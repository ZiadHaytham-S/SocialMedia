"use client";

import { useRef, useState } from "react";
import type { PostAvailability } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  POST_AVAILABILITY_DESC_KEYS,
  POST_AVAILABILITY_ICONS,
  POST_AVAILABILITY_LABEL_KEYS,
  POST_AVAILABILITY_OPTIONS,
} from "@/lib/post-availability";
import { DropdownPortal } from "@/components/ui/dropdown-portal";
import { cn, ui } from "@/lib/theme/ui";

type PostPrivacyMenuProps = {
  value: PostAvailability;
  onChange: (value: PostAvailability) => void;
  allowComments?: boolean;
  onAllowCommentsChange?: (value: boolean) => void;
  compact?: boolean;
};

export function PostPrivacyMenu({
  value,
  onChange,
  allowComments,
  onAllowCommentsChange,
  compact = false,
}: PostPrivacyMenuProps) {
  const { t } = useLocale();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-[13px] font-semibold text-fb transition hover:bg-surface-hover",
          compact && "px-2 py-1 text-[12px]",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden className="text-base leading-none">
          {POST_AVAILABILITY_ICONS[value]}
        </span>
        <span>{t(POST_AVAILABILITY_LABEL_KEYS[value])}</span>
        <span aria-hidden className="text-[10px] text-t-muted">
          ▾
        </span>
      </button>

      <DropdownPortal
        align="end"
        anchorRef={anchorRef}
        minWidth={280}
        onClose={() => setOpen(false)}
        open={open}
        placement="top"
        width={280}
      >
        <div
          className="overflow-hidden rounded-lg bg-surface py-1 shadow-[var(--shadow-elevated)] ring-1 ring-border-light"
          role="menu"
        >
          <p className="px-3 py-2 text-[12px] font-semibold text-t-muted">{t("post.availability.label")}</p>
          {POST_AVAILABILITY_OPTIONS.map((option) => (
            <button
              className={cn(
                "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-start transition hover:bg-surface-hover",
                value === option && "bg-surface-hover",
              )}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              <span className={cn("flex items-center gap-2 text-[15px] font-semibold", value === option && "text-fb")}>
                <span aria-hidden>{POST_AVAILABILITY_ICONS[option]}</span>
                {t(POST_AVAILABILITY_LABEL_KEYS[option])}
              </span>
              <span className="ps-7 text-[12px] font-medium text-t-muted">{t(POST_AVAILABILITY_DESC_KEYS[option])}</span>
            </button>
          ))}
          {onAllowCommentsChange !== undefined ? (
            <>
              <div className="mx-2 my-1 h-px bg-border-light" />
              <label className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2", ui.bodySm)}>
                <input
                  checked={allowComments}
                  className="h-4 w-4 rounded border-border text-fb focus:ring-fb"
                  onChange={(event) => onAllowCommentsChange(event.target.checked)}
                  type="checkbox"
                />
                {t("composer.allowComments")}
              </label>
            </>
          ) : null}
        </div>
      </DropdownPortal>
    </div>
  );
}
