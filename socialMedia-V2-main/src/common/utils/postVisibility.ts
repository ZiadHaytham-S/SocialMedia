import { HydratedDocument, Types } from "mongoose";
import { AvailabilityEnum } from "../enums";
import type { IPost, IUser } from "../interfaces";
import { isAdmin } from "./adminAccess";
import { friendGraph } from "./friendGraph";

function toAuthorId(author: Types.ObjectId | IUser): Types.ObjectId {
  if (author instanceof Types.ObjectId) {
    return author;
  }

  const record = author as IUser & { _id?: Types.ObjectId };
  return record._id instanceof Types.ObjectId ? record._id : Types.ObjectId.createFromHexString(String(record._id));
}

/** Build accepted-friend id set for the viewer (used for PRIVATE posts and feed scope). */
export async function getViewerFriendIdSet(viewer: HydratedDocument<IUser>) {
  const friendIds = await friendGraph.getAcceptedFriendIds(viewer._id);
  const set = new Set<string>([viewer._id.toString()]);

  for (const id of friendIds) {
    set.add(id.toString());
  }

  return set;
}

/** PUBLIC = everyone; PRIVATE = author + tagged users + friends; ONLY = author only. */
export function canViewerSeePost(
  post: HydratedDocument<IPost>,
  viewer: HydratedDocument<IUser>,
  friendIdSet?: Set<string>,
): boolean {
  const authorId = toAuthorId(post.author).toString();

  if (authorId === viewer._id.toString() || isAdmin(viewer)) {
    return true;
  }

  const availability = post.availability ?? AvailabilityEnum.PUBLIC;

  if (availability === AvailabilityEnum.ONLY) {
    return false;
  }

  if (availability === AvailabilityEnum.PUBLIC) {
    return true;
  }

  if (availability === AvailabilityEnum.PRIVATE) {
    const taggedIds = (post.tags ?? []).map((tag) => tag.toString());

    if (taggedIds.includes(viewer._id.toString())) {
      return true;
    }

    if (friendIdSet?.has(authorId)) {
      return true;
    }

    return false;
  }

  return true;
}

/** Home feed: admins see all posts; users see self + friends only. */
export async function feedVisibilityFilter(viewer: HydratedDocument<IUser>) {
  if (isAdmin(viewer)) {
    return {};
  }

  const friendIds = await friendGraph.getAcceptedFriendIds(viewer._id);

  return {
    author: { $in: [viewer._id, ...friendIds] },
  };
}
