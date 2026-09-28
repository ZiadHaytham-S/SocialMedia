import type { ApiConversation, ApiMessage } from "@/types/social";

export type OpenConversationData = {
  openConversation: ApiConversation;
};

export type SendMessageData = {
  sendMessage: ApiMessage;
};

export type ConversationsData = {
  conversations: ApiConversation[];
};

export type MessagesData = {
  messages: ApiMessage[];
};

export type MessagingUnreadCountData = {
  messagingUnreadCount: number;
};
