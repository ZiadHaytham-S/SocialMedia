"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

type RequireAuthScreenProps = {
  children: React.ReactNode;
};

/**
 * Client-side guard when middleware/session race leaves a protected page without auth.
 * Incognito / logged-out users are sent to login instead of an empty feed skeleton.
 */
export function RequireAuthScreen({ children }: RequireAuthScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const { isLoading, isAuthenticated } = useRequireAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(pathname || "/")}`;
      router.replace(loginUrl);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className={cn("flex min-h-screen flex-col items-center justify-center gap-3", ui.page)}>
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-muted" />
        <p className={cn("text-sm font-semibold", ui.textMuted)}>{t("auth.checkingSession")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center", ui.page)}>
        <p className={cn("text-sm font-semibold", ui.textMuted)}>{t("auth.redirectingToLogin")}</p>
      </div>
    );
  }

  return children;
}
