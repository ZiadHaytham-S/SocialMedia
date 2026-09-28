import type { ApiPost } from "@/types/social";

/** Post id to send to the share API (underlying content, not the repost wrapper). */
export function getShareTargetPostId(post: ApiPost) {
  return post.sharedPost?.id ?? post.id;
}

/** Post shown inside the share modal preview. */
export function getSharePreviewPost(post: ApiPost) {
  return post.sharedPost ?? post;
}

/** Share count for the underlying content (original post, not repost wrapper). */
export function getDisplayShareCount(post: ApiPost) {
  if (post.sharedPost) {
    return post.sharedPost.shareCount ?? 0;
  }

  return post.shareCount ?? 0;
}

/** Prepend new share post and bump shareCount on the original everywhere it appears in the feed. */
export function prependShareAndIncrementCount(posts: ApiPost[], sharedPost: ApiPost) {
  const originalId = sharedPost.sharedPost?.id;

  if (!originalId) {
    return [sharedPost, ...posts];
  }

  return [
    sharedPost,
    ...posts.map((item) => {
      if (item.id === originalId) {
        return { ...item, shareCount: (item.shareCount ?? 0) + 1 };
      }

      if (item.sharedPost?.id === originalId) {
        return {
          ...item,
          sharedPost: { ...item.sharedPost, shareCount: (item.sharedPost.shareCount ?? 0) + 1 },
        };
      }

      return item;
    }),
  ];
}
