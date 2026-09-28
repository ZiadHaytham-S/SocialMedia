"use client";

import { MessageIcon } from "@/components/home/icons";
import { NavIconButton } from "@/components/home/nav-icon-button";
import { useMessenger } from "@/components/messaging/messenger-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/theme/ui";

export function MessagesNavLink() {
  const { t } = useLocale();
  const { toggleInbox, messagingUnreadCount } = useMessenger();

  return (
    <NavIconButton label={t("nav.messages")} onClick={toggleInbox} title={t("nav.messages")}>
      <span className="relative inline-flex">
        <MessageIcon
          className={cn(
            "h-[22px] w-[22px] transition",
            messagingUnreadCount > 0 && "text-fb",
          )}
        />
        {messagingUnreadCount > 0 ? (
          <span className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {messagingUnreadCount > 9 ? "9+" : messagingUnreadCount}
          </span>
        ) : null}
      </span>
    </NavIconButton>
  );
}
