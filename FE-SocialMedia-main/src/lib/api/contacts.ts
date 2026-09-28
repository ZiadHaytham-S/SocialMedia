import type { ApiUser } from "@/types/social";
import { isAdmin } from "@/lib/auth/roles";
import { listFriendContacts } from "@/lib/api/friend";
import { listUsers } from "@/lib/api/user";

/** Friends for normal users; all users (except self) for admins (mentions / sidebar). */
export async function listContactsForViewer(viewer: ApiUser): Promise<ApiUser[]> {
  if (isAdmin(viewer)) {
    const users = await listUsers();
    return users.filter((user) => user.id !== viewer.id);
  }

  return listFriendContacts();
}
