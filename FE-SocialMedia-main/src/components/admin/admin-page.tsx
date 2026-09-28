"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiUser } from "@/types/social";
import { ADMIN_ROLE, isAdmin } from "@/lib/auth/roles";
import { deleteUser, getViewer, listUsers, restoreUser, setUserRole } from "@/lib/api/user";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import { RequireAuthScreen } from "@/components/auth/require-auth-screen";
import { LeftSidebar, RightSidebar } from "@/components/home/sidebar";
import { TopNav } from "@/components/home/top-nav";
import { defaultAvatar } from "@/lib/api/fallbacks";
import { getProfileHref } from "@/lib/utils/profile-path";
import { cn, ui } from "@/lib/theme/ui";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export function AdminPage() {
  const { t } = useLocale();
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth();
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function reload() {
    setIsLoading(true);
    setError("");

    try {
      const nextViewer = await getViewer();

      if (!isAdmin(nextViewer)) {
        setError(t("admin.forbidden"));
        setViewer(nextViewer);
        return;
      }

      const nextUsers = await listUsers();
      setViewer(nextViewer);
      setUsers(nextUsers);
    } catch {
      setError(t("admin.loadError"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      void reload();
    }
  }, [isAuthenticated, isAuthLoading]);

  const filtered = users.filter((user) => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return true;
    }

    return (
      user.name.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.id.toLowerCase().includes(q)
    );
  });

  return (
    <RequireAuthScreen>
      <div className={ui.page}>
        {viewer ? <TopNav viewer={viewer} /> : <header className={cn(ui.navHeader, "h-14")} />}

        <main className={ui.feedMain}>
          {viewer ? <LeftSidebar viewer={viewer} /> : <aside className="sticky top-16 hidden lg:block" />}

          <div className={ui.feedColumn}>
            <section className={ui.cardPadded}>
              <h1 className={ui.headingXl}>{t("admin.dashboardTitle")}</h1>
              <p className={cn("mt-1 text-[15px]", ui.textMuted)}>{t("admin.dashboardDesc")}</p>
            </section>

            {error ? <p className={ui.alertError}>{error}</p> : null}

            {viewer && isAdmin(viewer) ? (
              <>
                <input
                  className={ui.authInput}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("admin.searchUsers")}
                  type="search"
                  value={query}
                />

                {isLoading ? (
                  <p className={cn("text-center text-sm font-semibold", ui.textMuted)}>{t("common.loading")}</p>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((user) => (
                      <AdminUserRow key={user.id} onChanged={() => void reload()} user={user} viewerId={viewer.id} />
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {viewer ? <RightSidebar contacts={users.filter((u) => u.id !== viewer.id)} /> : null}
        </main>
      </div>
    </RequireAuthScreen>
  );
}

function AdminUserRow({
  user,
  viewerId,
  onChanged,
}: {
  user: ApiUser;
  viewerId: string;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const profileHref = getProfileHref(user.id);
  const isDeleted = Boolean(user.deletedAt);
  const isTargetAdmin = user.role === ADMIN_ROLE;
  const isSelf = user.id === viewerId;

  async function handleDelete() {
    const ok = await confirm({
      title: t("admin.confirmDeleteUser"),
      confirmLabel: t("admin.deleteUser"),
      cancelLabel: t("post.cancel"),
      destructive: true,
    });

    if (!ok) {
      return;
    }

    await deleteUser(user.id);
    onChanged();
  }

  async function handleRestore() {
    await restoreUser(user.id);
    onChanged();
  }

  async function handleRole() {
    await setUserRole(user.id, isTargetAdmin ? 0 : 1);
    onChanged();
  }

  return (
    <article className={cn(ui.cardPaddedSm, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
      <div className="flex min-w-0 items-center gap-3">
        {profileHref ? (
          <Link href={profileHref}>
            <img alt="" className="h-11 w-11 rounded-full object-cover" src={user.avatarUrl || defaultAvatar} />
          </Link>
        ) : (
          <img alt="" className="h-11 w-11 rounded-full object-cover" src={user.avatarUrl || defaultAvatar} />
        )}
        <div className="min-w-0">
          <p className={cn("truncate font-bold", ui.textPrimary)}>{user.name}</p>
          <p className={cn("truncate text-[13px]", ui.textMuted)}>{user.email || user.id}</p>
          <p className={cn("text-[12px] font-semibold", ui.textMuted)}>
            {isTargetAdmin ? t("admin.roleAdmin") : t("admin.roleUser")}
            {isDeleted ? ` · ${t("admin.deletedBadge")}` : ""}
          </p>
        </div>
      </div>

      {!isSelf ? (
        <div className="flex flex-wrap gap-2">
          {!isDeleted ? (
            <button className={cn(ui.profileEditBtn, "text-red-600")} onClick={() => void handleDelete()} type="button">
              {t("admin.deleteUser")}
            </button>
          ) : (
            <button className={ui.profileEditBtn} onClick={() => void handleRestore()} type="button">
              {t("admin.restoreUser")}
            </button>
          )}
          <button className={ui.profileEditBtn} onClick={() => void handleRole()} type="button">
            {isTargetAdmin ? t("admin.demoteUser") : t("admin.promoteUser")}
          </button>
        </div>
      ) : (
        <span className={cn("text-[13px] font-semibold", ui.textMuted)}>{t("admin.you")}</span>
      )}
      {ConfirmDialog}
    </article>
  );
}
