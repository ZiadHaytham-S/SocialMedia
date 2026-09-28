"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { PasswordInput } from "@/components/ui/password-input";
import type { ApiUser } from "@/types/social";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  getViewer,
  updatePassword,
  updateProfile,
  updateProfileCoverImage,
  updateProfileImage,
} from "@/lib/api/user";
import { TopNav } from "@/components/home/top-nav";
import {
  isSoundEnabled,
  playNotificationSound,
  setSoundEnabled,
} from "@/lib/notifications/notification-sound";
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal";
import { cn, ui } from "@/lib/theme/ui";

export function SettingsPage() {
  const { t } = useLocale();
  const { update: updateSession } = useSession();
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<ApiUser | null>(null);
  const [profileMessage, setProfileMessage] = useState<MessageKey | "">("");
  const [passwordMessage, setPasswordMessage] = useState<MessageKey | "">("");
  const [imageMessage, setImageMessage] = useState<MessageKey | "">("");
  const [profileError, setProfileError] = useState<MessageKey | "">("");
  const [passwordError, setPasswordError] = useState<MessageKey | "">("");
  const [imageError, setImageError] = useState<MessageKey | "">("");
  const [soundsEnabled, setSoundsEnabled] = useState(() => isSoundEnabled());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    getViewer().then(setViewer).catch(() => setViewer(null));
  }, [isAuthLoading, isAuthenticated]);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!viewer) return;

    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const updated = await updateProfile(viewer.id, {
        username: String(formData.get("username") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        gender: formData.get("gender") ? Number(formData.get("gender")) : undefined,
        DOB: String(formData.get("DOB") ?? "") || undefined,
      });
      setViewer({
        ...viewer,
        ...updated,
        name: String(formData.get("username") ?? viewer.name),
        username: String(formData.get("username") ?? viewer.username ?? viewer.name),
        phone: String(formData.get("phone") ?? viewer.phone ?? ""),
      });
      setProfileMessage("settings.profileUpdated");
    } catch {
      setProfileError("settings.profileError");
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const credentials = await updatePassword({
        oldPassword: String(formData.get("oldPassword") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      });

      // Password is already saved; session sync must not surface as a password failure.
      try {
        await updateSession({
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
        });
      } catch {
        // Tokens were persisted in updatePassword(); user can continue with the new session.
      }

      event.currentTarget.reset();
      setPasswordMessage("settings.passwordUpdated");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "";

      if (message.startsWith("error.")) {
        setPasswordError(message as MessageKey);
        return;
      }

      setPasswordError("settings.passwordError");
    }
  }

  async function handleAvatarChange(file?: File) {
    if (!file) return;
    setImageError("");
    setImageMessage("");

    try {
      const updated = await updateProfileImage(file);
      setViewer((current) => (current ? { ...current, ...updated } : current));
      setImageMessage("settings.avatarUpdated");
    } catch {
      setImageError("settings.avatarError");
    }
  }

  async function handleCoverChange(files?: FileList | null) {
    if (!files?.length) return;
    setImageError("");
    setImageMessage("");

    const selectedFiles = Array.from(files).slice(0, 2);

    try {
      const updated = await updateProfileCoverImage(selectedFiles);
      setViewer((current) => (current ? { ...current, ...updated } : current));
      setImageMessage("settings.coverUpdated");
    } catch {
      setImageError("settings.coverError");
    }
  }

  if (!viewer) {
    return (
      <div className={ui.page}>
        <header className={`${ui.navHeader} h-16`} />
        <main className="mx-auto max-w-5xl px-3 pt-24">
          <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
        </main>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <TopNav viewer={viewer} />
      <main className="mx-auto grid w-full max-w-5xl gap-5 px-3 pb-10 pt-20 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${ui.card} p-5`}>
          <img className="h-28 w-28 rounded-full object-cover" src={viewer.avatarUrl} alt="" />
          <h1 className={cn("mt-4 text-2xl font-bold", ui.textPrimary)}>{viewer.name}</h1>
          <p className={cn("text-sm", ui.textMuted)}>{viewer.email}</p>
          <div className="mt-5 space-y-2">
            <button className={cn("w-full", ui.btnSecondary)} onClick={() => avatarRef.current?.click()} type="button">
              {t("settings.changeAvatar")}
            </button>
            <button className={cn("w-full", ui.btnSecondary)} onClick={() => coverRef.current?.click()} type="button">
              {t("settings.changeCover")}
            </button>
          </div>
          {imageMessage ? <Message message={t(imageMessage)} /> : null}
          {imageError ? <Message error message={t(imageError)} /> : null}
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              setAvatarFile(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
            ref={avatarRef}
            type="file"
          />
          <input accept="image/*" className="hidden" multiple onChange={(event) => handleCoverChange(event.target.files)} ref={coverRef} type="file" />
        </aside>

        <section className="space-y-5">
          <form key={`profile-${viewer.id}`} className={`${ui.card} p-5`} onSubmit={handleProfileSubmit}>
            <h2 className={ui.headingLg}>{t("settings.profile")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input defaultValue={viewer.username || viewer.name} label={t("settings.username")} name="username" />
              <Input defaultValue={viewer.phone ?? ""} label={t("settings.phone")} name="phone" />
              <label className={cn("text-sm font-bold", ui.textSecondary)}>
                {t("settings.gender")}
                <select className={cn("mt-1", ui.inputFieldSm)} defaultValue={viewer.gender ?? ""} name="gender">
                  <option value="">{t("settings.genderSelect")}</option>
                  <option value="0">{t("settings.genderMale")}</option>
                  <option value="1">{t("settings.genderFemale")}</option>
                </select>
              </label>
              <Input defaultValue={viewer.DOB?.slice(0, 10) ?? ""} label={t("settings.dob")} name="DOB" type="date" />
            </div>
            {profileMessage ? <Message message={t(profileMessage)} /> : null}
            {profileError ? <Message error message={t(profileError)} /> : null}
            <button className="mt-4 rounded-md bg-blue-600 px-5 py-2 text-sm font-bold text-white" type="submit">
              {t("settings.saveProfile")}
            </button>
          </form>

          <form className={`${ui.card} p-5`} onSubmit={handlePasswordSubmit}>
            <h2 className={ui.headingLg}>{t("settings.password")}</h2>
            <div className="mt-4 grid gap-3">
              <PasswordField label={t("settings.oldPassword")} name="oldPassword" />
              <PasswordField label={t("auth.newPassword")} name="password" />
              <PasswordField label={t("auth.confirmPassword")} name="confirmPassword" />
            </div>
            {passwordMessage ? <Message message={t(passwordMessage)} /> : null}
            {passwordError ? <Message error message={t(passwordError)} /> : null}
            <button className="mt-4 rounded-md bg-blue-600 px-5 py-2 text-sm font-bold text-white" type="submit">
              {t("settings.updatePassword")}
            </button>
          </form>

          <section className={`${ui.card} p-5`}>
            <h2 className={ui.headingLg}>{t("settings.notifications")}</h2>
            <label className="mt-4 flex items-start justify-between gap-4">
              <span>
                <span className={cn("block text-sm font-bold", ui.textPrimary)}>{t("settings.notificationSounds")}</span>
                <span className={cn("mt-1 block text-sm", ui.textMuted)}>{t("settings.notificationSoundsDesc")}</span>
              </span>
              <input
                checked={soundsEnabled}
                className="mt-1 h-5 w-5 accent-fb"
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setSoundsEnabled(enabled);
                  setSoundEnabled(enabled);

                  if (enabled) {
                    playNotificationSound("notification", "settings:test");
                  }
                }}
                type="checkbox"
              />
            </label>
          </section>
        </section>
      </main>
      {avatarFile ? (
        <AvatarCropModal
          file={avatarFile}
          onCancel={() => setAvatarFile(null)}
          onConfirm={(croppedFile) => {
            setAvatarFile(null);
            void handleAvatarChange(croppedFile);
          }}
        />
      ) : null}
    </div>
  );
}

function PasswordField({ label, name }: { label: string; name: string }) {
  return (
    <label className={cn("text-sm font-bold", ui.textSecondary)}>
      {label}
      <div className="mt-1">
        <PasswordInput className="h-11" name={name} />
      </div>
    </label>
  );
}

function Input({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className={cn("text-sm font-bold", ui.textSecondary)}>
      {label}
      <input
        className={cn("mt-1", ui.inputFieldSm)}
        defaultValue={defaultValue}
        name={name}
        type={type}
      />
    </label>
  );
}

function Message({ error, message }: { error?: boolean; message: string }) {
  return <p className={cn("mt-3 text-sm font-semibold", error ? "text-danger" : "text-success")}>{message}</p>;
}
