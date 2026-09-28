import type { ApiUser, FriendCounts, FriendListItem, FriendMeta, FriendRelation, FriendSearchHit } from "@/types/social";
import { apiRequest } from "../client";
import { asRecord, normalizeUser, unwrapList, unwrapResult } from "../normalizers";

function normalizeFriendMeta(value: unknown): FriendMeta {
  const record = asRecord(value);

  return {
    relation: (record.relation as FriendRelation) ?? "none",
    friendCount: typeof record.friendCount === "number" ? record.friendCount : 0,
    mutualCount: typeof record.mutualCount === "number" ? record.mutualCount : 0,
    canSendRequest:
      typeof record.canSendRequest === "boolean"
        ? record.canSendRequest
        : record.relation === "none",
    canAccept: Boolean(record.canAccept),
    canCancel: Boolean(record.canCancel),
    canUnfriend: Boolean(record.canUnfriend),
    canBlock: Boolean(record.canBlock),
    canUnblock: Boolean(record.canUnblock),
  };
}

function normalizeFriendListItem(value: unknown): FriendListItem {
  const record = asRecord(value);

  return {
    friendshipId: typeof record.friendshipId === "string" ? record.friendshipId : undefined,
    friendsSince: typeof record.friendsSince === "string" ? record.friendsSince : undefined,
    requestedAt: typeof record.requestedAt === "string" ? record.requestedAt : undefined,
    blockedAt: typeof record.blockedAt === "string" ? record.blockedAt : undefined,
    blockId: typeof record.blockId === "string" ? record.blockId : undefined,
    mutualCount: typeof record.mutualCount === "number" ? record.mutualCount : undefined,
    user: normalizeUser(record.user),
  };
}

function normalizeSearchHit(value: unknown): FriendSearchHit {
  const record = asRecord(value);

  return {
    user: normalizeUser(record.user),
    relation: (record.relation as FriendRelation) ?? "none",
    mutualCount: typeof record.mutualCount === "number" ? record.mutualCount : 0,
  };
}

export async function listFriends(): Promise<FriendListItem[]> {
  const data = await apiRequest<unknown>("/friend");
  return unwrapList(data).map((item) => normalizeFriendListItem(item));
}

export async function listFriendContacts(): Promise<ApiUser[]> {
  const friends = await listFriends();
  return friends.map((item) => item.user);
}

export async function getFriendCounts(): Promise<FriendCounts> {
  const data = await apiRequest<unknown>("/friend/counts");
  const result = asRecord(unwrapResult(data));

  return {
    friends: typeof result.friends === "number" ? result.friends : 0,
    incoming: typeof result.incoming === "number" ? result.incoming : 0,
    outgoing: typeof result.outgoing === "number" ? result.outgoing : 0,
  };
}

export async function getFriendStatus(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/status/${userId}`);
  return normalizeFriendMeta(unwrapResult(data));
}

export async function listIncomingFriendRequests(): Promise<FriendListItem[]> {
  const data = await apiRequest<unknown>("/friend/requests/incoming");
  return unwrapList(data).map((item) => normalizeFriendListItem(item));
}

export async function listOutgoingFriendRequests(): Promise<FriendListItem[]> {
  const data = await apiRequest<unknown>("/friend/requests/outgoing");
  return unwrapList(data).map((item) => normalizeFriendListItem(item));
}

export async function listFriendSuggestions(): Promise<FriendListItem[]> {
  const data = await apiRequest<unknown>("/friend/suggestions");
  return unwrapList(data).map((item) => normalizeFriendListItem(item));
}

export async function listBlockedUsers(): Promise<FriendListItem[]> {
  const data = await apiRequest<unknown>("/friend/blocked");
  return unwrapList(data).map((item) => normalizeFriendListItem(item));
}

export async function listMutualFriends(userId: string): Promise<ApiUser[]> {
  const data = await apiRequest<unknown>(`/friend/mutual/${userId}`);
  return unwrapList(data).map((item) => normalizeUser(item));
}

export async function searchUsersForFriends(query: string): Promise<FriendSearchHit[]> {
  const data = await apiRequest<unknown>(`/friend/search?q=${encodeURIComponent(query)}`);
  return unwrapList(data).map((item) => normalizeSearchHit(item));
}

export async function sendFriendRequest(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/request/${userId}`, { method: "POST" });
  return normalizeFriendMeta(unwrapResult(data));
}

export async function cancelFriendRequest(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/request/${userId}`, { method: "DELETE" });
  return normalizeFriendMeta(unwrapResult(data));
}

export async function acceptFriendRequest(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/request/${userId}/accept`, { method: "PATCH" });
  return normalizeFriendMeta(unwrapResult(data));
}

export async function declineFriendRequest(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/request/${userId}/decline`, { method: "PATCH" });
  return normalizeFriendMeta(unwrapResult(data));
}

export async function unfriendUser(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/${userId}`, { method: "DELETE" });
  return normalizeFriendMeta(unwrapResult(data));
}

export async function blockUser(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/block/${userId}`, { method: "POST" });
  return normalizeFriendMeta(unwrapResult(data));
}

export async function unblockUser(userId: string): Promise<FriendMeta> {
  const data = await apiRequest<unknown>(`/friend/block/${userId}`, { method: "DELETE" });
  return normalizeFriendMeta(unwrapResult(data));
}
