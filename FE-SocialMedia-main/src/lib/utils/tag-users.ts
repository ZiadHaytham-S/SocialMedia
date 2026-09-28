import type { ApiUser } from "@/types/social";
import { getMentionHandle } from "@/lib/utils/mentions";

export function resolveTagIds(tagIds: string[] | undefined, contacts: ApiUser[]) {
  if (!tagIds?.length) {
    return [];
  }

  const byId = new Map(contacts.map((user) => [user.id, user]));

  return tagIds.map((id) => byId.get(id)).filter((user): user is ApiUser => Boolean(user));
}

export function parseMentionUsernames(text: string) {
  const matches = text.match(/@([a-zA-Z0-9_\u0600-\u06FF]+)/g) ?? [];
  return [...new Set(matches.map((token) => token.slice(1).toLowerCase()))];
}

export function tagIdsFromMentions(text: string, contacts: ApiUser[]) {
  const mentions = parseMentionUsernames(text);
  if (!mentions.length) {
    return [];
  }

  const ids = new Set<string>();

  for (const contact of contacts) {
    const keys = [
      getMentionHandle(contact),
      contact.username,
      contact.name,
      contact.firstName,
      contact.lastName,
    ]
      .filter(Boolean)
      .map((value) => value!.toLowerCase().replace(/\s+/g, ""));

    for (const mention of mentions) {
      const normalizedMention = mention.replace(/\s+/g, "");
      if (keys.some((key) => key === normalizedMention || key?.includes(normalizedMention))) {
        ids.add(contact.id);
      }
    }
  }

  return [...ids];
}

export function mergeTagIds(selected: string[], fromText: string, contacts: ApiUser[]) {
  return [...new Set([...selected, ...tagIdsFromMentions(fromText, contacts)])];
}
