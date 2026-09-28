import { HydratedDocument, Types } from "mongoose";
import {
  DeviceTokenRepository,
  NotificationRepository,
  UserRepository,
} from "../../DB/repository";
import { DevicePlatformEnum, NotificationTypeEnum } from "../../common/enums/notification.enum";
import { IUser } from "../../common/interfaces";
import { NotFoundException } from "../../common/exceptions";
import { sendFcmToTokens } from "../../common/services/fcm.service";
import { FE_ORIGIN } from "../../config/config";
import { emitToUser } from "../message/socket/emit";
import { isUserOnline } from "../message/socket/presence";

const USER_NAME_SELECT = "firstName lastName";

const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
};

export class NotificationService {
  private readonly deviceTokenRepository = new DeviceTokenRepository();
  private readonly notificationRepository = new NotificationRepository();
  private readonly userRepository = new UserRepository();

  private displayName(user: { firstName?: string; lastName?: string }) {
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "مستخدم";
  }

  private appUrl(path: string) {
    const base = (FE_ORIGIN ?? "http://localhost:3001").split(",")[0]?.trim() ?? "http://localhost:3001";
    return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  }

  async registerDeviceToken(
    userId: Types.ObjectId,
    input: { token: string; platform?: DevicePlatformEnum; deviceId?: string },
  ) {
    const platform = input.platform ?? DevicePlatformEnum.WEB;

    await this.deviceTokenRepository.findOneAndUpdate({
      filter: { userId, token: input.token },
      update: {
        $set: {
          platform,
          deviceId: input.deviceId,
          lastUsedAt: new Date(),
        },
        $setOnInsert: { userId, token: input.token },
      },
      options: { upsert: true, returnDocument: "after" },
    });

    return { registered: true };
  }

  async unregisterDeviceToken(userId: Types.ObjectId, token: string) {
    await this.deviceTokenRepository.deleteMany({
      filter: { userId, token },
    });

    return { removed: true };
  }

  async unregisterAllDeviceTokens(userId: Types.ObjectId) {
    await this.deviceTokenRepository.deleteMany({ filter: { userId } });
    return { removed: true };
  }

  private serializeNotification(doc: Record<string, unknown>) {
    return {
      id: String(doc._id),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      data: (doc.data as Record<string, string> | undefined) ?? {},
      fromUserId: doc.fromUserId ? String(doc.fromUserId) : undefined,
      read: Boolean(doc.read),
      readAt: doc.readAt ? new Date(doc.readAt as string | Date).toISOString() : undefined,
      createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
    };
  }

  async listNotifications(
    userId: Types.ObjectId,
    options: { limit?: number; unreadOnly?: boolean } = {},
  ) {
    const limit = options.limit ?? 30;
    const filter: Record<string, unknown> = { userId };

    if (options.unreadOnly) {
      filter.read = false;
    }

    const rows = await this.notificationRepository.find({
      filter,
      options: { sort: { createdAt: -1 }, limit },
    });

    return rows.map((row) => this.serializeNotification(row.toJSON() as unknown as Record<string, unknown>));
  }

  async getUnreadCount(userId: Types.ObjectId) {
    const count = await this.notificationRepository.count({
      filter: {
        userId,
        read: false,
        type: { $ne: NotificationTypeEnum.MESSAGE },
      },
    });

    return { count };
  }

  async markAsRead(userId: Types.ObjectId, notificationId: string) {
    const updated = await this.notificationRepository.findOneAndUpdate({
      filter: { _id: notificationId, userId },
      update: { read: true, readAt: new Date() },
      options: { returnDocument: "after" },
    });

    if (!updated) {
      throw new NotFoundException("Notification not found");
    }

    return this.serializeNotification(updated.toJSON() as unknown as Record<string, unknown>);
  }

  async markAllAsRead(userId: Types.ObjectId) {
    await this.notificationRepository.updateMany({
      filter: { userId, read: false },
      update: { read: true, readAt: new Date() },
    });

    return { updated: true };
  }

  private async deliverToUser(
    userId: Types.ObjectId,
    input: {
      type: NotificationTypeEnum;
      title: string;
      body: string;
      data?: Record<string, string>;
      fromUserId?: Types.ObjectId;
    },
  ) {
    const created = await this.notificationRepository.createOne({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
        fromUserId: input.fromUserId,
        read: false,
      },
    });

    const serialized = this.serializeNotification(created.toJSON() as unknown as Record<string, unknown>);
    emitToUser(userId.toString(), "notification:new", serialized);

    const online = await isUserOnline(userId.toString());

    if (online) {
      return serialized;
    }

    const tokens = await this.deviceTokenRepository.find({
      filter: { userId },
      options: { limit: 50 },
    });

    const tokenStrings = tokens.map((row) => row.token).filter(Boolean);

    if (!tokenStrings.length) {
      return serialized;
    }

    try {
      const push = await sendFcmToTokens(tokenStrings, {
        title: input.title,
        body: input.body,
        data: {
          ...input.data,
          notificationId: created._id.toString(),
          type: input.type,
        },
      });

      if (push.invalidTokens.length) {
        await this.deviceTokenRepository.deleteMany({
          filter: { userId, token: { $in: push.invalidTokens } },
        });
      }
    } catch (error) {
      console.warn("FCM delivery failed:", error);
    }

    return serialized;
  }

  async notifyFriendRequest(sender: HydratedDocument<IUser>, recipientUserId: string) {
    const recipientId = new Types.ObjectId(recipientUserId);

    if (sender._id.toString() === recipientId.toString()) {
      return;
    }

    const name = this.displayName(sender);

    return this.deliverToUser(recipientId, {
      type: NotificationTypeEnum.FRIEND_REQUEST,
      title: "طلب صداقة جديد",
      body: `${name} أرسل لك طلب صداقة`,
      fromUserId: sender._id,
      data: {
        fromUserId: sender._id.toString(),
        url: this.appUrl("/friends"),
      },
    });
  }

  async notifyFriendAccepted(accepter: HydratedDocument<IUser>, requesterUserId: string) {
    const requesterId = new Types.ObjectId(requesterUserId);

    if (accepter._id.toString() === requesterId.toString()) {
      return;
    }

    const name = this.displayName(accepter);

    return this.deliverToUser(requesterId, {
      type: NotificationTypeEnum.FRIEND_ACCEPTED,
      title: "تم قبول طلب الصداقة",
      body: `${name} قبل طلب صداقتك`,
      fromUserId: accepter._id,
      data: {
        fromUserId: accepter._id.toString(),
        url: this.appUrl(`/profile/${accepter._id.toString()}`),
      },
    });
  }

  async notifyDirectMessage(
    sender: HydratedDocument<IUser>,
    recipientUserId: string,
    conversationId: string,
  ) {
    const recipientId = new Types.ObjectId(recipientUserId);

    if (sender._id.toString() === recipientId.toString()) {
      return;
    }

    const name = this.displayName(sender);

    return this.deliverToUser(recipientId, {
      type: NotificationTypeEnum.MESSAGE,
      title: "رسالة جديدة",
      body: `${name} أرسل لك رسالة`,
      fromUserId: sender._id,
      data: {
        fromUserId: sender._id.toString(),
        conversationId,
        url: this.appUrl(`/messages?with=${sender._id.toString()}`),
      },
    });
  }

  async notifyPostComment(
    commenter: HydratedDocument<IUser>,
    postAuthorId: Types.ObjectId,
    postId: string,
  ) {
    if (commenter._id.toString() === postAuthorId.toString()) {
      return;
    }

    const name = this.displayName(commenter);

    return this.deliverToUser(postAuthorId, {
      type: NotificationTypeEnum.COMMENT,
      title: "تعليق جديد",
      body: `${name} علّق على منشورك`,
      fromUserId: commenter._id,
      data: {
        fromUserId: commenter._id.toString(),
        postId,
        url: this.appUrl(`/post/${postId}`),
      },
    });
  }

  async notifyCommentReply(
    commenter: HydratedDocument<IUser>,
    parentAuthorId: Types.ObjectId,
    postId: string,
    commentId: string,
  ) {
    if (commenter._id.toString() === parentAuthorId.toString()) {
      return;
    }

    const name = this.displayName(commenter);

    return this.deliverToUser(parentAuthorId, {
      type: NotificationTypeEnum.COMMENT_REPLY,
      title: "رد على تعليقك",
      body: `${name} رد على تعليقك`,
      fromUserId: commenter._id,
      data: {
        fromUserId: commenter._id.toString(),
        postId,
        commentId,
        url: this.appUrl(`/post/${postId}`),
      },
    });
  }

  async notifyCommentMention(
    commenter: HydratedDocument<IUser>,
    mentionedUserId: Types.ObjectId,
    postId: string,
    commentId: string,
  ) {
    if (commenter._id.toString() === mentionedUserId.toString()) {
      return;
    }

    const name = this.displayName(commenter);

    return this.deliverToUser(mentionedUserId, {
      type: NotificationTypeEnum.COMMENT_MENTION,
      title: "تمت الإشارة إليك",
      body: `${name} أشار إليك في تعليق`,
      fromUserId: commenter._id,
      data: {
        fromUserId: commenter._id.toString(),
        postId,
        commentId,
        url: this.appUrl(`/post/${postId}`),
      },
    });
  }

  async notifyPostMention(
    author: HydratedDocument<IUser>,
    mentionedUserId: Types.ObjectId,
    postId: string,
  ) {
    if (author._id.toString() === mentionedUserId.toString()) {
      return;
    }

    const name = this.displayName(author);

    return this.deliverToUser(mentionedUserId, {
      type: NotificationTypeEnum.POST_MENTION,
      title: "تمت الإشارة إليك",
      body: `${name} أشار إليك في منشور`,
      fromUserId: author._id,
      data: {
        fromUserId: author._id.toString(),
        postId,
        url: this.appUrl(`/post/${postId}`),
      },
    });
  }

  async notifyPostShare(
    sharer: HydratedDocument<IUser>,
    postAuthorId: Types.ObjectId,
    postId: string,
    shareId: string,
  ) {
    if (sharer._id.toString() === postAuthorId.toString()) {
      return;
    }

    const name = this.displayName(sharer);

    return this.deliverToUser(postAuthorId, {
      type: NotificationTypeEnum.POST_SHARE,
      title: "مشاركة جديدة",
      body: `${name} شارك منشورك`,
      fromUserId: sharer._id,
      data: {
        fromUserId: sharer._id.toString(),
        postId,
        shareId,
        url: this.appUrl(`/post/${shareId}`),
      },
    });
  }

  private reactionEmoji(type: string) {
    return REACTION_EMOJI[type] ?? "👍";
  }

  async notifyPostReaction(
    reactor: HydratedDocument<IUser>,
    postAuthorId: Types.ObjectId,
    postId: string,
    reactionType: string,
  ) {
    if (reactor._id.toString() === postAuthorId.toString()) {
      return;
    }

    const name = this.displayName(reactor);
    const emoji = this.reactionEmoji(reactionType);

    return this.deliverToUser(postAuthorId, {
      type: NotificationTypeEnum.POST_REACTION,
      title: "تفاعل جديد",
      body: `${name} تفاعل ${emoji} مع منشورك`,
      fromUserId: reactor._id,
      data: {
        fromUserId: reactor._id.toString(),
        postId,
        reactionType,
        url: this.appUrl(`/post/${postId}`),
      },
    });
  }

  async notifyCommentReaction(
    reactor: HydratedDocument<IUser>,
    commentAuthorId: Types.ObjectId,
    postId: string,
    commentId: string,
    reactionType: string,
  ) {
    if (reactor._id.toString() === commentAuthorId.toString()) {
      return;
    }

    const name = this.displayName(reactor);
    const emoji = this.reactionEmoji(reactionType);

    return this.deliverToUser(commentAuthorId, {
      type: NotificationTypeEnum.COMMENT_REACTION,
      title: "تفاعل على تعليقك",
      body: `${name} تفاعل ${emoji} مع تعليقك`,
      fromUserId: reactor._id,
      data: {
        fromUserId: reactor._id.toString(),
        postId,
        commentId,
        reactionType,
        url: this.appUrl(`/post/${postId}`),
      },
    });
  }

  async resolveSenderName(fromUserId?: string) {
    if (!fromUserId) {
      return undefined;
    }

    const user = await this.userRepository.findOne({
      filter: { _id: fromUserId },
      projection: USER_NAME_SELECT,
    });

    return user ? this.displayName(user) : undefined;
  }
}

export default new NotificationService();
