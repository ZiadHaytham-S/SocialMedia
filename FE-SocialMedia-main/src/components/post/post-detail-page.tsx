"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiPost, ApiUser } from "@/types/social";
import { getPostById } from "@/lib/api/post";
import { listContactsForViewer } from "@/lib/api/contacts";
import { getViewer } from "@/lib/api/user";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import { RequireAuthScreen } from "@/components/auth/require-auth-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { LeftSidebar, RightSidebar } from "@/components/home/sidebar";
import { PostCard } from "@/components/home/post-card";
import { TopNav } from "@/components/home/top-nav";
import { getShareTargetPostId } from "@/lib/utils/post-share";
import { cn, ui } from "@/lib/theme/ui";

type PostDetailPageProps = {
  postId: string;
};

export function PostDetailPage({ postId }: PostDetailPageProps) {
  const { t } = useLocale();
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth();
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [post, setPost] = useState<ApiPost | null>(null);
  const [contacts, setContacts] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      if (!isAuthLoading && !isAuthenticated) {
        setIsLoading(false);
      }
      return;
    }

    let ignore = false;

    async function load() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const nextViewer = await getViewer();
        const [nextPost, nextContacts] = await Promise.all([
          getPostById(postId),
          listContactsForViewer(nextViewer),
        ]);

        if (ignore) {
          return;
        }

        setViewer(nextViewer);
        setPost(nextPost);
        setContacts(nextContacts);
      } catch {
        if (!ignore) {
          setPost(null);
          setNotFound(true);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isAuthLoading, postId]);

  return (
    <RequireAuthScreen>
      <div className={ui.page}>
        {viewer ? <TopNav viewer={viewer} /> : <header className={cn(ui.navHeader, "h-14")} />}

        <main className={ui.feedMain}>
          {viewer ? <LeftSidebar viewer={viewer} /> : <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:block" />}

          <div className={ui.feedColumn}>
            <Link className={cn("text-[15px] font-semibold hover:underline", ui.textLink)} href="/">
              ← {t("share.backToFeed")}
            </Link>

            {isLoading ? <FeedSkeleton count={1} /> : null}

            {!isLoading && notFound ? (
              <EmptyState description={t("share.postNotFoundDesc")} title={t("share.postNotFound")} />
            ) : null}

            {!isLoading && post && viewer ? (
              <PostCard
                contacts={contacts}
                onDeletePost={() => setNotFound(true)}
                onSharePost={(sharedPost) =>
                  setPost((current) => {
                    if (!current || getShareTargetPostId(current) !== getShareTargetPostId(sharedPost)) {
                      return current;
                    }

                    return { ...current, shareCount: (current.shareCount ?? 0) + 1 };
                  })
                }
                onUpdatePost={setPost}
                post={post}
                viewer={viewer}
              />
            ) : null}
          </div>

          {viewer ? <RightSidebar contacts={contacts} /> : <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] xl:block" />}
        </main>
      </div>
    </RequireAuthScreen>
  );
}
