import { model, models, Schema, Types } from "mongoose";
import { IBlock } from "../../common/interfaces/friendship.interface";

const blockSchema = new Schema<IBlock>(
  {
    blocker: { type: Types.ObjectId, ref: "User", required: true },
    blocked: { type: Types.ObjectId, ref: "User", required: true },
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    autoIndex: true,
  },
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1 });

export const BlockModel = models.Block || model<IBlock>("Block", blockSchema);
