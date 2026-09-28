"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiPost, ApiStory, ApiUser } from "@/types/social";
import { getNewsFeed } from "@/lib/api/post";
import { getStoryFeed } from "@/lib/api/story";
import { listContactsForViewer } from "@/lib/api/contacts";
import { getViewer } from "@/lib/api/user";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "./feed-skeleton";
import { LeftSidebar, RightSidebar } from "./sidebar";
import { prependShareAndIncrementCount } from "@/lib/utils/post-share";
import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";
import { StoriesRow } from "./stories-row";
import { ui } from "@/lib/theme/ui";
import { TopNav } from "./top-nav";
import { RequireAuthScreen } from "@/components/auth/require-auth-screen";

export function HomePage() {
  const { t } = useLocale();
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth();
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [stories, setStories] = useState<ApiStory[]>([]);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [contacts, setContacts] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"" | "home.loadError">("");

  const refreshStories = useCallback(async () => {
    if (!viewer) {
      return;
    }

    try {
      const nextStories = await getStoryFeed();
      setStories(nextStories);
    } catch {
      // Keep the current stories if a background refresh fails.
    }
  }, [viewer]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      if (!isAuthLoading && !isAuthenticated) {
        const timeout = window.setTimeout(() => {
          setIsLoading(false);
        }, 0);

        return () => window.clearTimeout(timeout);
      }
      return;
    }

    let ignore = false;

    async function loadHome() {
      setIsLoading(true);
      setError("");

      try {
        const nextViewer = await getViewer();
        const [nextStories, nextPosts, nextContacts] = await Promise.all([
          getStoryFeed(),
          getNewsFeed(),
          listContactsForViewer(nextViewer),
        ]);

        if (!ignore) {
          setViewer(nextViewer);
          setStories(nextStories);
          setPosts(nextPosts);
          setContacts(nextContacts);
        }
      } catch {
        if (!ignore) {
          setError("home.loadError");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadHome();

    return () => {
      ignore = true;
    };
  }, [isAuthLoading, isAuthenticated]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const refreshVisibleStories = () => {
      if (document.visibilityState === "visible") {
        void refreshStories();
      }
    };

    const interval = window.setInterval(() => {
      void refreshStories();
    }, 5000);

    window.addEventListener("focus", refreshVisibleStories);
    document.addEventListener("visibilitychange", refreshVisibleStories);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisibleStories);
      document.removeEventListener("visibilitychange", refreshVisibleStories);
    };
  }, [refreshStories, viewer]);

  const showFeed = viewer && !isLoading;

  return (
    <RequireAuthScreen>
    <div className={ui.page}>
      {viewer ? <TopNav viewer={viewer} /> : <TopNavSkeleton />}

      <main className={ui.feedMain}>
        {viewer ? <LeftSidebar viewer={viewer} /> : <SidebarSkeleton />}

        <div className={ui.feedColumn}>
          {viewer ? (
            <>
              <StoriesRow
                onCreateStory={(story) => setStories((current) => [story, ...current])}
                onDeleteStory={(storyId) => setStories((current) => current.filter((story) => story.id !== storyId))}
                onUpdateStory={(updatedStory) =>
                  setStories((current) => current.map((story) => (story.id === updatedStory.id ? updatedStory : story)))
                }
                stories={stories}
                viewer={viewer}
              />
              <PostComposer
                contacts={contacts}
                onCreatePost={(post) => setPosts((current) => [post, ...current])}
                viewer={viewer}
              />
            </>
          ) : (
            <ComposerSkeleton />
          )}

          {isLoading ? <FeedSkeleton /> : null}

          {error ? (
            <div className={`rounded-lg p-5 text-center text-sm font-semibold shadow-sm ring-1 ${ui.alertError}`}>
              {t(error as "home.loadError")}
            </div>
          ) : null}

          {showFeed && posts.length === 0 && !error ? (
            <EmptyState description={t("home.emptyPostsDesc")} title={t("home.emptyPosts")} />
          ) : null}

          {showFeed ? (
            <section className="flex flex-col gap-3 sm:gap-4">
              {posts.map((post) => (
                <PostCard
                  contacts={contacts}
                  key={post.id}
                  onDeletePost={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
                  onSharePost={(sharedPost) => setPosts((current) => prependShareAndIncrementCount(current, sharedPost))}
                  onUpdatePost={(updatedPost) =>
                    setPosts((current) => current.map((item) => (item.id === updatedPost.id ? updatedPost : item)))
                  }
                  post={post}
                  viewer={viewer}
                />
              ))}
            </section>
          ) : null}
        </div>

        <RightSidebar contacts={contacts} />
      </main>
    </div>
    </RequireAuthScreen>
  );
}

function TopNavSkeleton() {
  return <header className={`${ui.navHeader} h-14`} />;
}

function SidebarSkeleton() {
  return <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] px-3 py-3 lg:block" />;
}

function ComposerSkeleton() {
  return <section className={ui.cardPadded}>
    <div className="h-11 animate-pulse rounded-full bg-surface-muted" />
  </section>;
}
