"use client";

import Link from "next/link";
import type { ApiUser } from "@/types/social";
import { cn, ui } from "@/lib/theme/ui";
import { getMentionHandle } from "@/lib/utils/mentions";
import { getProfileHref } from "@/lib/utils/profile-path";

type MentionBodyProps = {
  text: string;
  contacts?: ApiUser[];
  className?: string;
};

export function MentionBody({ text, contacts = [], className }: MentionBodyProps) {
  const handles = new Set(contacts.map((user) => getMentionHandle(user).toLowerCase()));

  const parts = text.split(/(@[^\s@]+)/g);

  return (
    <p className={cn("whitespace-pre-wrap", ui.body, className)}>
      {parts.map((part, index) => {
        if (part.startsWith("@")) {
          const handle = part.slice(1).toLowerCase();
          const taggedUser = contacts.find((user) => getMentionHandle(user).toLowerCase() === handle);
          const profileHref = taggedUser ? getProfileHref(taggedUser.id) : undefined;

          if (profileHref) {
            return (
              <Link
                className="font-semibold text-fb hover:underline"
                href={profileHref}
                key={`${part}-${index}`}
              >
                {part}
              </Link>
            );
          }

          return (
            <span className={cn("font-semibold", handles.has(handle) ? "text-fb" : "text-fb/80")} key={`${part}-${index}`}>
              {part}
            </span>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </p>
  );
}
