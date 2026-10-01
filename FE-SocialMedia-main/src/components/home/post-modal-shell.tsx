"use client";

import { useEffect, type ReactNode } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

type PostModalShellProps = {
  open: boolean;
  titleId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
};

export function PostModalShell({ open, titleId, title, onClose, children, footer }: PostModalShellProps) {
  const { t } = useLocale();
  const mounted = useHydrated();

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

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[8vh]">
      <div className="absolute inset-0" onClick={onClose} role="presentation" />
      <div
        className="relative z-10 flex w-full max-w-[500px] flex-col rounded-lg bg-surface shadow-[var(--shadow-elevated)]"
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
      >
        <div className="relative flex shrink-0 items-center justify-center border-b border-border-light px-4 py-3">
          <h2 className={cn(ui.headingLg, "text-center")} id={titleId}>
            {title}
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

        <div className="max-h-[min(60vh,480px)] overflow-y-auto p-4">{children}</div>

        <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 overflow-visible border-t border-border-light px-4 py-3">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
