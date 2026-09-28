"use client";

import { useRef } from "react";
import type { ApiUser, PostAvailability } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { PostFormBody } from "./post-form-body";
import { PostModalShell } from "./post-modal-shell";
import { PostPrivacyMenu } from "./post-privacy-menu";

type PostCreateModalProps = {
  open: boolean;
  viewer: ApiUser;
  contacts: ApiUser[];
  content: string;
  tagIds: string[];
  allowComments: boolean;
  availability: PostAvailability;
  attachmentPreview?: string;
  attachmentName?: string;
  error?: string;
  isSubmitting: boolean;
  onContentChange: (value: string) => void;
  onTagIdsChange: (ids: string[]) => void;
  onAllowCommentsChange: (value: boolean) => void;
  onAvailabilityChange: (value: PostAvailability) => void;
  onPhotoClick: () => void;
  onRemoveAttachment: () => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function PostCreateModal({
  open,
  viewer,
  contacts,
  content,
  tagIds,
  allowComments,
  availability,
  attachmentPreview,
  attachmentName,
  error,
  isSubmitting,
  onContentChange,
  onTagIdsChange,
  onAllowCommentsChange,
  onAvailabilityChange,
  onPhotoClick,
  onRemoveAttachment,
  onSubmit,
  onClose,
}: PostCreateModalProps) {
  const { t } = useLocale();
  const mentionRef = useRef<HTMLTextAreaElement>(null);
  const canPost = Boolean(content.trim() || attachmentPreview || attachmentName);

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
          <button className={ui.btnPrimary} disabled={!canPost || isSubmitting} onClick={onSubmit} type="button">
            {isSubmitting ? t("composer.posting") : t("composer.post")}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title={t("composer.createPost")}
      titleId="post-create-title"
    >
      <PostFormBody
        attachmentName={attachmentName}
        attachmentPreview={attachmentPreview}
        autoFocus
        contacts={contacts}
        content={content}
        mentionRef={mentionRef}
        onContentChange={onContentChange}
        onPhotoClick={onPhotoClick}
        onRemoveAttachment={onRemoveAttachment}
        onTagIdsChange={onTagIdsChange}
        tagIds={tagIds}
        viewer={viewer}
      />
      {error ? <p className={cn(ui.alertError, "mt-3")}>{t(error as "composer.createError")}</p> : null}
    </PostModalShell>
  );
}
