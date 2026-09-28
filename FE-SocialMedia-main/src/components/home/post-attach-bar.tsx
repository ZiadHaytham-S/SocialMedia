"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/theme/ui";
import { ComposerFeelingIcon, ComposerPhotoIcon, ComposerTagIcon } from "./icons";
import { focusMentionInTextarea } from "./mention-textarea";

type PostAttachBarProps = {
  onPhotoClick?: () => void;
  mentionTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onMentionInsert?: (value: string) => void;
};

export function PostAttachBar({ onPhotoClick, mentionTextareaRef, onMentionInsert }: PostAttachBarProps) {
  const { t } = useLocale();

  function handleTagPeople() {
    const el = mentionTextareaRef?.current ?? null;
    focusMentionInTextarea(el, onMentionInsert);
    requestAnimationFrame(() => el?.focus());
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border-light px-3 py-2">
      <span className="text-[15px] font-semibold text-t-primary">{t("composer.addToPost")}</span>
      <div className="flex items-center gap-0.5">
        {onPhotoClick ? (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-surface-hover"
            onClick={onPhotoClick}
            title={t("composer.photo")}
            type="button"
          >
            <ComposerPhotoIcon className="h-6 w-6" />
          </button>
        ) : null}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-surface-hover"
          onClick={handleTagPeople}
          title={t("post.tags.label")}
          type="button"
        >
          <ComposerTagIcon className="h-6 w-6" />
        </button>
        <button
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full opacity-40"
          disabled
          title={t("nav.comingSoon")}
          type="button"
        >
          <ComposerFeelingIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
