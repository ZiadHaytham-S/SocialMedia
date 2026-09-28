"use client";

import type { ApiUser } from "@/types/social";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

export function TaggedUsersRow({ users }: { users: ApiUser[] }) {
  const { t, locale } = useLocale();

  if (!users.length) {
    return null;
  }

  return (
    <p className={cn("flex flex-wrap items-center gap-1 text-[13px]", ui.meta)}>
      <span className="font-semibold text-t-secondary">{t("post.tags.with")}</span>
      {users.map((user, index) => (
        <span className="inline-flex items-center" key={user.id}>
          {index > 0 ? <span className="text-t-muted">{locale === "ar" ? "، " : ", "}</span> : null}
          <UserProfileLink layout="name" nameClassName="font-semibold text-t-primary" user={user} />
        </span>
      ))}
    </p>
  );
}
