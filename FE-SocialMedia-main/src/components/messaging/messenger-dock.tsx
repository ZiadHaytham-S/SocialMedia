"use client";

import { defaultAvatar } from "@/lib/api/fallbacks";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/theme/ui";
import { MessageThread } from "./message-thread";
import { MessengerInbox } from "./messenger-inbox";
import { useMessenger } from "./messenger-context";

const PANEL_CLASS =
  "pointer-events-auto flex shrink-0 h-[min(620px,calc(100dvh-1rem))] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-border-light bg-surface shadow-[var(--shadow-elevated)] sm:h-[min(520px,calc(100dvh-7.5rem))] sm:w-[min(380px,calc(100vw-1.5rem))] sm:rounded-t-2xl";

export function MessengerDock() {
  const { t } = useLocale();
  const {
    viewer,
    inboxOpen,
    windows,
    conversations,
    focusedConversationId,
    closeInbox,
    openChat,
    openConversationWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    refetchConversations,
    refreshMessagingUnread,
  } = useMessenger();

  if (!viewer) {
    return null;
  }

  const openWindows = windows.filter((row) => !row.minimized);
  const minimizedWindows = windows.filter((row) => row.minimized);
  const dockVisible = inboxOpen || openWindows.length > 0 || minimizedWindows.length > 0;

  if (!dockVisible) {
    return null;
  }

  return (
    <div
      aria-label={t("messages.title")}
      className="pointer-events-none fixed bottom-0 end-0 z-[90] flex max-w-full items-end gap-2 p-2 sm:p-3"
      role="region"
    >
      {openWindows.map((window) => (
        <div className={PANEL_CLASS} key={window.id}>
          <MessageThread
            className="h-full"
            compact
            conversationId={window.conversationId}
            onClose={() => closeWindow(window.id)}
            onConversationDeleted={() => {
              closeWindow(window.id);
              void refetchConversations();
              void refreshMessagingUnread();
            }}
            onMinimize={() => minimizeWindow(window.id)}
            peer={window.peer}
            viewer={viewer}
          />
        </div>
      ))}

      {inboxOpen ? (
        <div className={PANEL_CLASS}>
          <MessengerInbox
            className="h-full"
            activeConversationId={focusedConversationId}
            conversations={conversations}
            onDeleteConversation={() => {
              void refetchConversations();
              void refreshMessagingUnread();
            }}
            onClose={closeInbox}
            onSelectConversation={(conversation) => {
              openConversationWindow(conversation);
              closeInbox();
            }}
            onStartChat={(userId) => void openChat(userId)}
            viewer={viewer}
          />
        </div>
      ) : null}

      {minimizedWindows.length > 0 ? (
        <div className={cn("pointer-events-auto max-h-[50dvh] overflow-y-auto flex flex-col gap-2 pb-1", (inboxOpen || openWindows.length > 0) && "hidden sm:flex")}>
          {minimizedWindows.map((window) => (
            <button
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-elevated)] ring-2 ring-fb transition hover:scale-105"
              key={window.id}
              onClick={() => restoreWindow(window.id)}
              title={window.peer.name}
              type="button"
            >
              <img
                alt=""
                className="h-11 w-11 rounded-full object-cover"
                src={window.peer.avatarUrl || defaultAvatar}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MessengerToggleButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { toggleInbox } = useMessenger();

  return (
    <button className={cn(className)} onClick={toggleInbox} type="button">
      {children}
    </button>
  );
}
