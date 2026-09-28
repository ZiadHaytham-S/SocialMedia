import type { HydratedDocument } from "mongoose";
import { UnauthorizedException } from "../../../common/exceptions";
import type { IUser } from "../../../common/interfaces";
import messageService from "../message.service";
import type { GraphqlContext } from "./context";

export const resolvers = {
  Query: {
    conversations: async (_: unknown, args: { limit?: number }, context: GraphqlContext) => {
      const viewer = requireViewer(context);
      return messageService.listConversations(viewer, args.limit ?? 30);
    },
    messages: async (
      _: unknown,
      args: { conversationId: string; limit?: number; before?: string },
      context: GraphqlContext,
    ) => {
      const viewer = requireViewer(context);
      return messageService.listMessages(viewer, args.conversationId, args.limit ?? 50, args.before);
    },
    messagingUnreadCount: async (_: unknown, __: unknown, context: GraphqlContext) => {
      const viewer = requireViewer(context);
      return messageService.getTotalUnreadCount(viewer);
    },
  },
  Mutation: {
    sendMessage: async (
      _: unknown,
      args: { recipientId: string; content: string },
      context: GraphqlContext,
    ) => {
      const viewer = requireViewer(context);
      return messageService.sendMessage(viewer, args.recipientId, args.content);
    },
    markConversationRead: async (
      _: unknown,
      args: { conversationId: string },
      context: GraphqlContext,
    ) => {
      const viewer = requireViewer(context);
      return messageService.markConversationRead(viewer, args.conversationId);
    },
    openConversation: async (
      _: unknown,
      args: { recipientId: string },
      context: GraphqlContext,
    ) => {
      const viewer = requireViewer(context);
      return messageService.openConversation(viewer, args.recipientId);
    },
  },
};

function requireViewer(context: GraphqlContext): HydratedDocument<IUser> {
  if (!context.user) {
    throw new UnauthorizedException("Authentication required");
  }

  return context.user;
}
