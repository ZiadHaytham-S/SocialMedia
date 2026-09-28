"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ApiUser } from "@/types/social";
import { defaultAvatar } from "@/lib/api/fallbacks";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { CameraIcon, EyeIcon, ImageIcon, MessageIcon, PencilIcon } from "@/components/home/icons";
import { AdminProfileActions } from "@/components/admin/admin-profile-actions";
import { FriendProfileActions } from "@/components/friends/friend-profile-actions";
import { isAdmin } from "@/lib/auth/roles";
import { ShareLinkButton } from "@/components/ui/share-link-button";
import { useMessenger } from "@/components/messaging/messenger-context";
import type { FriendMeta } from "@/types/social";
import { cn, ui } from "@/lib/theme/ui";
import { AvatarCropModal } from "./avatar-crop-modal";

type ProfileHeaderProps = {
  profile: ApiUser;
  viewer: ApiUser;
  isOwnProfile: boolean;
  imageError?: MessageKey | "";
  friendMeta?: FriendMeta;
  onFriendMetaChange?: (meta: FriendMeta) => void;
  onProfileChange?: (profile: ApiUser) => void;
  onAvatarChange: (file?: File) => void;
  onCoverChange: (files?: FileList | null) => void;
};

export function ProfileHeader({
  profile,
  viewer,
  isOwnProfile,
  imageError,
  friendMeta,
  onFriendMetaChange,
  onProfileChange,
  onAvatarChange,
  onCoverChange,
}: ProfileHeaderProps) {
  const { t } = useLocale();
  const { openChat } = useMessenger();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const displayName = profile.name.trim() || profile.username?.trim() || t("user.unknown");
  const handle = profile.username?.trim();
  const viewerIsAdmin = isAdmin(viewer);

  return (
    <section className={cn("overflow-hidden", ui.feedCard)}>
      <div className="relative">
        <div className={ui.profileCover}>
          {profile.coverUrl ? (
            <img alt="" className="h-full w-full object-cover" src={profile.coverUrl} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-16 w-16 text-t-faint opacity-40" />
            </div>
          )}
          {isOwnProfile ? (
            <button
              className={cn("absolute bottom-4 end-4", ui.profileEditBtn)}
              onClick={() => coverRef.current?.click()}
              type="button"
            >
              <CameraIcon className="h-5 w-5 shrink-0 text-t-primary" />
              <span>{t("profile.changeCover")}</span>
            </button>
          ) : null}
        </div>

        <div className="absolute bottom-0 start-4 translate-y-1/2 sm:start-6">
          <div className="relative">
            <img
              alt=""
              className={ui.profileAvatar}
              src={profile.avatarUrl || defaultAvatar}
            />
            {isOwnProfile ? (
              <button
                className={cn("absolute bottom-2 end-2 sm:bottom-3 sm:end-3", ui.profileIconBtn)}
                onClick={() => avatarRef.current?.click()}
                title={t("profile.changeAvatar")}
                type="button"
              >
                <CameraIcon className="h-5 w-5 text-t-primary" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-20 sm:px-6 sm:pt-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className={ui.headingXl}>{displayName}</h1>
            {handle ? (
              <p className={cn("mt-0.5 text-[15px] font-medium", ui.textMuted)}>@{handle}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] font-semibold">
              {friendMeta && !isOwnProfile ? (
                <span className={ui.textMuted}>
                  {t("friends.friendCount", { count: friendMeta.friendCount })}
                  {friendMeta.mutualCount > 0
                    ? ` · ${t("friends.mutualCount", { count: friendMeta.mutualCount })}`
                    : ""}
                </span>
              ) : null}
              {typeof profile.profileVisitCount === "number" && isOwnProfile ? (
                <span className={cn("inline-flex items-center gap-1.5", ui.textMuted)}>
                  <EyeIcon className="h-4 w-4 shrink-0 text-t-muted" />
                  {t("profile.visits", { count: profile.profileVisitCount })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 self-stretch sm:min-w-[200px] sm:items-end sm:self-auto">
            {!isOwnProfile ? (
              <FriendProfileActions initialMeta={friendMeta} onMetaChange={onFriendMetaChange} target={profile} />
            ) : null}
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {!isOwnProfile ? (
                <button
                  className={ui.profileEditBtn}
                  onClick={() => void openChat(profile.id)}
                  type="button"
                >
                  <MessageIcon className="h-5 w-5 shrink-0 text-t-primary" />
                  <span>{t("messages.sendMessage")}</span>
                </button>
              ) : null}
              <ShareLinkButton targetId={profile.id} type="profile" variant="header" />
              {isOwnProfile ? (
                <Link className={ui.profileEditBtn} href="/settings">
                  <PencilIcon className="h-5 w-5 shrink-0 text-t-primary" />
                  <span>{t("profile.editProfile")}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {imageError ? <p className={cn("mt-3", ui.alertError)}>{t(imageError)}</p> : null}

        {!isOwnProfile && viewerIsAdmin ? (
          <div className="mt-4">
            <AdminProfileActions onProfileChange={(next) => onProfileChange?.(next)} profile={profile} />
          </div>
        ) : null}
      </div>

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
      <input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(event) => onCoverChange(event.target.files)}
        ref={coverRef}
        type="file"
      />
      {avatarFile ? (
        <AvatarCropModal
          file={avatarFile}
          onCancel={() => setAvatarFile(null)}
          onConfirm={(croppedFile) => {
            setAvatarFile(null);
            onAvatarChange(croppedFile);
          }}
        />
      ) : null}
    </section>
  );
}
