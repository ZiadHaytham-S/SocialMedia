"use client";

import { useEffect, useState } from "react";
import { searchUsersForFriends } from "@/lib/api/friend";
import type { FriendSearchHit } from "@/types/social";

export const USER_SEARCH_MIN_LENGTH = 2;
export const USER_SEARCH_DEBOUNCE_MS = 350;

export function useUserSearch(query: string, debounceMs = USER_SEARCH_DEBOUNCE_MS) {
  const [hits, setHits] = useState<FriendSearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  const isReady = trimmed.length >= USER_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!isReady) {
      setHits([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    let ignore = false;
    setIsSearching(true);
    setError(null);

    const handle = window.setTimeout(() => {
      void searchUsersForFriends(trimmed)
        .then((results) => {
          if (!ignore) {
            setHits(results);
            setIsSearching(false);
          }
        })
        .catch((nextError) => {
          if (!ignore) {
            setHits([]);
            setIsSearching(false);
            setError(nextError instanceof Error ? nextError.message : "Search failed");
          }
        });
    }, debounceMs);

    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [debounceMs, isReady, trimmed]);

  return { hits, isSearching, isReady, error, trimmed };
}
