"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import type { ApiConversation, ApiMessageUser, ApiUser } from "@/types/social";
import { getViewer } from "@/lib/api/user";
import {
  CONVERSATIONS_QUERY,
  MARK_CONVERSATION_READ_MUTATION,
  MESSAGING_UNREAD_COUNT_QUERY,
  OPEN_CONVERSATION_MUTATION,
} from "@/lib/graphql/operations";
import type { ConversationsData, MessagingUnreadCountData, OpenConversationData } from "@/lib/graphql/types";
import {
  joinConversationRoom,
  MESSAGING_SOCKET_EVENT,
  MESSAGING_UNREAD_REFRESH_EVENT,
  type MessagingSocketPayload,
} from "@/lib/messaging/socket-client";
import { setMessengerOpenConversationIds } from "@/lib/notifications/notification-sound";

export type MessengerWindow = {
  id: string;
  conversationId: string;
  peer: ApiMessageUser;
  minimized: boolean;
};

type MessengerContextValue = {
  viewer: ApiUser | null;
  inboxOpen: boolean;
  windows: MessengerWindow[];
  conversations: ApiConversation[];
  messagingUnreadCount: number;
  focusedConversationId: string | null;
  toggleInbox: () => void;
  openInbox: () => void;
  closeInbox: () => void;
  openChat: (recipientId: string) => Promise<void>;
  openConversationWindow: (conversation: ApiConversation) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  refetchConversations: () => Promise<unknown>;
  refreshMessagingUnread: () => Promise<unknown>;
};

const MessengerContext = createContext<MessengerContextValue | null>(null);

function maxWindows() {
  // Reserve room for the inbox and minimized conversations on smaller screens.
  return window.innerWidth < 1280 ? 1 : 2;
}

function createWindowId() {
  return `win-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function MessengerProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [windows, setWindows] = useState<MessengerWindow[]>([]);

  const isAuthenticated = status === "authenticated";

  const { data: conversationsData, refetch: refetchConversationsQuery } = useQuery<ConversationsData>(
    CONVERSATIONS_QUERY,
    { variables: { limit: 40 }, skip: !isAuthenticated },
  );

  const { data: unreadData, refetch: refetchUnreadQuery } = useQuery<MessagingUnreadCountData>(
    MESSAGING_UNREAD_COUNT_QUERY,
    { skip: !isAuthenticated },
  );

  const [openConversationMutation] = useMutation<OpenConversationData>(OPEN_CONVERSATION_MUTATION);
  const [markReadMutation] = useMutation(MARK_CONVERSATION_READ_MUTATION);

  const conversations = useMemo(
    () => conversationsData?.conversations ?? [],
    [conversationsData?.conversations],
  );

  const conversationUnreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0),
    [conversations],
  );

  const messagingUnreadCount = Math.max(
    unreadData?.messagingUnreadCount ?? 0,
    conversationUnreadTotal,
  );

  const refetchConversations = useCallback(async () => {
    return refetchConversationsQuery();
  }, [refetchConversationsQuery]);

  const refreshMessagingUnread = useCallback(async () => {
    await Promise.all([refetchUnreadQuery(), refetchConversationsQuery()]);
  }, [refetchConversationsQuery, refetchUnreadQuery]);

  useEffect(() => {
    if (!isAuthenticated) {
      const timeout = window.setTimeout(() => {
        setViewer(null);
        setWindows([]);
        setInboxOpen(false);
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    void getViewer().then(setViewer).catch(() => setViewer(null));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    function onSocketEvent(event: Event) {
      const detail = (event as CustomEvent<MessagingSocketPayload>).detail;

      if (
        detail.type === "message:new" ||
        detail.type === "message:updated" ||
        detail.type === "message:deleted" ||
        detail.type === "conversation:updated" ||
        detail.type === "conversation:deleted"
      ) {
        void refetchConversations();
        void refreshMessagingUnread();
      }

      if (detail.type === "conversation:read") {
        void refreshMessagingUnread();
      }

      if (detail.type === "notification:new") {
        const notification = detail.notification as { type?: string } | undefined;

        if (notification?.type === "message") {
          void refreshMessagingUnread();
        }
      }
    }

    function onUnreadRefresh() {
      void refreshMessagingUnread();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshMessagingUnread();
      }
    }

    window.addEventListener(MESSAGING_SOCKET_EVENT, onSocketEvent);
    window.addEventListener(MESSAGING_UNREAD_REFRESH_EVENT, onUnreadRefresh);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener(MESSAGING_SOCKET_EVENT, onSocketEvent);
      window.removeEventListener(MESSAGING_UNREAD_REFRESH_EVENT, onUnreadRefresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, refetchConversations, refreshMessagingUnread]);

  const openConversationWindow = useCallback(
    (conversation: ApiConversation) => {
      setWindows((current) => {
        const existing = current.find((row) => row.conversationId === conversation.id);

        if (existing) {
          const singleWindow = maxWindows() === 1;
          return current.map((row) =>
            row.id === existing.id ? { ...row, minimized: false } : singleWindow ? { ...row, minimized: true } : row,
          );
        }

        const next: MessengerWindow = {
          id: createWindowId(),
          conversationId: conversation.id,
          peer: conversation.peer,
          minimized: false,
        };

        const open = current.filter((row) => !row.minimized);
        const minimized = current.filter((row) => row.minimized);

        if (maxWindows() === 1) {
          return [...current.map((row) => ({ ...row, minimized: true })), next];
        }

        if (open.length >= maxWindows()) {
          const [dropped, ...rest] = open;
          return [...rest, next, ...minimized, { ...dropped, minimized: true }];
        }

        return [...open, next, ...minimized];
      });

      joinConversationRoom(conversation.id);
      void markReadMutation({ variables: { conversationId: conversation.id } }).then(() => {
        void refreshMessagingUnread();
      });
      void refetchConversations();
    },
    [markReadMutation, refetchConversations, refreshMessagingUnread],
  );

  const openChat = useCallback(
    async (recipientId: string) => {
      const result = await openConversationMutation({ variables: { recipientId } });
      const conversation = result.data?.openConversation;

      if (!conversation) {
        return;
      }

      openConversationWindow(conversation);
      setInboxOpen(false);
    },
    [openConversationMutation, openConversationWindow],
  );

  const toggleInbox = useCallback(() => {
    if (maxWindows() === 1) setWindows((current) => current.map((row) => ({ ...row, minimized: true })));
    setInboxOpen((open) => !open);
  }, []);

  const openInbox = useCallback(() => {
    if (maxWindows() === 1) setWindows((current) => current.map((row) => ({ ...row, minimized: true })));
    setInboxOpen(true);
  }, []);

  const closeInbox = useCallback(() => {
    setInboxOpen(false);
  }, []);

  const closeWindow = useCallback((windowId: string) => {
    setWindows((current) => current.filter((row) => row.id !== windowId));
  }, []);

  const minimizeWindow = useCallback((windowId: string) => {
    setWindows((current) =>
      current.map((row) => (row.id === windowId ? { ...row, minimized: true } : row)),
    );
  }, []);

  const restoreWindow = useCallback((windowId: string) => {
    setWindows((current) => {
      const target = current.find((row) => row.id === windowId);

      if (!target) {
        return current;
      }

      const others = current.filter((row) => row.id !== windowId);
      if (maxWindows() === 1) {
        return [...others.map((row) => ({ ...row, minimized: true })), { ...target, minimized: false }];
      }
      const open = others.filter((row) => !row.minimized);
      const minimized = others.filter((row) => row.minimized);

      if (open.length >= maxWindows()) {
        const [dropped, ...restOpen] = open;
        return [...restOpen, { ...target, minimized: false }, ...minimized, { ...dropped, minimized: true }];
      }

      return [...open, { ...target, minimized: false }, ...minimized];
    });

    setInboxOpen(false);
  }, []);

  useEffect(() => {
    const fitWindows = () => {
      if (maxWindows() !== 1) return;
      setWindows((current) => {
        const active = inboxOpen ? undefined : current.findLast((row) => !row.minimized)?.id;
        return current.map((row) => row.id === active ? row : { ...row, minimized: true });
      });
    };
    window.addEventListener("resize", fitWindows);
    return () => window.removeEventListener("resize", fitWindows);
  }, [inboxOpen]);

  const focusedConversationId = useMemo(() => {
    const open = windows.find((row) => !row.minimized);
    return open?.conversationId ?? null;
  }, [windows]);

  useEffect(() => {
    const openIds = windows.filter((row) => !row.minimized).map((row) => row.conversationId);
    setMessengerOpenConversationIds(openIds);
  }, [windows]);

  const value = useMemo<MessengerContextValue>(
    () => ({
      viewer,
      inboxOpen,
      windows,
      conversations,
      messagingUnreadCount,
      focusedConversationId,
      toggleInbox,
      openInbox,
      closeInbox,
      openChat,
      openConversationWindow,
      closeWindow,
      minimizeWindow,
      restoreWindow,
      refetchConversations,
      refreshMessagingUnread,
    }),
    [
      viewer,
      inboxOpen,
      windows,
      conversations,
      messagingUnreadCount,
      focusedConversationId,
      toggleInbox,
      openInbox,
      closeInbox,
      openChat,
      openConversationWindow,
      closeWindow,
      minimizeWindow,
      restoreWindow,
      refetchConversations,
      refreshMessagingUnread,
    ],
  );

  return <MessengerContext.Provider value={value}>{children}</MessengerContext.Provider>;
}

export function useMessenger() {
  const context = useContext(MessengerContext);

  if (!context) {
    throw new Error("useMessenger must be used within MessengerProvider");
  }

  return context;
}

export function useMessengerOptional() {
  return useContext(MessengerContext);
}
