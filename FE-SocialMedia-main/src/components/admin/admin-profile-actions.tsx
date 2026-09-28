"use client";

import { useRouter } from "next/navigation";
import type { ApiUser } from "@/types/social";
import { ADMIN_ROLE } from "@/lib/auth/roles";
import { deleteUser, restoreUser, setUserRole } from "@/lib/api/user";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type AdminProfileActionsProps = {
  profile: ApiUser;
  onProfileChange: (profile: ApiUser) => void;
};

export function AdminProfileActions({ profile, onProfileChange }: AdminProfileActionsProps) {
  const router = useRouter();
  const { t } = useLocale();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const isDeleted = Boolean(profile.deletedAt);
  const isTargetAdmin = profile.role === ADMIN_ROLE;

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

    const updated = await deleteUser(profile.id);
    onProfileChange(updated);
  }

  async function handleRestore() {
    const updated = await restoreUser(profile.id);
    onProfileChange(updated);
  }

  async function handleRoleToggle() {
    const nextRole = isTargetAdmin ? 0 : 1;
    const updated = await setUserRole(profile.id, nextRole);
    onProfileChange(updated);
  }

  return (
    <section className={cn(ui.cardPaddedSm, "border border-amber-500/30 bg-amber-500/5")}>
      <p className={cn("text-[13px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300")}>
        {t("admin.panelTitle")}
      </p>
      <p className={cn("mt-1 text-[13px]", ui.textMuted)}>
        {profile.email ? `${t("auth.email")}: ${profile.email}` : null}
        {profile.role !== undefined ? ` · ${t("admin.roleLabel")}: ${isTargetAdmin ? t("admin.roleAdmin") : t("admin.roleUser")}` : null}
        {isDeleted ? ` · ${t("admin.deletedBadge")}` : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!isDeleted ? (
          <button className={cn(ui.profileEditBtn, "text-red-600 dark:text-red-400")} onClick={() => void handleDelete()} type="button">
            {t("admin.deleteUser")}
          </button>
        ) : (
          <button className={ui.profileEditBtn} onClick={() => void handleRestore()} type="button">
            {t("admin.restoreUser")}
          </button>
        )}
        <button className={ui.profileEditBtn} onClick={() => void handleRoleToggle()} type="button">
          {isTargetAdmin ? t("admin.demoteUser") : t("admin.promoteUser")}
        </button>
        <button className={ui.profileEditBtn} onClick={() => router.push("/admin")} type="button">
          {t("admin.openDashboard")}
        </button>
      </div>
      {ConfirmDialog}
    </section>
  );
}
