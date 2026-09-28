"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ApiUser } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn, ui } from "@/lib/theme/ui";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { ComposerPhotoIcon } from "./icons";

export type StoryCreateMode = "text" | "photo";

type StoryCreateModalProps = {
  open: boolean;
  viewer: ApiUser;
  mode: StoryCreateMode;
  content: string;
  attachmentPreview?: string;
  attachmentName?: string;
  error?: string;
  isSubmitting: boolean;
  onModeChange: (mode: StoryCreateMode) => void;
  onContentChange: (value: string) => void;
  onPhotoClick: () => void;
  onRemoveAttachment: () => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function StoryCreateModal({
  open,
  viewer,
  mode,
  content,
  attachmentPreview,
  attachmentName,
  error,
  isSubmitting,
  onModeChange,
  onContentChange,
  onPhotoClick,
  onRemoveAttachment,
  onSubmit,
  onClose,
}: StoryCreateModalProps) {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  const canShare =
    mode === "text" ? Boolean(content.trim()) : Boolean(attachmentPreview || attachmentName);

  const errorKey = error as MessageKey | undefined;

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[8vh]">
      <div className="absolute inset-0" onClick={onClose} role="presentation" />
      <div
        className="relative z-10 flex w-full max-w-[500px] flex-col rounded-lg bg-surface shadow-[var(--shadow-elevated)]"
        role="dialog"
        aria-labelledby="story-create-title"
        aria-modal="true"
      >
        <div className="relative flex shrink-0 items-center justify-center border-b border-border-light px-4 py-3">
          <h2 className={cn(ui.headingLg, "text-center")} id="story-create-title">
            {t("story.createTitle")}
          </h2>
          <button
            aria-label={t("composer.closeModal")}
            className={cn(ui.iconButton, "absolute end-3 h-9 w-9 text-xl leading-none")}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 p-4">
          <UserProfileLink layout="row" user={viewer} />

          <p className={cn("text-[13px] font-medium", ui.textMuted)}>{t("story.modeHint")}</p>

          <div
            className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1"
            role="tablist"
            aria-label={t("story.createTitle")}
          >
            <button
              aria-selected={mode === "text"}
              className={cn(
                "rounded-md py-2 text-[15px] font-semibold transition",
                mode === "text" ? "bg-surface text-fb shadow-sm" : "text-t-secondary hover:bg-surface-hover",
              )}
              onClick={() => onModeChange("text")}
              role="tab"
              type="button"
            >
              {t("story.modeText")}
            </button>
            <button
              aria-selected={mode === "photo"}
              className={cn(
                "rounded-md py-2 text-[15px] font-semibold transition",
                mode === "photo" ? "bg-surface text-fb shadow-sm" : "text-t-secondary hover:bg-surface-hover",
              )}
              onClick={() => onModeChange("photo")}
              role="tab"
              type="button"
            >
              {t("story.modePhoto")}
            </button>
          </div>

          {mode === "text" ? (
            <textarea
              autoFocus
              className={cn(ui.textarea, "min-h-[120px] resize-none")}
              onChange={(event) => onContentChange(event.target.value)}
              placeholder={t("story.textPlaceholder")}
              value={content}
            />
          ) : (
            <>
              {attachmentPreview ? (
                <div className="relative">
                  <div className={cn("overflow-hidden rounded-lg border border-border-light", ui.mediaCanvas)}>
                    <img alt="" className="max-h-72 w-full object-contain" src={attachmentPreview} />
                  </div>
                  <button
                    aria-label={t("composer.removePhoto")}
                    className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-lg font-bold text-t-secondary shadow ring-1 ring-border-light"
                    onClick={onRemoveAttachment}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ) : attachmentName ? (
                <p className={cn("text-[13px] font-medium", ui.textMuted)}>{attachmentName}</p>
              ) : (
                <button
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-light bg-surface-muted py-10 text-[15px] font-semibold text-t-secondary transition hover:border-fb hover:bg-surface-hover"
                  onClick={onPhotoClick}
                  type="button"
                >
                  <ComposerPhotoIcon className="h-10 w-10 text-fb" />
                  {t("composer.photo")}
                </button>
              )}

              {attachmentPreview || attachmentName ? (
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-light py-2.5 text-[15px] font-semibold text-t-secondary transition hover:bg-surface-hover"
                  onClick={onPhotoClick}
                  type="button"
                >
                  <ComposerPhotoIcon className="h-6 w-6" />
                  {t("composer.photo")}
                </button>
              ) : null}
            </>
          )}

          {errorKey ? <p className={ui.alertError}>{t(errorKey)}</p> : null}
        </div>

        <div className="flex justify-end border-t border-border-light px-4 py-3">
          <button className={ui.btnPrimary} disabled={!canShare || isSubmitting} onClick={onSubmit} type="button">
            {isSubmitting ? t("story.uploading") : t("story.share")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
