import { HydratedDocument, Types } from "mongoose";
import {
  ConversationRepository,
  MessageRepository,
  UserRepository,
} from "../../DB/repository";
import {
  BadRequestException,
  ForBiddenException,
  NotFoundException,
} from "../../common/exceptions";
import { IMessage, IUser } from "../../common/interfaces";
import { getR2FileUrl, uploadFileToR2 } from "../../common/services";
import { friendGraph } from "../../common/utils/friendGraph";
import notificationService from "../notification/notification.service";
import { emitToConversation, emitToUser, setSocketServer } from "./socket/emit";

export { setSocketServer as setMessageSocketServer };

const USER_SELECT = "firstName lastName profilePicture profileCoverPictures createdAt email";

export type SerializedUserSummary = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type SerializedMessage = {
  id: string;
  conversationId: string;
  content: string;
  attachmentUrl?: string | undefined;
  attachmentType?: "audio" | "image" | "video" | undefined;
  attachmentName?: string | undefined;
  attachmentSize?: number | undefined;
  sender: SerializedUserSummary;
  createdAt: string;
  readAt?: string | undefined;
  editedAt?: string | undefined;
  isPinned?: boolean | undefined;
  viewerReaction?: string | undefined;
  reactions?: { type: string; count: number }[] | undefined;
  forwardedFrom?: {
    messageId: string;
    senderName: string;
    content: string;
  } | undefined;
};

export type SerializedConversation = {
  id: string;
  peer: SerializedUserSummary;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  } | undefined;
  unreadCount: number;
  updatedAt: string;
};

function sortedParticipantPair(a: Types.ObjectId, b: Types.ObjectId): [Types.ObjectId, Types.ObjectId] {
  const left = a.toString();
  const right = b.toString();
  return left < right ? [a, b] : [b, a];
}

function unreadForUser(
  unreadCounts: Map<string, number> | Record<string, number> | undefined,
  userId: string,
) {
  if (!unreadCounts) {
    return 0;
  }

  if (unreadCounts instanceof Map) {
    return unreadCounts.get(userId) ?? 0;
  }

  return unreadCounts[userId] ?? 0;
}

function hiddenBeforeForUser(
  hiddenFor:
    | { userId: Types.ObjectId; hiddenBefore: Date }[]
    | undefined,
  userId: string,
) {
  return hiddenFor?.find((row) => row.userId.toString() === userId)?.hiddenBefore;
}

export class MessageService {
  private readonly conversationRepository = new ConversationRepository();
  private readonly messageRepository = new MessageRepository();
  private readonly userRepository = new UserRepository();

  private serializeUser(user: Record<string, unknown>): SerializedUserSummary {
    const profilePicture = user.profilePicture as { key?: string; url?: string | null } | undefined;

    if (profilePicture?.key) {
      profilePicture.url = getR2FileUrl(profilePicture.key) ?? profilePicture.url ?? null;
    }

    const firstName = String(user.firstName ?? "");
    const lastName = String(user.lastName ?? "");
    const username = typeof user.username === "string" ? user.username : `${firstName}${lastName}`.trim();

    return {
      id: String(user._id ?? user.id),
      name: `${firstName} ${lastName}`.trim() || username || "User",
      username,
      avatarUrl: profilePicture?.url ?? null,
    };
  }

  private async loadUserSummary(userId: string | Types.ObjectId): Promise<SerializedUserSummary> {
    const user = await this.userRepository.findOne({
      filter: { _id: friendGraph.toObjectId(userId) },
      projection: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.serializeUser(user.toJSON() as unknown as Record<string, unknown>);
  }

  private attachmentPreview(file?: Express.Multer.File) {
    if (!file) {
      return undefined;
    }

    if (file.mimetype.startsWith("audio/")) {
      return "Audio";
    }

    return file.mimetype.startsWith("video/") ? "Video" : "Photo";
  }

  private serializeAttachment(attachment?: {
    key?: string;
    url?: string;
    secure_url?: string;
    mimetype?: string;
    originalname?: string;
    size?: number;
  }) {
    if (!attachment?.key && !attachment?.url && !attachment?.secure_url) {
      return {};
    }

    const url = attachment.secure_url ?? attachment.url ?? getR2FileUrl(attachment.key);
    const attachmentType = attachment.mimetype?.startsWith("audio/")
      ? "audio"
      : attachment.mimetype?.startsWith("video/")
        ? "video"
        : "image";

    return {
      attachmentUrl: url ?? undefined,
      attachmentType: attachmentType as "audio" | "image" | "video",
      attachmentName: attachment.originalname,
      attachmentSize: attachment.size,
    };
  }

  private serializeReactions(
    reactions: IMessage["reactions"] | undefined,
    viewerId: Types.ObjectId,
  ) {
    const counts = new Map<string, number>();
    let viewerReaction: string | undefined;

    for (const reaction of reactions ?? []) {
      counts.set(reaction.type, (counts.get(reaction.type) ?? 0) + 1);

      if (reaction.userId.toString() === viewerId.toString()) {
        viewerReaction = reaction.type;
      }
    }

    return {
      viewerReaction,
      reactions: [...counts.entries()].map(([type, count]) => ({ type, count })),
    };
  }

  private serializeMessage(
    message: HydratedDocument<IMessage>,
    sender: SerializedUserSummary,
    viewerId: Types.ObjectId,
  ): SerializedMessage {
    const reactionSummary = this.serializeReactions(message.reactions, viewerId);
    const row: SerializedMessage = {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      content: message.content,
      ...this.serializeAttachment(message.attachment),
      ...reactionSummary,
      isPinned: Boolean(message.pinnedBy?.some((id) => id.toString() === viewerId.toString())),
      sender,
      createdAt: message.createdAt?.toISOString() ?? new Date().toISOString(),
    };

    if (message.readAt) {
      row.readAt = message.readAt.toISOString();
    }

    if (message.editedAt) {
      row.editedAt = message.editedAt.toISOString();
    }

    if (message.forwardedFrom?.messageId) {
      row.forwardedFrom = {
        messageId: message.forwardedFrom.messageId.toString(),
        senderName: message.forwardedFrom.senderName,
        content: message.forwardedFrom.content,
      };
    }

    return row;
  }

  private peerIdFromConversation(
    conversation: { participants: Types.ObjectId[] },
    viewerId: Types.ObjectId,
  ) {
    const viewer = viewerId.toString();
    const peer = conversation.participants.find((id) => id.toString() !== viewer);

    if (!peer) {
      throw new BadRequestException("Invalid conversation participants");
    }

    return peer;
  }

  private async assertCanMessage(
    viewer: HydratedDocument<IUser>,
    recipientId: Types.ObjectId,
  ) {
    if (viewer._id.toString() === recipientId.toString()) {
      throw new BadRequestException("You cannot message yourself");
    }

    const recipient = await this.userRepository.findOne({
      filter: { _id: recipientId },
      projection: "_id",
    });

    if (!recipient) {
      throw new NotFoundException("User not found");
    }

    if (await friendGraph.isBlocked(viewer._id, recipientId, viewer)) {
      throw new ForBiddenException("You cannot message this user");
    }
  }

  private async getConversationForViewer(conversationId: string, viewerId: Types.ObjectId) {
    const conversation = await this.conversationRepository.findOne({
      filter: {
        _id: friendGraph.toObjectId(conversationId),
        participants: viewerId,
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return conversation;
  }

  private async getMessageForViewer(
    viewer: HydratedDocument<IUser>,
    messageId: string,
  ) {
    const message = await this.messageRepository.findOne({
      filter: {
        _id: friendGraph.toObjectId(messageId),
        deletedFor: { $ne: viewer._id },
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    const conversation = await this.getConversationForViewer(message.conversationId.toString(), viewer._id);

    return { message, conversation };
  }

  private async refreshConversationLastMessage(conversationId: Types.ObjectId) {
    const [latestMessage] = await this.messageRepository.find({
      filter: { conversationId },
      options: { sort: { createdAt: -1 }, limit: 1 },
    });

    if (latestMessage) {
      await this.conversationRepository.findOneAndUpdate({
        filter: { _id: conversationId },
        update: {
          lastMessage: {
            content: latestMessage.content,
            senderId: latestMessage.senderId,
            createdAt: latestMessage.createdAt ?? new Date(),
          },
          lastMessageAt: latestMessage.createdAt ?? new Date(),
        },
      });
      return;
    }

    await this.conversationRepository.findOneAndUpdate({
      filter: { _id: conversationId },
      update: {
        $unset: { lastMessage: "", lastMessageAt: "" },
      },
    });
  }

  private async emitMessageUpdated(message: HydratedDocument<IMessage>, viewerId: Types.ObjectId) {
    const sender = await this.loadUserSummary(message.senderId);
    const conversation = await this.conversationRepository.findOne({
      filter: { _id: message.conversationId },
    });

    for (const participantId of conversation?.participants ?? [viewerId]) {
      emitToUser(
        participantId.toString(),
        "message:updated",
        this.serializeMessage(message, sender, participantId),
      );
    }

    return this.serializeMessage(message, sender, viewerId);
  }

  async findOrCreateConversation(
    viewer: HydratedDocument<IUser>,
    recipientUserId: string,
  ) {
    const recipientId = friendGraph.toObjectId(recipientUserId);
    await this.assertCanMessage(viewer, recipientId);

    const participants = sortedParticipantPair(viewer._id, recipientId);

    let conversation = await this.conversationRepository.findOne({
      filter: { participants },
    });

    if (!conversation) {
      try {
        conversation = await this.conversationRepository.createOne({
          data: { participants, unreadCounts: {} },
        });
      } catch (error) {
        // Two requests can open the same chat at once. Return the winning insert.
        if ((error as { code?: number }).code !== 11000) throw error;
        conversation = await this.conversationRepository.findOne({ filter: { participants } });
        if (!conversation) throw error;
      }
    }

    return conversation;
  }

  private serializeConversation(
    conversation: {
      _id: Types.ObjectId;
      participants: Types.ObjectId[];
      lastMessage?: { content: string; senderId: Types.ObjectId; createdAt: Date };
      lastMessageAt?: Date;
      unreadCounts?: Map<string, number> | Record<string, number>;
      hiddenFor?: { userId: Types.ObjectId; hiddenBefore: Date }[];
      updatedAt?: Date;
    },
    viewerId: Types.ObjectId,
    peerSummary?: SerializedUserSummary,
  ): SerializedConversation {
    const peerId = this.peerIdFromConversation(conversation, viewerId);

    return {
      id: conversation._id.toString(),
      peer: peerSummary ?? {
        id: peerId.toString(),
        name: "",
        username: "",
        avatarUrl: null,
      },
      lastMessage: conversation.lastMessage
        ? {
            content: conversation.lastMessage.content,
            senderId: conversation.lastMessage.senderId.toString(),
            createdAt: conversation.lastMessage.createdAt.toISOString(),
          }
        : undefined,
      unreadCount: unreadForUser(conversation.unreadCounts, viewerId.toString()),
      updatedAt: (conversation.lastMessageAt ?? conversation.updatedAt ?? new Date()).toISOString(),
    };
  }

  async listConversations(viewer: HydratedDocument<IUser>, limit = 30): Promise<SerializedConversation[]> {
    const conversations = await this.conversationRepository.find({
      filter: { participants: viewer._id },
      options: { sort: { lastMessageAt: -1, updatedAt: -1 }, limit: limit * 2 },
    });

    const visibleConversations = conversations
      .filter((conversation) => {
        const hiddenBefore = hiddenBeforeForUser(conversation.hiddenFor, viewer._id.toString());

        if (!hiddenBefore) {
          return true;
        }

        return Boolean(conversation.lastMessageAt && conversation.lastMessageAt > hiddenBefore);
      })
      .slice(0, limit);

    const peerIds = visibleConversations.map((row) => this.peerIdFromConversation(row, viewer._id));
    const users = await this.userRepository.find({
      filter: { _id: { $in: peerIds } },
      projection: USER_SELECT,
    });

    const userMap = new Map(
      users.map((user) => [user._id.toString(), this.serializeUser(user.toJSON() as unknown as Record<string, unknown>)]),
    );

    return visibleConversations.map((conversation) =>
      this.serializeConversation(
        conversation,
        viewer._id,
        userMap.get(this.peerIdFromConversation(conversation, viewer._id).toString()),
      ),
    );
  }

  async listMessages(
    viewer: HydratedDocument<IUser>,
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<SerializedMessage[]> {
    const conversation = await this.getConversationForViewer(conversationId, viewer._id);
    const hiddenBefore = hiddenBeforeForUser(conversation.hiddenFor, viewer._id.toString());

    const filter: Record<string, unknown> = {
      conversationId: friendGraph.toObjectId(conversationId),
      deletedFor: { $ne: viewer._id },
    };

    if (hiddenBefore) {
      filter.createdAt = { $gt: hiddenBefore };
    }

    if (before) {
      const beforeMessage = await this.messageRepository.findOne({
        filter: {
          _id: friendGraph.toObjectId(before),
          conversationId: friendGraph.toObjectId(conversationId),
        },
      });

      if (beforeMessage?.createdAt) {
        filter.createdAt = {
          ...((filter.createdAt as Record<string, Date> | undefined) ?? {}),
          $lt: beforeMessage.createdAt,
        };
      }
    }

    const messages = await this.messageRepository.find({
      filter: filter as never,
      options: { sort: { createdAt: -1 }, limit },
    });

    const senderIds = [...new Set(messages.map((row) => row.senderId.toString()))];
    const users = await this.userRepository.find({
      filter: { _id: { $in: senderIds.map((id) => friendGraph.toObjectId(id)) } },
      projection: USER_SELECT,
    });

    const userMap = new Map(
      users.map((user) => [user._id.toString(), this.serializeUser(user.toJSON() as unknown as Record<string, unknown>)]),
    );

    return messages.reverse().map((message) =>
      this.serializeMessage(
        message,
        userMap.get(message.senderId.toString()) ?? {
          id: message.senderId.toString(),
          name: "User",
          username: "",
          avatarUrl: null,
        },
        viewer._id,
      ),
    );
  }

  async sendMessage(
    viewer: HydratedDocument<IUser>,
    recipientUserId: string,
    content: string,
    file?: Express.Multer.File,
  ): Promise<SerializedMessage> {
    const trimmed = content.trim();

    if (!trimmed && !file) {
      throw new BadRequestException("Message content is required");
    }

    if (trimmed.length > 2000) {
      throw new BadRequestException("Message must not exceed 2000 characters");
    }

    const conversation = await this.findOrCreateConversation(viewer, recipientUserId);
    const recipientId = this.peerIdFromConversation(conversation, viewer._id);
    const attachment = file
      ? {
          ...(await uploadFileToR2({ file, folder: `messages/${conversation._id}` })),
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size,
        }
      : undefined;
    const storedContent = trimmed || this.attachmentPreview(file) || "";

    const message = await this.messageRepository.createOne({
      data: {
        conversationId: conversation._id,
        senderId: viewer._id,
        content: storedContent,
        attachment,
      },
    });

    const createdAt = message.createdAt ?? new Date();
    const unreadKey = `unreadCounts.${recipientId.toString()}`;

    await this.conversationRepository.findOneAndUpdate({
      filter: { _id: conversation._id },
      update: {
        lastMessage: {
          content: storedContent,
          senderId: viewer._id,
          createdAt,
        },
        lastMessageAt: createdAt,
        $pull: {
          hiddenFor: {
            userId: { $in: [viewer._id, recipientId] },
          },
        },
        $inc: { [unreadKey]: 1 },
      },
    });

    const serialized: SerializedMessage = {
      id: message._id.toString(),
      conversationId: conversation._id.toString(),
      content: storedContent,
      ...this.serializeAttachment(attachment),
      ...this.serializeReactions(message.reactions, viewer._id),
      isPinned: false,
      sender: await this.loadUserSummary(viewer._id),
      createdAt: createdAt.toISOString(),
    };

    const peerSummary = await this.loadUserSummary(recipientId);
    const conversationPayload = this.serializeConversation(
      {
        _id: conversation._id,
        participants: conversation.participants,
        lastMessage: { content: storedContent, senderId: viewer._id, createdAt },
        lastMessageAt: createdAt,
        unreadCounts: conversation.unreadCounts,
        updatedAt: createdAt,
      },
      recipientId,
      await this.loadUserSummary(viewer._id),
    );

    const recipientConversationPayload = {
      ...conversationPayload,
      peer: await this.loadUserSummary(viewer._id),
      unreadCount: unreadForUser(conversation.unreadCounts, recipientId.toString()) + 1,
    };

    emitToUser(recipientId.toString(), "message:new", serialized);
    emitToConversation(conversation._id.toString(), "message:new", serialized);
    emitToUser(recipientId.toString(), "conversation:updated", recipientConversationPayload);
    emitToUser(viewer._id.toString(), "conversation:updated", {
      ...this.serializeConversation(
        {
          _id: conversation._id,
          participants: conversation.participants,
          lastMessage: { content: storedContent, senderId: viewer._id, createdAt },
          lastMessageAt: createdAt,
          unreadCounts: conversation.unreadCounts,
          updatedAt: createdAt,
        },
        viewer._id,
        peerSummary,
      ),
      unreadCount: 0,
    });

    void notificationService
      .notifyDirectMessage(viewer, recipientId.toString(), conversation._id.toString())
      .catch((error) => {
        console.warn("Failed to deliver message notification:", error);
      });

    return serialized;
  }

  async openConversation(viewer: HydratedDocument<IUser>, recipientUserId: string): Promise<SerializedConversation> {
    const conversation = await this.findOrCreateConversation(viewer, recipientUserId);
    const peerId = this.peerIdFromConversation(conversation, viewer._id);
    const peerSummary = await this.loadUserSummary(peerId);

    return this.serializeConversation(conversation, viewer._id, peerSummary);
  }

  async markConversationRead(viewer: HydratedDocument<IUser>, conversationId: string) {
    const conversation = await this.getConversationForViewer(conversationId, viewer._id);
    const peerId = this.peerIdFromConversation(conversation, viewer._id);
    const unreadKey = `unreadCounts.${viewer._id.toString()}`;

    await this.conversationRepository.findOneAndUpdate({
      filter: { _id: conversation._id },
      update: { $set: { [unreadKey]: 0 } },
    });

    await this.messageRepository.updateMany({
      filter: {
        conversationId: conversation._id,
        senderId: peerId,
        readAt: { $exists: false },
      },
      update: { readAt: new Date() },
    });

    emitToUser(peerId.toString(), "conversation:read", {
      conversationId,
      readerId: viewer._id.toString(),
    });

    return true;
  }

  async deleteConversationForViewer(viewer: HydratedDocument<IUser>, conversationId: string) {
    const conversation = await this.getConversationForViewer(conversationId, viewer._id);
    const unreadKey = `unreadCounts.${viewer._id.toString()}`;
    const hiddenBefore = new Date();

    await this.conversationRepository.findOneAndUpdate({
      filter: { _id: conversation._id },
      update: {
        $pull: { hiddenFor: { userId: viewer._id } },
      },
    });

    await this.conversationRepository.findOneAndUpdate({
      filter: { _id: conversation._id },
      update: {
        $push: { hiddenFor: { userId: viewer._id, hiddenBefore } },
        $set: { [unreadKey]: 0 },
      },
    });

    emitToUser(viewer._id.toString(), "conversation:deleted", {
      conversationId: conversation._id.toString(),
    });

    return true;
  }

  async editOwnMessage(
    viewer: HydratedDocument<IUser>,
    messageId: string,
    content: string,
  ) {
    const trimmed = content.trim();

    if (!trimmed) {
      throw new BadRequestException("Message content is required");
    }

    if (trimmed.length > 2000) {
      throw new BadRequestException("Message must not exceed 2000 characters");
    }

    const { message, conversation } = await this.getMessageForViewer(viewer, messageId);

    if (message.senderId.toString() !== viewer._id.toString()) {
      throw new ForBiddenException("You can only edit your own messages");
    }

    if (message.attachment?.key || message.attachment?.url || message.attachment?.secure_url) {
      throw new BadRequestException("Attachment messages cannot be edited");
    }

    const updated = await this.messageRepository.findOneAndUpdate({
      filter: { _id: message._id, senderId: viewer._id },
      update: { content: trimmed, editedAt: new Date() },
      options: { returnDocument: "after" },
    });

    if (!updated) {
      throw new NotFoundException("Message not found");
    }

    if (conversation.lastMessageAt?.getTime() === message.createdAt?.getTime()) {
      await this.refreshConversationLastMessage(conversation._id);
    }

    return this.emitMessageUpdated(updated, viewer._id);
  }

  async toggleReaction(
    viewer: HydratedDocument<IUser>,
    messageId: string,
    type: string,
  ) {
    const reactionType = type.trim().slice(0, 20);

    if (!reactionType) {
      throw new BadRequestException("Reaction type is required");
    }

    const { message } = await this.getMessageForViewer(viewer, messageId);
    const existing = message.reactions?.find((reaction) => reaction.userId.toString() === viewer._id.toString());

    let updated = await this.messageRepository.findOneAndUpdate({
      filter: { _id: message._id },
      update: { $pull: { reactions: { userId: viewer._id } } },
      options: { returnDocument: "after" },
    });

    if (existing?.type !== reactionType) {
      updated = await this.messageRepository.findOneAndUpdate({
        filter: { _id: message._id },
        update: {
          $push: { reactions: { userId: viewer._id, type: reactionType, createdAt: new Date() } },
        },
        options: { returnDocument: "after" },
      });
    }

    if (!updated) {
      throw new NotFoundException("Message not found");
    }

    return this.emitMessageUpdated(updated, viewer._id);
  }

  async setMessagePinned(
    viewer: HydratedDocument<IUser>,
    messageId: string,
    pinned: boolean,
  ) {
    const { message } = await this.getMessageForViewer(viewer, messageId);
    const updated = await this.messageRepository.findOneAndUpdate({
      filter: { _id: message._id },
      update: pinned
        ? { $addToSet: { pinnedBy: viewer._id } }
        : { $pull: { pinnedBy: viewer._id } },
      options: { returnDocument: "after" },
    });

    if (!updated) {
      throw new NotFoundException("Message not found");
    }

    return this.emitMessageUpdated(updated, viewer._id);
  }

  async forwardMessage(
    viewer: HydratedDocument<IUser>,
    messageId: string,
    recipientUserId: string,
  ) {
    const { message } = await this.getMessageForViewer(viewer, messageId);
    const conversation = await this.findOrCreateConversation(viewer, recipientUserId);
    const recipientId = this.peerIdFromConversation(conversation, viewer._id);
    const senderSummary = await this.loadUserSummary(message.senderId);
    const createdAt = new Date();

    const forwarded = await this.messageRepository.createOne({
      data: {
        conversationId: conversation._id,
        senderId: viewer._id,
        content: message.content,
        attachment: message.attachment,
        forwardedFrom: {
          messageId: message._id,
          senderName: senderSummary.name,
          content: message.content,
        },
      },
    });

    const unreadKey = `unreadCounts.${recipientId.toString()}`;

    await this.conversationRepository.findOneAndUpdate({
      filter: { _id: conversation._id },
      update: {
        lastMessage: {
          content: forwarded.content,
          senderId: viewer._id,
          createdAt,
        },
        lastMessageAt: createdAt,
        $pull: {
          hiddenFor: {
            userId: { $in: [viewer._id, recipientId] },
          },
        },
        $inc: { [unreadKey]: 1 },
      },
    });

    const serialized = this.serializeMessage(
      forwarded,
      await this.loadUserSummary(viewer._id),
      viewer._id,
    );

    emitToUser(recipientId.toString(), "message:new", serialized);
    emitToConversation(conversation._id.toString(), "message:new", serialized);
    emitToUser(recipientId.toString(), "conversation:updated", {
      conversationId: conversation._id.toString(),
    });
    emitToUser(viewer._id.toString(), "conversation:updated", {
      conversationId: conversation._id.toString(),
    });

    return serialized;
  }

  async deleteOwnMessage(viewer: HydratedDocument<IUser>, messageId: string) {
    const message = await this.messageRepository.findOne({
      filter: {
        _id: friendGraph.toObjectId(messageId),
        senderId: viewer._id,
        deletedFor: { $ne: viewer._id },
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    const conversation = await this.getConversationForViewer(message.conversationId.toString(), viewer._id);

    await this.messageRepository.findOneAndDelete({
      filter: {
        _id: message._id,
        senderId: viewer._id,
      },
    });

    await this.refreshConversationLastMessage(conversation._id);

    const payload = {
      conversationId: conversation._id.toString(),
      messageId: message._id.toString(),
    };

    emitToConversation(conversation._id.toString(), "message:deleted", payload);
    conversation.participants.forEach((participantId) => {
      emitToUser(participantId.toString(), "conversation:updated", {
        conversationId: conversation._id.toString(),
      });
    });

    return true;
  }

  async getTotalUnreadCount(viewer: HydratedDocument<IUser>) {
    const conversations = await this.conversationRepository.find({
      filter: { participants: viewer._id },
    });

    return conversations.reduce((total, conversation) => {
      const hiddenBefore = hiddenBeforeForUser(conversation.hiddenFor, viewer._id.toString());

      if (hiddenBefore && (!conversation.lastMessageAt || conversation.lastMessageAt <= hiddenBefore)) {
        return total;
      }

      return total + unreadForUser(conversation.unreadCounts, viewer._id.toString());
    }, 0);
  }
}

export default new MessageService();
