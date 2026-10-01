import { io, type Socket } from "socket.io-client";
import { API_URL } from "../api/client";

export const MESSAGING_SOCKET_EVENT = "messaging:socket-event";
export const NOTIFICATIONS_SOCKET_EVENT = "notifications:socket-event";
export const MESSAGING_UNREAD_REFRESH_EVENT = "messaging:unread-refresh";

export function dispatchMessagingUnreadRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MESSAGING_UNREAD_REFRESH_EVENT));
  }
}

export type NotificationSocketPayload = {
  type: "notification:new";
  notification: unknown;
};

export type MessagingSocketPayload =
  | { type: "message:new"; message: unknown }
  | { type: "message:updated"; message: unknown }
  | { type: "message:deleted"; payload: { conversationId: string; messageId: string } }
  | { type: "conversation:updated"; conversation: unknown }
  | { type: "conversation:deleted"; payload: { conversationId: string } }
  | { type: "conversation:read"; payload: { conversationId: string; readerId: string } }
  | { type: "typing"; payload: { conversationId: string; userId: string; isTyping: boolean } }
  | { type: "presence:update"; payload: { userId: string; online: boolean } }
  | NotificationSocketPayload;

let socket: Socket | null = null;
const conversationRooms = new Set<string>();
let presenceTimer: ReturnType<typeof setInterval> | undefined;

function emitSocketEvent(payload: MessagingSocketPayload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MESSAGING_SOCKET_EVENT, { detail: payload }));
  }
}

function emitNotificationSocketEvent(payload: NotificationSocketPayload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_SOCKET_EVENT, { detail: payload }));
  }
}

export function getMessagingSocket() {
  return socket;
}

export function connectMessagingSocket(token: string) {
  if (socket) {
    const previousToken = (socket.auth as { token?: string }).token;
    if (previousToken !== token) {
      socket.disconnect();
      socket.auth = { token };
    }
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(API_URL, {
    auth: { token },
    // Start with HTTP polling; upgrade when the backend supports WebSockets.
    transports: ["polling", "websocket"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    for (const conversationId of conversationRooms) {
      socket?.emit("join:conversation", conversationId);
    }
    socket?.emit("presence:ping");
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => {
      if (socket?.connected) socket.emit("presence:ping");
    }, 30000);
  });

  socket.on("disconnect", () => {
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = undefined;
  });

  socket.on("message:new", (message) => {
    emitSocketEvent({ type: "message:new", message });
  });

  socket.on("message:deleted", (payload) => {
    emitSocketEvent({ type: "message:deleted", payload });
  });

  socket.on("message:updated", (message) => {
    emitSocketEvent({ type: "message:updated", message });
  });

  socket.on("conversation:updated", (conversation) => {
    emitSocketEvent({ type: "conversation:updated", conversation });
  });

  socket.on("conversation:deleted", (payload) => {
    emitSocketEvent({ type: "conversation:deleted", payload });
  });

  socket.on("conversation:read", (payload) => {
    emitSocketEvent({ type: "conversation:read", payload });
  });

  socket.on("typing", (payload) => {
    emitSocketEvent({ type: "typing", payload });
  });

  socket.on("presence:update", (payload) => {
    emitSocketEvent({ type: "presence:update", payload });
  });

  socket.on("notification:new", (notification) => {
    emitNotificationSocketEvent({ type: "notification:new", notification });
    emitSocketEvent({ type: "notification:new", notification });
  });

  return socket;
}

export function disconnectMessagingSocket() {
  conversationRooms.clear();
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = undefined;
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function joinConversationRoom(conversationId: string) {
  conversationRooms.add(conversationId);
  socket?.emit("join:conversation", conversationId);
}

export function leaveConversationRoom(conversationId: string) {
  conversationRooms.delete(conversationId);
  socket?.emit("leave:conversation", conversationId);
}

export function emitTypingStart(conversationId: string) {
  socket?.emit("typing:start", { conversationId });
}

export function emitTypingStop(conversationId: string) {
  socket?.emit("typing:stop", { conversationId });
}
