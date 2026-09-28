import type { ApiUser } from "@/types/social";

/** Default avatar when the API returns no profile image. */
export const defaultAvatar = "/default-avatar.svg";

/** Neutral placeholder — never a fake person name. Used only for missing API fields. */
export const anonymousUser: ApiUser = {
  id: "",
  name: "",
  username: "",
  avatarUrl: defaultAvatar,
  coverUrl: "",
};
