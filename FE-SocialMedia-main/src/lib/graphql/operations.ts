import { gql } from "@apollo/client";

export const CONVERSATIONS_QUERY = gql`
  query Conversations($limit: Int) {
    conversations(limit: $limit) {
      id
      unreadCount
      updatedAt
      peer {
        id
        name
        username
        avatarUrl
      }
      lastMessage {
        content
        senderId
        createdAt
      }
    }
  }
`;

export const MESSAGES_QUERY = gql`
  query Messages($conversationId: ID!, $limit: Int, $before: ID) {
    messages(conversationId: $conversationId, limit: $limit, before: $before) {
      id
      conversationId
      content
      attachmentUrl
      attachmentType
      attachmentName
      attachmentSize
      createdAt
      readAt
      editedAt
      isPinned
      viewerReaction
      reactions {
        type
        count
      }
      forwardedFrom {
        messageId
        senderName
        content
      }
      sender {
        id
        name
        username
        avatarUrl
      }
    }
  }
`;

export const MESSAGING_UNREAD_COUNT_QUERY = gql`
  query MessagingUnreadCount {
    messagingUnreadCount
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($recipientId: ID!, $content: String!) {
    sendMessage(recipientId: $recipientId, content: $content) {
      id
      conversationId
      content
      attachmentUrl
      attachmentType
      attachmentName
      attachmentSize
      createdAt
      readAt
      editedAt
      isPinned
      viewerReaction
      reactions {
        type
        count
      }
      forwardedFrom {
        messageId
        senderName
        content
      }
      sender {
        id
        name
        username
        avatarUrl
      }
    }
  }
`;

export const MARK_CONVERSATION_READ_MUTATION = gql`
  mutation MarkConversationRead($conversationId: ID!) {
    markConversationRead(conversationId: $conversationId)
  }
`;

export const OPEN_CONVERSATION_MUTATION = gql`
  mutation OpenConversation($recipientId: ID!) {
    openConversation(recipientId: $recipientId) {
      id
      unreadCount
      updatedAt
      peer {
        id
        name
        username
        avatarUrl
      }
      lastMessage {
        content
        senderId
        createdAt
      }
    }
  }
`;
