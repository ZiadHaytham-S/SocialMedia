"use client";
import { notificationPath } from "@/lib/notifications/notification-path";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import {
  clearFcmTokenLocally,
  getStoredFcmToken,
  requestFcmToken,
  subscribeForegroundMessages,
} from "@/lib/notifications/fcm-client";
import { isFirebaseConfigured } from "@/lib/notifications/firebase-config";
import { registerDeviceToken, unregisterDeviceToken } from "@/lib/api/notification";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  playNotificationSoundForType,
  primeNotificationAudio,
} from "@/lib/notifications/notification-sound";

export const NOTIFICATIONS_REFRESH_EVENT = "notifications:refresh";

function emitNotificationsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
  }
}

export function FcmProvider() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const registeredTokenRef = useRef<string | null>(null);

  const syncToken = useCallback(async () => {
    if (status !== "authenticated" || !session?.accessToken || !isFirebaseConfigured()) {
      return;
    }

    const token = await requestFcmToken();

    if (!token || registeredTokenRef.current === token) {
      return;
    }

    await registerDeviceToken(token);
    registeredTokenRef.current = token;
  }, [session?.accessToken, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) {
      return;
    }

    void syncToken();
  }, [session?.accessToken, status, syncToken]);

  useEffect(() => {
    if (status !== "authenticated") {
      registeredTokenRef.current = null;
    }
  }, [status]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    return subscribeForegroundMessages((payload) => {
      emitNotificationsRefresh();

      const notificationType = payload.data?.type;
      const notificationId = payload.data?.notificationId;
      const conversationId = payload.data?.conversationId;
      const fromUserId = payload.data?.fromUserId;

      const dedupeKey =
        notificationType === "message" && conversationId && fromUserId
          ? `message:${conversationId}:${fromUserId}`
          : notificationId
            ? `notification:${notificationId}`
            : undefined;

      playNotificationSoundForType(notificationType, dedupeKey);

      if (typeof window !== "undefined" && Notification.permission === "granted") {
        const title = payload.title ?? t("notifications.newFallback");
        const body = payload.body ?? "";

        try {
          const notification = new Notification(title, {
            body,
            icon: "/default-avatar.svg",
            data: payload.data,
          });
          notification.onclick = () => {
            notification.close();
            window.focus();
            window.location.assign(notificationPath(payload.data?.url) || "/");
          };
        } catch {
          /* ignore if Notification constructor fails */
        }
      }
    });
  }, [t]);

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
    async function unregisterOnLogout() {
      if (status === "unauthenticated") {
        const token = getStoredFcmToken();

        if (token) {
          try {
            await unregisterDeviceToken(token);
          } catch {
            /* session may already be cleared */
          }
        }

        await clearFcmTokenLocally();
        registeredTokenRef.current = null;
      }
    }

    void unregisterOnLogout();
  }, [status]);

  return null;
}
