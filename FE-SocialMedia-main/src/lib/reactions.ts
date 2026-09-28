import type { ReactionType } from "@/types/social";

export type ReactionConfig = {
  type: ReactionType;
  emoji: string;
  labelKey: `reaction.${ReactionType}`;
  activeClass: string;
};

export const REACTIONS: ReactionConfig[] = [
  { type: "like", emoji: "👍", labelKey: "reaction.like", activeClass: "text-blue-600 dark:text-blue-400" },
  { type: "love", emoji: "❤️", labelKey: "reaction.love", activeClass: "text-red-600 dark:text-red-400" },
  { type: "haha", emoji: "😂", labelKey: "reaction.haha", activeClass: "text-amber-600 dark:text-amber-400" },
  { type: "wow", emoji: "😮", labelKey: "reaction.wow", activeClass: "text-amber-600 dark:text-amber-400" },
  { type: "sad", emoji: "😢", labelKey: "reaction.sad", activeClass: "text-amber-600 dark:text-amber-400" },
  { type: "angry", emoji: "😡", labelKey: "reaction.angry", activeClass: "text-orange-600 dark:text-orange-400" },
];

export function getReactionConfig(type?: ReactionType) {
  return REACTIONS.find((reaction) => reaction.type === type);
}

export function isReactionType(value: unknown): value is ReactionType {
  return REACTIONS.some((reaction) => reaction.type === value);
}
