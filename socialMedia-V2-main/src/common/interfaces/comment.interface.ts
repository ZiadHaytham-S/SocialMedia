import { Types } from "mongoose";
import type { IAttachment, IPostReaction } from "./post.interface";
import type { IPost } from "./post.interface";
import type { IUser } from "./user.interface";

export interface IComment {
  content?: string;
  attachment?: IAttachment;

  /** Emoji reactions (like, love, haha, …) — used by the app today. */
  reactions?: IPostReaction[];

  /** Tagged users */
  tags?: (Types.ObjectId | IUser)[];

  /** Logical post reference — serialized from `post` in MongoDB. */
  postId: Types.ObjectId | IPost;
  /** Persisted post reference in MongoDB. */
  post: Types.ObjectId | IPost;

  /** Parent comment when this is a reply. Persisted as `parentComment` in MongoDB. */
  commentId?: Types.ObjectId | IComment;
  parentComment?: Types.ObjectId | IComment;

  /** Logical owner — serialized from `author` in MongoDB. */
  createdBy: Types.ObjectId | IUser;
  /** Persisted owner field in MongoDB. */
  author: Types.ObjectId | IUser;
  updatedBy?: Types.ObjectId | IUser;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  restoredAt?: Date;
}
