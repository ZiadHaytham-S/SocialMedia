"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

export function LocaleHead() {
  const { t } = useLocale();

  useEffect(() => {
    document.title = t("meta.title");
  }, [t]);

  return null;
}
