import { HydratedDocument, Types } from "mongoose";
import { RoleEnum } from "../enums";
import type { IUser } from "../interfaces";

type UserLike = Pick<IUser, "role"> & { _id?: Types.ObjectId | string };

export function isAdmin(user?: UserLike | HydratedDocument<IUser> | null): boolean {
  return user?.role === RoleEnum.ADMIN;
}

export function isAdminOrOwner(
  user: UserLike | HydratedDocument<IUser>,
  ownerId: string | Types.ObjectId | { toString(): string },
): boolean {
  const userId =
    user._id instanceof Types.ObjectId
      ? user._id.toString()
      : typeof user._id === "string"
        ? user._id
        : (user as HydratedDocument<IUser>)._id.toString();

  return isAdmin(user) || userId === ownerId.toString();
}
