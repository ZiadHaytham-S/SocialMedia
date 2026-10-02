"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/home/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "login" | "register";
};

export function AuthShell({ children, mode }: AuthShellProps) {
  const { t } = useLocale();
  const isLogin = mode === "login";
  const isRegister = mode === "register";

  return (
    <main className={cn("relative px-4 pb-6 pt-16 sm:py-8", ui.page)}>
      <div className="absolute end-4 top-4 z-10 flex items-center gap-1">
        <ThemeToggle iconClassName="h-[22px] w-[22px]" />
        <LanguageSwitcher iconClassName="h-[22px] w-[22px]" />
      </div>

      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl gap-8 lg:gap-12",
          isRegister
            ? "min-h-0 flex-col items-stretch justify-start py-4 lg:flex-row lg:items-start lg:justify-between lg:py-8"
            : "min-h-[calc(100vh-5rem)] items-center justify-center lg:justify-between",
        )}
      >
        <section className="hidden max-w-xl lg:block">
          <div className="mb-5 flex items-center gap-3">
            <VibeLogo className="h-14 w-14 text-[26px]" />
            <span className="bg-gradient-to-r from-fb via-cyan-500 to-emerald-500 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              {t("auth.brand")}
            </span>
          </div>
          <h1 className={`text-3xl font-semibold leading-tight ${ui.textPrimary}`}>{t("auth.tagline")}</h1>
          <p className={`mt-4 max-w-lg text-lg leading-8 ${ui.textSecondary}`}>{t("auth.subtitle")}</p>
        </section>

        <section className={cn("w-full", isRegister ? "max-w-[520px] lg:ms-auto" : "max-w-md")}>
          <div className={cn("mb-5 text-center", isRegister ? "lg:mb-6" : "lg:hidden")}>
            <VibeLogo className="mx-auto h-12 w-12 text-[22px] sm:h-14 sm:w-14 sm:text-[26px]" />
            <p className="mt-2 bg-gradient-to-r from-fb via-cyan-500 to-emerald-500 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">
              {t("auth.brand")}
            </p>
          </div>

          <div className={cn(ui.card, "shadow-lg", isRegister ? "p-5 sm:p-6" : "p-5")}>
            {children}
            <div className={cn("border-t pt-4 text-center sm:pt-5", ui.divider, isRegister ? "mt-4" : "mt-5")}>
              <Link
                className={`inline-flex h-12 items-center justify-center rounded-md px-6 text-base font-bold text-white transition ${
                  isLogin ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
                href={isLogin ? "/register" : "/login"}
              >
                {isLogin ? t("auth.createAccount") : t("auth.haveAccount")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function VibeLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-fb via-cyan-500 to-emerald-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/25",
        className,
      )}
    >
      ✨
    </span>
  );
}
