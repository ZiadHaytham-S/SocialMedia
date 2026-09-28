"use client";

import { useState } from "react";
import type { ApiConversation, ApiUser } from "@/types/social";
import { defaultAvatar } from "@/lib/api/fallbacks";
import { deleteConversation } from "@/lib/api/message";
import { useUserSearch } from "@/hooks/use-user-search";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(
    locale.startsWith("ar") ? "ar-EG" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

type MessengerInboxProps = {
  conversations: ApiConversation[];
  activeConversationId?: string | null;
  viewer: ApiUser;
  onSelectConversation: (conversation: ApiConversation) => void;
  onStartChat: (userId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onClose?: () => void;
  className?: string;
};

export function MessengerInbox({
  conversations,
  activeConversationId,
  viewer,
  onSelectConversation,
  onStartChat,
  onDeleteConversation,
  onClose,
  className,
}: MessengerInboxProps) {
  const { t, locale } = useLocale();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [deletingConversationId, setDeletingConversationId] =
    useState<string>();
  const {
    hits: searchHits,
    isSearching,
    isReady: isSearchReady,
  } = useUserSearch(search);

  const searchResults = searchHits
    .map((hit) => hit.user)
    .filter((user) => user.id !== viewer.id);

  return (
    <div className={cn("flex min-h-0 flex-col bg-surface", className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-border-light px-4 py-3">
        <h2 className="text-[17px] font-bold text-t-primary">
          {t("messages.title")}
        </h2>
        {onClose ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-t-muted transition hover:bg-surface-hover"
            onClick={onClose}
            title={t("messages.close")}
            type="button"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        ) : null}
      </div>

      <div className="shrink-0 px-3 py-2">
        <input
          className="h-9 w-full rounded-full bg-surface-input px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search.placeholder")}
          type="search"
          value={search}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isSearchReady ? (
          <>
            {isSearching ? (
              <p className={cn("px-4 py-6 text-center text-sm", ui.textMuted)}>
                {t("search.searching")}
              </p>
            ) : searchResults.length === 0 ? (
              <p className={cn("px-4 py-6 text-center text-sm", ui.textMuted)}>
                {t("search.noResults")}
              </p>
            ) : (
              <div className="p-2">
                <p
                  className={cn(
                    "px-2 pb-2 text-[13px] font-semibold",
                    ui.textMuted,
                  )}
                >
                  {t("messages.startChat")}
                </p>
                {searchResults.map((contact) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-start transition hover:bg-surface-hover"
                    key={contact.id}
                    onClick={() => {
                      onStartChat(contact.id);
                      setSearch("");
                    }}
                    type="button"
                  >
                    <img
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                      src={contact.avatarUrl || defaultAvatar}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-t-primary">
                        {contact.name}
                      </span>
                      {contact.email ? (
                        <span className="block truncate text-[12px] text-t-muted">
                          {contact.email}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : conversations.length === 0 ? (
          <p className={cn("px-4 py-8 text-center text-sm", ui.textMuted)}>
            {t("messages.empty")}
          </p>
        ) : (
          conversations.map((conversation) => (
            <div
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-start transition hover:bg-surface-hover",
                activeConversationId === conversation.id && "bg-fb/5",
              )}
              key={conversation.id}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
                onClick={() => onSelectConversation(conversation)}
                type="button"
              >
                <img
                  alt=""
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-surface"
                  src={conversation.peer.avatarUrl || defaultAvatar}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-bold text-t-primary">
                      {conversation.peer.name}
                    </p>
                    {conversation.lastMessage ? (
                      <span
                        className={cn("shrink-0 text-[11px]", ui.textMuted)}
                      >
                        {formatTime(conversation.lastMessage.createdAt, locale)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className={cn("truncate text-[13px]", ui.textMuted)}>
                      {conversation.lastMessage?.content ??
                        t("messages.startChat")}
                    </p>
                    {conversation.unreadCount > 0 ? (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-fb px-1.5 text-[11px] font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
              <button
                aria-label={
                  locale.startsWith("ar")
                    ? "حذف الشات من عندي"
                    : "Delete chat for me"
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-t-muted transition hover:bg-red-500/10 hover:text-danger disabled:opacity-50"
                disabled={deletingConversationId === conversation.id}
                onClick={async () => {
                  const message = locale.startsWith("ar")
                    ? "تمسح الشات ده من عندك؟ الطرف التاني هيفضل شايفه."
                    : "Delete this chat for you only? The other person will still see it.";

                  const ok = await confirm({
                    title: message,
                    confirmLabel: locale.startsWith("ar") ? "حذف" : "Delete",
                    cancelLabel: locale.startsWith("ar") ? "إلغاء" : "Cancel",
                    destructive: true,
                  });

                  if (!ok) {
                    return;
                  }

                  setDeletingConversationId(conversation.id);

                  try {
                    await deleteConversation(conversation.id);
                    onDeleteConversation?.(conversation.id);
                  } finally {
                    setDeletingConversationId(undefined);
                  }
                }}
                title={
                  locale.startsWith("ar")
                    ? "حذف الشات من عندي"
                    : "Delete chat for me"
                }
                type="button"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
