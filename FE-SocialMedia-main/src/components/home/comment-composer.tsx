"use client";

import { useRef } from "react";
import type { ApiUser } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { SendIcon } from "./icons";
import { MentionTextarea } from "./mention-textarea";

type CommentComposerProps = {
  viewer: ApiUser;
  contacts: ApiUser[];
  value: string;
  tagIds: string[];
  placeholder: string;
  attachmentName?: string;
  canSubmit: boolean;
  isSubmitting?: boolean;
  onChange: (value: string) => void;
  onTagIdsChange: (ids: string[]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPhotoClick: () => void;
};

export function CommentComposer({
  viewer,
  contacts,
  value,
  tagIds,
  placeholder,
  attachmentName,
  canSubmit,
  isSubmitting = false,
  onChange,
  onTagIdsChange,
  onSubmit,
  onPhotoClick,
}: CommentComposerProps) {
  const { t } = useLocale();
  const mentionRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form className="mt-3" onSubmit={onSubmit} ref={formRef}>
      <div className="flex items-center gap-2">
        <UserProfileLink layout="avatar" user={viewer} />
        <div className="flex min-h-10 min-w-0 flex-1 items-start gap-1 rounded-full bg-surface-input px-3 py-2 focus-within:bg-surface focus-within:ring-1 focus-within:ring-fb/25">
          <MentionTextarea
            className="w-full"
            contacts={contacts}
            minRows={1}
            onChange={onChange}
            onSubmitShortcut={() => formRef.current?.requestSubmit()}
            onTagIdsChange={onTagIdsChange}
            placeholder={placeholder}
            ref={mentionRef}
            selectedTagIds={tagIds}
            value={value}
            variant="comment"
          />
        </div>
        <button
          className={cn(ui.iconButton, "shrink-0 text-t-muted hover:text-fb")}
          onClick={onPhotoClick}
          title={t("post.image")}
          type="button"
        >
          📷
        </button>
        <button
          aria-label={t("post.sendComment")}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
            canSubmit && !isSubmitting ? "bg-fb text-white hover:bg-fb-hover" : "cursor-not-allowed bg-surface-muted text-t-muted",
          )}
          disabled={!canSubmit || isSubmitting}
          title={t("post.sendComment")}
          type="submit"
        >
          {isSubmitting ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <SendIcon className="h-4 w-4" />}
        </button>
      </div>
      {attachmentName ? <p className={cn("mt-1 ps-10 text-xs font-semibold", ui.textMuted)}>{attachmentName}</p> : null}
    </form>
  );
}
