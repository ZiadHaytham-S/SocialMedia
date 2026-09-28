"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ApiUser, FriendCounts, FriendListItem, FriendRelation } from "@/types/social";
import {
  getFriendCounts,
  listBlockedUsers,
  listFriends,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  listFriendSuggestions,
} from "@/lib/api/friend";
import { getViewer } from "@/lib/api/user";
import { useUserSearch } from "@/hooks/use-user-search";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { RequireAuthScreen } from "@/components/auth/require-auth-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { LeftSidebar, RightSidebar } from "@/components/home/sidebar";
import { TopNav } from "@/components/home/top-nav";
import { FriendUserRow } from "./friend-user-row";
import { cn, ui } from "@/lib/theme/ui";

type FriendsTab = "all" | "requests" | "suggestions" | "find" | "blocked";

const TAB_KEYS: FriendsTab[] = ["all", "requests", "suggestions", "find", "blocked"];

export function FriendsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as FriendsTab) || "all";
  const { t } = useLocale();
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth();
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [contacts, setContacts] = useState<ApiUser[]>([]);
  const [tab, setTab] = useState<FriendsTab>(TAB_KEYS.includes(initialTab) ? initialTab : "all");
  const [counts, setCounts] = useState<FriendCounts>({ friends: 0, incoming: 0, outgoing: 0 });
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [incoming, setIncoming] = useState<FriendListItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendListItem[]>([]);
  const [suggestions, setSuggestions] = useState<FriendListItem[]>([]);
  const [blocked, setBlocked] = useState<FriendListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { hits: searchHits, isSearching } = useUserSearch(tab === "find" ? searchQuery : "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<MessageKey | "">("");

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [nextViewer, nextCounts, nextFriends, nextIncoming, nextOutgoing, nextSuggestions, nextBlocked] =
        await Promise.all([
          getViewer(),
          getFriendCounts(),
          listFriends(),
          listIncomingFriendRequests(),
          listOutgoingFriendRequests(),
          listFriendSuggestions(),
          listBlockedUsers(),
        ]);

      setViewer(nextViewer);
      setCounts(nextCounts);
      setFriends(nextFriends);
      setIncoming(nextIncoming);
      setOutgoing(nextOutgoing);
      setSuggestions(nextSuggestions);
      setBlocked(nextBlocked);
      setContacts(nextFriends.map((item) => item.user));
    } catch {
      setError("friends.loadError");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    void reload();
  }, [isAuthenticated, isAuthLoading, reload]);

  const tabLabel = (key: FriendsTab): MessageKey => {
    switch (key) {
      case "all":
        return "friends.tabAll";
      case "requests":
        return "friends.tabRequests";
      case "suggestions":
        return "friends.tabSuggestions";
      case "find":
        return "friends.tabFind";
      case "blocked":
        return "friends.tabBlocked";
    }
  };

  return (
    <RequireAuthScreen>
      <div className={ui.page}>
        {viewer ? <TopNav viewer={viewer} /> : <header className={cn(ui.navHeader, "h-14")} />}

        <main className={ui.feedMain}>
          {viewer ? <LeftSidebar viewer={viewer} /> : <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:block" />}

          <div className={ui.feedColumn}>
            <section className={ui.cardPadded}>
              <h1 className={ui.headingXl}>{t("friends.title")}</h1>
              <p className={cn("mt-1 text-[15px]", ui.textMuted)}>{t("friends.subtitle")}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-[14px] font-semibold">
                <span className={ui.textSecondary}>{t("friends.statsFriends", { count: counts.friends })}</span>
                <span className={ui.textSecondary}>{t("friends.statsIncoming", { count: counts.incoming })}</span>
                <span className={ui.textSecondary}>{t("friends.statsOutgoing", { count: counts.outgoing })}</span>
              </div>
            </section>

            <nav className={cn(ui.cardPaddedSm, "flex flex-wrap gap-2")}>
              {TAB_KEYS.map((key) => (
                <button
                  className={cn(
                    "rounded-full px-4 py-2 text-[14px] font-semibold transition",
                    tab === key ? "bg-fb text-white" : "bg-surface-muted text-t-secondary hover:bg-surface-hover",
                  )}
                  key={key}
                  onClick={() => setTab(key)}
                  type="button"
                >
                  {t(tabLabel(key))}
                  {key === "requests" && counts.incoming > 0 ? (
                    <span className="ms-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-500 px-1.5 text-[12px] text-white">
                      {counts.incoming}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>

            {error ? <p className={ui.alertError}>{t(error)}</p> : null}

            {isLoading ? <p className={cn("text-center text-sm font-semibold", ui.textMuted)}>{t("common.loading")}</p> : null}

            {!isLoading && tab === "all" ? (
              <FriendsList
                emptyDesc={t("friends.emptyAllDesc")}
                emptyTitle={t("friends.emptyAll")}
                items={friends}
                onChanged={() => void reload()}
                relation="friends"
              />
            ) : null}

            {!isLoading && tab === "requests" ? (
              <div className="space-y-6">
                <section className="space-y-3">
                  <h2 className={ui.headingMd}>{t("friends.incomingTitle")}</h2>
                  <FriendsList
                    emptyDesc={t("friends.emptyIncomingDesc")}
                    emptyTitle={t("friends.emptyIncoming")}
                    items={incoming}
                    onChanged={() => void reload()}
                    relation="pending_incoming"
                  />
                </section>
                <section className="space-y-3">
                  <h2 className={ui.headingMd}>{t("friends.outgoingTitle")}</h2>
                  <FriendsList
                    emptyDesc={t("friends.emptyOutgoingDesc")}
                    emptyTitle={t("friends.emptyOutgoing")}
                    items={outgoing}
                    onChanged={() => void reload()}
                    relation="pending_outgoing"
                  />
                </section>
              </div>
            ) : null}

            {!isLoading && tab === "suggestions" ? (
              <FriendsList
                emptyDesc={t("friends.emptySuggestionsDesc")}
                emptyTitle={t("friends.emptySuggestions")}
                items={suggestions}
                onChanged={() => void reload()}
                relation="none"
                showMutual
              />
            ) : null}

            {!isLoading && tab === "find" ? (
              <section className="space-y-3">
                <input
                  className={ui.authInput}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("friends.searchPlaceholder")}
                  type="search"
                  value={searchQuery}
                />
                {searchQuery.trim().length < 2 ? (
                  <p className={cn("text-[14px] font-medium", ui.textMuted)}>{t("friends.searchHint")}</p>
                ) : isSearching ? (
                  <p className={cn("text-[14px] font-medium", ui.textMuted)}>{t("search.searching")}</p>
                ) : searchHits.length === 0 ? (
                  <EmptyState description={t("friends.emptySearchDesc")} title={t("friends.emptySearch")} />
                ) : (
                  <div className="space-y-2">
                    {searchHits.map((hit) => (
                      <FriendUserRow
                        item={{ user: hit.user, mutualCount: hit.mutualCount }}
                        key={hit.user.id}
                        onChanged={() => void reload()}
                        presetRelation={hit.relation}
                        showMutual
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {!isLoading && tab === "blocked" ? (
              <FriendsList
                emptyDesc={t("friends.emptyBlockedDesc")}
                emptyTitle={t("friends.emptyBlocked")}
                items={blocked}
                onChanged={() => void reload()}
                relation="blocked_by_viewer"
              />
            ) : null}
          </div>

          {viewer ? <RightSidebar contacts={contacts} /> : <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] xl:block" />}
        </main>
      </div>
    </RequireAuthScreen>
  );
}

function FriendsList({
  items,
  emptyTitle,
  emptyDesc,
  relation,
  showMutual,
  onChanged,
}: {
  items: FriendListItem[];
  emptyTitle: string;
  emptyDesc: string;
  relation?: FriendRelation;
  showMutual?: boolean;
  onChanged: () => void;
}) {
  if (items.length === 0) {
    return <EmptyState description={emptyDesc} title={emptyTitle} />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <FriendUserRow
          item={item}
          key={item.user.id}
          onChanged={onChanged}
          presetRelation={relation}
          showMutual={showMutual}
        />
      ))}
    </div>
  );
}
