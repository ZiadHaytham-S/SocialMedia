"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiPost, ApiUser, PostAvailability } from "@/types/social";
import { createPost } from "@/lib/api/post";
import { mergeTagIds } from "@/lib/utils/tag-users";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";
import { ComposerFeelingIcon, ComposerPhotoIcon, ComposerTagIcon } from "./icons";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { PostCreateModal } from "./post-create-modal";

type PostComposerProps = {
  viewer: ApiUser;
  contacts?: ApiUser[];
  onCreatePost: (post: ApiPost) => void;
};

export function PostComposer({ viewer, contacts = [], onCreatePost }: PostComposerProps) {
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const [attachmentPreview, setAttachmentPreview] = useState<string>();
  const [allowComments, setAllowComments] = useState(true);
  const [availability, setAvailability] = useState<PostAvailability>("PUBLIC");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!attachment?.type.startsWith("image/")) {
      setAttachmentPreview(undefined);
      return;
    }

    const url = URL.createObjectURL(attachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  function resetForm() {
    setContent("");
    setAttachment(undefined);
    setAllowComments(true);
    setAvailability("PUBLIC");
    setTagIds([]);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  function handleOpen() {
    setOpen(true);
  }

  async function handleSubmit() {
    if (!content.trim() && !attachment) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const mergedTags = mergeTagIds(tagIds, content, contacts);
      const post = await createPost({ content, allowComments, availability, tagIds: mergedTags, attachment });
      onCreatePost({
        ...post,
        author: viewer,
        createdBy: viewer,
        imageUrl: post.imageUrl || (attachment ? URL.createObjectURL(attachment) : ""),
        tagIds: mergedTags,
        availability,
      });
      handleClose();
    } catch {
      setError("composer.createError");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className={ui.feedCard}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <UserProfileLink layout="avatar" user={viewer} />
          <button className={ui.composerPill} onClick={handleOpen} type="button">
            {t("composer.placeholder", { name: viewer.name.split(" ")[0] || viewer.name })}
          </button>
        </div>

        <div className="grid grid-cols-3 border-t border-border-light px-2 py-1.5">
          <button
            className={ui.composerAction}
            onClick={() => {
              handleOpen();
              fileInputRef.current?.click();
            }}
            type="button"
          >
            <ComposerPhotoIcon className="h-5 w-5" />
            {t("composer.photo")}
          </button>
          <button
            className={cn(ui.composerAction, "cursor-not-allowed opacity-50")}
            disabled
            title={t("nav.comingSoon")}
            type="button"
          >
            <ComposerFeelingIcon className="h-5 w-5" />
            {t("composer.feeling")}
          </button>
          <button className={ui.composerAction} onClick={handleOpen} type="button">
            <ComposerTagIcon className="h-5 w-5" />
            {t("post.tags.label")}
          </button>
        </div>

        <input
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setAttachment(file);
              handleOpen();
            }
          }}
          ref={fileInputRef}
          type="file"
        />
      </section>

      <PostCreateModal
        allowComments={allowComments}
        attachmentName={attachment && !attachmentPreview ? attachment.name : undefined}
        attachmentPreview={attachmentPreview}
        availability={availability}
        contacts={contacts}
        content={content}
        error={error || undefined}
        isSubmitting={isSubmitting}
        onAllowCommentsChange={setAllowComments}
        onAvailabilityChange={setAvailability}
        onClose={handleClose}
        onContentChange={setContent}
        onPhotoClick={() => fileInputRef.current?.click()}
        onRemoveAttachment={() => {
          setAttachment(undefined);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        onSubmit={() => void handleSubmit()}
        onTagIdsChange={setTagIds}
        open={open}
        tagIds={tagIds}
        viewer={viewer}
      />
    </>
  );
}
