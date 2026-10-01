"use client";

import type { ApiComment, ApiUser, ReactionType } from "@/types/social";
import { reactOnComment, removeCommentReaction } from "@/lib/api/comment";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { MentionBody } from "./mention-body";
import { TaggedUsersRow } from "./tag-picker";
import { ReactionLikeControl, ReactionSummary } from "./reaction-picker";

type CommentItemProps = {
  comment: ApiComment;
  canEdit: boolean;
  isEditing: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  isReplyTarget?: boolean;
  depth?: number;
  editedContent: string;
  taggedUsers?: ApiUser[];
  mentionContacts?: ApiUser[];
  onDelete: () => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onEditContentChange: (value: string) => void;
  onReply: () => void;
  onUpdate: (comment: ApiComment) => void;
  onError: () => void;
};

export function CommentItem({
  comment,
  canEdit,
  isEditing,
  isUpdating = false,
  isDeleting = false,
  isReplyTarget = false,
  editedContent,
  taggedUsers = [],
  mentionContacts = [],
  onDelete,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditContentChange,
  onReply,
  onUpdate,
  onError,
}: CommentItemProps) {
  const { t } = useLocale();

  async function handleReact(type: ReactionType) {
    try {
      if (comment.viewerReacted && comment.viewerReactionType === type) {
        onUpdate(await removeCommentReaction(comment.id));
        return;
      }
      onUpdate(await reactOnComment(comment.id, type));
    } catch {
      onError();
    }
  }

  async function handleRemove() {
    try {
      onUpdate(await removeCommentReaction(comment.id));
    } catch {
      onError();
    }
  }

  return (
    <div className={cn("flex gap-2", isReplyTarget && "rounded-lg bg-success-soft/40 p-1")}>
      <UserProfileLink layout="avatar" stopPropagation user={comment.author} />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-[calc(100%-2rem)]">
          <div className={ui.commentBubble}>
            <UserProfileLink
              layout="name"
              nameClassName="block w-fit text-[13px] font-semibold leading-tight text-t-primary"
              stopPropagation
              user={comment.author}
            />
            {isEditing ? (
              <input
                className={cn("mt-1.5 h-8 w-full rounded-lg border border-border-light bg-surface px-2 text-[13px]", ui.textPrimary)}
                onChange={(event) => onEditContentChange(event.target.value)}
                value={editedContent}
              />
            ) : (
              <MentionBody className={cn("mt-0.5", ui.bodySm)} contacts={mentionContacts} text={comment.body} />
            )}
            <TaggedUsersRow users={taggedUsers} />
          </div>
          {comment.attachmentUrl ? (
            <div className={cn("mt-1 overflow-hidden rounded-lg border border-border-light", ui.mediaCanvas)}>
              <img className={ui.mediaImageSm} src={comment.attachmentUrl} alt="" />
            </div>
          ) : null}
        </div>

        <div className={ui.commentActions}>
          <ReactionLikeControl
            isReacted={comment.viewerReacted}
            onRemove={() => void handleRemove()}
            onSelect={(type) => void handleReact(type)}
            reactionType={comment.viewerReactionType}
            reactionsCount={comment.reactionsCount}
            size="compact"
          />
          {(comment.reactionTypes?.length ?? 0) > 0 ? (
            <ReactionSummary className="-ms-0.5" types={comment.reactionTypes ?? []} />
          ) : null}
          <button className="hover:underline" onClick={onReply} type="button">
            {t("post.reply")}
          </button>
          {canEdit ? (
            isEditing ? (
              <>
                <button
                  className="text-fb hover:underline disabled:opacity-50"
                  disabled={isUpdating}
                  onClick={onEditSave}
                  type="button"
                >
                  {isUpdating ? "..." : t("post.save")}
                </button>
                <button className="hover:underline disabled:opacity-50" disabled={isUpdating} onClick={onEditCancel} type="button">
                  {t("post.cancel")}
                </button>
              </>
            ) : (
              <button className="hover:underline" onClick={onEditStart} type="button">
                {t("post.edit")}
              </button>
            )
          ) : null}
          {canEdit ? (
            <button className="text-danger hover:underline disabled:opacity-50" disabled={isDeleting} onClick={onDelete} type="button">
              {isDeleting ? "..." : t("post.delete")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
