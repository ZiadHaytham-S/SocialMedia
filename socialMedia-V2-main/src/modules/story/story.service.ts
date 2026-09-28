import { HydratedDocument, Types } from "mongoose";
import { StoryRepository } from "../../DB/repository";
import { BadRequestException, ForBiddenException, NotFoundException } from "../../common/exceptions";
import { RoleEnum } from "../../common/enums";
import { IStory, IUser, ReactionType } from "../../common/interfaces";
import { uploadFileToR2 } from "../../common/services";
import { serializeStories, serializeStory } from "../../common/utils/mediaResponse";
import { isAdmin } from "../../common/utils/adminAccess";
import { friendGraph } from "../../common/utils/friendGraph";

type StoryPayload = {
  content?: string;
};

export class StoryService {
  private readonly storyRepository: StoryRepository;

  constructor() {
    this.storyRepository = new StoryRepository();
  }

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === "string" ? Types.ObjectId.createFromHexString(id) : id;
  }

  private canManage(user: HydratedDocument<IUser>, author: Types.ObjectId): boolean {
    return user.role === RoleEnum.ADMIN || author.toString() === user._id.toString();
  }

  private async uploadAttachment({
    file,
    userId,
  }: {
    file?: Express.Multer.File;
    userId: Types.ObjectId;
  }) {
    if (!file) return undefined;

    const { key } = await uploadFileToR2({
      file,
      folder: `stories/${userId}`,
    });

    return { key };
  }

  async createStory({
    data,
    file,
    user,
  }: {
    data: StoryPayload;
    file?: Express.Multer.File | undefined;
    user: HydratedDocument<IUser>;
  }) {
    const hasContent = Boolean(data.content?.trim());
    const hasFile = Boolean(file);

    if (!hasContent && !hasFile) {
      throw new BadRequestException("Story content or attachment is required");
    }

    if (hasContent && hasFile) {
      throw new BadRequestException("Story must be either text or image, not both");
    }

    const attachment = hasFile
      ? await this.uploadAttachment({
          file: file as Express.Multer.File,
          userId: user._id,
        })
      : undefined;

    const story = await this.storyRepository.createOne({
      data: {
        content: hasContent ? data.content?.trim() : undefined,
        attachment,
        author: user._id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const populated = await this.storyRepository.findOne({
      filter: { _id: story._id },
      options: {
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    return serializeStory(populated ?? story, user);
  }

  private async assertCanViewStory(story: HydratedDocument<IStory>, viewer: HydratedDocument<IUser>) {
    const authorId =
      story.author instanceof Types.ObjectId
        ? story.author
        : (story.author as IUser & { _id: Types.ObjectId })._id;

    if (
      authorId.toString() !== viewer._id.toString() &&
      !isAdmin(viewer) &&
      !(await friendGraph.areFriends(viewer._id, authorId))
    ) {
      throw new ForBiddenException("You are not allowed to view this story");
    }
  }

  async feed(viewer: HydratedDocument<IUser>) {
    const filter = isAdmin(viewer)
      ? {}
      : { author: { $in: [viewer._id, ...(await friendGraph.getAcceptedFriendIds(viewer._id))] } };

    const stories = await this.storyRepository.find({
      filter,
      options: {
        sort: { createdAt: -1 },
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    return serializeStories(stories, viewer);
  }

  async profileStories(userId: string, viewer: HydratedDocument<IUser>) {
    const stories = await this.storyRepository.find({
      filter: { author: this.toObjectId(userId) },
      options: {
        sort: { createdAt: -1 },
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    return serializeStories(stories, viewer);
  }

  async getStory(storyId: string, viewer: HydratedDocument<IUser>) {
    const story = await this.storyRepository.findOne({
      filter: { _id: this.toObjectId(storyId) },
      options: {
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    if (!story) throw new NotFoundException("Story not found");
    await this.assertCanViewStory(story, viewer);
    return serializeStory(story, viewer);
  }

  async viewStory(storyId: string, viewer: HydratedDocument<IUser>) {
    const story = await this.storyRepository.findOne({
      filter: { _id: this.toObjectId(storyId) },
      options: {
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    if (!story) throw new NotFoundException("Story not found");
    await this.assertCanViewStory(story, viewer);

    const authorId =
      story.author instanceof Types.ObjectId
        ? story.author
        : (story.author as IUser & { _id: Types.ObjectId })._id;

    if (authorId.toString() !== viewer._id.toString()) {
      await this.storyRepository.findOneAndUpdate({
        filter: { _id: story._id },
        update: { $addToSet: { views: viewer._id } },
      });
    }

    const updated = await this.storyRepository.findOne({
      filter: { _id: story._id },
      options: {
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    return serializeStory(updated ?? story, viewer);
  }

  async reactOnStory(storyId: string, viewer: HydratedDocument<IUser>, type: ReactionType) {
    const story = await this.storyRepository.findOne({
      filter: { _id: this.toObjectId(storyId) },
      options: {
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    if (!story) throw new NotFoundException("Story not found");
    await this.assertCanViewStory(story, viewer);

    const reactions = (story.reactions ?? []).filter(
      (reaction) => reaction.userId.toString() !== viewer._id.toString(),
    );
    reactions.push({ userId: viewer._id, type, createdAt: new Date() });
    story.reactions = reactions;
    await story.save();
    await story.populate({ path: "author", select: "firstName lastName profilePicture" });

    return serializeStory(story, viewer);
  }

  async deleteStoryReaction(storyId: string, viewer: HydratedDocument<IUser>) {
    const story = await this.storyRepository.findOne({
      filter: { _id: this.toObjectId(storyId) },
      options: {
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    if (!story) throw new NotFoundException("Story not found");
    await this.assertCanViewStory(story, viewer);

    story.reactions = (story.reactions ?? []).filter(
      (reaction) => reaction.userId.toString() !== viewer._id.toString(),
    );
    await story.save();
    await story.populate({ path: "author", select: "firstName lastName profilePicture" });

    return serializeStory(story, viewer);
  }

  async deleteStory({
    storyId,
    user,
  }: {
    storyId: string;
    user: HydratedDocument<IUser>;
  }) {
    const story = await this.storyRepository.findOne({
      filter: { _id: this.toObjectId(storyId) },
    });
    if (!story) throw new NotFoundException("Story not found");
    if (!this.canManage(user, story.author)) {
      throw new ForBiddenException("You are not allowed to delete this story");
    }

    const deleted = await this.storyRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(storyId) },
      update: { deletedAt: new Date() },
      options: { new: true },
    });

    if (!deleted) throw new NotFoundException("Story not found");
    return serializeStory(deleted, user);
  }

  async dashboard(viewer: HydratedDocument<IUser>) {
    const stories = await this.storyRepository.find({ filter: {} });

    const latestStories = stories
      .sort((a: HydratedDocument<IStory>, b: HydratedDocument<IStory>) => {
        const bTime = b.createdAt?.getTime() || 0;
        const aTime = a.createdAt?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return {
      totalActiveStories: stories.length,
      latestStories: serializeStories(latestStories, viewer),
    };
  }
}

export default new StoryService();
