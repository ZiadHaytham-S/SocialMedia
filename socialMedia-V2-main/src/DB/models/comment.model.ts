import { model, models, Schema, Types } from "mongoose";
import { IComment, IPostReaction } from "../../common/interfaces";

const commentReactionSchema = new Schema<IPostReaction>(
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

const commentSchema = new Schema<IComment>(
  {
    content: { type: String, trim: true },
    attachment: {
      key: String,
      url: String,
      public_id: String,
      secure_url: String,
    },
    post: { type: Types.ObjectId, ref: "Post", required: true },
    parentComment: { type: Types.ObjectId, ref: "Comment" },
    tags: [{ type: Types.ObjectId, ref: "User" }],
    author: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    reactions: { type: [commentReactionSchema], default: [] },
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

commentSchema.pre(["findOne", "find"], function () {
  const query = this.getQuery();

  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, deletedAt: { $exists: false } });
  }
});

commentSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  const update = this.getUpdate() as Partial<IComment>;

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

export const CommentModel =
  models.Comment || model<IComment>("Comment", commentSchema);
