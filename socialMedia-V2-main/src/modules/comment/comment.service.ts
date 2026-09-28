import { HydratedDocument, Types } from "mongoose";
import { CommentRepository, PostRepository } from "../../DB/repository";
import { BadRequestException, ForBiddenException, NotFoundException } from "../../common/exceptions";
import { ReactionType, IUser } from "../../common/interfaces";
import { RoleEnum } from "../../common/enums";
import { uploadFileToR2 } from "../../common/services";
import {
  serializeComment,
  serializeComments,
} from "../../common/utils/mediaResponse";
import { canViewerSeePost, getViewerFriendIdSet } from "../../common/utils/postVisibility";
import notificationService from "../notification/notification.service";

type CommentPayload = {
  content?: string;
  commentId?: string;
  tags?: string[];
};

const AUTHOR_POPULATE = [{ path: "author", select: "firstName lastName profilePicture" }] as const;

export class CommentService {
  private readonly commentRepository: CommentRepository;
  private readonly postRepository: PostRepository;

  constructor() {
    this.commentRepository = new CommentRepository();
    this.postRepository = new PostRepository();
  }

  private async findCommentById(commentId: string, viewer: HydratedDocument<IUser>) {
    const comment = await this.commentRepository.findOne({
      filter: { _id: this.toObjectId(commentId) },
      options: { populate: [...AUTHOR_POPULATE] },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    return serializeComment(comment, viewer);
  }

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === "string" ? Types.ObjectId.createFromHexString(id) : id;
  }

  private toAuthorId(author: Types.ObjectId | IUser): Types.ObjectId {
    if (author instanceof Types.ObjectId) {
      return author;
    }

    const record = author as IUser & { _id?: Types.ObjectId };
    return record._id instanceof Types.ObjectId ? record._id : Types.ObjectId.createFromHexString(String(record._id));
  }

  private canManage(user: HydratedDocument<IUser>, author: Types.ObjectId | IUser): boolean {
    return user.role === RoleEnum.ADMIN || this.toAuthorId(author).toString() === user._id.toString();
  }

  private async uploadAttachment({
  file,
  userId,
}: {
  file?: Express.Multer.File;
  userId: Types.ObjectId;
}) {
  if (!file) return undefined;

  return uploadFileToR2({
    file,
    folder: `posts/comments/${userId}`,
  });
}

  async createComment({
    postId,
    data,
    file,
    user,
  }: {
    postId: string;
    data: CommentPayload;
    file?: Express.Multer.File | undefined;
    user: HydratedDocument<IUser>;
  }) {
    if (!data.content && !file) {
      throw new BadRequestException("Comment content or attachment is required");
    }

    const post = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
    });
    if (!post) throw new NotFoundException("Post not found");
    const friendIdSet = await getViewerFriendIdSet(user);

    if (!canViewerSeePost(post, user, friendIdSet)) {
      throw new ForBiddenException("You are not allowed to view this post");
    }
    if (post.allowComments === false) {
      throw new ForBiddenException("Comments are disabled for this post");
    }

    const attachment = await this.uploadAttachment({
      file:file as Express.Multer.File,
      userId: user._id,
    });

    const comment = await this.commentRepository.createOne({
      data: {
        content: data.content,
        attachment,
        post: this.toObjectId(postId),
        ...(data.commentId ? { parentComment: this.toObjectId(data.commentId) } : {}),
        ...(data.tags?.length ? { tags: data.tags.map((id) => this.toObjectId(id)) } : {}),
        author: user._id,
        updatedBy: user._id,
      },
    });

    const notified = new Set<string>([user._id.toString()]);
    const postAuthorId = this.toAuthorId(post.author as Types.ObjectId | IUser);

    if (!notified.has(postAuthorId.toString())) {
      notified.add(postAuthorId.toString());
      void notificationService
        .notifyPostComment(user, postAuthorId, postId)
        .catch((error) => console.warn("Failed to notify post comment:", error));
    }

    if (data.commentId) {
      const parentComment = await this.commentRepository.findOne({
        filter: { _id: this.toObjectId(data.commentId) },
        projection: "author",
      });

      if (parentComment) {
        const parentAuthorId = this.toAuthorId(parentComment.author);

        if (!notified.has(parentAuthorId.toString())) {
          notified.add(parentAuthorId.toString());
          void notificationService
            .notifyCommentReply(user, parentAuthorId, postId, comment._id.toString())
            .catch((error) => console.warn("Failed to notify comment reply:", error));
        }
      }
    }

    if (data.tags?.length) {
      for (const tagId of data.tags) {
        const mentionedId = this.toObjectId(tagId);

        if (notified.has(mentionedId.toString())) {
          continue;
        }

        notified.add(mentionedId.toString());
        void notificationService
          .notifyCommentMention(user, mentionedId, postId, comment._id.toString())
          .catch((error) => console.warn("Failed to notify comment mention:", error));
      }
    }

    return this.findCommentById(comment._id.toString(), user);
  }

  async listPostComments(postId: string, viewer: HydratedDocument<IUser>) {
    const post = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
    });
    if (!post) throw new NotFoundException("Post not found");
    const friendIdSet = await getViewerFriendIdSet(viewer);

    if (!canViewerSeePost(post, viewer, friendIdSet)) {
      throw new ForBiddenException("You are not allowed to view this post");
    }

    const comments = await this.commentRepository.find({
      filter: { post: this.toObjectId(postId) },
      options: {
        sort: { createdAt: -1 },
        populate: [...AUTHOR_POPULATE],
      },
    });

    return serializeComments(comments, viewer);
  }

  async updateComment({
    commentId,
    data,
    user,
  }: {
    commentId: string;
    data: CommentPayload;
    user: HydratedDocument<IUser>;
  }) {
    const comment = await this.commentRepository.findOne({
      filter: { _id: this.toObjectId(commentId) },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (!this.canManage(user, comment.author)) {
      throw new ForBiddenException("You are not allowed to update this comment");
    }

    const updated = await this.commentRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(commentId) },
      update: { content: data.content, updatedBy: user._id },
      options: { new: true },
    });

    if (!updated) throw new NotFoundException("Comment not found");
    return this.findCommentById(commentId, user);
  }

  async deleteComment({
    commentId,
    user,
  }: {
    commentId: string;
    user: HydratedDocument<IUser>;
  }) {
    const comment = await this.commentRepository.findOne({
      filter: { _id: this.toObjectId(commentId) },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (!this.canManage(user, comment.author)) {
      throw new ForBiddenException("You are not allowed to delete this comment");
    }

    const deleted = await this.commentRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(commentId) },
      update: { deletedAt: new Date() },
      options: { new: true, populate: [...AUTHOR_POPULATE] },
    });

    if (!deleted) throw new NotFoundException("Comment not found");

    return serializeComment(deleted, user);
  }

  async reactComment({
    commentId,
    type,
    user,
  }: {
    commentId: string;
    type: ReactionType;
    user: HydratedDocument<IUser>;
  }) {
    const comment = await this.commentRepository.findOne({
      filter: { _id: this.toObjectId(commentId) },
    });
    if (!comment) throw new NotFoundException("Comment not found");

    comment.reactions = comment.reactions || [];
    const reaction = comment.reactions.find(
      (item) => item.userId.toString() === user._id.toString(),
    );
    const isNewReaction = !reaction;

    if (reaction) {
      reaction.type = type;
      reaction.createdAt = new Date();
    } else {
      comment.reactions.push({ userId: user._id, type, createdAt: new Date() });
    }

    await comment.save();

    if (isNewReaction) {
      const authorId = this.toAuthorId(comment.author);
      const postId = comment.post.toString();

      if (authorId.toString() !== user._id.toString()) {
        void notificationService
          .notifyCommentReaction(user, authorId, postId, commentId, type)
          .catch((error) => console.warn("Failed to notify comment reaction:", error));
      }
    }

    return this.findCommentById(commentId, user);
  }

  async removeCommentReaction({
    commentId,
    user,
  }: {
    commentId: string;
    user: HydratedDocument<IUser>;
  }) {
    const comment = await this.commentRepository.findOne({
      filter: { _id: this.toObjectId(commentId) },
    });
    if (!comment) throw new NotFoundException("Comment not found");

    comment.reactions = (comment.reactions || []).filter(
      (item) => item.userId.toString() !== user._id.toString(),
    );

    await comment.save();
    return this.findCommentById(commentId, user);
  }
}

export default new CommentService();
