import { model, models, Schema, Types } from "mongoose";
import { IMessage } from "../../common/interfaces/message.interface";

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 2000 },
    attachment: {
      key: String,
      url: String,
      secure_url: String,
      mimetype: String,
      originalname: String,
      size: Number,
    },
    readAt: Date,
    editedAt: Date,
    deletedFor: {
      type: [Types.ObjectId],
      ref: "User",
      default: [],
    },
    pinnedBy: {
      type: [Types.ObjectId],
      ref: "User",
      default: [],
    },
    reactions: {
      type: [
        {
          userId: { type: Types.ObjectId, ref: "User", required: true },
          type: { type: String, required: true, maxlength: 20 },
          createdAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
    forwardedFrom: {
      messageId: { type: Types.ObjectId, ref: "Message" },
      senderName: String,
      content: String,
    },
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    autoIndex: true,
  },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ deletedFor: 1 });
messageSchema.index({ pinnedBy: 1 });

export const MessageModel = models.Message || model<IMessage>("Message", messageSchema);
