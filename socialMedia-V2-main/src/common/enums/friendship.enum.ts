export enum FriendshipStatusEnum {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  CANCELLED = "cancelled",
}

export enum FriendRelationEnum {
  NONE = "none",
  FRIENDS = "friends",
  PENDING_OUTGOING = "pending_outgoing",
  PENDING_INCOMING = "pending_incoming",
  SELF = "self",
  BLOCKED_BY_VIEWER = "blocked_by_viewer",
  BLOCKED_BY_TARGET = "blocked_by_target",
}
