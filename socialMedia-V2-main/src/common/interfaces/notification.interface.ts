import { Types } from "mongoose";
import { DevicePlatformEnum, NotificationTypeEnum } from "../enums/notification.enum";

export interface IDeviceToken {
  userId: Types.ObjectId;
  token: string;
  platform: DevicePlatformEnum;
  deviceId?: string;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationTypeEnum;
  title: string;
  body: string;
  data?: Record<string, string>;
  fromUserId?: Types.ObjectId;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
