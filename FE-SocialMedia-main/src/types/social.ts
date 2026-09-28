export type ApiMessageUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
};

export type ApiMessage = {
  id: string;
  conversationId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: "audio" | "image" | "video";
  attachmentName?: string;
  attachmentSize?: number;
  editedAt?: string;
  isPinned?: boolean;
  viewerReaction?: string;
  reactions?: { type: string; count: number }[];
  forwardedFrom?: {
    messageId: string;
    senderName: string;
    content: string;
  };
  sender: ApiMessageUser;
  createdAt: string;
  readAt?: string;
};

export type ApiConversation = {
  id: string;
  peer: ApiMessageUser;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
};

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "comment"
  | "comment_reply"
  | "comment_mention"
  | "post_mention"
  | "post_share"
  | "post_reaction"
  | "comment_reaction"
  | "message"
  | "generic";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
  fromUserId?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
};

export type FriendRelation =
  | "none"
  | "friends"
  | "pending_outgoing"
  | "pending_incoming"
  | "self"
  | "blocked_by_viewer"
  | "blocked_by_target";

export type FriendMeta = {
  relation: FriendRelation;
  friendCount: number;
  mutualCount: number;
  canSendRequest: boolean;
  canAccept: boolean;
  canCancel: boolean;
  canUnfriend: boolean;
  canBlock: boolean;
  canUnblock: boolean;
};

export type FriendCounts = {
  friends: number;
  incoming: number;
  outgoing: number;
};

export type FriendListItem = {
  friendshipId?: string;
  friendsSince?: string;
  requestedAt?: string;
  blockedAt?: string;
  blockId?: string;
  user: ApiUser;
  mutualCount?: number;
};

export type FriendSearchHit = {
  user: ApiUser;
  relation: FriendRelation;
  mutualCount: number;
};

export type ApiUser = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  gender?: number;
  DOB?: string;
  role?: number;
  deletedAt?: string;
  restoredAt?: string;
  profileVisitCount?: number;
  avatarUrl?: string;
  coverUrl?: string;
  coverUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
  friendMeta?: FriendMeta;
};

export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export type ApiComment = {
  id: string;
  body: string;
  attachmentUrl?: string;
  createdAt?: string;
  reactionsCount: number;
  viewerReacted: boolean;
  viewerReactionType?: ReactionType;
  reactionTypes?: ReactionType[];
  /** Display owner (from API `author` / `createdBy`). */
  author: ApiUser;
  createdBy?: ApiUser;
  postId?: string;
  /** Parent comment id when this comment is a reply. */
  parentCommentId?: string;
  tagIds?: string[];
};

export type PostAvailability = "PUBLIC" | "PRIVATE" | "ONLY";

export type ApiPost = {
  id: string;
  body: string;
  imageUrl?: string;
  folderId?: string;
  availability?: PostAvailability;
  createdAt?: string;
  reactionsCount: number;
  commentsCount: number;
  shareCount: number;
  viewerReacted: boolean;
  viewerReactionType?: ReactionType;
  reactionTypes?: ReactionType[];
  author: ApiUser;
  createdBy?: ApiUser;
  comments?: ApiComment[];
  allowComments?: boolean;
  tagIds?: string[];
  /** Embedded original when this post is a share/repost. */
  sharedPost?: ApiPost;
  sharedPostUnavailable?: boolean;
};

export type ApiStory = {
  id: string;
  body?: string;
  imageUrl?: string;
  createdAt?: string;
  expiresAt?: string;
  viewsCount: number;
  reactionsCount: number;
  viewerViewed: boolean;
  viewerReacted: boolean;
  viewerReactionType?: ReactionType;
  reactionTypes?: ReactionType[];
  author: ApiUser;
};

export type StoryDashboard = {
  totalActiveStories: number;
  latestStories: ApiStory[];
};

export type PostDashboard = {
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  latestPosts: ApiPost[];
};

export type LoginCredentials = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: ApiUser;
};
