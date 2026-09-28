"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@apollo/client/react";
import type { ApiStory, ApiUser } from "@/types/social";
import { deleteStoryReaction, getStoryById, reactOnStory, viewStory } from "@/lib/api/story";
import { SEND_MESSAGE_MUTATION } from "@/lib/graphql/operations";
import type { SendMessageData } from "@/lib/graphql/types";
import { useLocale } from "@/lib/i18n/locale-context";
import { ShareLinkButton } from "@/components/ui/share-link-button";
import { UserProfileLink } from "@/components/ui/user-profile-link";
import { cn, ui } from "@/lib/theme/ui";

type StoryViewerProps = {
  story: ApiStory | null;
  viewer: ApiUser;
  onClose: () => void;
  onStoryChange?: (story: ApiStory) => void;
  onDeleteStory?: (storyId: string) => void;
  deletingStoryId?: string;
};

export function StoryViewer({ story, viewer, onClose, onStoryChange, onDeleteStory, deletingStoryId }: StoryViewerProps) {
  const { t } = useLocale();
  const [reply, setReply] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyError, setReplyError] = useState("");
  const [sendMessageMutation, { loading: isSendingReply }] = useMutation<SendMessageData>(SEND_MESSAGE_MUTATION);

  useEffect(() => {
    if (!story) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, story]);

  useEffect(() => {
    if (!story || story.viewerViewed || story.author.id === viewer.id) {
      return;
    }

    let ignore = false;

    viewStory(story.id)
      .then((updated) => {
        if (!ignore) {
          onStoryChange?.(updated);
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [onStoryChange, story, viewer.id]);

  useEffect(() => {
    if (!story) {
      return;
    }

    let ignore = false;

    async function refreshOpenStory() {
      if (!story) {
        return;
      }

      try {
        const updated = await getStoryById(story.id);
        if (!ignore) {
          onStoryChange?.(updated);
        }
      } catch {
        // Keep the open story as-is if a background refresh fails.
      }
    }

    const interval = window.setInterval(() => {
      void refreshOpenStory();
    }, 5000);

    window.addEventListener("focus", refreshOpenStory);

    return () => {
      ignore = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOpenStory);
    };
  }, [onStoryChange, story]);

  if (!story || typeof document === "undefined") {
    return null;
  }

  const isOwnStory = story.author.id === viewer.id;
  const isDeleting = deletingStoryId === story.id;

  async function handleReaction() {
    if (!story) {
      return;
    }

    const previous = story;
    const optimistic = story.viewerReacted
      ? {
          ...story,
          viewerReacted: false,
          viewerReactionType: undefined,
          reactionsCount: Math.max(0, story.reactionsCount - 1),
        }
      : {
          ...story,
          viewerReacted: true,
          viewerReactionType: "like" as const,
          reactionsCount: story.reactionsCount + 1,
        };

    onStoryChange?.(optimistic);

    try {
      const updated = previous.viewerReacted
        ? await deleteStoryReaction(previous.id)
        : await reactOnStory(previous.id, "like");
      onStoryChange?.(updated);
    } catch {
      onStoryChange?.(previous);
    }
  }

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = reply.trim();

    if (!content || isSendingReply || !story || isOwnStory) {
      return;
    }

    setReplyError("");
    setReplyMessage("");

    try {
      await sendMessageMutation({
        variables: {
          recipientId: story.author.id,
          content: `${t("story.replyPrefix")}: ${content}`,
        },
      });
      setReply("");
      setReplyMessage(t("story.replySent"));
    } catch {
      setReplyError(t("story.replyError"));
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex flex-col bg-black">
      <div className="absolute inset-0" onClick={onClose} role="presentation" />

      <div className="relative z-10 flex items-center gap-3 px-4 py-3">
        <UserProfileLink
          avatarClassName="h-10 w-10 ring-2 ring-fb"
          className="min-w-0 flex-1"
          layout="row"
          nameClassName="truncate text-[15px] font-bold text-white hover:text-white hover:underline"
          user={story.author}
        />
        <ShareLinkButton targetId={story.id} type="story" variant="icon" />
        {isOwnStory && onDeleteStory ? (
          <button
            aria-label={t("story.delete")}
            className="flex h-9 min-w-9 items-center justify-center rounded-full bg-red-500/20 px-3 text-sm font-bold text-red-100 transition hover:bg-red-500/30 disabled:opacity-60"
            disabled={isDeleting}
            onClick={() => onDeleteStory(story.id)}
            type="button"
          >
            {isDeleting ? "..." : t("story.delete")}
          </button>
        ) : null}
        <button
          aria-label={t("story.viewerClose")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl text-white transition hover:bg-white/30"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8">
        {story.imageUrl ? (
          <img className="max-h-full max-w-full object-contain" src={story.imageUrl} alt="" />
        ) : story.body?.trim() ? (
          <p className="max-w-lg whitespace-pre-wrap text-center text-2xl font-semibold leading-snug text-white">{story.body}</p>
        ) : (
          <p className={cn("text-center text-white/80", ui.body)}>{t("story.textOnly")}</p>
        )}
      </div>

      <div className="relative z-10 border-t border-white/10 bg-black/75 px-4 py-3">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] font-semibold text-white/80">
            <div className="flex items-center gap-4">
              <span>{t("story.views", { count: story.viewsCount })}</span>
              <span>{t("story.likes", { count: story.reactionsCount })}</span>
            </div>
            <button
              className={cn(
                "rounded-full px-4 py-2 text-[14px] font-bold transition",
                story.viewerReacted ? "bg-fb text-white" : "bg-white/15 text-white hover:bg-white/25",
              )}
              onClick={() => void handleReaction()}
              type="button"
            >
              {story.viewerReacted ? t("post.unlike") : t("post.like")}
            </button>
          </div>

          {!isOwnStory ? (
            <form className="flex items-center gap-2" onSubmit={(event) => void handleReply(event)}>
              <input
                className="min-w-0 flex-1 rounded-full bg-white/15 px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-white/55 focus:ring-2 focus:ring-fb/60"
                onChange={(event) => {
                  setReply(event.target.value);
                  setReplyMessage("");
                  setReplyError("");
                }}
                placeholder={t("story.replyPlaceholder")}
                value={reply}
              />
              <button
                className="rounded-full bg-fb px-5 py-2.5 text-[15px] font-bold text-white transition hover:bg-fb-hover disabled:opacity-50"
                disabled={!reply.trim() || isSendingReply}
                type="submit"
              >
                {t("messages.send")}
              </button>
            </form>
          ) : null}

          {replyMessage ? <p className="text-[13px] font-semibold text-green-300">{replyMessage}</p> : null}
          {replyError ? <p className="text-[13px] font-semibold text-red-300">{replyError}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
