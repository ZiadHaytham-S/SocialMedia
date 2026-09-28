"use client";

import { useRef } from "react";
import type { ApiUser } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { MentionTextarea } from "./mention-textarea";
import { PostAttachBar } from "./post-attach-bar";

type PostFormBodyProps = {
  viewer: ApiUser;
  content: string;
  tagIds: string[];
  contacts: ApiUser[];
  attachmentPreview?: string;
  attachmentName?: string;
  placeholder?: string;
  onContentChange: (value: string) => void;
  onTagIdsChange: (ids: string[]) => void;
  onPhotoClick?: () => void;
  onRemoveAttachment?: () => void;
  mentionRef?: React.RefObject<HTMLTextAreaElement | null>;
  autoFocus?: boolean;
};

export function PostFormBody({
  viewer,
  content,
  tagIds,
  contacts,
  attachmentPreview,
  attachmentName,
  placeholder,
  onContentChange,
  onTagIdsChange,
  onPhotoClick,
  onRemoveAttachment,
  mentionRef: externalMentionRef,
  autoFocus,
}: PostFormBodyProps) {
  const { t } = useLocale();
  const internalMentionRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = externalMentionRef ?? internalMentionRef;
  return (
    <div className="space-y-3">
      <UserProfileLink layout="row" user={viewer} />

      <MentionTextarea
        autoFocus={autoFocus}
        contacts={contacts}
        onChange={onContentChange}
        onTagIdsChange={onTagIdsChange}
        placeholder={placeholder ?? t("composer.placeholder", { name: viewer.name.split(" ")[0] || viewer.name })}
        ref={mentionRef}
        selectedTagIds={tagIds}
        value={content}
      />

      {attachmentPreview ? (
        <div className="relative">
          <div className={cn("overflow-hidden rounded-lg border border-border-light", ui.mediaCanvas)}>
            <img alt="" className="max-h-72 w-full object-contain" src={attachmentPreview} />
          </div>
          {onRemoveAttachment ? (
            <button
              aria-label={t("composer.removePhoto")}
              className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-lg font-bold text-t-secondary shadow ring-1 ring-border-light transition hover:bg-surface"
              onClick={onRemoveAttachment}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
      ) : attachmentName ? (
        <p className={cn("text-[13px] font-medium", ui.textMuted)}>{attachmentName}</p>
      ) : null}

      <PostAttachBar mentionTextareaRef={mentionRef} onMentionInsert={onContentChange} onPhotoClick={onPhotoClick} />
    </div>
  );
}
