"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiStory, ApiUser } from "@/types/social";
import { createStory, deleteStory } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale-context";
import { DropdownPortal } from "@/components/ui/dropdown-portal";
import { cn, ui } from "@/lib/theme/ui";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { PlusIcon } from "./icons";
import { StoryCreateModal, type StoryCreateMode } from "./story-create-modal";
import { StoryViewer } from "./story-viewer";

type StoriesRowProps = {
  stories: ApiStory[];
  viewer: ApiUser;
  onCreateStory: (story: ApiStory) => void;
  onDeleteStory: (storyId: string) => void;
  onUpdateStory?: (story: ApiStory) => void;
};

const STORY_W = "w-[110px]";
const STORY_H = "h-[194px]";
/** Bottom label strip (Facebook create-story card). */
const STORY_CREATE_BOTTOM_H = 56;

export function StoriesRow({ stories, viewer, onCreateStory, onDeleteStory, onUpdateStory }: StoriesRowProps) {
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openStoryMenuId, setOpenStoryMenuId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [storyMode, setStoryMode] = useState<StoryCreateMode>("photo");
  const [storyContent, setStoryContent] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const [attachmentPreview, setAttachmentPreview] = useState<string>();
  const [viewingStory, setViewingStory] = useState<ApiStory | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string>();

  useEffect(() => {
    if (!attachment?.type.startsWith("image/") && !attachment?.type.startsWith("video/")) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setAttachmentPreview(reader.result);
      }
    });
    reader.readAsDataURL(attachment);
  }, [attachment]);

  function resetCreateForm() {
    setStoryMode("photo");
    setStoryContent("");
    setAttachment(undefined);
    setAttachmentPreview(undefined);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleStoryModeChange(mode: StoryCreateMode) {
    setStoryMode(mode);
    setError("");

    if (mode === "text") {
      setAttachment(undefined);
      setAttachmentPreview(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setStoryContent("");
  }

  function handleCloseCreate() {
    setCreateOpen(false);
    resetCreateForm();
  }

  async function handleShareStory() {
    if (storyMode === "text" && !storyContent.trim()) {
      setError("story.textRequired");
      return;
    }

    if (storyMode === "photo" && !attachment) {
      setError("story.photoRequired");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const story = await createStory(
        storyMode === "text" ? { content: storyContent.trim() } : { attachment },
      );
      onCreateStory({ ...story, author: viewer });
      handleCloseCreate();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      if (message === "validation.storyOneTypeOnly" || message === "validation.storyRequired") {
        setError(message);
      } else {
        setError("story.createError");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteStory(storyId: string) {
    if (deletingStoryId) {
      return;
    }

    setError("");
    setDeletingStoryId(storyId);

    try {
      await deleteStory(storyId);
      onDeleteStory(storyId);
      setOpenStoryMenuId(undefined);
      if (viewingStory?.id === storyId) {
        setViewingStory(null);
      }
    } catch {
      setError("story.deleteError");
    } finally {
      setDeletingStoryId(undefined);
    }
  }

  return (
    <>
      <section className={ui.feedCardStories}>
        <div className={ui.storiesTrack}>
          <button
            className={cn(
              "relative isolate overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border-light transition hover:brightness-[0.98] disabled:opacity-60",
              STORY_W,
              STORY_H,
            )}
            disabled={isSubmitting}
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <div
              className="overflow-hidden bg-surface-muted"
              style={{ height: `calc(100% - ${STORY_CREATE_BOTTOM_H}px)` }}
            >
              <img className="h-full w-full object-cover" src={viewer.avatarUrl} alt="" />
            </div>

            <div
              className="absolute inset-x-0 bottom-0 z-0 flex flex-col items-center justify-end border-t border-border-light bg-surface pb-2 pt-7"
              style={{ height: STORY_CREATE_BOTTOM_H }}
            >
              <span className="max-w-full px-1 text-center text-[11px] font-bold leading-tight text-t-primary">
                {t("story.createCard")}
              </span>
            </div>

            <div
              className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ top: `calc(100% - ${STORY_CREATE_BOTTOM_H}px)` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fb text-white shadow-md ring-[3px] ring-surface">
                <PlusIcon className="h-5 w-5" />
              </span>
            </div>
          </button>

          {stories.map((story) => {
            const canDelete = story.author.id === viewer.id || viewer.role === 1;
            return (
              <article
                className={cn(
                  "group cursor-pointer",
                  ui.storyTile,
                  ui.storyTileRing,
                  STORY_W,
                  STORY_H,
                )}
                key={story.id}
                onClick={() => {
                  setOpenStoryMenuId(undefined);
                  setViewingStory(story);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setViewingStory(story);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {story.imageUrl ? (
                  <img
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    src={story.imageUrl}
                    alt=""
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1877f2] via-[#3b5998] to-[#1c1e21] p-3">
                    {story.body ? (
                      <p className="line-clamp-6 text-center text-[13px] font-semibold leading-snug text-white">{story.body}</p>
                    ) : null}
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

                <div
                  className="absolute start-3 top-3 z-20 rounded-full bg-surface p-[2px] ring-[2.5px] ring-fb"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  role="presentation"
                >
                  <UserProfileLink
                    avatarClassName="h-9 w-9"
                    layout="avatar"
                    stopPropagation
                    user={story.author}
                  />
                </div>

                {canDelete ? (
                  <StoryCardMenu
                    deleteLabel={t("story.delete")}
                    isDeleting={deletingStoryId === story.id}
                    isOpen={openStoryMenuId === story.id}
                    onClose={() => setOpenStoryMenuId(undefined)}
                    onDelete={() => void handleDeleteStory(story.id)}
                    onToggle={() =>
                      setOpenStoryMenuId((current) => (current === story.id ? undefined : story.id))
                    }
                  />
                ) : null}

                <div
                  className="absolute inset-x-2 bottom-2.5 z-20 line-clamp-2 text-start"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  role="presentation"
                >
                  <UserProfileLink
                    layout="name"
                    nameClassName="text-[12px] font-bold leading-tight text-white drop-shadow-md hover:text-white hover:underline"
                    stopPropagation
                    user={story.author}
                  />
                </div>
              </article>
            );
          })}
        </div>

        {error ? <p className={cn("mx-4 mb-4 mt-1", ui.alertError)}>{t(error as "story.createError")}</p> : null}

        <input
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setStoryMode("photo");
              setStoryContent("");
              setAttachmentPreview(undefined);
              setAttachment(file);
              setError("");
            }
          }}
          ref={fileInputRef}
          type="file"
        />
      </section>

      <StoryCreateModal
        attachmentName={attachment && !attachmentPreview ? attachment.name : undefined}
        attachmentPreview={attachmentPreview}
        content={storyContent}
        error={error || undefined}
        isSubmitting={isSubmitting}
        mode={storyMode}
        onClose={handleCloseCreate}
        onContentChange={setStoryContent}
        onModeChange={handleStoryModeChange}
        onPhotoClick={() => fileInputRef.current?.click()}
        onRemoveAttachment={() => {
          setAttachment(undefined);
          setAttachmentPreview(undefined);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        onSubmit={() => void handleShareStory()}
        open={createOpen}
        viewer={viewer}
      />

      {viewingStory ? (
        <StoryViewer
          onClose={() => setViewingStory(null)}
          deletingStoryId={deletingStoryId}
          onDeleteStory={(storyId) => void handleDeleteStory(storyId)}
          onStoryChange={(updatedStory) => {
            setViewingStory(updatedStory);
            onUpdateStory?.(updatedStory);
          }}
          story={viewingStory}
          viewer={viewer}
        />
      ) : null}
    </>
  );
}

type StoryCardMenuProps = {
  isOpen: boolean;
  isDeleting?: boolean;
  deleteLabel: string;
  onToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
};

function StoryCardMenu({ isOpen, isDeleting = false, deleteLabel, onToggle, onClose, onDelete }: StoryCardMenuProps) {
  const { t } = useLocale();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="absolute end-1.5 top-1.5 z-20"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        ref={menuButtonRef}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("story.optionsMenu")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-lg font-bold leading-none text-white backdrop-blur-sm transition hover:bg-black/70",
          isOpen ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        type="button"
      >
        ···
      </button>

      <DropdownPortal
        align="end"
        anchorRef={menuButtonRef}
        className={cn(ui.menuDropdown, "py-1")}
        minWidth={168}
        onClose={onClose}
        open={isOpen}
        placement="bottom"
        width={168}
      >
        <button
          className={cn(ui.menuItemDanger, "disabled:opacity-60")}
          disabled={isDeleting}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          role="menuitem"
          type="button"
        >
          {isDeleting ? "..." : deleteLabel}
        </button>
      </DropdownPortal>
    </div>
  );
}
