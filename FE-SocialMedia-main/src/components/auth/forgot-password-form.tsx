"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  requestForgotPasswordCode,
  resetForgotPasswordCode,
  verifyForgotPasswordCode,
} from "@/lib/api/auth";
import { FieldError } from "@/components/ui/field-error";
import { PasswordInput } from "@/components/ui/password-input";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  confirmEmailSchema,
  emailOnlySchema,
  getFormString,
  resetPasswordSchema,
  type FieldErrors,
  zodFieldErrors,
} from "@/lib/validation/social-validation";
import { cn, ui } from "@/lib/theme/ui";

type ForgotField = "email" | "otp" | "password" | "confirmPassword";
type Step = "email" | "otp" | "reset";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<MessageKey | "">("");
  const [success, setSuccess] = useState<MessageKey | "">("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ForgotField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      if (step === "email") {
        const parsed = emailOnlySchema.safeParse({ email: getFormString(formData, "email") });

        if (!parsed.success) {
          setFieldErrors(zodFieldErrors(parsed.error));
          return;
        }

        await requestForgotPasswordCode(parsed.data.email);
        setEmail(parsed.data.email);
        setSuccess("auth.resetCodeSent");
        setStep("otp");
        return;
      }

      if (step === "otp") {
        const parsed = confirmEmailSchema.safeParse({
          email,
          otp: getFormString(formData, "otp"),
        });

        if (!parsed.success) {
          setFieldErrors(zodFieldErrors(parsed.error));
          return;
        }

        await verifyForgotPasswordCode(parsed.data);
        setOtp(parsed.data.otp);
        setSuccess("auth.codeVerified");
        setStep("reset");
        return;
      }

      const parsed = resetPasswordSchema.safeParse({
        email,
        otp,
        password: getFormString(formData, "password"),
        confirmPassword: getFormString(formData, "confirmPassword"),
      });

      if (!parsed.success) {
        setFieldErrors(zodFieldErrors(parsed.error));
        return;
      }

      await resetForgotPasswordCode(parsed.data);
      setSuccess("auth.resetRedirecting");
      router.replace(`/login?reset=success&email=${encodeURIComponent(parsed.data.email)}`);
    } catch {
      setError("error.generic");
    } finally {
      setIsSubmitting(false);
    }
  }

  const redirecting = success === "auth.resetRedirecting";

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {step === "email" ? (
        <>
          <input
            className={cn(inputClass(fieldErrors.email), ui.inputLtr)}
            dir="ltr"
            name="email"
            placeholder={t("auth.email")}
            type="email"
          />
          {fieldErrors.email ? <FieldError message={fieldErrors.email} /> : null}
        </>
      ) : null}

      {step === "otp" ? (
        <>
          <p className={ui.infoBox}>{email}</p>
          <input
            className={inputClass(fieldErrors.otp)}
            inputMode="numeric"
            name="otp"
            onChange={(event) => setOtp(event.target.value.trim())}
            placeholder={t("auth.otp")}
          />
          {fieldErrors.otp ? <FieldError message={fieldErrors.otp} /> : null}
        </>
      ) : null}

      {step === "reset" ? (
        <>
          <p className={ui.infoBox}>{email}</p>
          <PasswordInput
            hasError={Boolean(fieldErrors.password)}
            name="password"
            placeholder={t("auth.newPassword")}
          />
          {fieldErrors.password ? <FieldError message={fieldErrors.password} /> : null}
          <PasswordInput
            hasError={Boolean(fieldErrors.confirmPassword)}
            name="confirmPassword"
            placeholder={t("auth.confirmPassword")}
          />
          {fieldErrors.confirmPassword ? <FieldError message={fieldErrors.confirmPassword} /> : null}
        </>
      ) : null}

      {success ? <p className={ui.alertSuccess}>{t(success)}</p> : null}
      {error ? <p className={ui.alertError}>{t(error)}</p> : null}

      <button
        className="h-12 w-full rounded-md bg-blue-600 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        disabled={isSubmitting || redirecting}
        type="submit"
      >
        {buttonLabel(step, isSubmitting, t)}
      </button>

      {redirecting ? (
        <Link className={cn("block text-center text-sm font-semibold", ui.link)} href="/login">
          {t("auth.goToLogin")}
        </Link>
      ) : null}
    </form>
  );
}

function buttonLabel(
  step: Step,
  isSubmitting: boolean,
  t: (key: MessageKey) => string,
) {
  if (isSubmitting) {
    return t("auth.pleaseWait");
  }

  if (step === "email") {
    return t("auth.sendResetCode");
  }

  if (step === "otp") {
    return t("auth.verifyCode");
  }

  return t("auth.resetPassword");
}

function inputClass(hasError?: string) {
  return cn(ui.authInput, hasError && "border-red-400 dark:border-red-500/70");
}
