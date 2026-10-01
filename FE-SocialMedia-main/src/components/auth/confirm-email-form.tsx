"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { confirmEmail, resendConfirmEmail } from "@/lib/api/auth";
import { autoLoginAfterConfirm } from "@/lib/auth/auto-login-after-confirm";
import { FieldError } from "@/components/ui/field-error";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  confirmEmailSchema,
  emailOnlySchema,
  getFormString,
  type FieldErrors,
  zodFieldErrors,
} from "@/lib/validation/social-validation";
import { cn, ui } from "@/lib/theme/ui";

type ConfirmEmailField = "email" | "otp";

export function ConfirmEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [success, setSuccess] = useState<MessageKey | "">("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ConfirmEmailField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsManualLogin, setNeedsManualLogin] = useState(false);

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});
    setNeedsManualLogin(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const parsed = confirmEmailSchema.safeParse({
      email: getFormString(formData, "email"),
      otp: getFormString(formData, "otp"),
    });

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setIsSubmitting(false);
      return;
    }

    try {
      await confirmEmail(parsed.data);
      setIsSubmitting(false);
      setIsSigningIn(true);
      setSuccess("auth.emailConfirmedSigningIn");

      const loginResult = await autoLoginAfterConfirm(parsed.data.email);

      if (loginResult.ok) {
        router.replace("/");
        router.refresh();
        return;
      }

      setIsSigningIn(false);
      setNeedsManualLogin(true);
      setSuccess("auth.emailConfirmedLoginManually");
    } catch {
      setError("error.confirmFailed");
      setIsSubmitting(false);
      setIsSigningIn(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    setFieldErrors({});
    setIsResending(true);

    const parsed = emailOnlySchema.safeParse({ email });

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setIsResending(false);
      return;
    }

    try {
      await resendConfirmEmail(parsed.data.email);
      setSuccess("auth.codeResent");
    } catch {
      setError("error.resendFailed");
    } finally {
      setIsResending(false);
    }
  }

  const isBusy = isSubmitting || isSigningIn;

  return (
    <form className="space-y-3" onSubmit={handleConfirm}>
      <input
        className={cn(inputClass(fieldErrors.email), ui.inputLtr)}
        dir="ltr"
        disabled={isBusy || needsManualLogin}
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("auth.email")}
        type="email"
        value={email}
      />
      {fieldErrors.email ? <FieldError message={fieldErrors.email} /> : null}

      <input
        className={inputClass(fieldErrors.otp)}
        disabled={isBusy || needsManualLogin}
        inputMode="numeric"
        name="otp"
        placeholder={t("auth.otp")}
      />
      {fieldErrors.otp ? <FieldError message={fieldErrors.otp} /> : null}

      {success ? <p className={ui.alertSuccess}>{t(success)}</p> : null}
      {error ? <p className={ui.alertError}>{t(error as "error.confirmFailed")}</p> : null}

      {needsManualLogin ? (
        <Link
          className="flex h-12 w-full items-center justify-center rounded-md bg-emerald-600 text-lg font-bold text-white transition hover:bg-emerald-700"
          href={`/login?email=${encodeURIComponent(email)}`}
        >
          {t("auth.goToLogin")}
        </Link>
      ) : (
        <button
          className="h-12 w-full rounded-md bg-blue-600 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isBusy}
          type="submit"
        >
          {isSigningIn
            ? t("auth.signingIn")
            : isSubmitting
              ? t("auth.confirming")
              : t("auth.confirmEmail")}
        </button>
      )}

      <button
        className={cn("h-11 w-full text-sm disabled:cursor-not-allowed disabled:opacity-50", ui.btnSecondary)}
        disabled={isResending || isBusy}
        onClick={handleResend}
        type="button"
      >
        {isResending ? t("auth.resending") : t("auth.resendCode")}
      </button>
    </form>
  );
}

function inputClass(hasError?: string) {
  return cn(ui.authInput, hasError && "border-red-400 dark:border-red-500/70");
}
