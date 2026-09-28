"use client";

import { useEffect, useRef, useState } from "react";
import { GlobeIcon } from "./icons";
import { NavIconButton } from "./nav-icon-button";
import { cn, ui } from "@/lib/theme/ui";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/messages";

type LanguageSwitcherProps = {
  iconClassName?: string;
};

export function LanguageSwitcher({ iconClassName = "h-[22px] w-[22px]" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectLanguage(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <NavIconButton label={t("nav.language")} onClick={() => setOpen((value) => !value)} title={t("nav.language")}>
        <GlobeIcon className={iconClassName} />
      </NavIconButton>

      {open ? (
        <div className={cn("absolute end-0 top-11 z-40 min-w-36", ui.menuDropdown)}>
          <button
            className={cn(ui.menuItem, "px-4", locale === "ar" ? "text-blue-600 dark:text-blue-400" : "")}
            onClick={() => selectLanguage("ar")}
            type="button"
          >
            {t("lang.ar")}
          </button>
          <button
            className={cn(ui.menuItem, "px-4", locale === "en" ? "text-blue-600 dark:text-blue-400" : "")}
            onClick={() => selectLanguage("en")}
            type="button"
          >
            {t("lang.en")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
