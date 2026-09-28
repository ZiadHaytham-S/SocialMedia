"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiStory, ApiUser } from "@/types/social";
import { getStoryById } from "@/lib/api/story";
import { getViewer } from "@/lib/api/user";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import { RequireAuthScreen } from "@/components/auth/require-auth-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { StoryViewer } from "@/components/home/story-viewer";
import { cn, ui } from "@/lib/theme/ui";

type StoryDetailPageProps = {
  storyId: string;
};

export function StoryDetailPage({ storyId }: StoryDetailPageProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth();
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [story, setStory] = useState<ApiStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    let ignore = false;

    async function load() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const [nextViewer, nextStory] = await Promise.all([getViewer(), getStoryById(storyId)]);

        if (!ignore) {
          setViewer(nextViewer);
          setStory(nextStory);
        }
      } catch {
        if (!ignore) {
          setStory(null);
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
  }, [isAuthenticated, isAuthLoading, storyId]);

  function handleClose() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <RequireAuthScreen>
      <div className={ui.page}>
        {isLoading ? (
          <div className="flex min-h-screen items-center justify-center">
            <p className={cn("text-sm font-semibold", ui.textMuted)}>{t("common.loading")}</p>
          </div>
        ) : null}

        {!isLoading && notFound ? (
          <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4">
            <EmptyState description={t("share.storyNotFoundDesc")} title={t("share.storyNotFound")} />
            <Link className={cn("text-[15px] font-semibold hover:underline", ui.textLink)} href="/">
              {t("share.backToFeed")}
            </Link>
          </div>
        ) : null}

        {viewer ? (
          <StoryViewer
            onClose={handleClose}
            onStoryChange={setStory}
            story={!isLoading && !notFound ? story : null}
            viewer={viewer}
          />
        ) : null}
      </div>
    </RequireAuthScreen>
  );
}
