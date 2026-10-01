import { Types } from "mongoose";

export interface IConversationLastMessage {
  content: string;
  senderId: Types.ObjectId;
  createdAt: Date;
}

export interface IConversation {
  participantKey?: string;
  participants: [Types.ObjectId, Types.ObjectId];
  lastMessage?: IConversationLastMessage;
  lastMessageAt?: Date;
  unreadCounts: Map<string, number> | Record<string, number>;
  hiddenFor?: {
    userId: Types.ObjectId;
    hiddenBefore: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMessage {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  attachment?: {
    key?: string;
    url?: string;
    secure_url?: string;
    mimetype?: string;
    originalname?: string;
    size?: number;
  };
  readAt?: Date;
  editedAt?: Date;
  deletedFor?: Types.ObjectId[];
  pinnedBy?: Types.ObjectId[];
  reactions?: {
    userId: Types.ObjectId;
    type: string;
    createdAt: Date;
  }[];
  forwardedFrom?: {
    messageId: Types.ObjectId;
    senderName: string;
    content: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
