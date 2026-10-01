"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/home/icons";
import { NavIconButton } from "@/components/home/nav-icon-button";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notification";
import { NOTIFICATIONS_REFRESH_EVENT } from "@/components/notifications/fcm-provider";
import { useMessengerOptional } from "@/components/messaging/messenger-context";
import { NOTIFICATIONS_SOCKET_EVENT, type NotificationSocketPayload } from "@/lib/messaging/socket-client";
import type { AppNotification } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { notificationPath } from "@/lib/notifications/notification-path";

function formatRelativeTime(iso: string, locale: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return locale.startsWith("ar") ? "الآن" : "Just now";
  }

  if (minutes < 60) {
    return locale.startsWith("ar") ? `منذ ${minutes} د` : `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return locale.startsWith("ar") ? `منذ ${hours} س` : `${hours}h ago`;
  }

  return date.toLocaleDateString(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function notificationHref(item: AppNotification) {
  const path = notificationPath(item.data.url);
  if (path) return path;

  if (item.type === "friend_request") {
    return "/friends";
  }

  if (item.type === "message") {
    return item.data.fromUserId ? `/messages?with=${item.data.fromUserId}` : "/messages";
  }

  if (
    item.type === "comment" ||
    item.type === "comment_reply" ||
    item.type === "comment_mention" ||
    item.type === "post_mention" ||
    item.type === "post_share"
  ) {
    return item.data.postId ? `/post/${item.data.postId}` : "/";
  }

  if (item.type === "post_reaction" || item.type === "comment_reaction") {
    return item.data.postId ? `/post/${item.data.postId}` : "/";
  }

  if (item.data.fromUserId) {
    return `/profile/${item.data.fromUserId}`;
  }

  return "/";
}

function normalizeSocketNotification(value: unknown): AppNotification {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const data = typeof record.data === "object" && record.data !== null
    ? (record.data as Record<string, string>)
    : {};

  return {
    id: String(record.id ?? record._id ?? ""),
    type: String(record.type ?? "generic") as AppNotification["type"],
    title: String(record.title ?? ""),
    body: String(record.body ?? ""),
    data,
    fromUserId: record.fromUserId ? String(record.fromUserId) : undefined,
    read: Boolean(record.read),
    readAt: typeof record.readAt === "string" ? record.readAt : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

export function NotificationBell() {
  const { t, locale } = useLocale();
  const messenger = useMessengerOptional();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const [list, count] = await Promise.all([
        listNotifications({ limit: 20 }),
        getUnreadNotificationCount(),
      ]);

      setItems(list);
      setUnreadCount(count);
    } catch {
      /* ignore when API unavailable */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    function onRefresh() {
      void refresh();
    }

    function onNotificationSocket(event: Event) {
      const detail = (event as CustomEvent<NotificationSocketPayload>).detail;

      if (detail.type !== "notification:new") {
        return;
      }

      const notification = normalizeSocketNotification(detail.notification);

      setItems((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }

        return [notification, ...current].slice(0, 20);
      });

      if (!notification.read && notification.type !== "message") {
        setUnreadCount((count) => count + 1);
      }

      window.setTimeout(() => {
        void refresh();
      }, 250);
    }

    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener(NOTIFICATIONS_SOCKET_EVENT, onNotificationSocket);

    return () => {
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.removeEventListener(NOTIFICATIONS_SOCKET_EVENT, onNotificationSocket);
    };
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);

    if (next) {
      if (unreadCount > 0) {
        const readAt = new Date().toISOString();
        setUnreadCount(0);
        setItems((current) => current.map((item) => ({ ...item, read: true, readAt: item.readAt ?? readAt })));

        try {
          await markAllNotificationsRead();
        } catch {
          await refresh();
          return;
        }
      }

      await refresh();
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    await refresh();
  }

  async function handleItemClick(item: AppNotification, event?: React.MouseEvent) {
    if (item.type === "message" && item.data.fromUserId && messenger) {
      event?.preventDefault();
      await messenger.openChat(item.data.fromUserId);
    }

    if (!item.read) {
      await markNotificationRead(item.id);
      setUnreadCount((count) => Math.max(0, count - 1));
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
      );
    }

    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <NavIconButton label={t("nav.notifications")} onClick={() => void handleOpen()} title={t("nav.notifications")}>
        <span className="relative inline-flex">
          <BellIcon className="h-[22px] w-[22px]" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -end-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
      </NavIconButton>

      {open ? (
        <div
          className={cn(
            "absolute end-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-xl border border-border-light bg-surface shadow-[var(--shadow-card)]",
          )}
          role="dialog"
          aria-label={t("notifications.title")}
        >
          <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
            <h2 className="text-[17px] font-bold text-t-primary">{t("notifications.title")}</h2>
            {unreadCount > 0 ? (
              <button
                className="text-[13px] font-semibold text-fb hover:underline"
                onClick={() => void handleMarkAllRead()}
                type="button"
              >
                {t("notifications.markAllRead")}
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {isLoading && !items.length ? (
              <p className={cn("px-4 py-6 text-center text-[14px]", ui.textMuted)}>{t("common.loading")}</p>
            ) : null}

            {!isLoading && !items.length ? (
              <p className={cn("px-4 py-8 text-center text-[14px]", ui.textMuted)}>{t("notifications.empty")}</p>
            ) : null}

            {items.map((item) => {
              const href = notificationHref(item);

              return (
                <Link
                  key={item.id}
                  className={cn(
                    "block border-b border-border-light px-4 py-3 transition hover:bg-surface-hover",
                    !item.read && "bg-fb/5",
                  )}
                  href={href}
                  onClick={(event) => void handleItemClick(item, event)}
                >
                  <p className="text-[14px] font-bold text-t-primary">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-t-secondary">{item.body}</p>
                  <p className={cn("mt-1 text-[12px]", ui.textMuted)}>{formatRelativeTime(item.createdAt, locale)}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
