import { model, models, Schema, Types } from "mongoose";
import { FriendshipStatusEnum } from "../../common/enums/friendship.enum";
import { IFriendship } from "../../common/interfaces/friendship.interface";

const friendshipSchema = new Schema<IFriendship>(
  {
    requester: { type: Types.ObjectId, ref: "User", required: true },
    recipient: { type: Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(FriendshipStatusEnum),
      default: FriendshipStatusEnum.PENDING,
      required: true,
    },
    respondedAt: Date,
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    autoIndex: true,
  },
);

friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ recipient: 1, status: 1 });
friendshipSchema.index({ requester: 1, status: 1 });

export const FriendshipModel = models.Friendship || model<IFriendship>("Friendship", friendshipSchema);
