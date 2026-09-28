"use client";

import Link from "next/link";
import { BrandIcon, SearchIcon } from "@/components/home/icons";
import { LanguageSwitcher } from "@/components/home/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <main className={`relative px-4 py-10 ${ui.page}`}>
      <div className="absolute end-4 top-4 flex items-center gap-1">
        <ThemeToggle iconClassName="h-[22px] w-[22px]" />
        <LanguageSwitcher iconClassName="h-[22px] w-[22px]" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col items-center justify-center text-center">
        <BrandIcon className="h-16 w-16 text-blue-600 dark:text-blue-400" />

        <div className={cn("mt-8 flex h-24 w-24 items-center justify-center rounded-full shadow-sm ring-1", ui.card, ui.textFaint)}>
          <SearchIcon className="h-11 w-11" />
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">{t("notFound.code")}</p>
        <h1 className={cn("mt-2 text-3xl font-bold tracking-tight sm:text-4xl", ui.textPrimary)}>{t("notFound.title")}</h1>
        <p className={cn("mt-4 max-w-xl text-base leading-7", ui.textSecondary)}>{t("notFound.description")}</p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
            href="/"
          >
            {t("notFound.goHome")}
          </Link>
          <Link
            className={cn("inline-flex h-12 flex-1 items-center justify-center rounded-md px-5 text-sm font-bold shadow-sm ring-1 transition", ui.card, ui.textSecondary, "hover:bg-surface-muted")}
            href="/login"
          >
            {t("notFound.login")}
          </Link>
        </div>
      </div>
    </main>
  );
}
