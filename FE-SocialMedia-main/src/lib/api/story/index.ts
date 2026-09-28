import type { ApiStory, ReactionType, StoryDashboard } from "@/types/social";
import { reactionTypeSchema, storyCreateSchema } from "@/lib/validation/social-validation";
import { apiRequest } from "../client";
import { asRecord, normalizeStory, unwrapList, unwrapResult } from "../normalizers";

export type CreateStoryInput = {
  content?: string;
  attachment?: File;
};

export async function createStory(input: CreateStoryInput) {
  const parsed = storyCreateSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid story data.");
  }

  const formData = new FormData();

  if (parsed.data.content?.trim()) {
    formData.set("content", parsed.data.content.trim());
  }

  if (parsed.data.attachment) {
    formData.set("attachment", parsed.data.attachment);
  }

  const data = await apiRequest<unknown>("/story", {
    method: "POST",
    body: formData,
  });

  return normalizeStory(unwrapResult(data));
}

export async function getStoryFeed() {
  const data = await apiRequest<unknown>("/story/feed");
  return unwrapList(data).map((item) => normalizeStory(item));
}

export async function getStoryDashboard(): Promise<StoryDashboard> {
  const data = await apiRequest<unknown>("/story/dashboard");
  const result = asRecord(unwrapResult(data));

  return {
    totalActiveStories:
      typeof result.totalActiveStories === "number" ? result.totalActiveStories : unwrapList(result.latestStories).length,
    latestStories: unwrapList(result.latestStories).map((item) => normalizeStory(item)),
  };
}

export async function getUserStories(userId: string): Promise<ApiStory[]> {
  const data = await apiRequest<unknown>(`/story/profile/${userId}`);
  return unwrapList(data).map((item) => normalizeStory(item));
}

export async function getStoryById(storyId: string): Promise<ApiStory> {
  const data = await apiRequest<unknown>(`/story/${storyId}`);
  return normalizeStory(unwrapResult(data));
}

export async function deleteStory(storyId: string): Promise<ApiStory> {
  const data = await apiRequest<unknown>(`/story/${storyId}`, {
    method: "DELETE",
  });

  return normalizeStory(unwrapResult(data));
}

export async function viewStory(storyId: string): Promise<ApiStory> {
  const data = await apiRequest<unknown>(`/story/${storyId}/view`, {
    method: "POST",
  });

  return normalizeStory(unwrapResult(data));
}

export async function reactOnStory(storyId: string, type: ReactionType = "like"): Promise<ApiStory> {
  const parsed = reactionTypeSchema.safeParse(type);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reaction type.");
  }

  const data = await apiRequest<unknown>(`/story/${storyId}/react`, {
    method: "PATCH",
    body: JSON.stringify({ type: parsed.data }),
  });

  return normalizeStory(unwrapResult(data));
}

export async function deleteStoryReaction(storyId: string): Promise<ApiStory> {
  const data = await apiRequest<unknown>(`/story/${storyId}/react`, { method: "DELETE" });
  return normalizeStory(unwrapResult(data));
}
