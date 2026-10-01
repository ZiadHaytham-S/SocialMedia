"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatMessage, LOCALE_STORAGE_KEY, type Locale, type MessageKey, messages } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  tv: (message: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return "ar";
  }

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "en" ? "en" : "ar";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [selectedLocale, setLocaleState] = useState<Locale>();
  const ready = useHydrated();
  const locale = selectedLocale ?? (ready ? readStoredLocale() : "ar");

  useEffect(() => {
    if (!ready) {
      return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => formatMessage(messages[locale][key], params),
    [locale],
  );

  const tv = useCallback(
    (message: string) => {
      if (message in messages[locale]) {
        return messages[locale][message as MessageKey];
      }

      return message;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, tv }), [locale, setLocale, t, tv]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
