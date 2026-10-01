"use client";

import { useEffect, useState } from "react";
import type { ApiPost, ApiUser } from "@/types/social";
import { getFriendStatus } from "@/lib/api/friend";
import { listContactsForViewer } from "@/lib/api/contacts";
import { getProfilePosts } from "@/lib/api/post";
import { getUserById, getViewer, updateProfileCoverImage, updateProfileImage, visitProfile } from "@/lib/api/user";
import type { FriendMeta } from "@/types/social";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { RequireAuthScreen } from "@/components/auth/require-auth-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { prependShareAndIncrementCount } from "@/lib/utils/post-share";
import { PostCard } from "@/components/home/post-card";
import { PostComposer } from "@/components/home/post-composer";
import { LeftSidebar, RightSidebar } from "@/components/home/sidebar";
import { TopNav } from "@/components/home/top-nav";
import { cn, ui } from "@/lib/theme/ui";
import { ProfileHeader } from "./profile-header";
import { ProfileSkeleton } from "./profile-skeleton";
import { ProfileTabs } from "./profile-tabs";

type ProfilePageProps = {
  userId?: string;
};

export function ProfilePage({ userId }: ProfilePageProps) {
  const { t } = useLocale();
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth();
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [contacts, setContacts] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<MessageKey | "">("");
  const [imageError, setImageError] = useState<MessageKey | "">("");
  const [friendMeta, setFriendMeta] = useState(profile?.friendMeta);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    let ignore = false;

    async function loadProfile() {
      setIsLoading(true);
      setError("");

      try {
        const nextViewer = await getViewer();
        const targetUserId = userId ?? nextViewer.id;
        let nextProfile: ApiUser;

        if (targetUserId === nextViewer.id) {
          nextProfile = nextViewer;
        } else {
          try {
            nextProfile = await visitProfile(targetUserId);
          } catch {
            nextProfile = await getUserById(targetUserId);
          }

          try {
            const meta = nextProfile.friendMeta ?? (await getFriendStatus(targetUserId));
            nextProfile = { ...nextProfile, friendMeta: meta };
          } catch {
            /* FriendProfileActions will retry status load */
          }
        }

        const [nextPosts, nextContacts] = await Promise.all([
          getProfilePosts(targetUserId),
          listContactsForViewer(nextViewer),
        ]);

        if (!ignore) {
          setViewer(nextViewer);
          setProfile(nextProfile);
          setFriendMeta(targetUserId === nextViewer.id ? undefined : nextProfile.friendMeta);
          setPosts(nextPosts);
          setContacts(nextContacts);
        }
      } catch {
        if (!ignore) {
          setError("profile.loadError");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    const timeout = window.setTimeout(() => void loadProfile(), 0);

    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [isAuthLoading, isAuthenticated, userId]);

  const isOwnProfile = Boolean(viewer && profile && profile.id === viewer.id);

  async function handleAvatarChange(file?: File) {
    if (!file || !isOwnProfile) {
      return;
    }

    setImageError("");

    try {
      const updated = await updateProfileImage(file);
      setViewer((current) => (current ? { ...current, ...updated } : current));
      setProfile((current) => (current ? { ...current, ...updated } : current));
    } catch {
      setImageError("profile.avatarError");
    }
  }

  async function handleCoverChange(files?: FileList | null) {
    if (!files?.length || !isOwnProfile) {
      return;
    }

    setImageError("");

    try {
      const updated = await updateProfileCoverImage(Array.from(files).slice(0, 2));
      setViewer((current) => (current ? { ...current, ...updated } : current));
      setProfile((current) => (current ? { ...current, ...updated } : current));
    } catch {
      setImageError("profile.coverError");
    }
  }

  const showShell = viewer && profile;

  return (
    <RequireAuthScreen>
      <div className={ui.page}>
        {viewer ? <TopNav viewer={viewer} /> : <header className={cn(ui.navHeader, "h-14")} />}

        <main className={ui.feedMain}>
          {viewer ? <LeftSidebar viewer={viewer} /> : <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] lg:block" />}

          <div className={ui.feedColumn}>
            {isLoading && !showShell ? <ProfileSkeleton /> : null}

            {showShell ? (
              <>
                <ProfileHeader
                  friendMeta={friendMeta}
                  imageError={imageError}
                  isOwnProfile={isOwnProfile}
                  onAvatarChange={handleAvatarChange}
                  onCoverChange={handleCoverChange}
                  onFriendMetaChange={(meta: FriendMeta) => {
                    setFriendMeta(meta);
                    setProfile((current) => (current ? { ...current, friendMeta: meta } : current));
                  }}
                  onProfileChange={setProfile}
                  profile={profile}
                  viewer={viewer}
                />

                <ProfileTabs />

                {isLoading ? (
                  <div className="mt-1">
                    <FeedSkeleton count={2} />
                  </div>
                ) : null}

                {error ? <ProfileAlert error message={t(error)} /> : null}

                {!isLoading && !error ? (
                  <section className="mt-1 flex flex-col gap-3 sm:gap-4">
                    {isOwnProfile ? (
                      <PostComposer
                        contacts={contacts}
                        onCreatePost={(post) => setPosts((current) => [post, ...current])}
                        viewer={viewer}
                      />
                    ) : null}

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

                    {posts.length === 0 ? (
                      <EmptyState
                        description={isOwnProfile ? t("profile.emptyOwnPostsDesc") : t("profile.emptyPostsDesc")}
                        title={isOwnProfile ? t("profile.emptyOwnPosts") : t("profile.emptyPosts")}
                      />
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : null}
          </div>

          {viewer ? <RightSidebar contacts={contacts} /> : <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] xl:block" />}
        </main>
      </div>
    </RequireAuthScreen>
  );
}

function ProfileAlert({ error, message }: { error?: boolean; message: string }) {
  return (
    <div
      className={cn(
        "mt-3 rounded-lg p-4 text-center text-sm font-semibold shadow-sm ring-1",
        error ? cn(ui.alertError, "ring-border-light") : cn(ui.card, ui.textMuted),
      )}
    >
      {message}
    </div>
  );
}
