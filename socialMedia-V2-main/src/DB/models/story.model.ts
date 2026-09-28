import { model, models, Schema, Types } from "mongoose";
import { IPostReaction, IStory } from "../../common/interfaces";

const storyReactionSchema = new Schema<IPostReaction>(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["like", "love", "haha", "wow", "sad", "angry"],
      required: true,
    },
    createdAt: Date,
  },
  {
    _id: false,
  },
);

const storySchema = new Schema<IStory>(
  {
    content: { type: String, trim: true },
    attachment: { key: String },
    author: { type: Types.ObjectId, ref: "User", required: true },
    views: { type: [Types.ObjectId], ref: "User", default: [] },
    reactions: { type: [storyReactionSchema], default: [] },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    deletedAt: Date,
  },
  {
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
    autoIndex: true,
  },
);

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

storySchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();

  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({
      ...query,
      deletedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  }
});

storySchema.pre(["updateOne", "findOneAndUpdate"], function () {
  const query = this.getQuery();

  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({
      deletedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
      ...query,
    });
  }
});

export const StoryModel = models.Story || model<IStory>("Story", storySchema);
