"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ApiUser } from "@/types/social";
import { defaultAvatar } from "@/lib/api/fallbacks";
import { SearchIcon } from "@/components/home/icons";
import { useUserSearch, USER_SEARCH_MIN_LENGTH } from "@/hooks/use-user-search";
import { useLocale } from "@/lib/i18n/locale-context";
import { getProfileHref } from "@/lib/utils/profile-path";
import { cn } from "@/lib/theme/ui";

type UserSearchBoxProps = {
  className?: string;
  inputClassName?: string;
  onSelectUser?: (user: ApiUser) => void;
  placeholder?: string;
};

export function UserSearchBox({ className, inputClassName, onSelectUser, placeholder }: UserSearchBoxProps) {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { hits, isSearching, isReady, error } = useUserSearch(query);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div className={cn("relative min-w-0", className)} ref={rootRef}>
      <label className="relative block min-w-0">
        <span className="sr-only">{t("nav.search")}</span>
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-t-muted" />
        <input
          className={cn(
            "h-10 w-full rounded-full bg-surface-input ps-10 pe-4 text-sm text-t-primary outline-none transition focus:ring-2 focus:ring-blue-500/25",
            inputClassName,
          )}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder ?? t("search.placeholder")}
          type="search"
          value={query}
        />
      </label>

      {showDropdown ? (
        <div className="absolute start-0 top-[calc(100%+6px)] z-50 max-h-80 w-full min-w-[240px] overflow-y-auto rounded-xl border border-border-light bg-surface shadow-lg">
          {!isReady ? (
            <p className="px-4 py-3 text-[13px] text-t-muted">{t("search.minHint")}</p>
          ) : isSearching ? (
            <p className="px-4 py-3 text-[13px] text-t-muted">{t("search.searching")}</p>
          ) : error ? (
            <p className="px-4 py-3 text-[13px] text-red-500">{error}</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-t-muted">{t("search.noResults")}</p>
          ) : (
            <ul className="py-1">
              {hits.map((hit) => {
                const profileHref = getProfileHref(hit.user.id);

                if (onSelectUser) {
                  return (
                    <li key={hit.user.id}>
                      <button
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-surface-hover"
                        onClick={() => {
                          onSelectUser(hit.user);
                          setQuery("");
                          setIsOpen(false);
                        }}
                        type="button"
                      >
                        <UserSearchResultRow user={hit.user} />
                      </button>
                    </li>
                  );
                }

                if (!profileHref) {
                  return null;
                }

                return (
                  <li key={hit.user.id}>
                    <Link
                      className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-hover"
                      href={profileHref}
                      onClick={() => {
                        setQuery("");
                        setIsOpen(false);
                      }}
                    >
                      <UserSearchResultRow user={hit.user} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function UserSearchResultRow({ user }: { user: ApiUser }) {
  return (
    <>
      <img alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" src={user.avatarUrl || defaultAvatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-t-primary">{user.name}</span>
        {user.email ? <span className="block truncate text-[12px] text-t-muted">{user.email}</span> : null}
      </span>
    </>
  );
}

export { USER_SEARCH_MIN_LENGTH };
