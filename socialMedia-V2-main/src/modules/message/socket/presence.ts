import { redisService } from "../../../common/services";

const PRESENCE_TTL_SECONDS = 90;
const PRESENCE_KEY_PREFIX = "presence:user:";

function presenceKey(userId: string) {
  return `${PRESENCE_KEY_PREFIX}${userId}`;
}

export async function markUserOnline(userId: string) {
  await redisService.set({
    key: presenceKey(userId),
    value: "1",
    ttl: PRESENCE_TTL_SECONDS,
  });
}

export async function markUserOffline(userId: string) {
  await redisService.deleteKey(presenceKey(userId));
}

export async function refreshUserPresence(userId: string) {
  await redisService.set({
    key: presenceKey(userId),
    value: "1",
    ttl: PRESENCE_TTL_SECONDS,
  });
}

export async function isUserOnline(userId: string) {
  const exists = await redisService.exists(presenceKey(userId));
  return Boolean(exists);
}

export function getOnlineUserIds() {
  return [] as string[];
}
