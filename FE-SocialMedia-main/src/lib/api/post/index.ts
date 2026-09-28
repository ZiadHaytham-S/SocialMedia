import type { ApiPost, PostAvailability, PostDashboard, ReactionType } from "@/types/social";
import {
  createPostSchema,
  reactionTypeSchema,
  sharePostSchema,
  updatePostSchema,
} from "@/lib/validation/social-validation";
import { apiRequest } from "../client";
import { normalizePost, unwrapList, unwrapResult } from "../normalizers";

export type PostMutationInput = {
  content?: string;
  allowComments?: boolean;
  availability?: PostAvailability;
  tagIds?: string[];
  attachment?: File;
};

function postFormData(input: PostMutationInput) {
  const formData = new FormData();

  if (input.content?.trim()) {
    formData.set("content", input.content.trim());
  }

  if (typeof input.allowComments === "boolean") {
    formData.set("allowComments", String(input.allowComments));
  }

  if (input.attachment) {
    formData.set("attachment", input.attachment);
  }

  if (input.availability) {
    formData.set("availability", input.availability);
  }

  const tagIds = input.tagIds?.filter((id) => /^[a-fA-F0-9]{24}$/.test(id));

  if (tagIds?.length) {
    formData.set("tags", tagIds.join(","));
  }

  return formData;
}

export async function getNewsFeed() {
  const data = await apiRequest<unknown>("/post/feed");
  return unwrapList(data).map((item) => normalizePost(item));
}

export async function getPostDashboard(): Promise<PostDashboard> {
  const data = await apiRequest<unknown>("/post/dashboard");
  const result = unwrapResult(data) as Record<string, unknown>;

  return {
    totalPosts: typeof result.totalPosts === "number" ? result.totalPosts : 0,
    totalComments: typeof result.totalComments === "number" ? result.totalComments : 0,
    totalReactions: typeof result.totalReactions === "number" ? result.totalReactions : 0,
    latestPosts: unwrapList(result.latestPosts).map((item) => normalizePost(item)),
  };
}

export async function getProfilePosts(userId: string): Promise<ApiPost[]> {
  const data = await apiRequest<unknown>(`/post/profile/${userId}`);
  return unwrapList(data).map((item) => normalizePost(item));
}

export async function createPost(input: string | PostMutationInput) {
  const payload = typeof input === "string" ? { content: input } : input;
  const parsed = createPostSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid post data.");
  }

  const data = await apiRequest<unknown>("/post", {
    method: "POST",
    body: postFormData(parsed.data),
  });

  return normalizePost(unwrapResult(data));
}

export async function getPostById(postId: string): Promise<ApiPost> {
  const data = await apiRequest<unknown>(`/post/${postId}`);
  return normalizePost(unwrapResult(data));
}

export async function updatePost(postId: string, input: PostMutationInput): Promise<ApiPost> {
  const parsed = updatePostSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid post data.");
  }

  const data = await apiRequest<unknown>(`/post/${postId}`, {
    method: "PATCH",
    body: postFormData(parsed.data),
  });

  return normalizePost(unwrapResult(data));
}

export async function deletePost(postId: string): Promise<ApiPost> {
  const data = await apiRequest<unknown>(`/post/${postId}`, {
    method: "DELETE",
  });

  return normalizePost(unwrapResult(data));
}

export async function reactOnPost(postId: string, type: ReactionType = "like"): Promise<ApiPost> {
  const parsed = reactionTypeSchema.safeParse(type);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reaction type.");
  }

  const data = await apiRequest<unknown>(`/post/${postId}/react`, {
    method: "PATCH",
    body: JSON.stringify({ type: parsed.data }),
  });

  return normalizePost(unwrapResult(data));
}

export async function removePostReaction(postId: string): Promise<ApiPost> {
  const data = await apiRequest<unknown>(`/post/${postId}/react`, { method: "DELETE" });
  return normalizePost(unwrapResult(data));
}

export type SharePostInput = {
  content?: string;
  allowComments?: boolean;
  availability?: PostAvailability;
};

export async function sharePost(postId: string, input: SharePostInput = {}): Promise<ApiPost> {
  const parsed = sharePostSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid share data.");
  }

  const body: Record<string, unknown> = {};

  if (parsed.data.content?.trim()) {
    body.content = parsed.data.content.trim();
  }

  if (typeof parsed.data.allowComments === "boolean") {
    body.allowComments = parsed.data.allowComments;
  }

  if (parsed.data.availability) {
    body.availability = parsed.data.availability;
  }

  const data = await apiRequest<unknown>(`/post/${postId}/share`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return normalizePost(unwrapResult(data));
}
