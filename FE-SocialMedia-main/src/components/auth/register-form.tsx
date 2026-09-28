"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api/auth";
import { stashSignupPassword } from "@/lib/auth/pending-signup";
import { FieldError } from "@/components/ui/field-error";
import { PasswordInput } from "@/components/ui/password-input";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { getFormString, registerSchema, type FieldErrors, zodFieldErrors } from "@/lib/validation/social-validation";

type RegisterField = "username" | "email" | "phone" | "gender" | "DOB" | "password" | "confirmPassword";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function minDobInputValue() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 100);
  return date.toISOString().slice(0, 10);
}

function fieldClass(hasError?: string) {
  return cn(ui.authInputCompact, hasError && "border-red-400 dark:border-red-500/70");
}

export function RegisterForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      username: getFormString(formData, "username"),
      email: getFormString(formData, "email"),
      phone: getFormString(formData, "phone"),
      gender: getFormString(formData, "gender"),
      DOB: getFormString(formData, "DOB"),
      password: getFormString(formData, "password"),
      confirmPassword: getFormString(formData, "confirmPassword"),
    });

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setIsSubmitting(false);
      return;
    }

    try {
      await registerUser(parsed.data);
      stashSignupPassword(parsed.data.email, parsed.data.password);
      router.push(`/confirm-email?email=${encodeURIComponent(parsed.data.email)}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "error.registerFailed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <header className="border-b border-border-light pb-4 text-center sm:text-start">
        <h2 className={cn("text-xl font-bold sm:text-[22px]", ui.textPrimary)}>{t("auth.signUpTitle")}</h2>
        <p className={cn("mt-1 text-[13px] leading-snug", ui.textMuted)}>{t("auth.signUpHint")}</p>
      </header>

      <FormSection title={t("auth.signUpSectionAccount")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthField error={fieldErrors.username} label={t("auth.username")}>
            <input className={fieldClass(fieldErrors.username)} name="username" placeholder={t("auth.username")} type="text" />
          </AuthField>
          <AuthField error={fieldErrors.email} label={t("auth.email")}>
            <input
              autoComplete="email"
              className={cn(fieldClass(fieldErrors.email), ui.inputLtr)}
              dir="ltr"
              name="email"
              placeholder={t("auth.email")}
              type="email"
            />
          </AuthField>
        </div>

        <AuthField error={fieldErrors.phone} label={t("auth.phoneOptional")}>
          <input
            autoComplete="tel"
            className={cn(fieldClass(fieldErrors.phone), ui.inputLtr)}
            dir="ltr"
            name="phone"
            placeholder={t("auth.phonePlaceholder")}
            type="tel"
          />
        </AuthField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AuthField error={fieldErrors.gender} label={t("settings.gender")}>
            <select className={fieldClass(fieldErrors.gender)} defaultValue="" name="gender">
              <option disabled value="">
                {t("settings.genderSelect")}
              </option>
              <option value="0">{t("settings.genderMale")}</option>
              <option value="1">{t("settings.genderFemale")}</option>
            </select>
          </AuthField>
          <AuthField error={fieldErrors.DOB} label={t("settings.dob")}>
            <input
              className={fieldClass(fieldErrors.DOB)}
              max={todayInputValue()}
              min={minDobInputValue()}
              name="DOB"
              type="date"
            />
          </AuthField>
        </div>
      </FormSection>

      <FormSection title={t("auth.signUpSectionPassword")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthField error={fieldErrors.password} label={t("auth.newPassword")}>
            <PasswordInput
              className="!h-11 !rounded-lg !px-3 !text-[15px]"
              hasError={Boolean(fieldErrors.password)}
              name="password"
              placeholder={t("auth.newPassword")}
            />
          </AuthField>
          <AuthField error={fieldErrors.confirmPassword} label={t("auth.confirmPassword")}>
            <PasswordInput
              className="!h-11 !rounded-lg !px-3 !text-[15px]"
              hasError={Boolean(fieldErrors.confirmPassword)}
              name="confirmPassword"
              placeholder={t("auth.confirmPassword")}
            />
          </AuthField>
        </div>
        <p className={cn("text-[12px] leading-snug", ui.textMuted)}>{t("auth.passwordRulesHint")}</p>
      </FormSection>

      {error ? (
        <p className={ui.alertError}>
          {error.startsWith("error.") || error.startsWith("validation.") ? t(error as "error.registerFailed") : error}
        </p>
      ) : null}

      <button
        className="h-11 w-full rounded-lg bg-emerald-600 text-[17px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? t("auth.signingUp") : t("auth.signUp")}
      </button>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className={cn("text-[13px] font-bold uppercase tracking-wide", ui.textSecondary)}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function AuthField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className={cn("text-[13px] font-semibold", ui.textSecondary)}>{label}</span>
      {children}
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}
