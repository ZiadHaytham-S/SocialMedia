"use client";

import Link from "next/link";
import type { ApiUser } from "@/types/social";
import { defaultAvatar } from "@/lib/api/fallbacks";
import { useLocale } from "@/lib/i18n/locale-context";
import { getProfileHref } from "@/lib/utils/profile-path";
import { cn, ui } from "@/lib/theme/ui";

export type UserProfileLinkUser = Pick<ApiUser, "id" | "name" | "username" | "avatarUrl">;

type UserProfileLinkProps = {
  user: UserProfileLinkUser;
  /** Avatar + name in a row (post/comment header). */
  layout?: "row" | "avatar" | "name";
  avatarClassName?: string;
  nameClassName?: string;
  className?: string;
  /** Prevent parent click handlers (e.g. story tile, post card). */
  stopPropagation?: boolean;
};

const avatarSizes = {
  sm: ui.avatarSm,
  md: ui.avatarMd,
  lg: ui.avatarLg,
} as const;

export function getUserDisplayName(user: UserProfileLinkUser, fallback: string) {
  return user.name?.trim() || user.username?.trim() || fallback;
}

export function UserProfileLink({
  user,
  layout = "row",
  avatarClassName,
  nameClassName,
  className,
  stopPropagation = false,
}: UserProfileLinkProps) {
  const { t } = useLocale();
  const href = getProfileHref(user.id);
  const displayName = getUserDisplayName(user, t("user.unknown"));

  function handleClick(event: React.MouseEvent) {
    if (stopPropagation) {
      event.stopPropagation();
    }
  }

  const avatar =
    layout === "name" ? null : (
      <img
        alt=""
        className={cn(avatarSizes.md, avatarClassName)}
        src={user.avatarUrl || defaultAvatar}
      />
    );

  const name =
    layout === "avatar" ? null : (
      <span className={cn(layout === "row" ? cn("truncate", ui.textLink) : ui.textLink, nameClassName)}>
        {displayName}
      </span>
    );

  const content = (
    <>
      {avatar}
      {name}
    </>
  );

  const layoutClass =
    layout === "row"
      ? "flex min-w-0 items-center gap-2"
      : layout === "avatar"
        ? "inline-flex shrink-0"
        : "inline min-w-0";

  if (!href) {
    return <span className={cn(layoutClass, className)}>{content}</span>;
  }

  return (
    <Link
      className={cn(layoutClass, "transition hover:opacity-90", className)}
      href={href}
      onClick={handleClick}
      title={t("profile.viewProfile", { name: displayName })}
    >
      {layout === "avatar" ? <span className="sr-only">{t("profile.viewProfile", { name: displayName })}</span> : null}
      {content}
    </Link>
  );
}
