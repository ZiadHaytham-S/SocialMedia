"use client";

import type { PostAvailability } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  POST_AVAILABILITY_DESC_KEYS,
  POST_AVAILABILITY_LABEL_KEYS,
  POST_AVAILABILITY_OPTIONS,
} from "@/lib/post-availability";
import { cn, ui } from "@/lib/theme/ui";

type AvailabilitySelectProps = {
  value: PostAvailability;
  onChange: (value: PostAvailability) => void;
  className?: string;
};

export function AvailabilitySelect({ value, onChange, className }: AvailabilitySelectProps) {
  const { t } = useLocale();

  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className={cn("text-[13px] font-semibold", ui.textSecondary)}>{t("post.availability.label")}</legend>
      {POST_AVAILABILITY_OPTIONS.map((option) => (
        <label
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-lg border border-border-light px-3 py-2.5 transition hover:bg-surface-hover",
            value === option && "border-fb bg-success-soft/30 ring-1 ring-fb/25",
          )}
          key={option}
        >
          <input
            checked={value === option}
            className="mt-1 h-4 w-4 border-border text-fb focus:ring-fb"
            name="post-availability"
            onChange={() => onChange(option)}
            type="radio"
            value={option}
          />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-t-primary">{t(POST_AVAILABILITY_LABEL_KEYS[option])}</span>
            <span className="block text-[12px] font-medium text-t-muted">{t(POST_AVAILABILITY_DESC_KEYS[option])}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function AvailabilityBadge({ value }: { value?: PostAvailability }) {
  const { t } = useLocale();

  if (!value || value === "PUBLIC") {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-t-muted">
      · {t(POST_AVAILABILITY_LABEL_KEYS[value])}
    </span>
  );
}
