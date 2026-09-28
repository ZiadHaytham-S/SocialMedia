import { model, models, Schema, Types } from "mongoose";
import { AvailabilityEnum } from "../../common/enums";
import { IPost, IPostReaction } from "../../common/interfaces";

const postReactionSchema = new Schema<IPostReaction>(
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

const postSchema = new Schema<IPost>(
  {
    folderId: { type: String, trim: true },
    content: { type: String, trim: true },
    attachments: {
      key: String,
      url: String,
      public_id: String,
      secure_url: String,
    },
    availability: {
      type: String,
      enum: Object.values(AvailabilityEnum),
      default: AvailabilityEnum.PUBLIC,
    },
    author: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    tags: [{ type: Types.ObjectId, ref: "User" }],
    reactions: { type: [postReactionSchema], default: [] },
    allowComments: { type: Boolean, default: true },
    sharedPost: { type: Types.ObjectId, ref: "Post" },
    shareCount: { type: Number, default: 0 },
    deletedAt: Date,
    restoredAt: Date,
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

postSchema.pre("save", function () {
  if (!this.folderId && this.author) {
    this.folderId = `posts/${this.author}`;
  }
});

postSchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();

  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

postSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  const update = this.getUpdate() as Partial<IPost>;

  if (update.deletedAt) {
    this.setUpdate({ ...update, $unset: { restoredAt: 1 } });
  }
  if (update.restoredAt) {
    this.setUpdate({ ...update, $unset: { deletedAt: 1 } });
    this.setQuery({ ...this.getQuery(), deletedAt: { $exists: true } });
  }

  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ deletedAt: { $exists: false }, ...query });
  }
});

postSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  const query = this.getQuery();
  if (query.force === true) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, deletedAt: { $exists: true } });
  }
});

export const PostModel = models.Post || model<IPost>("Post", postSchema);
