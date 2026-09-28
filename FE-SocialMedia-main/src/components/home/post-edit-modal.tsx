"use client";

import { useRef } from "react";
import type { ApiUser, PostAvailability } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { PostFormBody } from "./post-form-body";
import { PostModalShell } from "./post-modal-shell";
import { PostPrivacyMenu } from "./post-privacy-menu";

type PostEditModalProps = {
  open: boolean;
  viewer: ApiUser;
  content: string;
  allowComments: boolean;
  availability: PostAvailability;
  tagIds: string[];
  contacts: ApiUser[];
  error?: string;
  onContentChange: (value: string) => void;
  onAllowCommentsChange: (value: boolean) => void;
  onAvailabilityChange: (value: PostAvailability) => void;
  onTagIdsChange: (ids: string[]) => void;
  onSave: () => void;
  onClose: () => void;
};

export function PostEditModal({
  open,
  viewer,
  content,
  allowComments,
  availability,
  tagIds,
  contacts,
  error,
  onContentChange,
  onAllowCommentsChange,
  onAvailabilityChange,
  onTagIdsChange,
  onSave,
  onClose,
}: PostEditModalProps) {
  const { t } = useLocale();
  const mentionRef = useRef<HTMLTextAreaElement>(null);

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
          <button className={ui.btnPrimary} disabled={!content.trim()} onClick={onSave} type="button">
            {t("post.save")}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title={t("post.editPost")}
      titleId="post-edit-title"
    >
      <PostFormBody
        autoFocus
        contacts={contacts}
        content={content}
        mentionRef={mentionRef}
        onContentChange={onContentChange}
        onTagIdsChange={onTagIdsChange}
        placeholder={t("post.editPlaceholder")}
        tagIds={tagIds}
        viewer={viewer}
      />
      {error ? <p className={cn(ui.alertError, "mt-3")}>{t(error as "post.updateError")}</p> : null}
    </PostModalShell>
  );
}
