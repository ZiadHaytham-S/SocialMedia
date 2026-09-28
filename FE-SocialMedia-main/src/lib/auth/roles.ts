import type { ApiUser } from "@/types/social";

/** Matches backend `RoleEnum.ADMIN`. */
export const ADMIN_ROLE = 1;

export function isAdmin(user?: Pick<ApiUser, "role"> | null): boolean {
  return user?.role === ADMIN_ROLE;
}

export function canModerateContent(viewer: ApiUser, authorId: string): boolean {
  return isAdmin(viewer) || viewer.id === authorId;
}
