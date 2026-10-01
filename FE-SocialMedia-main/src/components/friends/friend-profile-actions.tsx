"use client";

import { useEffect, useState } from "react";
import type { ApiUser, FriendMeta } from "@/types/social";
import { getFriendStatus } from "@/lib/api/friend";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { FriendActions } from "./friend-actions";

type FriendProfileActionsProps = {
  target: ApiUser;
  initialMeta?: FriendMeta;
  onMetaChange?: (meta: FriendMeta) => void;
};

export function FriendProfileActions({ target, initialMeta, onMetaChange }: FriendProfileActionsProps) {
  const { t } = useLocale();
  const [meta, setMeta] = useState<FriendMeta | undefined>(initialMeta);
  const [isLoading, setIsLoading] = useState(!initialMeta);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [previousInitialMeta, setPreviousInitialMeta] = useState(initialMeta);
  if (initialMeta !== previousInitialMeta) {
    setPreviousInitialMeta(initialMeta);
    setMeta(initialMeta);
    setIsLoading(!initialMeta);
    setLoadError("");
  }

  useEffect(() => {
    if (initialMeta && retryKey === 0) {
      return;
    }

    let ignore = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");

      try {
        const next = await getFriendStatus(target.id);

        if (!ignore) {
          setMeta(next);
        }
      } catch (caught) {
        if (!ignore) {
          setLoadError(caught instanceof Error ? caught.message : t("friends.actionError"));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    const timeout = window.setTimeout(() => void load(), 0);

    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [initialMeta, retryKey, target.id, t]);

  if (isLoading) {
    return (
      <div className={cn(ui.friendBtnPrimary, "pointer-events-none animate-pulse bg-surface-muted text-transparent shadow-none")} aria-hidden="true">
        <span className="opacity-0">{t("friends.addFriend")}</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto">
        <p className={ui.alertError}>{loadError}</p>
        <button className={ui.friendBtnSecondary} onClick={() => setRetryKey((k) => k + 1)} type="button">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!meta) {
    return null;
  }

  return (
    <FriendActions
      meta={meta}
      onMetaChange={(next) => {
        setMeta(next);
        onMetaChange?.(next);
      }}
      target={target}
    />
  );
}
