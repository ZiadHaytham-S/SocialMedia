"use client";

import { useEffect, useState } from "react";
import type { ApiUser, FriendMeta } from "@/types/social";
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  unfriendUser,
  unblockUser,
} from "@/lib/api/friend";
import { CheckIcon, UserPlusIcon, XIcon } from "@/components/home/icons";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

type FriendActionsProps = {
  target: ApiUser;
  meta: FriendMeta;
  compact?: boolean;
  onMetaChange?: (meta: FriendMeta) => void;
};

export function FriendActions({ target, meta, compact = false, onMetaChange }: FriendActionsProps) {
  const { t } = useLocale();
  const [current, setCurrent] = useState(meta);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrent(meta);
  }, [meta]);

  async function run(action: () => Promise<FriendMeta>) {
    setBusy(true);
    setError("");

    try {
      const next = await action();
      setCurrent(next);
      onMetaChange?.(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("friends.actionError"));
    } finally {
      setBusy(false);
    }
  }

  if (current.relation === "self") {
    return null;
  }

  const btnPrimary = compact ? ui.friendBtnCompactPrimary : ui.friendBtnPrimary;
  const btnSecondary = compact ? ui.friendBtnCompactSecondary : ui.friendBtnSecondary;
  const btnDanger = compact ? cn(ui.friendBtnCompactSecondary, "text-red-600 dark:text-red-400") : ui.friendBtnDanger;
  const iconSm = compact ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        {current.canSendRequest ? (
          <button
            className={btnPrimary}
            disabled={busy}
            onClick={() => void run(() => sendFriendRequest(target.id))}
            type="button"
          >
            <UserPlusIcon className={iconSm} />
            <span>{t("friends.addFriend")}</span>
          </button>
        ) : null}

        {current.canCancel ? (
          <button
            className={btnSecondary}
            disabled={busy}
            onClick={() => void run(() => cancelFriendRequest(target.id))}
            type="button"
          >
            <span>{t("friends.cancelRequest")}</span>
          </button>
        ) : null}

        {current.canAccept ? (
          <>
            <button
              className={btnPrimary}
              disabled={busy}
              onClick={() => void run(() => acceptFriendRequest(target.id))}
              type="button"
            >
              <CheckIcon className={iconSm} />
              <span>{t("friends.confirm")}</span>
            </button>
            <button
              className={btnSecondary}
              disabled={busy}
              onClick={() => void run(() => declineFriendRequest(target.id))}
              type="button"
            >
              <XIcon className={iconSm} />
              <span>{t("friends.decline")}</span>
            </button>
          </>
        ) : null}

        {current.canUnfriend ? (
          <button className={btnDanger} disabled={busy} onClick={() => void run(() => unfriendUser(target.id))} type="button">
            <span>{t("friends.unfriend")}</span>
          </button>
        ) : null}

        {current.canUnblock ? (
          <button className={btnSecondary} disabled={busy} onClick={() => void run(() => unblockUser(target.id))} type="button">
            <span>{t("friends.unblock")}</span>
          </button>
        ) : null}

        {current.canBlock && current.relation !== "blocked_by_viewer" ? (
          <button className={btnDanger} disabled={busy} onClick={() => void run(() => blockUser(target.id))} type="button">
            <span>{t("friends.block")}</span>
          </button>
        ) : null}

        {current.relation === "friends" ? (
          <span className={ui.friendBadge}>{t("friends.friendsBadge")}</span>
        ) : null}

        {current.relation === "pending_outgoing" ? (
          <span className={ui.friendStatusPill}>{t("friends.requestSent")}</span>
        ) : null}

        {current.relation === "blocked_by_target" ? (
          <span className={ui.friendStatusPill}>{t("friends.blockedYou")}</span>
        ) : null}
      </div>

      {error ? <p className={cn(ui.alertError, "max-w-sm")}>{error}</p> : null}
    </div>
  );
}
