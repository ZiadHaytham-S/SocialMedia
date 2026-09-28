import type { AppNotification } from "@/types/social";
import { apiRequest } from "../client";
import { asRecord, unwrapList, unwrapResult } from "../normalizers";

function normalizeNotification(value: unknown): AppNotification {
  const record = asRecord(value);

  return {
    id: String(record.id ?? record._id ?? ""),
    type: String(record.type ?? "generic") as AppNotification["type"],
    title: String(record.title ?? ""),
    body: String(record.body ?? ""),
    data: asRecord(record.data) as Record<string, string>,
    fromUserId: record.fromUserId ? String(record.fromUserId) : undefined,
    read: Boolean(record.read),
    readAt: typeof record.readAt === "string" ? record.readAt : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

export async function registerDeviceToken(token: string, deviceId?: string) {
  const data = await apiRequest<unknown>("/notification/device-token", {
    method: "POST",
    body: JSON.stringify({ token, platform: "web", deviceId }),
  });

  return unwrapResult(data);
}

export async function unregisterDeviceToken(token: string) {
  const data = await apiRequest<unknown>("/notification/device-token", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });

  return unwrapResult(data);
}

export async function listNotifications(options?: { limit?: number; unreadOnly?: boolean }) {
  const params = new URLSearchParams();

  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  if (options?.unreadOnly) {
    params.set("unreadOnly", "true");
  }

  const query = params.toString();
  const data = await apiRequest<unknown>(`/notification${query ? `?${query}` : ""}`);
  return unwrapList(data).map((item) => normalizeNotification(item));
}

export async function getUnreadNotificationCount() {
  const data = await apiRequest<unknown>("/notification/unread-count");
  const result = asRecord(unwrapResult(data));

  return typeof result.count === "number" ? result.count : 0;
}

export async function markNotificationRead(notificationId: string) {
  const data = await apiRequest<unknown>(`/notification/${notificationId}/read`, {
    method: "PATCH",
  });

  return normalizeNotification(unwrapResult(data));
}

export async function markAllNotificationsRead() {
  const data = await apiRequest<unknown>("/notification/read-all", {
    method: "PATCH",
  });

  return unwrapResult(data);
}
