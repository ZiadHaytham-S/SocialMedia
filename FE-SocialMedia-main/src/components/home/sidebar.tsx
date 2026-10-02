"use client";

import Link from "next/link";
import type { ApiUser } from "@/types/social";
import { useMessengerOptional } from "@/components/messaging/messenger-context";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { isAdmin } from "@/lib/auth/roles";
import { cn, ui } from "@/lib/theme/ui";
import { UserIcon } from "./icons";

type SidebarProps = {
  viewer: ApiUser;
};

export function LeftSidebar({ viewer }: SidebarProps) {
  const { t } = useLocale();
  const messenger = useMessengerOptional();

  const menuItems: { labelKey: MessageKey; href: string; action?: "messages" }[] = [
    { labelKey: "sidebar.friends", href: "/friends" },
    { labelKey: "nav.messages", href: "#", action: "messages" },
    { labelKey: "sidebar.memories", href: "#" },
    { labelKey: "sidebar.saved", href: "#" },
    { labelKey: "sidebar.groups", href: "#" },
    { labelKey: "sidebar.market", href: "#" },
    { labelKey: "sidebar.watch", href: "#" },
  ];

  return (
    <aside className="sticky top-28 hidden h-[calc(100dvh-7rem)] overflow-y-auto py-3 ps-1 pe-2 lg:block xl:top-16 xl:h-[calc(100dvh-4rem)]">
      <nav className="space-y-1">
        <SidebarItem href="/profile" image={viewer.avatarUrl} label={viewer.name || t("sidebar.myProfile")} prominent />
        {isAdmin(viewer) ? <SidebarItem href="/admin" label={t("nav.admin")} prominent /> : null}
        {menuItems.map((item) =>
          item.action === "messages" ? (
            <button
              className={cn(ui.sidebarItem, "w-full text-start")}
              key={item.labelKey}
              onClick={() => messenger?.openInbox()}
              type="button"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg">💬</span>
              <span className="truncate">{t(item.labelKey)}</span>
            </button>
          ) : (
            <SidebarItem key={item.labelKey} href={item.href} label={t(item.labelKey)} />
          ),
        )}
      </nav>
    </aside>
  );
}

export function RightSidebar({ contacts = [] }: { contacts?: ApiUser[] }) {
  const { t } = useLocale();
  const messenger = useMessengerOptional();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto py-3 ps-2 pe-1 xl:block">
      <section className="mb-4">
        <h2 className={ui.sidebarHeading}>{t("sidebar.sponsored")}</h2>
        <div className="overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-card)] ring-1 ring-border-light transition hover:bg-surface-hover">
          <div className="relative h-28 bg-gradient-to-br from-[#0ea5e9] via-[#2563eb] to-[#7c3aed]">
            <div className="absolute end-4 top-4 h-14 w-14 rounded-lg bg-white/20 backdrop-blur" />
            <div className="absolute bottom-4 start-4 h-8 w-24 rounded-full bg-white/25" />
          </div>
          <div className="p-3">
            <p className={cn("text-[14px] font-bold", ui.textPrimary)}>{t("sidebar.adTitle")}</p>
            <p className={cn("mt-1", ui.meta)}>{t("sidebar.adSubtitle")}</p>
            <button className="mt-3 w-full rounded-lg bg-fb px-3 py-2 text-[13px] font-bold text-white transition hover:bg-fb-hover" type="button">
              {t("sidebar.adAction")}
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between px-2">
          <h2 className={ui.sidebarHeading}>{t("sidebar.friendsOnline")}</h2>
        </div>
        <div className="space-y-0.5">
          {contacts.length === 0 ? (
            <p className={cn("px-2 py-2", ui.meta)}>{t("sidebar.noContacts")}</p>
          ) : (
            contacts.map((contact) => (
              <button
                className={cn(ui.sidebarItem, "w-full text-start")}
                key={contact.id}
                onClick={() => void messenger?.openChat(contact.id)}
                type="button"
              >
                <span className="relative shrink-0">
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
                    {contact.avatarUrl ? (
                      <img className="h-9 w-9 object-cover" src={contact.avatarUrl} alt="" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-t-muted" />
                    )}
                  </span>
                  <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
                </span>
                <span className="truncate">{contact.name}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}

function SidebarItem({
  href,
  image,
  label,
  prominent = false,
  online = false,
}: {
  href: string;
  image?: string;
  label: string;
  prominent?: boolean;
  online?: boolean;
}) {
  const { t } = useLocale();
  const isDisabled = href === "#";
  const className = cn(ui.sidebarItem, prominent && "font-bold");

  const content = (
    <>
      <span className="relative shrink-0">
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
          {image ? <img className="h-9 w-9 object-cover" src={image} alt="" /> : <UserIcon className="h-5 w-5 text-t-muted" />}
        </span>
        {online ? <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" /> : null}
      </span>
      <span className="truncate">{label}</span>
    </>
  );

  if (isDisabled) {
    return (
      <span aria-disabled="true" className={cn(className, "cursor-not-allowed opacity-60")} title={t("nav.comingSoon")}>
        {content}
      </span>
    );
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}
