"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ApiUser } from "@/types/social";
import { useLocale } from "@/lib/i18n/locale-context";
import { DropdownPortal } from "@/components/ui/dropdown-portal";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { cn } from "@/lib/theme/ui";
import { getTextareaCaretCoordinates } from "@/lib/utils/textarea-caret";
import {
  filterContactsForMention,
  findMentionContext,
  getMentionHandle,
  insertMention,
  type MentionContext,
} from "@/lib/utils/mentions";
import { tagIdsFromMentions } from "@/lib/utils/tag-users";

type MentionTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  contacts: ApiUser[];
  selectedTagIds: string[];
  onTagIdsChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  autoFocus?: boolean;
  variant?: "post" | "comment";
  onSubmitShortcut?: () => void;
};

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(function MentionTextarea(
  {
    value,
    onChange,
    contacts,
    onTagIdsChange,
    placeholder,
    className,
    minRows = 4,
    autoFocus,
    variant = "post",
    onSubmitShortcut,
  },
  forwardedRef,
) {
  const { t } = useLocale();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(forwardedRef, () => textareaRef.current as HTMLTextAreaElement);

  const [mentionCtx, setMentionCtx] = useState<MentionContext | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = mentionCtx ? filterContactsForMention(contacts, mentionCtx.query) : [];
  const showSuggestions = Boolean(mentionCtx && (suggestions.length > 0 || contacts.length === 0));

  const syncMentionState = useCallback((text: string, cursor: number) => {
    const ctx = findMentionContext(text, cursor);
    setMentionCtx(ctx);
    setActiveIndex(0);
  }, []);

  const syncTagIds = useCallback(
    (text: string) => {
      onTagIdsChange(tagIdsFromMentions(text, contacts));
    },
    [contacts, onTagIdsChange],
  );

  const getMentionAnchorRect = useCallback(() => {
    const el = textareaRef.current;
    if (!el || !mentionCtx) {
      return null;
    }

    const caret = getTextareaCaretCoordinates(el, el.selectionStart);
    return {
      top: caret.top,
      left: caret.left,
      bottom: caret.bottom,
      right: caret.left,
      width: 0,
      height: caret.height,
    };
  }, [mentionCtx]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    syncMentionState(value, el.selectionStart ?? value.length);
  }, [syncMentionState, value]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    function handleScroll() {
      const current = textareaRef.current;
      if (!current) {
        return;
      }
      syncMentionState(current.value, current.selectionStart);
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [syncMentionState, value]);

  function applyMention(user: ApiUser) {
    if (!mentionCtx || !textareaRef.current) {
      return;
    }

    const handle = getMentionHandle(user);
    const cursor = textareaRef.current.selectionStart;
    const { text, cursor: nextCursor } = insertMention(value, mentionCtx.start, cursor, handle);
    onChange(text);
    syncTagIds(text);
    setMentionCtx(null);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) {
        return;
      }
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    onChange(next);
    syncTagIds(next);
    syncMentionState(next, event.target.selectionStart);
  }

  function handleSelect() {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    syncMentionState(el.value, el.selectionStart);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionCtx && suggestions.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        applyMention(suggestions[activeIndex]);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionCtx(null);
        return;
      }
    }

    if (variant === "comment" && event.key === "Enter") {
      event.preventDefault();
      onSubmitShortcut?.();
    }
  }

  const variantClasses =
    variant === "comment"
      ? "min-h-0 resize-none border-0 bg-transparent p-0 text-[15px] leading-5 outline-none focus:ring-0"
      : "min-h-[120px] w-full resize-none border-0 bg-transparent p-0 text-[17px] leading-6 text-t-primary outline-none placeholder:text-t-muted focus:ring-0";

  return (
    <div className={cn("relative block w-full min-w-0", variant === "comment" && "flex-1")}>
      <textarea
        autoFocus={autoFocus}
        className={cn(variantClasses, className)}
        onChange={handleChange}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        onKeyUp={handleSelect}
        placeholder={placeholder ?? t("post.mention.placeholder")}
        ref={textareaRef}
        rows={variant === "comment" ? 1 : minRows}
        value={value}
      />

      <DropdownPortal
        align="start"
        anchorRef={textareaRef}
        getAnchorRect={getMentionAnchorRect}
        minWidth={280}
        onClose={() => setMentionCtx(null)}
        open={showSuggestions}
        placement="auto"
        width={280}
      >
        {suggestions.length > 0 ? (
          <ul className="max-h-52 overflow-auto rounded-lg bg-surface py-1 shadow-[var(--shadow-elevated)] ring-1 ring-border-light" data-mention-list role="listbox">
            {suggestions.map((user, index) => (
              <li key={user.id} role="option" aria-selected={index === activeIndex}>
                <div
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 transition hover:bg-surface-hover",
                    index === activeIndex && "bg-surface-hover",
                  )}
                >
                  <UserProfileLink avatarClassName="h-8 w-8" layout="avatar" user={user} />
                  <button
                    className="min-w-0 flex-1 text-start"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applyMention(user);
                    }}
                    type="button"
                  >
                    <p className="truncate text-[15px] font-semibold text-t-primary">{user.name.trim() || user.username}</p>
                    <p className="truncate text-[13px] text-t-muted">@{getMentionHandle(user)}</p>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-surface px-3 py-2 text-[13px] text-t-muted shadow ring-1 ring-border-light">
            {t("post.mention.noContacts")}
          </p>
        )}
      </DropdownPortal>
    </div>
  );
});

/** Inserts @ at cursor to start tagging (Facebook "Tag people" action). */
export function focusMentionInTextarea(
  textarea: HTMLTextAreaElement | null,
  onChange?: (value: string) => void,
) {
  if (!textarea) {
    return;
  }

  textarea.focus();
  const cursor = textarea.selectionStart;
  const next = `${textarea.value.slice(0, cursor)}@${textarea.value.slice(cursor)}`;
  if (onChange) {
    onChange(next);
  } else {
    textarea.value = next;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const nextCursor = cursor + 1;
  textarea.setSelectionRange(nextCursor, nextCursor);
}
