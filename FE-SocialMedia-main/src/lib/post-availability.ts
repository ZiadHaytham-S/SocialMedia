import type { PostAvailability } from "@/types/social";
import type { MessageKey } from "@/lib/i18n/messages";

/** Matches backend AvailabilityEnum (PRIVATE = friends-only in UI). */
export const POST_AVAILABILITY_OPTIONS: PostAvailability[] = ["PUBLIC", "PRIVATE", "ONLY"];

export const POST_AVAILABILITY_LABEL_KEYS: Record<PostAvailability, MessageKey> = {
  PUBLIC: "post.availability.public",
  PRIVATE: "post.availability.friends",
  ONLY: "post.availability.only",
};

export const POST_AVAILABILITY_DESC_KEYS: Record<PostAvailability, MessageKey> = {
  PUBLIC: "post.availability.publicDesc",
  PRIVATE: "post.availability.friendsDesc",
  ONLY: "post.availability.onlyDesc",
};

export const POST_AVAILABILITY_ICONS: Record<PostAvailability, string> = {
  PUBLIC: "🌐",
  PRIVATE: "👥",
  ONLY: "🔒",
};
