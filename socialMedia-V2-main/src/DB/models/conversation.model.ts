import { model, models, Schema, Types } from "mongoose";
import { IConversation } from "../../common/interfaces/message.interface";

const lastMessageSchema = new Schema(
  {
    content: { type: String, required: true },
    senderId: { type: Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [Types.ObjectId],
      ref: "User",
      required: true,
      validate: {
        validator: (value: Types.ObjectId[]) => value.length === 2,
        message: "Conversation must have exactly two participants",
      },
    },
    lastMessage: lastMessageSchema,
    lastMessageAt: Date,
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    hiddenFor: {
      type: [
        {
          userId: { type: Types.ObjectId, ref: "User", required: true },
          hiddenBefore: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    autoIndex: true,
  },
);

conversationSchema.index({ participants: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ "hiddenFor.userId": 1 });

export const ConversationModel =
  models.Conversation || model<IConversation>("Conversation", conversationSchema);
