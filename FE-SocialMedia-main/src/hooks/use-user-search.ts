"use client";

import { useEffect, useState } from "react";
import { searchUsersForFriends } from "@/lib/api/friend";
import type { FriendSearchHit } from "@/types/social";

export const USER_SEARCH_MIN_LENGTH = 2;
export const USER_SEARCH_DEBOUNCE_MS = 350;

export function useUserSearch(query: string, debounceMs = USER_SEARCH_DEBOUNCE_MS) {
  const [result, setResult] = useState<{ query: string; hits: FriendSearchHit[]; error: string | null }>({ query: "", hits: [], error: null });

  const trimmed = query.trim();
  const isReady = trimmed.length >= USER_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let ignore = false;

    const handle = window.setTimeout(() => {
      void searchUsersForFriends(trimmed)
        .then((results) => {
          if (!ignore) {
            setResult({ query: trimmed, hits: results, error: null });
          }
        })
        .catch((nextError) => {
          if (!ignore) {
            setResult({ query: trimmed, hits: [], error: nextError instanceof Error ? nextError.message : "Search failed" });
          }
        });
    }, debounceMs);

    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [debounceMs, isReady, trimmed]);

  const isCurrent = isReady && result.query === trimmed;
  return {
    hits: isCurrent ? result.hits : [],
    isSearching: isReady && !isCurrent,
    isReady,
    error: isCurrent ? result.error : null,
    trimmed,
  };
}
