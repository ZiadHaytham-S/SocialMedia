"use client";

import { MoonIcon, SunIcon } from "@/components/home/icons";
import { NavIconButton } from "@/components/home/nav-icon-button";
import { useLocale } from "@/lib/i18n/locale-context";
import { useTheme } from "@/lib/theme/theme-context";

type ThemeToggleProps = {
  iconClassName?: string;
};

export function ThemeToggle({ iconClassName = "h-[22px] w-[22px]" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLocale();

  return (
    <NavIconButton
      label={isDark ? t("settings.lightMode") : t("settings.darkMode")}
      onClick={toggleTheme}
      title={isDark ? t("settings.lightMode") : t("settings.darkMode")}
    >
      {isDark ? <SunIcon className={iconClassName} /> : <MoonIcon className={iconClassName} />}
    </NavIconButton>
  );
}
