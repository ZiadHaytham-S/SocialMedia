import { model, models, Schema, Types } from "mongoose";
import { DevicePlatformEnum } from "../../common/enums/notification.enum";
import { IDeviceToken } from "../../common/interfaces/notification.interface";

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true },
    platform: {
      type: String,
      enum: Object.values(DevicePlatformEnum),
      default: DevicePlatformEnum.WEB,
      required: true,
    },
    deviceId: { type: String },
    lastUsedAt: { type: Date, default: Date.now },
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    autoIndex: true,
  },
);

deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

export const DeviceTokenModel = models.DeviceToken || model<IDeviceToken>("DeviceToken", deviceTokenSchema);
