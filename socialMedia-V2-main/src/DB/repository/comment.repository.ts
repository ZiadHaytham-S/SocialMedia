import { HydratedDocument, Types } from "mongoose";
import { IComment } from "../../common/interfaces";
import { CommentModel } from "../models/comment.model";
import { DataBaseRepository } from "./base.repository";

export class CommentRepository extends DataBaseRepository<IComment> {
  constructor() {
    super(CommentModel);
  }

  async countGroupedByPost(postIds: Types.ObjectId[]): Promise<Record<string, number>> {
    if (!postIds.length) {
      return {};
    }

    const rows = await this.model.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          post: { $in: postIds },
          deletedAt: { $exists: false },
        },
      },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);

    return Object.fromEntries(rows.map((row) => [row._id.toString(), row.count]));
  }

  async findRootPreviewsByPosts(
    postIds: Types.ObjectId[],
    limitPerPost = 2,
  ): Promise<Map<string, HydratedDocument<IComment>[]>> {
    const map = new Map<string, HydratedDocument<IComment>[]>();

    if (!postIds.length || limitPerPost < 1) {
      return map;
    }

    const comments = await this.find({
      filter: {
        post: { $in: postIds },
        $or: [{ parentComment: { $exists: false } }, { parentComment: null }],
        deletedAt: { $exists: false },
      },
      options: {
        sort: { createdAt: 1 },
        populate: [{ path: "author", select: "firstName lastName profilePicture" }],
      },
    });

    for (const comment of comments) {
      const postId = comment.post.toString();
      const bucket = map.get(postId) ?? [];

      if (bucket.length < limitPerPost) {
        bucket.push(comment);
        map.set(postId, bucket);
      }
    }

    return map;
  }
}
