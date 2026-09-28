export const typeDefs = `#graphql
  type UserSummary {
    id: ID!
    name: String!
    username: String!
    avatarUrl: String
  }

  type MessagePreview {
    content: String!
    senderId: ID!
    createdAt: String!
  }

  type Message {
    id: ID!
    conversationId: ID!
    content: String!
    attachmentUrl: String
    attachmentType: String
    attachmentName: String
    attachmentSize: Float
    sender: UserSummary!
    createdAt: String!
    readAt: String
    editedAt: String
    isPinned: Boolean
    viewerReaction: String
    reactions: [MessageReactionSummary!]!
    forwardedFrom: ForwardedMessage
  }

  type MessageReactionSummary {
    type: String!
    count: Int!
  }

  type ForwardedMessage {
    messageId: ID!
    senderName: String!
    content: String!
  }

  type Conversation {
    id: ID!
    peer: UserSummary!
    lastMessage: MessagePreview
    unreadCount: Int!
    updatedAt: String!
  }

  type Query {
    conversations(limit: Int = 30): [Conversation!]!
    messages(conversationId: ID!, limit: Int = 50, before: ID): [Message!]!
    messagingUnreadCount: Int!
  }

  type Mutation {
    sendMessage(recipientId: ID!, content: String!): Message!
    markConversationRead(conversationId: ID!): Boolean!
    openConversation(recipientId: ID!): Conversation!
  }
`;
