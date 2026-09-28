import type { ApiComment, ApiPost, ApiStory, ApiUser, FriendMeta, FriendRelation, ReactionType } from "@/types/social";
import { isReactionType } from "@/lib/reactions";
import { anonymousUser, defaultAvatar } from "./fallbacks";
import { API_URL } from "./client";

export type LooseRecord = Record<string, unknown>;

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
}

function isObjectIdString(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

export function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" ? (value as LooseRecord) : {};
}

export function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function formatTimestamp(value: unknown, fallback = "") {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);

    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }

    return value;
  }

  return fallback;
}

function countFrom(value: unknown, fallback = 0) {
  return Array.isArray(value) ? value.length : asNumber(value, fallback);
}

function reactionTypesFromRecord(record: LooseRecord): ReactionType[] {
  if (Array.isArray(record.reactionTypes)) {
    return record.reactionTypes.filter(isReactionType);
  }

  if (!Array.isArray(record.reactions)) {
    return [];
  }

  const types = new Set<ReactionType>();

  for (const item of record.reactions) {
    const reaction = asRecord(item);
    const type = reaction.type;

    if (isReactionType(type)) {
      types.add(type);
    }
  }

  return [...types];
}

function viewerReactionTypeFromRecord(record: LooseRecord): ReactionType | undefined {
  const direct = record.viewerReactionType;

  if (isReactionType(direct)) {
    return direct;
  }

  return undefined;
}

function readablePhone(value: unknown) {
  const phone = asString(value, "");
  return /^(?:\+20|0)?1[0125]\d{8}$/.test(phone) ? phone : "";
}

function assetUrl(value: unknown) {
  const raw = asString(value, "");

  if (!raw) {
    return "";
  }

  if (/^(https?:|blob:|data:|\/)/.test(raw)) {
    return raw;
  }

  const publicBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_ASSET_URL ?? API_URL;

  return publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, "")}/${raw.replace(/^\//, "")}` : "";
}

function objectIdString(value: unknown) {
  if (isObjectIdString(value)) {
    return value;
  }

  const nested = asRecord(value);
  return asString(nested.id ?? nested._id, "");
}

function tagIdsFrom(record: LooseRecord) {
  if (!Array.isArray(record.tags)) {
    return undefined;
  }

  return record.tags.map((tag) => objectIdString(tag)).filter(Boolean);
}

function authorSource(record: LooseRecord) {
  const author = record.author ?? record.user ?? record.createdBy;

  if (author && typeof author === "object") {
    return author;
  }

  if (isObjectIdString(author)) {
    return { _id: author };
  }

  return author;
}

export function unwrapList(value: unknown): unknown[] {
  const record = asRecord(value);
  const data = asRecord(record.data);
  const list =
    (Array.isArray(value) && value) ||
    (Array.isArray(record.data) && record.data) ||
    (Array.isArray(record.result) && record.result) ||
    (Array.isArray(data.result) && data.result) ||
    (Array.isArray(record.posts) && record.posts) ||
    (Array.isArray(record.feed) && record.feed) ||
    (Array.isArray(record.comments) && record.comments) ||
    (Array.isArray(record.stories) && record.stories) ||
    [];

  return list;
}

export function unwrapResult(value: unknown): unknown {
  const record = asRecord(value);
  const data = asRecord(record.data);

  return data.result ?? data.updated ?? data.credentials ?? record.result ?? record.data ?? value;
}

export function preserveEntityAuthor<T extends { author: ApiUser }>(previous: T | undefined, next: T): T {
  if (!previous) {
    return next;
  }

  return { ...next, author: mergeAuthor(previous.author, next.author) };
}

export function mergeAuthor(previous: ApiUser | undefined, next: ApiUser): ApiUser {
  if (next.name.trim()) {
    return next;
  }

  if (!previous) {
    return next;
  }

  return {
    ...next,
    id: next.id || previous.id,
    name: previous.name,
    firstName: previous.firstName ?? next.firstName,
    lastName: previous.lastName ?? next.lastName,
    username: previous.username || next.username,
    avatarUrl: next.avatarUrl !== defaultAvatar ? next.avatarUrl : previous.avatarUrl,
    coverUrl: next.coverUrl || previous.coverUrl,
  };
}

export function normalizeUser(value: unknown, fallback = anonymousUser): ApiUser {
  if (isObjectIdString(value)) {
    return { ...anonymousUser, id: value };
  }

  const record = asRecord(value);

  if (!Object.keys(record).length) {
    return { ...fallback };
  }

  const profile = asRecord(record.user ?? record.author ?? record.createdBy);
  const profilePicture = asRecord(record.profilePicture ?? profile.profilePicture);
  const coverPictures = Array.isArray(record.profileCoverPictures)
    ? record.profileCoverPictures
    : Array.isArray(profile.profileCoverPictures)
      ? profile.profileCoverPictures
      : [];
  const firstName = asString(record.firstName ?? profile.firstName, "");
  const lastName = asString(record.lastName ?? profile.lastName, "");
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName = asString(
    record.name ?? record.fullName ?? profile.name ?? profile.fullName ?? fullName ?? record.username ?? profile.username,
    "",
  );
  const id = asString(record.id ?? record._id ?? profile.id ?? profile._id, fallback.id);
  const friendMetaRaw = asRecord(record.friendMeta ?? asRecord(record.result).friendMeta);

  const friendMeta: FriendMeta | undefined = Object.keys(friendMetaRaw).length
    ? {
        relation: (friendMetaRaw.relation as FriendRelation) ?? "none",
        friendCount: typeof friendMetaRaw.friendCount === "number" ? friendMetaRaw.friendCount : 0,
        mutualCount: typeof friendMetaRaw.mutualCount === "number" ? friendMetaRaw.mutualCount : 0,
        canSendRequest:
          typeof friendMetaRaw.canSendRequest === "boolean"
            ? friendMetaRaw.canSendRequest
            : friendMetaRaw.relation === "none",
        canAccept: Boolean(friendMetaRaw.canAccept),
        canCancel: Boolean(friendMetaRaw.canCancel),
        canUnfriend: Boolean(friendMetaRaw.canUnfriend),
        canBlock: Boolean(friendMetaRaw.canBlock),
        canUnblock: Boolean(friendMetaRaw.canUnblock),
      }
    : undefined;

  return {
    id,
    name: displayName,
    firstName,
    lastName,
    username: asString(record.username ?? profile.username ?? fullName, ""),
    email: asString(record.email ?? profile.email, ""),
    phone: readablePhone(record.phone ?? profile.phone),
    gender: typeof record.gender === "number" ? record.gender : undefined,
    DOB: asString(record.DOB ?? profile.DOB, ""),
    role: typeof record.role === "number" ? record.role : undefined,
    profileVisitCount: typeof record.profileVisitCount === "number" ? record.profileVisitCount : undefined,
    avatarUrl: assetUrl(
      record.avatarUrl ??
        record.avatar ??
        record.profileImage ??
        record.image ??
        profile.avatarUrl ??
        profilePicture.url ??
        profilePicture.key,
    ) || defaultAvatar,
    coverUrl: assetUrl(record.coverUrl ?? record.cover ?? profile.coverUrl),
    coverUrls: coverPictures
      .map((item) => {
        const picture = asRecord(item);
        return assetUrl(picture.url ?? picture.secure_url ?? picture.key);
      })
      .filter(Boolean),
    createdAt: asString(record.createdAt ?? profile.createdAt, ""),
    updatedAt: asString(record.updatedAt ?? profile.updatedAt, ""),
    friendMeta,
    deletedAt: formatTimestamp(record.deletedAt, ""),
    restoredAt: formatTimestamp(record.restoredAt, ""),
  };
}

export function normalizeComment(value: unknown, previousAuthor?: ApiUser): ApiComment {
  const record = asRecord(value);
  const attachment = asRecord(record.attachment);
  const author = mergeAuthor(previousAuthor, normalizeUser(authorSource(record)));
  const postId = objectIdString(record.postId ?? record.post);
  const parentCommentId = objectIdString(record.commentId ?? record.parentComment);

  return {
    id: asString(record.id ?? record._id, createId()),
    body: asString(record.body ?? record.content ?? record.text ?? record.comment, ""),
    createdAt: formatTimestamp(record.createdAt ?? record.created_at ?? record.time, "now"),
    reactionsCount: countFrom(record.reactions ?? record.reactionsCount ?? record.reactCount ?? record.likesCount, 0),
    viewerReacted: Boolean(record.viewerReacted ?? record.isReacted ?? record.liked),
    viewerReactionType: viewerReactionTypeFromRecord(record),
    reactionTypes: reactionTypesFromRecord(record),
    author,
    createdBy: author,
    postId: postId || undefined,
    parentCommentId: parentCommentId || undefined,
    tagIds: tagIdsFrom(record),
    attachmentUrl: assetUrl(attachment.secure_url ?? attachment.url ?? attachment.key),
  };
}

export function normalizePost(value: unknown, previousAuthor?: ApiUser): ApiPost {
  const record = asRecord(value);
  const comments = unwrapList(record.comments).map((comment) => normalizeComment(comment));
  const attachments = asRecord(record.attachments ?? record.attachment);
  const author = mergeAuthor(previousAuthor, normalizeUser(authorSource(record)));
  const availability = asString(record.availability, "");
  const allowedAvailability = ["PUBLIC", "PRIVATE", "ONLY"] as const;

  const sharedSource = record.sharedPost ?? record.sharedFrom ?? record.originalPost;
  const sharedPost =
    sharedSource && !record.sharedPostUnavailable
      ? normalizePost(sharedSource, mergeAuthor(previousAuthor, normalizeUser(authorSource(asRecord(sharedSource)))))
      : undefined;

  return {
    id: asString(record.id ?? record._id, createId()),
    body: asString(record.body ?? record.content ?? record.text ?? record.caption, ""),
    folderId: asString(record.folderId, "") || undefined,
    availability: allowedAvailability.includes(availability as (typeof allowedAvailability)[number])
      ? (availability as ApiPost["availability"])
      : undefined,
    imageUrl: assetUrl(
      record.imageUrl ??
        record.image ??
        record.mediaUrl ??
        record.photo ??
        attachments.secure_url ??
        attachments.url ??
        attachments.key ??
        attachments.public_id,
    ),
    createdAt: formatTimestamp(record.createdAt ?? record.created_at ?? record.time, "now"),
    reactionsCount: countFrom(record.reactions ?? record.reactionsCount ?? record.reactCount ?? record.likesCount, 0),
    commentsCount: asNumber(record.commentsCount ?? record.commentCount, comments.length),
    viewerReacted: Boolean(record.viewerReacted ?? record.isReacted ?? record.liked),
    viewerReactionType: viewerReactionTypeFromRecord(record),
    reactionTypes: reactionTypesFromRecord(record),
    author,
    createdBy: author,
    tagIds: tagIdsFrom(record),
    comments,
    allowComments: typeof record.allowComments === "boolean" ? record.allowComments : undefined,
    sharedPost,
    sharedPostUnavailable: Boolean(record.sharedPostUnavailable),
    shareCount: asNumber(record.shareCount ?? record.sharesCount, 0),
  };
}

export function normalizeStory(value: unknown, previousAuthor?: ApiUser): ApiStory {
  const record = asRecord(value);
  const attachment = asRecord(record.attachment);
  const author = mergeAuthor(previousAuthor, normalizeUser(authorSource(record)));

  return {
    id: asString(record.id ?? record._id, createId()),
    body: asString(record.body ?? record.content ?? record.text ?? "", ""),
    imageUrl: assetUrl(record.imageUrl ?? record.image ?? record.mediaUrl ?? attachment.secure_url ?? attachment.url ?? attachment.key),
    createdAt: formatTimestamp(record.createdAt ?? record.created_at ?? record.time, "now"),
    expiresAt: formatTimestamp(record.expiresAt ?? record.expires_at, ""),
    viewsCount: countFrom(record.views ?? record.viewsCount ?? record.viewCount, 0),
    reactionsCount: countFrom(record.reactions ?? record.reactionsCount ?? record.reactCount ?? record.likesCount, 0),
    viewerViewed: Boolean(record.viewerViewed ?? record.viewed),
    viewerReacted: Boolean(record.viewerReacted ?? record.isReacted ?? record.liked),
    viewerReactionType: viewerReactionTypeFromRecord(record),
    reactionTypes: reactionTypesFromRecord(record),
    author,
  };
}
