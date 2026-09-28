"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

type ProfileTab = "posts";

type ProfileTabsProps = {
  activeTab?: ProfileTab;
};

export function ProfileTabs({ activeTab = "posts" }: ProfileTabsProps) {
  const { t } = useLocale();

  return (
    <nav aria-label={t("profile.tabsLabel")} className={cn("mt-3 overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-card)]")}>
      <div className="flex border-b border-border-light">
        <button
          aria-current={activeTab === "posts" ? "page" : undefined}
          className={cn(
            "relative px-5 py-3 text-[15px] font-semibold transition",
            activeTab === "posts" ? "text-fb" : cn(ui.textMuted, "hover:bg-surface-hover"),
          )}
          type="button"
        >
          {t("profile.tabPosts")}
          {activeTab === "posts" ? (
            <span className="absolute inset-x-3 bottom-0 h-1 rounded-t-full bg-fb" />
          ) : null}
        </button>
      </div>
    </nav>
  );
}
