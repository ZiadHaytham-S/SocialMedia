"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/home/icons";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

type PasswordInputProps = {
  className?: string;
  defaultValue?: string;
  hasError?: boolean;
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function PasswordInput({
  className = "",
  defaultValue,
  hasError,
  name,
  placeholder,
  value,
  onChange,
}: PasswordInputProps) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className={cn(
          "h-13 w-full rounded-md border border-border bg-surface-input ps-4 pe-12 text-base text-t-primary outline-none transition placeholder:text-t-muted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400 dark:focus:ring-blue-400/25",
          ui.inputLtr,
          hasError ? "border-red-400 dark:border-red-500/70" : "",
          className,
        )}
        dir="ltr"
        defaultValue={defaultValue}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-t-muted transition hover:bg-surface-muted hover:text-t-secondary"
        onClick={() => setVisible((current) => !current)}
        title={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        type="button"
      >
        {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        <span className="sr-only">{visible ? t("auth.hidePassword") : t("auth.showPassword")}</span>
      </button>
    </div>
  );
}
