import { Types } from "mongoose";
import type { IPostReaction } from "./post.interface";

export interface IStoryAttachment {
  key: string;
}

export interface IStory {
  content?: string;
  attachment?: IStoryAttachment;
  author: Types.ObjectId;
  views?: Types.ObjectId[];
  reactions?: IPostReaction[];
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
