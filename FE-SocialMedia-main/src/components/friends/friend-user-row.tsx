"use client";

import Link from "next/link";
import type { FriendListItem, FriendMeta, FriendRelation } from "@/types/social";
import { FriendActions } from "./friend-actions";
import { getFriendStatus } from "@/lib/api/friend";
import { useLocale } from "@/lib/i18n/locale-context";
import { getProfileHref } from "@/lib/utils/profile-path";
import { cn, ui } from "@/lib/theme/ui";
import { defaultAvatar } from "@/lib/api/fallbacks";
import { useState } from "react";

type FriendUserRowProps = {
  item: FriendListItem;
  showMutual?: boolean;
  presetRelation?: FriendRelation;
  onChanged?: () => void;
};

export function FriendUserRow({ item, showMutual, presetRelation, onChanged }: FriendUserRowProps) {
  const { t } = useLocale();
  const [meta, setMeta] = useState<FriendMeta | null>(
    item.user.friendMeta ??
      (presetRelation
        ? {
            relation: presetRelation,
            friendCount: 0,
            mutualCount: item.mutualCount ?? 0,
            canSendRequest: presetRelation === "none",
            canAccept: presetRelation === "pending_incoming",
            canCancel: presetRelation === "pending_outgoing",
            canUnfriend: presetRelation === "friends",
            canBlock: presetRelation !== "self" && presetRelation !== "blocked_by_viewer",
            canUnblock: presetRelation === "blocked_by_viewer",
          }
        : null),
  );

  const profileHref = getProfileHref(item.user.id);

  async function ensureMeta() {
    if (meta) {
      return meta;
    }

    const loaded = await getFriendStatus(item.user.id);
    setMeta(loaded);
    return loaded;
  }

  return (
    <article className={cn(ui.cardPaddedSm, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {profileHref ? (
          <Link href={profileHref}>
            <img alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-surface" src={item.user.avatarUrl || defaultAvatar} />
          </Link>
        ) : (
          <img alt="" className="h-12 w-12 rounded-full object-cover" src={item.user.avatarUrl || defaultAvatar} />
        )}
        <div className="min-w-0">
          {profileHref ? (
            <Link className={cn("block truncate text-[17px] font-bold hover:underline", ui.textPrimary)} href={profileHref}>
              {item.user.name}
            </Link>
          ) : (
            <p className={cn("truncate text-[17px] font-bold", ui.textPrimary)}>{item.user.name}</p>
          )}
          {showMutual && (item.mutualCount ?? 0) > 0 ? (
            <p className={cn("text-[13px] font-medium", ui.textMuted)}>{t("friends.mutualCount", { count: item.mutualCount ?? 0 })}</p>
          ) : null}
        </div>
      </div>

      {presetRelation === "pending_incoming" || presetRelation === "pending_outgoing" ? (
        <FriendActions
          compact
          meta={{
            relation: presetRelation,
            friendCount: 0,
            mutualCount: item.mutualCount ?? 0,
            canSendRequest: false,
            canAccept: presetRelation === "pending_incoming",
            canCancel: presetRelation === "pending_outgoing",
            canUnfriend: false,
            canBlock: true,
            canUnblock: false,
          }}
          onMetaChange={() => onChanged?.()}
          target={item.user}
        />
      ) : meta ? (
        <FriendActions compact meta={meta} onMetaChange={() => onChanged?.()} target={item.user} />
      ) : (
        <button
          className={cn(ui.profileEditBtn, "shrink-0")}
          onClick={() => void ensureMeta()}
          type="button"
        >
          {t("friends.manage")}
        </button>
      )}
    </article>
  );
}
