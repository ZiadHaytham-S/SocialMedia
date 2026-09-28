import { HydratedDocument, Types } from "mongoose";
import { FriendshipRepository, BlockRepository, UserRepository } from "../../DB/repository";
import {
  BadRequestException,
  ConflictException,
  ForBiddenException,
  NotFoundException,
} from "../../common/exceptions";
import { FriendshipStatusEnum, FriendRelationEnum } from "../../common/enums/friendship.enum";
import { IUser } from "../../common/interfaces";
import { getR2FileUrl } from "../../common/services";
import { isAdmin } from "../../common/utils/adminAccess";
import { friendGraph } from "../../common/utils/friendGraph";
import notificationService from "../notification/notification.service";

const USER_SELECT = "firstName lastName profilePicture profileCoverPictures createdAt email";

export class FriendService {
  private readonly friendshipRepository: FriendshipRepository;
  private readonly blockRepository: BlockRepository;
  private readonly userRepository: UserRepository;

  constructor() {
    this.friendshipRepository = new FriendshipRepository();
    this.blockRepository = new BlockRepository();
    this.userRepository = new UserRepository();
  }

  private serializeUser(user: Record<string, unknown>) {
    const profilePicture = user.profilePicture as { key?: string; url?: string | null } | undefined;

    if (profilePicture?.key) {
      profilePicture.url = getR2FileUrl(profilePicture.key) ?? profilePicture.url ?? null;
    }

    if (Array.isArray(user.profileCoverPictures)) {
      user.profileCoverPictures = user.profileCoverPictures.map((item) => {
        const picture = item as { key?: string; url?: string | null };

        return {
          ...picture,
          url: getR2FileUrl(picture.key) ?? picture.url ?? null,
        };
      });
    }

    return user;
  }

  private async assertUserExists(userId: string) {
    const user = await this.userRepository.findOne({
      filter: { _id: friendGraph.toObjectId(userId) },
      projection: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  private async assertNotBlocked(
    viewer: HydratedDocument<IUser>,
    targetId: Types.ObjectId,
  ) {
    if (isAdmin(viewer)) {
      return;
    }

    if (await friendGraph.isBlocked(viewer._id, targetId, viewer)) {
      throw new ForBiddenException("You cannot interact with this user");
    }
  }

  async sendRequest(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const viewerId = viewer._id;
    const targetId = friendGraph.toObjectId(targetUserId);

    if (viewerId.toString() === targetId.toString()) {
      throw new BadRequestException("You cannot send a friend request to yourself");
    }

    await this.assertUserExists(targetUserId);
    await this.assertNotBlocked(viewer, targetId);

    const existing = await this.friendshipRepository.findOne({
      filter: {
        $or: [
          { requester: viewerId, recipient: targetId },
          { requester: targetId, recipient: viewerId },
        ],
      },
    });

    if (existing?.status === FriendshipStatusEnum.ACCEPTED) {
      throw new ConflictException("You are already friends");
    }

    if (existing?.status === FriendshipStatusEnum.PENDING) {
      if (existing.requester.toString() === viewerId.toString()) {
        throw new ConflictException("Friend request already sent");
      }

      throw new ConflictException("This user already sent you a request. Accept it instead.");
    }

    if (existing) {
      await this.friendshipRepository.findOneAndUpdate({
        filter: { _id: existing._id },
        update: {
          requester: viewerId,
          recipient: targetId,
          status: FriendshipStatusEnum.PENDING,
          $unset: { respondedAt: 1 },
        },
      });
    } else {
      await this.friendshipRepository.createOne({
        data: {
          requester: viewerId,
          recipient: targetId,
          status: FriendshipStatusEnum.PENDING,
        },
      });
    }

    void notificationService.notifyFriendRequest(viewer, targetUserId).catch(() => undefined);

    return this.getStatus(viewer, targetUserId);
  }

  async cancelRequest(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const deleted = await this.friendshipRepository.findOneAndDelete({
      filter: {
        requester: viewer._id,
        recipient: friendGraph.toObjectId(targetUserId),
        status: FriendshipStatusEnum.PENDING,
      },
    });

    if (!deleted) {
      throw new NotFoundException("Outgoing friend request not found");
    }

    return this.getStatus(viewer, targetUserId);
  }

  async acceptRequest(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const updated = await this.friendshipRepository.findOneAndUpdate({
      filter: {
        requester: friendGraph.toObjectId(targetUserId),
        recipient: viewer._id,
        status: FriendshipStatusEnum.PENDING,
      },
      update: {
        status: FriendshipStatusEnum.ACCEPTED,
        respondedAt: new Date(),
      },
      options: { returnDocument: "after" },
    });

    if (!updated) {
      throw new NotFoundException("Incoming friend request not found");
    }

    void notificationService.notifyFriendAccepted(viewer, targetUserId).catch(() => undefined);

    return this.getStatus(viewer, targetUserId);
  }

  async declineRequest(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const updated = await this.friendshipRepository.findOneAndUpdate({
      filter: {
        requester: friendGraph.toObjectId(targetUserId),
        recipient: viewer._id,
        status: FriendshipStatusEnum.PENDING,
      },
      update: {
        status: FriendshipStatusEnum.DECLINED,
        respondedAt: new Date(),
      },
      options: { returnDocument: "after" },
    });

    if (!updated) {
      throw new NotFoundException("Incoming friend request not found");
    }

    return this.getStatus(viewer, targetUserId);
  }

  async unfriend(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const targetId = friendGraph.toObjectId(targetUserId);
    const deleted = await this.friendshipRepository.findOneAndDelete({
      filter: {
        status: FriendshipStatusEnum.ACCEPTED,
        $or: [
          { requester: viewer._id, recipient: targetId },
          { requester: targetId, recipient: viewer._id },
        ],
      },
    });

    if (!deleted) {
      throw new NotFoundException("Friendship not found");
    }

    return this.getStatus(viewer, targetUserId);
  }

  async blockUser(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const targetId = friendGraph.toObjectId(targetUserId);

    if (viewer._id.toString() === targetId.toString()) {
      throw new BadRequestException("You cannot block yourself");
    }

    await this.assertUserExists(targetUserId);

    await this.friendshipRepository.deleteMany({
      filter: {
        $or: [
          { requester: viewer._id, recipient: targetId },
          { requester: targetId, recipient: viewer._id },
        ],
      },
    });

    const existing = await this.blockRepository.findOne({
      filter: { blocker: viewer._id, blocked: targetId },
    });

    if (!existing) {
      await this.blockRepository.createOne({
        data: { blocker: viewer._id, blocked: targetId },
      });
    }

    return this.getStatus(viewer, targetUserId);
  }

  async unblockUser(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const deleted = await this.blockRepository.findOneAndDelete({
      filter: {
        blocker: viewer._id,
        blocked: friendGraph.toObjectId(targetUserId),
      },
    });

    if (!deleted) {
      throw new NotFoundException("Block not found");
    }

    return this.getStatus(viewer, targetUserId);
  }

  async listFriends(viewer: HydratedDocument<IUser>) {
    const friendships = await this.friendshipRepository.find({
      filter: {
        status: FriendshipStatusEnum.ACCEPTED,
        $or: [{ requester: viewer._id }, { recipient: viewer._id }],
      },
      options: {
        sort: { updatedAt: -1 },
        populate: [...friendGraph.userPopulate()],
      },
    });

    return friendships.map((row) => {
      const other = friendGraph.otherUserFromFriendship(row, viewer._id);
      const user =
        other && typeof other === "object" && "firstName" in other
          ? this.serializeUser((other as HydratedDocument<IUser>).toJSON() as unknown as Record<string, unknown>)
          : other;

      return {
        friendshipId: row._id.toString(),
        friendsSince: row.respondedAt ?? row.updatedAt ?? row.createdAt,
        user,
      };
    });
  }

  async listIncomingRequests(viewer: HydratedDocument<IUser>) {
    const rows = await this.friendshipRepository.find({
      filter: { recipient: viewer._id, status: FriendshipStatusEnum.PENDING },
      options: {
        sort: { createdAt: -1 },
        populate: [{ path: "requester", select: USER_SELECT }],
      },
    });

    return rows.map((row) => ({
      friendshipId: row._id.toString(),
      requestedAt: row.createdAt,
      user: this.serializeUser((row.requester as unknown as HydratedDocument<IUser>).toJSON() as unknown as Record<string, unknown>),
    }));
  }

  async listOutgoingRequests(viewer: HydratedDocument<IUser>) {
    const rows = await this.friendshipRepository.find({
      filter: { requester: viewer._id, status: FriendshipStatusEnum.PENDING },
      options: {
        sort: { createdAt: -1 },
        populate: [{ path: "recipient", select: USER_SELECT }],
      },
    });

    return rows.map((row) => ({
      friendshipId: row._id.toString(),
      requestedAt: row.createdAt,
      user: this.serializeUser((row.recipient as unknown as HydratedDocument<IUser>).toJSON() as unknown as Record<string, unknown>),
    }));
  }

  async listBlocked(viewer: HydratedDocument<IUser>) {
    const rows = await this.blockRepository.find({
      filter: { blocker: viewer._id },
      options: {
        sort: { createdAt: -1 },
        populate: [{ path: "blocked", select: USER_SELECT }],
      },
    });

    return rows.map((row) => ({
      blockId: row._id.toString(),
      blockedAt: row.createdAt,
      user: this.serializeUser((row.blocked as unknown as HydratedDocument<IUser>).toJSON() as unknown as Record<string, unknown>),
    }));
  }

  async getCounts(viewer: HydratedDocument<IUser>) {
    const [friends, incoming, outgoing] = await Promise.all([
      friendGraph.countFriends(viewer._id),
      this.friendshipRepository.count({
        filter: { recipient: viewer._id, status: FriendshipStatusEnum.PENDING },
      }),
      this.friendshipRepository.count({
        filter: { requester: viewer._id, status: FriendshipStatusEnum.PENDING },
      }),
    ]);

    return { friends, incoming, outgoing };
  }

  async getStatus(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const targetId = friendGraph.toObjectId(targetUserId);

    const relation = await friendGraph.getRelation(viewer._id, targetId);
    const [friendCount, mutualCount] = await Promise.all([
      friendGraph.countFriends(targetId),
      friendGraph.countMutualFriends(viewer._id, targetId),
    ]);

    return {
      relation,
      friendCount,
      mutualCount,
      canSendRequest: relation === FriendRelationEnum.NONE,
      canAccept: relation === FriendRelationEnum.PENDING_INCOMING,
      canCancel: relation === FriendRelationEnum.PENDING_OUTGOING,
      canUnfriend: relation === FriendRelationEnum.FRIENDS,
      canBlock: relation !== FriendRelationEnum.SELF && relation !== FriendRelationEnum.BLOCKED_BY_VIEWER,
      canUnblock: relation === FriendRelationEnum.BLOCKED_BY_VIEWER,
    };
  }

  async listMutual(viewer: HydratedDocument<IUser>, targetUserId: string) {
    const targetId = friendGraph.toObjectId(targetUserId);
    const friendsA = await friendGraph.getAcceptedFriendIds(viewer._id);
    const friendsB = await friendGraph.getAcceptedFriendIds(targetId);
    const mutualIds = friendsA
      .map((id) => id.toString())
      .filter((id) => friendsB.some((b) => b.toString() === id))
      .map((id) => friendGraph.toObjectId(id));

    if (!mutualIds.length) {
      return [];
    }

    const users = await this.userRepository.find({
      filter: { _id: { $in: mutualIds } },
      projection: USER_SELECT,
      options: { sort: { firstName: 1 } },
    });

    return users.map((user) => this.serializeUser(user.toJSON() as unknown as Record<string, unknown>));
  }

  async suggestions(viewer: HydratedDocument<IUser>, limit = 12) {
    const friendIds = await friendGraph.getAcceptedFriendIds(viewer._id);
    const blockedIds = await friendGraph.getBlockedUserIds(viewer._id);
    const exclude = new Set([
      viewer._id.toString(),
      ...friendIds.map((id) => id.toString()),
      ...blockedIds.map((id) => id.toString()),
    ]);

    const pending = await this.friendshipRepository.find({
      filter: {
        status: FriendshipStatusEnum.PENDING,
        $or: [{ requester: viewer._id }, { recipient: viewer._id }],
      },
    });

    for (const row of pending) {
      exclude.add(row.requester.toString());
      exclude.add(row.recipient.toString());
    }

    const users = await this.userRepository.find({
      filter: { _id: { $nin: [...exclude].map((id) => friendGraph.toObjectId(id)) } },
      projection: USER_SELECT,
      options: { sort: { createdAt: -1 }, limit },
    });

    const suggestions = await Promise.all(
      users.map(async (user) => ({
        user: this.serializeUser(user.toJSON() as unknown as Record<string, unknown>),
        mutualCount: await friendGraph.countMutualFriends(viewer._id, user._id),
      })),
    );

    return suggestions.sort((a, b) => b.mutualCount - a.mutualCount);
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async searchUsers(viewer: HydratedDocument<IUser>, query: string, limit = 20) {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      throw new BadRequestException("Search query must be at least 2 characters");
    }

    const blockedIds = await friendGraph.getBlockedUserIds(viewer._id);
    const exclude = [viewer._id, ...blockedIds];
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const tokenFilters = tokens.map((token) => {
      const regex = new RegExp(this.escapeRegex(token), "i");

      return {
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
      };
    });

    const users = await this.userRepository.find({
      filter: {
        _id: { $nin: exclude },
        $or: [
          { $and: tokenFilters },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ["$firstName", " ", "$lastName"] },
                regex: this.escapeRegex(trimmed),
                options: "i",
              },
            },
          },
        ],
      },
      projection: USER_SELECT,
      options: { sort: { firstName: 1 }, limit },
    });

    return Promise.all(
      users.map(async (user) => ({
        user: this.serializeUser(user.toJSON() as unknown as Record<string, unknown>),
        relation: await friendGraph.getRelation(viewer._id, user._id),
        mutualCount: await friendGraph.countMutualFriends(viewer._id, user._id),
      })),
    );
  }

  async profileMeta(viewer: HydratedDocument<IUser>, targetUserId: string) {
    return this.getStatus(viewer, targetUserId);
  }
}

export default new FriendService();
