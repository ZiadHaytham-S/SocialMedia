import { Types } from "mongoose";
import type { IUser } from "./user.interface";
import { AvailabilityEnum } from "../enums/post.enum";

export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export interface IPostReaction {
  userId: Types.ObjectId;
  type: ReactionType;
  createdAt?: Date;
}

export interface IAttachment {
  key?: string;
  url?: string;
  public_id?: string;
  secure_url?: string;
}

export interface IPost {
  folderId: string;
  content?: string;
  attachments?: IAttachment;

  /** Post visibility — reserved for a future release. */
  availability?: AvailabilityEnum;

  /** Emoji reactions (like, love, haha, …) — used by the app today. */
  reactions?: IPostReaction[];

  /** Tagged users */
  tags?: (Types.ObjectId | IUser)[];

  allowComments?: boolean;

  /** Reference to the post being shared (repost wrapper). */
  sharedPost?: Types.ObjectId | IPost;

  /** Denormalized count of times this post was shared. */
  shareCount?: number;

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
