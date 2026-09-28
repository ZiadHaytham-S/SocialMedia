import { HydratedDocument, Types } from "mongoose";
import { CommentRepository, PostRepository } from "../../DB/repository";
import { BadRequestException, ForBiddenException, NotFoundException } from "../../common/exceptions";
import { IComment, IPost, ReactionType, IUser } from "../../common/interfaces";
import { AvailabilityEnum, RoleEnum } from "../../common/enums";
import { uploadFileToR2 } from "../../common/services";
import {
  serializeComments,
  serializePost,
  serializePosts,
} from "../../common/utils/mediaResponse";
import { canViewerSeePost, feedVisibilityFilter, getViewerFriendIdSet } from "../../common/utils/postVisibility";
import { isAdmin } from "../../common/utils/adminAccess";
import { friendGraph } from "../../common/utils/friendGraph";
import notificationService from "../notification/notification.service";

type PostPayload = {
  content?: string;
  allowComments?: boolean;
  availability?: AvailabilityEnum;
  tags?: string[];
};

const AUTHOR_POPULATE = [{ path: "author", select: "firstName lastName profilePicture" }] as const;

const POST_POPULATE = [
  ...AUTHOR_POPULATE,
  {
    path: "sharedPost",
    populate: { path: "author", select: "firstName lastName profilePicture" },
  },
] as const;

export class PostService {
  private readonly postRepository: PostRepository;
  private readonly commentRepository: CommentRepository;

  constructor() {
    this.postRepository = new PostRepository();
    this.commentRepository = new CommentRepository();
  }

  private async findPostById(postId: string, viewer: HydratedDocument<IUser>) {
    const post = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
      options: { populate: [...POST_POPULATE] },
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    await this.assertViewerCanSeePost(post, viewer);

    return this.enrichSinglePost(post, viewer);
  }

  private resolveShareTargetId(post: HydratedDocument<IPost>): string {
    const shared = post.sharedPost;

    if (shared && typeof shared === "object" && "author" in shared) {
      return (shared as HydratedDocument<IPost>)._id.toString();
    }

    if (shared) {
      return shared.toString();
    }

    return post._id.toString();
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

  private async assertViewerCanSeePost(post: HydratedDocument<IPost>, viewer: HydratedDocument<IUser>) {
    const friendIdSet = await getViewerFriendIdSet(viewer);

    if (!canViewerSeePost(post, viewer, friendIdSet)) {
      throw new ForBiddenException("You are not allowed to view this post");
    }
  }

  private async enrichPostsForFeed(posts: HydratedDocument<IPost>[], viewer: HydratedDocument<IUser>) {
    if (!posts.length) {
      return [];
    }

    const friendIdSet = await getViewerFriendIdSet(viewer);
    const visiblePosts = posts.filter((post) => canViewerSeePost(post, viewer, friendIdSet));

    if (!visiblePosts.length) {
      return [];
    }

    const postIds = visiblePosts.map((post) => post._id);
    const [countMap, previewMap] = await Promise.all([
      this.commentRepository.countGroupedByPost(postIds),
      this.commentRepository.findRootPreviewsByPosts(postIds, 2),
    ]);

    return visiblePosts.map((post) => {
      const postId = post._id.toString();
      const serialized = serializePost(post, viewer, friendIdSet);
      const previews = previewMap.get(postId) ?? [];

      return {
        ...serialized,
        commentsCount: countMap[postId] ?? 0,
        comments: serializeComments(previews, viewer),
      };
    });
  }

  private async enrichSinglePost(post: HydratedDocument<IPost>, viewer: HydratedDocument<IUser>) {
    const [enriched] = await this.enrichPostsForFeed([post], viewer);
    const friendIdSet = await getViewerFriendIdSet(viewer);
    return enriched ?? serializePost(post, viewer, friendIdSet);
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
    folder: `posts/${userId}`,
  });
}
  async createPost({
    data,
    file,
    user,
  }: {
    data: PostPayload;
    file?: Express.Multer.File | undefined;
    user: HydratedDocument<IUser>;
  }) {
    if (!data.content && !file) {
      throw new BadRequestException("Post content or attachment is required");
    }

    const attachments = await this.uploadAttachment({
      file:file as Express.Multer.File,
      userId: user._id,
    });

    const post = await this.postRepository.createOne({
      data: {
        folderId: `posts/${user._id}`,
        content: data.content,
        attachments,
        allowComments: data.allowComments,
        availability: data.availability ?? AvailabilityEnum.PUBLIC,
        tags: data.tags?.map((id) => this.toObjectId(id)),
        author: user._id,
        updatedBy: user._id,
      },
    });

    if (data.tags?.length) {
      const notified = new Set<string>();

      for (const tagId of data.tags) {
        const mentionedId = this.toObjectId(tagId);

        if (notified.has(mentionedId.toString())) {
          continue;
        }

        notified.add(mentionedId.toString());
        void notificationService
          .notifyPostMention(user, mentionedId, post._id.toString())
          .catch((error) => console.warn("Failed to notify post mention:", error));
      }
    }

    return this.findPostById(post._id.toString(), user);
  }

  async sharePost({
    postId,
    data,
    user,
  }: {
    postId: string;
    data: PostPayload;
    user: HydratedDocument<IUser>;
  }) {
    const original = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
      options: { populate: [...POST_POPULATE] },
    });

    if (!original) {
      throw new NotFoundException("Post not found");
    }

    await this.assertViewerCanSeePost(original, user);

    const targetId = this.resolveShareTargetId(original);

    const share = await this.postRepository.createOne({
      data: {
        folderId: `posts/${user._id}`,
        content: data.content?.trim() || undefined,
        sharedPost: this.toObjectId(targetId),
        allowComments: data.allowComments ?? true,
        availability: data.availability ?? AvailabilityEnum.PUBLIC,
        author: user._id,
        updatedBy: user._id,
      },
    });

    const shareTarget = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(targetId) },
    });

    if (shareTarget) {
      shareTarget.shareCount = (shareTarget.shareCount ?? 0) + 1;
      await shareTarget.save();

      const shareAuthorId =
        shareTarget.author instanceof Types.ObjectId
          ? shareTarget.author
          : Types.ObjectId.createFromHexString(String((shareTarget.author as IUser & { _id?: Types.ObjectId })._id));

      void notificationService
        .notifyPostShare(user, shareAuthorId, targetId, share._id.toString())
        .catch((error) => console.warn("Failed to notify post share:", error));
    }

    return this.findPostById(share._id.toString(), user);
  }

  async newsFeed(viewer: HydratedDocument<IUser>) {
    const posts = await this.postRepository.find({
      filter: await feedVisibilityFilter(viewer),
      options: {
        sort: { createdAt: -1 },
        populate: [...POST_POPULATE],
      },
    });

    return this.enrichPostsForFeed(posts, viewer);
  }

  async profilePosts(userId: string, viewer: HydratedDocument<IUser>) {
    const authorId = this.toObjectId(userId);
    const isOwner = authorId.toString() === viewer._id.toString();
    const isFriend = isOwner || (await friendGraph.areFriends(viewer._id, authorId));

    const filter: Record<string, unknown> = { author: authorId };

    if (!isOwner && !isFriend && !isAdmin(viewer)) {
      filter.$or = [
        { availability: AvailabilityEnum.PUBLIC },
        { availability: { $exists: false } },
      ];
    }

    const posts = await this.postRepository.find({
      filter,
      options: {
        sort: { createdAt: -1 },
        populate: [...POST_POPULATE],
      },
    });

    return this.enrichPostsForFeed(posts, viewer);
  }

  async getPost(postId: string, viewer: HydratedDocument<IUser>) {
    return this.findPostById(postId, viewer);
  }

  async updatePost({
    postId,
    data,
    file,
    user,
  }: {
    postId: string;
    data: PostPayload;
    file?: Express.Multer.File | undefined;
    user: HydratedDocument<IUser>;
  }) {
    const post = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (!this.canManage(user, post.author)) {
      throw new ForBiddenException("You are not allowed to update this post");
    }

    const attachments = await this.uploadAttachment({
      file:file as Express.Multer.File,
      userId: user._id,
    });

    const updated = await this.postRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(postId) },
      update: {
        ...(data.content ? { content: data.content } : {}),
        ...(typeof data.allowComments === "boolean"
          ? { allowComments: data.allowComments }
          : {}),
        ...(data.availability ? { availability: data.availability } : {}),
        ...(data.tags ? { tags: data.tags.map((id) => this.toObjectId(id)) } : {}),
        ...(attachments ? { attachments } : {}),
        updatedBy: user._id,
      },
      options: { new: true },
    });

    if (!updated) throw new NotFoundException("Post not found");
    return this.findPostById(postId, user);
  }

  async deletePost({
    postId,
    user,
  }: {
    postId: string;
    user: HydratedDocument<IUser>;
  }) {
    const post = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (!this.canManage(user, post.author)) {
      throw new ForBiddenException("You are not allowed to delete this post");
    }

    await this.commentRepository.updateMany({
      filter: { post: this.toObjectId(postId) },
      update: { deletedAt: new Date() },
    });

    const deleted = await this.postRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(postId) },
      update: { deletedAt: new Date() },
      options: { new: true, populate: [...POST_POPULATE] },
    });

    if (!deleted) throw new NotFoundException("Post not found");

    return serializePost(deleted, user);
  }

  async reactPost({
    postId,
    type,
    user,
  }: {
    postId: string;
    type: ReactionType;
    user: HydratedDocument<IUser>;
  }) {
    const post = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
    });
    if (!post) throw new NotFoundException("Post not found");
    await this.assertViewerCanSeePost(post, user);

    post.reactions = post.reactions || [];
    const reaction = post.reactions.find(
      (item) => item.userId.toString() === user._id.toString(),
    );
    const isNewReaction = !reaction;

    if (reaction) {
      reaction.type = type;
      reaction.createdAt = new Date();
    } else {
      post.reactions.push({ userId: user._id, type, createdAt: new Date() });
    }

    await post.save();

    if (isNewReaction) {
      const authorId =
        post.author instanceof Types.ObjectId
          ? post.author
          : Types.ObjectId.createFromHexString(String((post.author as IUser & { _id?: Types.ObjectId })._id));

      if (authorId.toString() !== user._id.toString()) {
        void notificationService
          .notifyPostReaction(user, authorId, postId, type)
          .catch((error) => console.warn("Failed to notify post reaction:", error));
      }
    }

    return this.findPostById(postId, user);
  }

  async removePostReaction({
    postId,
    user,
  }: {
    postId: string;
    user: HydratedDocument<IUser>;
  }) {
    const post = await this.postRepository.findOne({
      filter: { _id: this.toObjectId(postId) },
    });
    if (!post) throw new NotFoundException("Post not found");
    await this.assertViewerCanSeePost(post, user);

    post.reactions = (post.reactions || []).filter(
      (item) => item.userId.toString() !== user._id.toString(),
    );

    await post.save();
    return this.findPostById(postId, user);
  }

  async dashboard(viewer: HydratedDocument<IUser>) {
    const [posts, comments] = await Promise.all([
      this.postRepository.find({
        filter: {},
        options: { populate: [...POST_POPULATE] },
      }),
      this.commentRepository.find({ filter: {} }),
    ]);

    const postReactions = posts.reduce(
      (total, post: HydratedDocument<IPost>) => total + (post.reactions?.length || 0),
      0,
    );
    const commentReactions = comments.reduce(
      (total, comment: HydratedDocument<IComment>) =>
        total + (comment.reactions?.length || 0),
      0,
    );

    const latestPosts = posts
      .sort((a, b) => {
        const bTime = b.createdAt?.getTime() || 0;
        const aTime = a.createdAt?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return {
      totalPosts: posts.length,
      totalComments: comments.length,
      totalReactions: postReactions + commentReactions,
      latestPosts: serializePosts(latestPosts, viewer),
    };
  }
}

export default new PostService();
