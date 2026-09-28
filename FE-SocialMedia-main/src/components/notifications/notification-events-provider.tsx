"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { NOTIFICATIONS_REFRESH_EVENT } from "@/components/notifications/fcm-provider";
import {
  NOTIFICATIONS_SOCKET_EVENT,
  type NotificationSocketPayload,
} from "@/lib/messaging/socket-client";
import {
  playNotificationSoundForType,
  primeNotificationAudio,
  isMessengerConversationOpen,
} from "@/lib/notifications/notification-sound";
import type { AppNotification } from "@/types/social";

function emitNotificationsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
  }
}

function messageDedupeKey(notification: AppNotification) {
  const conversationId = notification.data.conversationId;
  const fromUserId = notification.data.fromUserId ?? notification.fromUserId;

  if (conversationId && fromUserId) {
    return `message:${conversationId}:${fromUserId}`;
  }

  return `notification:${notification.id}`;
}

export function NotificationEventsProvider() {
  const { status } = useSession();

  useEffect(() => {
    function primeOnInteraction() {
      primeNotificationAudio();
    }

    window.addEventListener("pointerdown", primeOnInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", primeOnInteraction);
    };
  }, []);

  useEffect(() => {
    function onServiceWorkerMessage(event: MessageEvent) {
      const payload = event.data as { type?: string; notificationType?: string; notificationId?: string } | null;

      if (payload?.type !== "notifications:refresh") {
        return;
      }

      emitNotificationsRefresh();

      if (payload.notificationType) {
        const dedupeKey = payload.notificationId
          ? `notification:${payload.notificationId}`
          : undefined;
        playNotificationSoundForType(payload.notificationType, dedupeKey);
      }
    }

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    function onNotificationSocket(event: Event) {
      const detail = (event as CustomEvent<NotificationSocketPayload>).detail;

      if (detail.type !== "notification:new") {
        return;
      }

      emitNotificationsRefresh();

      const notification = detail.notification as AppNotification;

      if (notification.type === "message" && isMessengerConversationOpen(notification.data.conversationId)) {
        return;
      }

      const dedupeKey =
        notification.type === "message" ? messageDedupeKey(notification) : `notification:${notification.id}`;

      playNotificationSoundForType(notification.type, dedupeKey);
    }

    window.addEventListener(NOTIFICATIONS_SOCKET_EVENT, onNotificationSocket);

    return () => {
      window.removeEventListener(NOTIFICATIONS_SOCKET_EVENT, onNotificationSocket);
    };
  }, [status]);

  return null;
}
