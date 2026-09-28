"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type DropdownPlacement = "top" | "bottom" | "auto";
export type DropdownAlign = "start" | "end";

export type AnchorRect = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

type DropdownPortalProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  placement?: DropdownPlacement;
  align?: DropdownAlign;
  minWidth?: number;
  /** Fixed menu width (ignores anchor width). Useful for icon buttons. */
  width?: number;
  className?: string;
  onClose?: () => void;
  /** Override anchor box (e.g. textarea caret). */
  getAnchorRect?: () => AnchorRect | null;
};

type Position = {
  top: number;
  left: number;
  width: number;
  resolvedPlacement: "top" | "bottom";
};

function computePosition(
  rect: AnchorRect,
  menuHeight: number,
  placement: DropdownPlacement,
  minWidth: number,
  align: DropdownAlign,
  fixedWidth?: number,
): Position {
  const gap = 6;
  const viewportPadding = 8;
  const width = fixedWidth ?? Math.max(rect.width, minWidth);
  let left = align === "end" ? rect.right - width : rect.left;
  const maxLeft = window.innerWidth - width - viewportPadding;
  left = Math.max(viewportPadding, Math.min(left, maxLeft));

  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  let resolvedPlacement: "top" | "bottom" = "bottom";

  if (placement === "top") {
    resolvedPlacement = "top";
  } else if (placement === "auto") {
    resolvedPlacement = spaceBelow < menuHeight && spaceAbove > spaceBelow ? "top" : "bottom";
  }

  const top =
    resolvedPlacement === "bottom"
      ? rect.bottom + gap
      : Math.max(viewportPadding, rect.top - gap - menuHeight);

  return { top, left, width, resolvedPlacement };
}

export function DropdownPortal({
  open,
  anchorRef,
  children,
  placement = "auto",
  align = "start",
  minWidth = 220,
  width: fixedWidth,
  className = "",
  onClose,
  getAnchorRect,
}: DropdownPortalProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const custom = getAnchorRect?.();
    const elementRect = anchorRef.current?.getBoundingClientRect();
    const rect = custom ?? elementRect;

    if (!rect) {
      return;
    }

    setPosition(computePosition(rect, menu.offsetHeight, placement, minWidth, align, fixedWidth));
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
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
  }, [align, fixedWidth, getAnchorRect, open, anchorRef, placement, minWidth, children]);

  useEffect(() => {
    if (!open || !onClose) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onClose?.();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anchorRef, onClose, open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={className}
      ref={menuRef}
      role="presentation"
      style={{
        position: "fixed",
        top: position?.top ?? -9999,
        left: position?.left ?? 0,
        width: position?.width ?? fixedWidth ?? minWidth,
        zIndex: 110,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
