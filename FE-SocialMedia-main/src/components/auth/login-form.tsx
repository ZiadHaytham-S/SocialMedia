"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { persistTokens } from "@/lib/api/tokens";
import { FieldError } from "@/components/ui/field-error";
import { PasswordInput } from "@/components/ui/password-input";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn, ui } from "@/lib/theme/ui";
import { getFormString, loginSchema, type FieldErrors, zodFieldErrors } from "@/lib/validation/social-validation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const emailFromReset = searchParams.get("email") ?? "";
  const resetWasSuccessful = searchParams.get("reset") === "success";
  const [error, setError] = useState<MessageKey | "">("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<"email" | "password">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: getFormString(formData, "email"),
      password: getFormString(formData, "password"),
    });
    const callbackUrl = searchParams.get("callbackUrl") ?? "/";

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
        redirectTo: callbackUrl,
      });

      if (result?.error) {
        setError(loginErrorKey(result.code ?? result.error));
        return;
      }

      const session = await getSession();

      if (session?.accessToken) {
        persistTokens(session.accessToken, session.refreshToken);
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <input
        defaultValue={emailFromReset}
        className={cn(ui.authInput, ui.inputLtr, fieldErrors.email && "border-red-400 dark:border-red-500/70")}
        dir="ltr"
        name="email"
        placeholder={t("auth.email")}
        type="email"
      />
      {fieldErrors.email ? <FieldError message={fieldErrors.email} /> : null}
      <PasswordInput
        hasError={Boolean(fieldErrors.password)}
        name="password"
        placeholder={t("auth.password")}
      />
      {fieldErrors.password ? <FieldError message={fieldErrors.password} /> : null}

      {resetWasSuccessful ? (
        <p className={ui.alertSuccess}>{t("auth.passwordResetSuccess")}</p>
      ) : null}
      {error ? <p className={ui.alertError}>{t(error)}</p> : null}

      <button
        className="h-12 w-full rounded-md bg-blue-600 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? t("auth.loggingIn") : t("auth.login")}
      </button>

      <div className="flex items-center justify-between text-sm font-semibold">
        <Link className={ui.link} href="/forgot-password">
          {t("auth.forgotPassword")}
        </Link>
        <Link className={ui.link} href="/confirm-email">
          {t("auth.confirmEmailLink")}
        </Link>
      </div>
    </form>
  );
}

function loginErrorKey(code?: string) {
  if (code === "credentials" || code === "CredentialsSignin") {
    return "error.loginInvalid";
  }

  if (code === "CallbackRouteError") {
    return "error.loginFailed";
  }

  return "error.loginGeneric";
}
