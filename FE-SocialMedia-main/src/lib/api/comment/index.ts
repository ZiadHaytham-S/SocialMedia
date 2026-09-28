import type { ApiComment, ReactionType } from "@/types/social";
import {
  createCommentSchema,
  reactionTypeSchema,
  updateCommentSchema,
} from "@/lib/validation/social-validation";
import { apiRequest } from "../client";
import { normalizeComment, unwrapList, unwrapResult } from "../normalizers";

export type CommentMutationInput = {
  content?: string;
  attachment?: File;
  /** Parent comment id when creating a reply. */
  commentId?: string;
  tagIds?: string[];
};

function commentFormData(input: CommentMutationInput) {
  const formData = new FormData();

  if (input.content?.trim()) {
    formData.set("content", input.content.trim());
  }

  if (input.attachment) {
    formData.set("attachment", input.attachment);
  }

  if (input.commentId?.trim()) {
    formData.set("commentId", input.commentId.trim());
  }

  if (input.tagIds?.length) {
    formData.set("tags", input.tagIds.join(","));
  }

  return formData;
}

export async function createComment(postId: string, input: string | CommentMutationInput): Promise<ApiComment> {
  const payload = typeof input === "string" ? { content: input } : input;
  const parsed = createCommentSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment data.");
  }

  const data = await apiRequest<unknown>(`/comment/post/${postId}`, {
    method: "POST",
    body: commentFormData(parsed.data),
  });

  return normalizeComment(unwrapResult(data));
}

export async function getPostComments(postId: string) {
  try {
    const data = await apiRequest<unknown>(`/comment/post/${postId}`);
    return unwrapList(data).map((item) => normalizeComment(item));
  } catch {
    return [];
  }
}

export async function updateComment(commentId: string, content: string): Promise<ApiComment> {
  const parsed = updateCommentSchema.safeParse({ content });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment content.");
  }

  const data = await apiRequest<unknown>(`/comment/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify(parsed.data),
  });

  return normalizeComment(unwrapResult(data));
}

export async function deleteComment(commentId: string): Promise<ApiComment> {
  const data = await apiRequest<unknown>(`/comment/${commentId}`, {
    method: "DELETE",
  });

  return normalizeComment(unwrapResult(data));
}

export async function reactOnComment(commentId: string, type: ReactionType = "like"): Promise<ApiComment> {
  const parsed = reactionTypeSchema.safeParse(type);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reaction type.");
  }

  const data = await apiRequest<unknown>(`/comment/${commentId}/react`, {
    method: "PATCH",
    body: JSON.stringify({ type: parsed.data }),
  });

  return normalizeComment(unwrapResult(data));
}

export async function removeCommentReaction(commentId: string): Promise<ApiComment> {
  const data = await apiRequest<unknown>(`/comment/${commentId}/react`, { method: "DELETE" });
  return normalizeComment(unwrapResult(data));
}
