import type { HydratedDocument, Types } from "mongoose";
import type { IComment, IPost, IStory, IUser } from "../interfaces";
import { getR2FileUrl } from "../services/r2.service";
import { canViewerSeePost } from "./postVisibility";

type ReactionLike = { userId: Types.ObjectId | string; type?: string };

type AttachmentLike = {
  key?: string;
  url?: string | null;
  secure_url?: string | null;
  public_id?: string;
};

export function hasViewerReacted(
  reactions: ReactionLike[] | undefined,
  viewerId: Types.ObjectId | string,
): boolean {
  const viewer = viewerId.toString();

  return (reactions ?? []).some((reaction) => reaction.userId.toString() === viewer);
}

export function getViewerReactionType(
  reactions: ReactionLike[] | undefined,
  viewerId: Types.ObjectId | string,
): string | undefined {
  const viewer = viewerId.toString();

  return (reactions ?? []).find((reaction) => reaction.userId.toString() === viewer)?.type;
}

export function getReactionTypes(reactions: ReactionLike[] | undefined): string[] {
  return [...new Set((reactions ?? []).map((reaction) => reaction.type).filter(Boolean) as string[])];
}

export function enrichAttachment<T extends AttachmentLike | null | undefined>(attachment: T): T {
  if (!attachment?.key) {
    return attachment;
  }

  const url = getR2FileUrl(attachment.key);

  if (!url) {
    return attachment;
  }

  return {
    ...attachment,
    url: attachment.url ?? url,
    secure_url: attachment.secure_url ?? url,
  };
}

function toPlain<T extends { toJSON?: () => Record<string, unknown> }>(doc: T): Record<string, unknown> {
  return typeof doc.toJSON === "function" ? doc.toJSON() : ({ ...doc } as Record<string, unknown>);
}

export function serializePost(
  post: HydratedDocument<IPost>,
  viewer?: HydratedDocument<IUser>,
  friendIdSet?: Set<string>,
): Record<string, unknown> {
  const json = toPlain(post);

  if (json.author) {
    json.createdBy = json.author;
  }

  if (json.attachments) {
    const attachments = enrichAttachment(json.attachments as AttachmentLike);

    if (attachments) {
      json.attachments = attachments;
      const attachmentUrl =
        (attachments as AttachmentLike).secure_url ?? (attachments as AttachmentLike).url;

      if (attachmentUrl) {
        json.imageUrl = attachmentUrl;
      }
    }
  }

  if (viewer) {
    const reactions = json.reactions as ReactionLike[] | undefined;
    json.viewerReacted = hasViewerReacted(reactions, viewer._id);
    json.viewerReactionType = getViewerReactionType(reactions, viewer._id);
    json.reactionTypes = getReactionTypes(reactions);
  }

  const shared = post.sharedPost;

  if (shared && typeof shared === "object" && "author" in shared) {
    const sharedDoc = shared as HydratedDocument<IPost>;

    if (viewer && canViewerSeePost(sharedDoc, viewer, friendIdSet)) {
      const nested = serializePost(sharedDoc, viewer, friendIdSet);
      delete nested.sharedPost;
      json.sharedPost = nested;
    } else {
      json.sharedPostUnavailable = true;
    }
  }

  return json;
}

export function serializePosts(posts: HydratedDocument<IPost>[], viewer?: HydratedDocument<IUser>) {
  return posts.map((post) => serializePost(post, viewer));
}

export function serializeComment(
  comment: HydratedDocument<IComment>,
  viewer?: HydratedDocument<IUser>,
): Record<string, unknown> {
  const json = toPlain(comment);

  if (json.post) {
    json.postId = json.post;
  }

  if (json.author) {
    json.createdBy = json.author;
  }

  if (json.parentComment) {
    json.commentId = json.parentComment;
  }

  if (json.attachment) {
    json.attachment = enrichAttachment(json.attachment as AttachmentLike);
  }

  if (viewer) {
    const reactions = json.reactions as ReactionLike[] | undefined;
    json.viewerReacted = hasViewerReacted(reactions, viewer._id);
    json.viewerReactionType = getViewerReactionType(reactions, viewer._id);
    json.reactionTypes = getReactionTypes(reactions);
  }

  return json;
}

export function serializeComments(
  comments: HydratedDocument<IComment>[],
  viewer?: HydratedDocument<IUser>,
) {
  return comments.map((comment) => serializeComment(comment, viewer));
}

export function serializeStory(
  story: HydratedDocument<IStory>,
  viewer?: HydratedDocument<IUser>,
): Record<string, unknown> {
  const json = toPlain(story);

  if (json.attachment) {
    json.attachment = enrichAttachment(json.attachment as AttachmentLike);
  }

  const views = json.views as Array<Types.ObjectId | string> | undefined;
  const reactions = json.reactions as ReactionLike[] | undefined;

  json.viewsCount = views?.length ?? 0;
  json.reactionsCount = reactions?.length ?? 0;
  json.reactionTypes = getReactionTypes(reactions);

  if (viewer) {
    json.viewerViewed = (views ?? []).some((userId) => userId.toString() === viewer._id.toString());
    json.viewerReacted = hasViewerReacted(reactions, viewer._id);
    json.viewerReactionType = getViewerReactionType(reactions, viewer._id);
  }

  return json;
}

export function serializeStories(stories: HydratedDocument<IStory>[], viewer?: HydratedDocument<IUser>) {
  return stories.map((story) => serializeStory(story, viewer));
}
