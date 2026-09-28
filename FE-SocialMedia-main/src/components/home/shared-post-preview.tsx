"use client";

import type { ApiPost } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { formatRelativeTime } from "@/lib/utils/format-time";
import { cn, ui } from "@/lib/theme/ui";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { MentionBody } from "./mention-body";

type SharedPostPreviewProps = {
  post: ApiPost;
  unavailable?: boolean;
  className?: string;
};

export function SharedPostPreview({ post, unavailable, className }: SharedPostPreviewProps) {
  const { t, locale } = useLocale();

  if (unavailable) {
    return (
      <div className={cn("rounded-lg border border-border-light bg-surface-muted px-4 py-6 text-center", className)}>
        <p className={cn("text-[15px] font-semibold", ui.textMuted)}>{t("share.unavailable")}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border-light bg-surface-muted", className)}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <UserProfileLink layout="avatar" stopPropagation user={post.author} />
        <div className="min-w-0">
          <UserProfileLink
            layout="name"
            nameClassName="truncate text-[15px] font-semibold"
            stopPropagation
            user={post.author}
          />
          <p className={ui.meta}>{formatRelativeTime(post.createdAt, locale)}</p>
        </div>
      </div>
      {post.body ? (
        <div className="px-3 pb-2">
          <MentionBody className="text-[15px] leading-snug" text={post.body} />
        </div>
      ) : null}
      {post.imageUrl ? (
        <div className="max-h-72 overflow-hidden bg-black/5 dark:bg-black/20">
          <img className="h-full max-h-72 w-full object-cover" src={post.imageUrl} alt="" />
        </div>
      ) : null}
    </div>
  );
}
