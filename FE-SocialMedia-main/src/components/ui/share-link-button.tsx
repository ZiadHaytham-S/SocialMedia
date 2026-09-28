"use client";

import { useCallback, useState } from "react";
import { LinkIcon } from "@/components/home/icons";
import { useLocale } from "@/lib/i18n/locale-context";
import { getShareUrl, type ShareTargetType } from "@/lib/utils/share-url";
import { cn, ui } from "@/lib/theme/ui";

type ShareLinkButtonProps = {
  targetId: string;
  type: ShareTargetType;
  className?: string;
  variant?: "action" | "menu" | "header" | "icon";
};

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ShareLinkButton({ targetId, type, className, variant = "action" }: ShareLinkButtonProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = getShareUrl(type, targetId);

    if (!url) {
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
      return;
    }

    try {
      await copyTextToClipboard(url);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
      setCopied(false);
      setTimeout(() => setFailed(false), 2500);
    }
  }, [targetId, type]);

  const label = failed ? t("share.copyLinkFailed") : copied ? t("share.linkCopied") : t("share.copyLink");

  if (variant === "menu") {
    return (
      <button className={cn(ui.menuItem, "text-[15px]", className)} onClick={() => void handleCopy()} type="button">
        {label}
      </button>
    );
  }

  if (variant === "header") {
    return (
      <button
        className={cn(ui.profileEditBtn, "shrink-0 self-start sm:self-auto", className)}
        onClick={() => void handleCopy()}
        type="button"
      >
        <LinkIcon className="h-5 w-5 shrink-0 text-t-primary" />
        <span>{label}</span>
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        aria-label={label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30",
          className,
        )}
        onClick={() => void handleCopy()}
        title={label}
        type="button"
      >
        <LinkIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button className={cn(ui.postActionBtn, className)} onClick={() => void handleCopy()} title={label} type="button">
      <LinkIcon className="h-5 w-5" />
      <span className="max-w-[5.5rem] truncate sm:max-w-none">{label}</span>
    </button>
  );
}
