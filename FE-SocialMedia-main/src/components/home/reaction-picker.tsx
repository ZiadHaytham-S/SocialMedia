"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { ReactionType } from "@/types/social";
import { getReactionConfig, REACTIONS } from "@/lib/reactions";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { LikeIcon } from "./icons";

const OPEN_DELAY_MS = 60;
const CLOSE_DELAY_MS = 320;
const LONG_PRESS_MS = 400;

type ReactionPickerProps = {
  onSelect: (type: ReactionType) => void;
  visible: boolean;
  compact?: boolean;
};

export function ReactionPicker({ onSelect, visible, compact = false }: ReactionPickerProps) {
  const { t } = useLocale();

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "flex items-center gap-0.5 rounded-full bg-surface px-2 py-1.5 shadow-[var(--shadow-elevated)] ring-1 ring-border-light",
        compact ? "px-1.5 py-1" : "px-2 py-2",
        "transition-all duration-200 ease-out dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
        visible ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
      )}
      role="toolbar"
      aria-label={t("post.pickReaction")}
    >
      {REACTIONS.map((reaction, index) => (
        <button
          className={cn(
            "group relative flex flex-col items-center justify-center rounded-full transition hover:bg-surface-muted",
            compact ? "h-9 w-9" : "h-11 w-11",
          )}
          key={reaction.type}
          onClick={() => onSelect(reaction.type)}
          style={{ transitionDelay: visible ? `${index * 30}ms` : "0ms" }}
          title={t(reaction.labelKey)}
          type="button"
        >
          <span
            className={cn(
              "leading-none transition duration-200 group-hover:scale-[1.35] group-hover:-translate-y-0.5",
              compact ? "text-2xl" : "text-[1.75rem]",
            )}
          >
            {reaction.emoji}
          </span>
          <span className="pointer-events-none absolute -bottom-5 hidden whitespace-nowrap rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-bold text-t-secondary shadow-sm ring-1 ring-border group-hover:block">
            {t(reaction.labelKey)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ReactionSummary({ types, className }: { types: ReactionType[]; className?: string }) {
  if (!types.length) {
    return null;
  }

  const configs = REACTIONS.filter((reaction) => types.includes(reaction.type));

  return (
    <div className={cn("flex items-center", className)}>
      {configs.map((reaction, index) => (
        <span
          className={cn(
            "flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface text-[15px] leading-none shadow-sm ring-2 ring-surface",
            index > 0 && "-ms-1.5",
          )}
          key={reaction.type}
          title={reaction.emoji}
        >
          {reaction.emoji}
        </span>
      ))}
    </div>
  );
}

type ReactionPickerAlign = "center" | "start";

type ReactionPickerFloatingProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  align: ReactionPickerAlign;
  compact: boolean;
  onSelect: (type: ReactionType) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
};

function ReactionPickerFloating({
  open,
  anchorRef,
  menuRef,
  align,
  compact,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: ReactionPickerFloatingProps) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) {
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 6;
      const pad = 8;
      const isRtl = document.documentElement.dir === "rtl";
      let left =
        align === "center"
          ? anchorRect.left + anchorRect.width / 2 - menuRect.width / 2
          : isRtl
            ? anchorRect.right - menuRect.width
            : anchorRect.left;
      left = Math.max(pad, Math.min(left, window.innerWidth - menuRect.width - pad));
      const top = Math.max(pad, anchorRect.top - menuRect.height - gap);
      setCoords({ top, left });
    }

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, menuRef, open, compact]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="pb-3"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      ref={menuRef}
      style={{
        position: "fixed",
        top: coords?.top ?? -9999,
        left: coords?.left ?? 0,
        zIndex: 110,
        visibility: coords ? "visible" : "hidden",
      }}
    >
      <div className="relative">
        <ReactionPicker compact={compact} onSelect={onSelect} visible />
        <div aria-hidden className="pointer-events-auto absolute inset-x-0 top-full h-3" />
      </div>
    </div>,
    document.body,
  );
}

type ReactionLikeControlProps = {
  isReacted: boolean;
  reactionType?: ReactionType;
  reactionsCount?: number;
  onSelect: (type: ReactionType) => void;
  onRemove: () => void;
  size?: "default" | "compact";
  disabled?: boolean;
};

export function ReactionLikeControl({
  isReacted,
  reactionType,
  reactionsCount = 0,
  onSelect,
  onRemove,
  size = "default",
  disabled = false,
}: ReactionLikeControlProps) {
  const compact = size === "compact";
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressTriggeredRef = useRef(false);
  const [open, setOpen] = useState(false);

  const activeReaction = getReactionConfig(reactionType);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  }, []);

  const showPicker = useCallback(() => {
    if (disabled) {
      return;
    }

    clearCloseTimer();
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer, disabled]);

  const hidePicker = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer]);

  const closePickerNow = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer, clearOpenTimer]);

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
      clearLongPressTimer();
    };
  }, [clearCloseTimer, clearLongPressTimer, clearOpenTimer]);

  useEffect(() => {
    if (disabled) {
      closePickerNow();
    }
  }, [closePickerNow, disabled]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      closePickerNow();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePickerNow();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePickerNow, open]);

  function handleSelect(type: ReactionType) {
    closePickerNow();
    onSelect(type);
  }

  function handlePrimaryClick() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (isReacted) {
      onRemove();
      return;
    }

    if (open) {
      closePickerNow();
      return;
    }

    onSelect("like");
  }

  const label = isReacted && activeReaction ? t(activeReaction.labelKey) : t("post.like");

  return (
    <div
      className={cn(compact ? "inline-flex" : "flex flex-1 justify-center", disabled && "pointer-events-none")}
      onMouseEnter={disabled ? undefined : showPicker}
      onMouseLeave={disabled ? undefined : hidePicker}
      ref={rootRef}
    >
      <ReactionPickerFloating
        align={compact ? "start" : "center"}
        anchorRef={buttonRef}
        compact={compact}
        menuRef={menuRef}
        onHoverEnd={disabled ? undefined : hidePicker}
        onHoverStart={disabled ? undefined : showPicker}
        onSelect={handleSelect}
        open={open}
      />

      <button
        ref={buttonRef}
        className={cn(
          compact
            ? "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-bold transition hover:bg-surface-muted"
            : ui.postActionBtn,
          isReacted
            ? cn(activeReaction?.activeClass ?? "text-fb", "hover:bg-surface-hover")
            : cn(ui.textSecondary, "hover:bg-surface-hover"),
          open && !isReacted && "bg-surface-hover",
        )}
        onClick={handlePrimaryClick}
        onPointerDown={() => {
          clearLongPressTimer();
          longPressTriggeredRef.current = false;
          longPressTimerRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            setOpen(true);
          }, LONG_PRESS_MS);
        }}
        onPointerLeave={clearLongPressTimer}
        onPointerUp={clearLongPressTimer}
        type="button"
      >
        {isReacted && activeReaction ? (
          <span className={cn("leading-none", compact ? "text-base" : "text-xl")}>{activeReaction.emoji}</span>
        ) : (
          <LikeIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        )}
        {compact ? (
          reactionsCount > 0 ? <span>{reactionsCount}</span> : null
        ) : (
          <span>{label}</span>
        )}
      </button>
    </div>
  );
}
