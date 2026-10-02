"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ApiUser } from "@/types/social";
import { signOutWithBackend } from "@/lib/api/auth-session";
import { useLocale } from "@/lib/i18n/locale-context";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { NavCenterTab, NavIconButton } from "./nav-icon-button";
import { isAdmin } from "@/lib/auth/roles";
import { cn, ui } from "@/lib/theme/ui";
import { MessagesNavLink } from "@/components/messaging/messages-nav-link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserSearchBox } from "@/components/search/user-search-box";
import {
  BrandIcon,
  GroupsIcon,
  HomeIcon,
  LogoutIcon,
  SettingsIcon,
  ShopIcon,
  UsersIcon,
  VideoIcon,
} from "./icons";

const NAV_ICON_CLASS = "h-[22px] w-[22px]";

type TopNavProps = {
  viewer: ApiUser;
};

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: "nav.home" | "nav.friends" | "nav.watch" | "nav.market" | "nav.groups";
  isActive?: (pathname: string) => boolean;
  disabled?: boolean;
};

export function TopNav({ viewer }: TopNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  const mainNavItems: NavItem[] = [
    { href: "/", icon: HomeIcon, labelKey: "nav.home", isActive: (path) => path === "/" },
    { href: "/friends", icon: UsersIcon, labelKey: "nav.friends", isActive: (path) => path.startsWith("/friends") },
    { href: "#watch", icon: VideoIcon, labelKey: "nav.watch", disabled: true },
    { href: "#market", icon: ShopIcon, labelKey: "nav.market", disabled: true },
    { href: "#groups", icon: GroupsIcon, labelKey: "nav.groups", disabled: true },
  ];

  return (
    <header className={ui.navHeader}>
      <nav className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1 px-2 sm:gap-x-2 sm:px-3 xl:h-14 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:px-5">
        <div className="flex h-14 min-w-0 items-center gap-2">
          <Link href="/" title={t("nav.home")}>
            <BrandIcon className="h-10 w-10 shrink-0 text-fb" />
          </Link>
          <UserSearchBox
            className="min-w-0 flex-1 xl:flex-none"
            inputClassName="w-full xl:w-40 2xl:w-64"
          />
        </div>

        <div className="order-3 col-span-2 flex h-11 items-stretch justify-center border-t border-border-light xl:order-none xl:col-span-1 xl:h-full xl:border-0">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive?.(pathname) ?? false;

            return (
              <NavCenterTab
                active={active}
                disabled={item.disabled}
                href={item.disabled ? undefined : item.href}
                key={item.labelKey}
                label={t(item.labelKey)}
                title={item.disabled ? t("nav.comingSoon") : t(item.labelKey)}
              >
                <Icon className={NAV_ICON_CLASS} />
              </NavCenterTab>
            );
          })}
        </div>

        {/* يمين: تفاعل → تفضيلات (لغة/مظهر) → حساب */}
        <div className="flex h-14 items-center justify-end gap-1">
          <MessagesNavLink />

          <NotificationBell />

          <Link
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full p-0.5 transition hover:bg-surface-muted",
              pathname.startsWith("/profile") && "ring-2 ring-fb ring-offset-2 ring-offset-surface",
            )}
            href="/profile"
            title={t("nav.profile")}
          >
            <img className="h-9 w-9 rounded-full object-cover ring-2 ring-border" src={viewer.avatarUrl} alt="" />
            <span className="sr-only">{t("nav.profile")}</span>
          </Link>

          <div className="hidden items-center gap-1 xl:flex">
          <LanguageSwitcher iconClassName={NAV_ICON_CLASS} />
          <ThemeToggle iconClassName={NAV_ICON_CLASS} />
          {isAdmin(viewer) ? (
            <NavIconButton href="/admin" label={t("nav.admin")} title={t("nav.admin")}>
              <SettingsIcon className={NAV_ICON_CLASS} />
            </NavIconButton>
          ) : null}

          <NavIconButton href="/settings" label={t("nav.settings")} title={t("nav.settings")}>
            <SettingsIcon className={NAV_ICON_CLASS} />
          </NavIconButton>

          <NavIconButton label={t("nav.logout")} onClick={() => signOutWithBackend("/login")} title={t("nav.logout")}>
            <LogoutIcon className={NAV_ICON_CLASS} />
          </NavIconButton>
          </div>
          <details className="relative xl:hidden">
            <summary aria-label={t("nav.settings")} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-surface-muted text-t-secondary [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="text-xl">☰</span>
            </summary>
            <div className="absolute end-0 top-12 z-50 w-56 rounded-xl border border-border-light bg-surface p-3 shadow-[var(--shadow-elevated)]">
              <div className="mb-2 flex gap-2">
                <LanguageSwitcher iconClassName={NAV_ICON_CLASS} />
                <ThemeToggle iconClassName={NAV_ICON_CLASS} />
              </div>
              {isAdmin(viewer) ? <Link className={ui.menuItem} href="/admin">{t("nav.admin")}</Link> : null}
              <Link className={ui.menuItem} href="/settings">{t("nav.settings")}</Link>
              <button className={ui.menuItemDanger} onClick={() => signOutWithBackend("/login")} type="button">{t("nav.logout")}</button>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
