import { model, models, Schema, Types } from "mongoose";
import { NotificationTypeEnum } from "../../common/enums/notification.enum";
import { INotification } from "../../common/interfaces/notification.interface";

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: Object.values(NotificationTypeEnum),
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    fromUserId: { type: Types.ObjectId, ref: "User" },
    read: { type: Boolean, default: false, index: true },
    readAt: Date,
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    autoIndex: true,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel =
  models.Notification || model<INotification>("Notification", notificationSchema);
