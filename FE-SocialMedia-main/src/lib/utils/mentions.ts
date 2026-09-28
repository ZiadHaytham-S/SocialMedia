import type { ApiUser } from "@/types/social";

export type MentionContext = {
  start: number;
  query: string;
};

/** Display token inserted after @ (no spaces). */
export function getMentionHandle(user: ApiUser) {
  const first = user.name.trim().split(/\s+/)[0];
  if (first) {
    return first.replace(/\s+/g, "");
  }

  return (user.username ?? "user").replace(/\s+/g, "");
}

export function findMentionContext(text: string, cursor: number): MentionContext | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) {
    return null;
  }

  return {
    start: cursor - match[0].length,
    query: match[1],
  };
}

export function insertMention(text: string, start: number, cursor: number, handle: string) {
  const token = `@${handle} `;
  const next = `${text.slice(0, start)}${token}${text.slice(cursor)}`;
  return { text: next, cursor: start + token.length };
}

export function filterContactsForMention(contacts: ApiUser[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return contacts.slice(0, 8);
  }

  return contacts
    .filter((contact) => {
      const handle = getMentionHandle(contact).toLowerCase();
      const name = contact.name.toLowerCase();
      const username = (contact.username ?? "").toLowerCase();
      return handle.includes(q) || name.includes(q) || username.includes(q);
    })
    .slice(0, 8);
}

export function formatTaggedNames(users: ApiUser[], locale: "ar" | "en") {
  const names = users.map((user) => user.name.trim().split(/\s+/)[0] || user.username).filter(Boolean);
  if (!names.length) {
    return "";
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return locale === "ar" ? `${names[0]} و${names[1]}` : `${names[0]} and ${names[1]}`;
  }

  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(locale === "ar" ? " و" : ", ");
  return locale === "ar" ? `${rest} و${last}` : `${rest}, and ${last}`;
}
