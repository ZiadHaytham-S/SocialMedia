"use client";

import { useLocale } from "@/lib/i18n/locale-context";

export function FieldError({ message }: { message: string }) {
  const { tv } = useLocale();

  return <p className="-mt-2 text-sm font-semibold text-red-600 dark:text-red-400">{tv(message)}</p>;
}
