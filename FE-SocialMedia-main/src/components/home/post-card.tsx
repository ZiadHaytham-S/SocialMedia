"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import { formatRelativeTime } from "@/lib/utils/format-time";
import type { ApiComment, ApiPost, ApiUser, PostAvailability, ReactionType } from "@/types/social";
import { createComment, deleteComment, getPostComments, updateComment } from "@/lib/api/comment";
import { preserveEntityAuthor } from "@/lib/api/normalizers";
import { deletePost, reactOnPost, removePostReaction, sharePost, updatePost } from "@/lib/api/post";
import { canModerateContent, isAdmin } from "@/lib/auth/roles";
import { getDisplayShareCount, getSharePreviewPost, getShareTargetPostId } from "@/lib/utils/post-share";
import { buildCommentTree, collectDescendantIds, removeCommentBranch } from "@/lib/utils/comment-tree";
import { mergeTagIds, resolveTagIds } from "@/lib/utils/tag-users";
import { cn, ui } from "@/lib/theme/ui";
import { AvailabilityBadge } from "./availability-select";
import { CommentThread } from "./comment-thread";
import { PostEditModal } from "./post-edit-modal";
import { PostShareModal } from "./post-share-modal";
import { SharedPostPreview } from "./shared-post-preview";
import { CommentIcon, DotsIcon, ShareIcon } from "./icons";
import { ReactionLikeControl, ReactionSummary } from "./reaction-picker";
import { CommentComposer } from "./comment-composer";
import { MentionBody } from "./mention-body";
import { ShareLinkButton } from "@/components/ui/share-link-button";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { TaggedUsersRow } from "./tag-picker";

const COMMENT_PREVIEW = 2;

type PostCardProps = {
  post: ApiPost;
  viewer: ApiUser;
  contacts?: ApiUser[];
  onDeletePost: (postId: string) => void;
  onUpdatePost: (post: ApiPost) => void;
  onSharePost?: (post: ApiPost) => void;
};

export function PostCard({ post, viewer, contacts = [], onDeletePost, onUpdatePost, onSharePost }: PostCardProps) {
  const { t, locale } = useLocale();
  const commentFileRef = useRef<HTMLInputElement>(null);
  const [currentPost, setCurrentPost] = useState(post);
  const [isReacted, setIsReacted] = useState(post.viewerReacted);
  const [viewerReactionType, setViewerReactionType] = useState<ReactionType | undefined>(post.viewerReactionType);
  const [reactionTypes, setReactionTypes] = useState<ReactionType[]>(post.reactionTypes ?? []);
  const [reactionsCount, setReactionsCount] = useState(post.reactionsCount);
  const [comments, setComments] = useState<ApiComment[]>(post.comments ?? []);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || post.comments?.length || 0);
  const [sharesCount, setSharesCount] = useState(getDisplayShareCount(post));
  const [commentBody, setCommentBody] = useState("");
  const [commentAttachment, setCommentAttachment] = useState<File>();
  const [commentTagIds, setCommentTagIds] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ApiComment>();
  const [commentError, setCommentError] = useState("");
  const [postError, setPostError] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedPostContent, setEditedPostContent] = useState(post.body);
  const [editedAllowComments, setEditedAllowComments] = useState(post.allowComments !== false);
  const [editedAvailability, setEditedAvailability] = useState<PostAvailability>(post.availability ?? "PUBLIC");
  const [editedTagIds, setEditedTagIds] = useState<string[]>(post.tagIds ?? []);
  const [editingCommentId, setEditingCommentId] = useState<string>();
  const [editedCommentContent, setEditedCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [updatingCommentId, setUpdatingCommentId] = useState<string>();
  const [deletingCommentId, setDeletingCommentId] = useState<string>();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const [shareAllowComments, setShareAllowComments] = useState(true);
  const [shareAvailability, setShareAvailability] = useState<PostAvailability>("PUBLIC");
  const [isSharing, setIsSharing] = useState(false);
  const postMenuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentPost.author.id === viewer.id;
  const canModerate = canModerateContent(viewer, currentPost.author.id);
  const embeddedPost = currentPost.sharedPost;
  const sharePreviewPost = getSharePreviewPost(currentPost);
  const commentsEnabled = currentPost.allowComments !== false;
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const visibleRoots = commentsOpen ? commentTree : commentTree.slice(0, COMMENT_PREVIEW);
  const showViewAllComments = commentsCount > visibleRoots.length && !commentsOpen;
  const postTaggedUsers = resolveTagIds(currentPost.tagIds, contacts);

  async function loadComments() {
    if (commentsLoaded || isLoadingComments) {
      return;
    }

    setIsLoadingComments(true);
    setCommentError("");

    try {
      const nextComments = await getPostComments(currentPost.id);
      setComments(nextComments);
      setCommentsCount(Math.max(post.commentsCount ?? 0, nextComments.length));
      setCommentsLoaded(true);
    } catch {
      setCommentError("post.loadCommentsError");
    } finally {
      setIsLoadingComments(false);
    }
  }

  useEffect(() => {
    const preview = post.comments ?? [];
    setComments(preview);
    setCommentsCount(post.commentsCount ?? preview.length);
    setSharesCount(getDisplayShareCount(post));
    setCommentsLoaded(false);
    setCommentsOpen(false);
  }, [post]);

  function syncReactionState(nextPost: ApiPost) {
    setIsReacted(nextPost.viewerReacted);
    setViewerReactionType(nextPost.viewerReactionType);
    setReactionsCount(nextPost.reactionsCount);
    setReactionTypes(nextPost.reactionTypes ?? []);
    setCurrentPost((current) => preserveEntityAuthor(current, { ...current, ...nextPost }));
  }

  useEffect(() => {
    if (!postMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) {
        setPostMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [postMenuOpen]);

  useEffect(() => {
    setCurrentPost(post);
    setIsReacted(post.viewerReacted);
    setViewerReactionType(post.viewerReactionType);
    setReactionTypes(post.reactionTypes ?? []);
    setReactionsCount(post.reactionsCount);
    setEditedPostContent(post.body);
    setEditedAllowComments(post.allowComments !== false);
    setEditedAvailability(post.availability ?? "PUBLIC");
    setEditedTagIds(post.tagIds ?? []);
  }, [post]);

  async function handleRemoveReaction() {
    setPostError("");
    const previous = {
      reacted: isReacted,
      type: viewerReactionType,
      count: reactionsCount,
      types: reactionTypes,
    };

    setIsReacted(false);
    setViewerReactionType(undefined);
    setReactionsCount((count) => Math.max(0, count - 1));

    try {
      const updatedPost = await removePostReaction(currentPost.id);
      syncReactionState(updatedPost);
    } catch {
      setIsReacted(previous.reacted);
      setViewerReactionType(previous.type);
      setReactionsCount(previous.count);
      setReactionTypes(previous.types);
      setPostError("post.reactError");
    }
  }

  async function handleReact(type: ReactionType) {
    setPostError("");

    if (isReacted && viewerReactionType === type) {
      await handleRemoveReaction();
      return;
    }

    const previous = {
      reacted: isReacted,
      type: viewerReactionType,
      count: reactionsCount,
      types: reactionTypes,
    };

    setIsReacted(true);
    setViewerReactionType(type);
    if (!previous.reacted) {
      setReactionsCount((count) => count + 1);
    }
    setReactionTypes((current) => (current.includes(type) ? current : [...current, type]));

    try {
      const updatedPost = await reactOnPost(currentPost.id, type);
      syncReactionState(updatedPost);
    } catch {
      setIsReacted(previous.reacted);
      setViewerReactionType(previous.type);
      setReactionsCount(previous.count);
      setReactionTypes(previous.types);
      setPostError("post.reactError");
    }
  }

  async function ensureCommentsLoaded() {
    if (!commentsLoaded) {
      await loadComments();
    }
  }

  async function handleOpenComments() {
    await ensureCommentsLoaded();
    setCommentsOpen(true);
  }

  async function handleCommentCountClick() {
    await ensureCommentsLoaded();
    setCommentsOpen((open) => !open);
  }

  async function handleExpandComments() {
    await ensureCommentsLoaded();
    setCommentsOpen(true);
  }

  function resetCommentComposer() {
    setCommentBody("");
    setCommentAttachment(undefined);
    setCommentTagIds([]);
    setReplyingTo(undefined);
    if (commentFileRef.current) {
      commentFileRef.current.value = "";
    }
  }

  async function handleCreateComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommentError("");

    if (!commentsEnabled) {
      setCommentError("post.commentsDisabled");
      return;
    }

    if (!commentBody.trim() && !commentAttachment) {
      return;
    }

    try {
      if (isSubmittingComment) {
        return;
      }

      setIsSubmittingComment(true);
      const mergedTags = mergeTagIds(commentTagIds, commentBody, contacts);
      const createdComment = await createComment(currentPost.id, {
        content: commentBody,
        attachment: commentAttachment,
        commentId: replyingTo?.id,
        tagIds: mergedTags,
      });
      const localAttachmentUrl = commentAttachment ? URL.createObjectURL(commentAttachment) : createdComment.attachmentUrl;
      setComments((current) => [
        {
          ...createdComment,
          attachmentUrl: localAttachmentUrl,
          author: viewer,
          createdBy: viewer,
          parentCommentId: replyingTo?.id,
          tagIds: mergedTags,
        },
        ...current,
      ]);
      setCommentsCount((count) => count + 1);
      resetCommentComposer();
      setCommentsOpen(true);
    } catch {
      setCommentError("post.createCommentError");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleUpdatePost() {
    setPostError("");

    try {
      const mergedTags = mergeTagIds(editedTagIds, editedPostContent, contacts);
      const updatedPost = await updatePost(currentPost.id, {
        content: editedPostContent,
        allowComments: editedAllowComments,
        availability: editedAvailability,
        tagIds: mergedTags,
      });
      const nextPost = {
        ...updatedPost,
        author: currentPost.author,
        tagIds: mergedTags,
        availability: editedAvailability,
      };
      setCurrentPost(nextPost);
      setIsEditingPost(false);
      onUpdatePost(nextPost);
    } catch {
      setPostError("post.updateError");
    }
  }

  async function handleDeletePost() {
    setPostError("");

    try {
      await deletePost(currentPost.id);
      onDeletePost(currentPost.id);
    } catch {
      setPostError("post.deleteError");
    }
  }

  async function handleSharePost() {
    setPostError("");
    setIsSharing(true);

    try {
      const shared = await sharePost(getShareTargetPostId(currentPost), {
        content: shareContent,
        allowComments: shareAllowComments,
        availability: shareAvailability,
      });
      setSharesCount((count) => count + 1);
      onSharePost?.(shared);
      setShareOpen(false);
      setShareContent("");
      setShareAllowComments(true);
      setShareAvailability("PUBLIC");
    } catch {
      setPostError("share.error");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleUpdateComment(commentId: string) {
    setCommentError("");

    try {
      if (updatingCommentId) {
        return;
      }

      setUpdatingCommentId(commentId);
      const previous = comments.find((comment) => comment.id === commentId);
      const nextComment = await updateComment(commentId, editedCommentContent);
      setComments((current) =>
        current.map((comment) => (comment.id === commentId ? preserveEntityAuthor(previous, nextComment) : comment)),
      );
      setEditingCommentId(undefined);
      setEditedCommentContent("");
    } catch {
      setCommentError("post.updateCommentError");
    } finally {
      setUpdatingCommentId(undefined);
    }
  }

  async function handleDeleteComment(commentId: string) {
    setCommentError("");

    try {
      if (deletingCommentId) {
        return;
      }

      setDeletingCommentId(commentId);
      await deleteComment(commentId);
      const removedCount = collectDescendantIds(comments, commentId).size;
      const nextComments = removeCommentBranch(comments, commentId);
      setComments(nextComments);
      setCommentsCount((count) => Math.max(0, count - removedCount));
      if (replyingTo?.id === commentId) {
        setReplyingTo(undefined);
      }
    } catch {
      setCommentError("post.deleteCommentError");
    } finally {
      setDeletingCommentId(undefined);
    }
  }

  return (
    <article className={ui.feedCard}>
      <div className="flex items-start justify-between gap-2 px-4 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <UserProfileLink layout="avatar" stopPropagation user={currentPost.author} />
          <div className="min-w-0">
            <p className="flex min-w-0 items-center gap-1 truncate">
              <UserProfileLink layout="name" stopPropagation user={currentPost.author} />
              <AvailabilityBadge value={currentPost.availability} />
            </p>
            <p className={ui.meta}>
              {embeddedPost ? `${t("post.sharedPost")} · ` : ""}
              {formatRelativeTime(currentPost.createdAt, locale)}
              {isOwner ? ` · ${t("post.you")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
        {isAdmin(viewer) && !isOwner ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
            {t("admin.badge")}
          </span>
        ) : null}
        {canModerate ? (
          <div className="relative" ref={postMenuRef}>
            <button
              aria-expanded={postMenuOpen}
              aria-haspopup="menu"
              className={cn(ui.iconButton, postMenuOpen && "bg-surface-hover")}
              onClick={() => setPostMenuOpen((open) => !open)}
              type="button"
            >
              <DotsIcon className="h-5 w-5" />
            </button>
            {postMenuOpen ? (
              <div
                className={cn(
                  "absolute end-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-lg bg-surface py-1 shadow-[var(--shadow-elevated)] ring-1 ring-border-light",
                )}
                role="menu"
              >
                <button
                  className={cn(ui.menuItem, "text-[15px]")}
                  onClick={() => {
                    setEditedPostContent(currentPost.body);
                    setEditedAllowComments(commentsEnabled);
                    setEditedAvailability(currentPost.availability ?? "PUBLIC");
                    setEditedTagIds(currentPost.tagIds ?? []);
                    setIsEditingPost(true);
                    setPostMenuOpen(false);
                  }}
                  role="menuitem"
                  type="button"
                >
                  {isOwner ? t("post.edit") : t("admin.editPost")}
                </button>
                <ShareLinkButton
                  targetId={currentPost.id}
                  type="post"
                  variant="menu"
                />
                <div className="mx-2 my-1 h-px bg-border-light" role="separator" />
                <button
                  className={cn(ui.menuItemDanger, "text-[15px]")}
                  onClick={() => {
                    setPostMenuOpen(false);
                    void handleDeletePost();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {isOwner ? t("post.delete") : t("admin.deletePost")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>

      <div className="space-y-2 px-4 pb-3">
        {currentPost.body ? <MentionBody contacts={contacts} text={currentPost.body} /> : null}
        {!embeddedPost ? <TaggedUsersRow users={postTaggedUsers} /> : null}
        {embeddedPost || currentPost.sharedPostUnavailable ? (
          <SharedPostPreview
            post={embeddedPost ?? sharePreviewPost}
            unavailable={currentPost.sharedPostUnavailable}
          />
        ) : null}
        {postError ? <p className={ui.alertError}>{t(postError as "post.reactError")}</p> : null}
      </div>

      <PostShareModal
        allowComments={shareAllowComments}
        availability={shareAvailability}
        content={shareContent}
        error={postError || undefined}
        isSubmitting={isSharing}
        onAllowCommentsChange={setShareAllowComments}
        onAvailabilityChange={setShareAvailability}
        onClose={() => {
          setShareOpen(false);
          setPostError("");
        }}
        onContentChange={setShareContent}
        onSubmit={() => void handleSharePost()}
        open={shareOpen}
        sourcePost={sharePreviewPost}
        viewer={viewer}
      />

      <PostEditModal
        allowComments={editedAllowComments}
        availability={editedAvailability}
        contacts={contacts}
        content={editedPostContent}
        error={postError || undefined}
        onAllowCommentsChange={setEditedAllowComments}
        onAvailabilityChange={setEditedAvailability}
        onClose={() => {
          setIsEditingPost(false);
          setPostError("");
        }}
        onContentChange={setEditedPostContent}
        onSave={() => void handleUpdatePost()}
        onTagIdsChange={setEditedTagIds}
        open={isEditingPost}
        tagIds={editedTagIds}
        viewer={viewer}
      />

      {currentPost.imageUrl && !embeddedPost ? (
        <div className={ui.mediaCanvas}>
          <img className={ui.mediaImage} src={currentPost.imageUrl} alt="" />
        </div>
      ) : null}

      <div className={ui.postStats}>
        <div className="flex items-center gap-2">
          {reactionTypes.length > 0 ? (
            <ReactionSummary types={reactionTypes} />
          ) : reactionsCount > 0 ? (
            <span
              aria-hidden
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface text-[15px] leading-none shadow-sm ring-2 ring-surface"
            >
              👍
            </span>
          ) : null}
          <span>{reactionsCount}</span>
        </div>
        <div className="flex items-center gap-3">
          {sharesCount > 0 ? (
            <span className={cn("font-semibold", ui.textMuted)}>{t("post.sharesCount", { count: sharesCount })}</span>
          ) : null}
          {commentsCount > 0 ? (
            <button className={cn("font-semibold hover:underline", ui.textMuted)} onClick={() => void handleCommentCountClick()} type="button">
              {t("post.commentsCount", { count: commentsCount })}
            </button>
          ) : null}
        </div>
      </div>

      <div
        aria-hidden={isEditingPost}
        className={cn("relative overflow-visible", ui.postActions, isEditingPost && "pointer-events-none")}
      >
        <ReactionLikeControl
          disabled={isEditingPost}
          isReacted={isReacted}
          onRemove={() => void handleRemoveReaction()}
          onSelect={(type) => void handleReact(type)}
          reactionType={viewerReactionType}
        />
        <button
          className={ui.postActionBtn}
          disabled={!commentsEnabled}
          onClick={commentsEnabled ? () => void handleOpenComments() : undefined}
          title={commentsEnabled ? undefined : t("post.commentsDisabled")}
          type="button"
        >
          <CommentIcon className="h-5 w-5" />
          {t("post.comment")}
        </button>
        <ShareLinkButton
          className={isEditingPost ? "pointer-events-none opacity-50" : undefined}
          targetId={currentPost.id}
          type="post"
        />
        <button
          className={ui.postActionBtn}
          disabled={isEditingPost}
          onClick={() => {
            setShareContent("");
            setShareAllowComments(true);
            setShareAvailability("PUBLIC");
            setShareOpen(true);
          }}
          type="button"
        >
          <ShareIcon className="h-5 w-5" />
          {t("post.share")}
        </button>
      </div>

      <div className={ui.commentsSection}>
        {isLoadingComments && commentsCount > 0 ? (
          <p className={cn("text-sm font-semibold", ui.textMuted)}>{t("post.loadingComments")}</p>
        ) : null}

        {visibleRoots.length > 0 ? (
          <CommentThread
            contacts={contacts}
            editedCommentContent={editedCommentContent}
            editingCommentId={editingCommentId}
            deletingCommentId={deletingCommentId}
            nodes={visibleRoots}
            onDelete={(commentId) => void handleDeleteComment(commentId)}
            onEditCancel={() => {
              setEditingCommentId(undefined);
              setEditedCommentContent("");
            }}
            onEditContentChange={setEditedCommentContent}
            onEditSave={(commentId) => void handleUpdateComment(commentId)}
            onEditStart={(comment) => {
              setEditingCommentId(comment.id);
              setEditedCommentContent(comment.body);
            }}
            onError={() => setCommentError("post.commentReactError")}
            onReply={(comment) => {
              setReplyingTo(comment);
              setCommentsOpen(true);
            }}
            onUpdate={(updated) => {
              setComments((current) =>
                current.map((item) => (item.id === updated.id ? preserveEntityAuthor(item, updated) : item)),
              );
            }}
            replyingToId={replyingTo?.id}
            updatingCommentId={updatingCommentId}
            viewer={viewer}
          />
        ) : null}

        {showViewAllComments ? (
          <button
            className={cn("text-sm font-bold hover:underline", ui.textMuted)}
            onClick={() => void handleExpandComments()}
            type="button"
          >
            {t("post.viewAllComments", { count: commentsCount })}
          </button>
        ) : null}

        {commentsOpen && commentTree.length > COMMENT_PREVIEW ? (
          <button
            className={cn("text-sm font-bold hover:underline", ui.textMuted)}
            onClick={() => setCommentsOpen(false)}
            type="button"
          >
            {t("post.hideComments")}
          </button>
        ) : null}

        {replyingTo ? (
          <div className={cn("mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-[13px] font-semibold", ui.textSecondary)}>
            <span className="inline-flex flex-wrap items-center gap-1">
              <span>{t("post.replyingToPrefix")}</span>
              <UserProfileLink layout="name" user={replyingTo.author} />
            </span>
            <button className="hover:underline" onClick={() => setReplyingTo(undefined)} type="button">
              {t("post.cancelReply")}
            </button>
          </div>
        ) : null}

        {commentsEnabled ? (
          <>
            <CommentComposer
              attachmentName={commentAttachment?.name}
              canSubmit={Boolean(commentBody.trim() || commentAttachment)}
              contacts={contacts}
              isSubmitting={isSubmittingComment}
              onChange={setCommentBody}
              onPhotoClick={() => commentFileRef.current?.click()}
              onSubmit={handleCreateComment}
              onTagIdsChange={setCommentTagIds}
              placeholder={replyingTo ? t("post.writeReply") : t("post.writeComment")}
              tagIds={commentTagIds}
              value={commentBody}
              viewer={viewer}
            />
            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => setCommentAttachment(event.target.files?.[0])}
              ref={commentFileRef}
              type="file"
            />
          </>
        ) : (
          <p className={cn("text-sm font-semibold", ui.textMuted)}>{t("post.commentsDisabled")}</p>
        )}
        {commentError ? <p className={cn("ps-10", ui.alertError)}>{t(commentError as "post.loadCommentsError")}</p> : null}
      </div>
    </article>
  );
}
