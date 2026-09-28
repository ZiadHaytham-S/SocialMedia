"use client";

import type { ApiPost, ApiUser, PostAvailability } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { PostModalShell } from "./post-modal-shell";
import { PostPrivacyMenu } from "./post-privacy-menu";
import { SharedPostPreview } from "./shared-post-preview";

type PostShareModalProps = {
  open: boolean;
  viewer: ApiUser;
  sourcePost: ApiPost;
  content: string;
  allowComments: boolean;
  availability: PostAvailability;
  error?: string;
  isSubmitting: boolean;
  onContentChange: (value: string) => void;
  onAllowCommentsChange: (value: boolean) => void;
  onAvailabilityChange: (value: PostAvailability) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function PostShareModal({
  open,
  viewer,
  sourcePost,
  content,
  allowComments,
  availability,
  error,
  isSubmitting,
  onContentChange,
  onAllowCommentsChange,
  onAvailabilityChange,
  onSubmit,
  onClose,
}: PostShareModalProps) {
  const { t } = useLocale();

  return (
    <PostModalShell
      footer={
        <>
          <PostPrivacyMenu
            allowComments={allowComments}
            onAllowCommentsChange={onAllowCommentsChange}
            onChange={onAvailabilityChange}
            value={availability}
          />
          <button className={ui.btnPrimary} disabled={isSubmitting} onClick={onSubmit} type="button">
            {isSubmitting ? t("share.sharing") : t("share.shareNow")}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title={t("share.sharePost")}
      titleId="post-share-title"
    >
      <div className="flex gap-3">
        <UserProfileLink className="shrink-0" layout="avatar" user={viewer} />
        <textarea
          className={cn(ui.authInput, "min-h-[88px] resize-none text-[17px]")}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder={t("share.captionPlaceholder")}
          rows={3}
          value={content}
        />
      </div>
      <SharedPostPreview
        className="mt-4"
        post={sourcePost}
        unavailable={sourcePost.sharedPostUnavailable}
      />
      {error ? <p className={cn(ui.alertError, "mt-3")}>{t(error as "share.error")}</p> : null}
    </PostModalShell>
  );
}
