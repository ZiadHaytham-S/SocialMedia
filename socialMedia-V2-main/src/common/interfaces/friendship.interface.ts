import { Types } from "mongoose";
import { FriendshipStatusEnum } from "../enums/friendship.enum";

export interface IFriendship {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: FriendshipStatusEnum;
  respondedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBlock {
  blocker: Types.ObjectId;
  blocked: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
