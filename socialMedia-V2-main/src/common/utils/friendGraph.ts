import { Types } from "mongoose";
import { FriendshipStatusEnum, FriendRelationEnum } from "../enums/friendship.enum";
import { FriendshipRepository, BlockRepository } from "../../DB/repository";
import { IUser } from "../interfaces";
import { isAdmin } from "./adminAccess";

const USER_SELECT = "firstName lastName profilePicture profileCoverPictures createdAt";

export class FriendGraph {
  private readonly friendshipRepository: FriendshipRepository;
  private readonly blockRepository: BlockRepository;

  constructor() {
    this.friendshipRepository = new FriendshipRepository();
    this.blockRepository = new BlockRepository();
  }

  toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === "string" ? Types.ObjectId.createFromHexString(id) : id;
  }

  async getBlockedUserIds(viewerId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const blocks = await this.blockRepository.find({
      filter: {
        $or: [{ blocker: viewerId }, { blocked: viewerId }],
      },
    });

    const ids = new Set<string>();

    for (const block of blocks) {
      const blocker = block.blocker.toString();
      const blocked = block.blocked.toString();
      const viewer = viewerId.toString();

      if (blocker === viewer) {
        ids.add(blocked);
      } else {
        ids.add(blocker);
      }
    }

    return [...ids].map((id) => this.toObjectId(id));
  }

  async isBlocked(
    viewerId: Types.ObjectId,
    targetId: Types.ObjectId,
    viewer?: Pick<IUser, "role"> | null,
  ): Promise<boolean> {
    if (viewer && isAdmin(viewer)) {
      return false;
    }

    const block = await this.blockRepository.findOne({
      filter: {
        $or: [
          { blocker: viewerId, blocked: targetId },
          { blocker: targetId, blocked: viewerId },
        ],
      },
    });

    return Boolean(block);
  }

  async getAcceptedFriendIds(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const friendships = await this.friendshipRepository.find({
      filter: {
        status: FriendshipStatusEnum.ACCEPTED,
        $or: [{ requester: userId }, { recipient: userId }],
      },
    });

    return friendships.map((row) =>
      row.requester.toString() === userId.toString() ? row.recipient : row.requester,
    );
  }

  async areFriends(userA: Types.ObjectId, userB: Types.ObjectId): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      filter: {
        status: FriendshipStatusEnum.ACCEPTED,
        $or: [
          { requester: userA, recipient: userB },
          { requester: userB, recipient: userA },
        ],
      },
    });

    return Boolean(friendship);
  }

  async getRelation(viewerId: Types.ObjectId, targetId: Types.ObjectId): Promise<FriendRelationEnum> {
    if (viewerId.toString() === targetId.toString()) {
      return FriendRelationEnum.SELF;
    }

    const block = await this.blockRepository.findOne({
      filter: {
        $or: [
          { blocker: viewerId, blocked: targetId },
          { blocker: targetId, blocked: viewerId },
        ],
      },
    });

    if (block) {
      if (block.blocker.toString() === viewerId.toString()) {
        return FriendRelationEnum.BLOCKED_BY_VIEWER;
      }

      return FriendRelationEnum.BLOCKED_BY_TARGET;
    }

    const friendship = await this.friendshipRepository.findOne({
      filter: {
        $or: [
          { requester: viewerId, recipient: targetId },
          { requester: targetId, recipient: viewerId },
        ],
      },
      options: { sort: { updatedAt: -1 } },
    });

    if (!friendship || friendship.status === FriendshipStatusEnum.CANCELLED) {
      return FriendRelationEnum.NONE;
    }

    if (friendship.status === FriendshipStatusEnum.ACCEPTED) {
      return FriendRelationEnum.FRIENDS;
    }

    if (friendship.status === FriendshipStatusEnum.PENDING) {
      if (friendship.requester.toString() === viewerId.toString()) {
        return FriendRelationEnum.PENDING_OUTGOING;
      }

      return FriendRelationEnum.PENDING_INCOMING;
    }

    return FriendRelationEnum.NONE;
  }

  async countFriends(userId: Types.ObjectId): Promise<number> {
    return this.friendshipRepository.count({
      filter: {
        status: FriendshipStatusEnum.ACCEPTED,
        $or: [{ requester: userId }, { recipient: userId }],
      },
    });
  }

  async countMutualFriends(userA: Types.ObjectId, userB: Types.ObjectId): Promise<number> {
    const friendsA = await this.getAcceptedFriendIds(userA);
    const friendSetB = new Set((await this.getAcceptedFriendIds(userB)).map((id) => id.toString()));

    return friendsA.filter((id) => friendSetB.has(id.toString())).length;
  }

  userPopulate() {
    return [
      { path: "requester", select: USER_SELECT },
      { path: "recipient", select: USER_SELECT },
    ] as const;
  }

  otherUserFromFriendship(
    friendship: { requester: Types.ObjectId | IUser; recipient: Types.ObjectId | IUser },
    viewerId: Types.ObjectId,
  ) {
    const requesterId =
      friendship.requester instanceof Types.ObjectId
        ? friendship.requester.toString()
        : (friendship.requester as IUser & { _id: Types.ObjectId })._id.toString();

    return requesterId === viewerId.toString() ? friendship.recipient : friendship.requester;
  }
}

export const friendGraph = new FriendGraph();
