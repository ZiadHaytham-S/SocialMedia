"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@apollo/client/react";
import type { ApiConversation, ApiMessage, ApiMessageUser, ApiUser } from "@/types/social";
import {
  MARK_CONVERSATION_READ_MUTATION,
  MESSAGES_QUERY,
} from "@/lib/graphql/operations";
import type { MessagesData } from "@/lib/graphql/types";
import { defaultAvatar } from "@/lib/api/fallbacks";
import {
  deleteConversation,
  deleteMessage,
  editMessage,
  forwardMessage,
  pinMessage,
  reactToMessage,
  sendMessage,
} from "@/lib/api/message";
import { useUserSearch } from "@/hooks/use-user-search";
import {
  emitTypingStart,
  emitTypingStop,
  joinConversationRoom,
  leaveConversationRoom,
  MESSAGING_SOCKET_EVENT,
  dispatchMessagingUnreadRefresh,
  type MessagingSocketPayload,
} from "@/lib/messaging/socket-client";
import {
  playNotificationSound,
  shouldPlayMessageSound,
} from "@/lib/notifications/notification-sound";
import { useLocale } from "@/lib/i18n/locale-context";
import { getProfileHref } from "@/lib/utils/profile-path";
import { cn, ui } from "@/lib/theme/ui";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

const MAX_MESSAGE_ATTACHMENT_SIZE = 1024 * 1024 * 1024;
const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRecordingDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function isGeneratedAttachmentLabel(message: ApiMessage) {
  if (!message.attachmentType) {
    return false;
  }

  return ["Audio", "Video", "Photo"].includes(message.content.trim());
}

function uniqueMessages(messages: ApiMessage[]) {
  const seen = new Set<string>();

  return messages.filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);
    return true;
  });
}

type MessageThreadProps = {
  conversationId: string;
  peer: ApiMessageUser;
  viewer: ApiUser;
  compact?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  onConversationDeleted?: (conversationId: string) => void;
  className?: string;
};

export function MessageThread({
  conversationId,
  peer,
  viewer,
  compact = false,
  onMinimize,
  onClose,
  onConversationDeleted,
  className,
}: MessageThreadProps) {
  const { t, locale } = useLocale();
  const { confirm, prompt, ConfirmDialog } = useConfirmDialog();
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File>();
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [sendError, setSendError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string>();
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string>();
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string>();
  const [forwardingMessage, setForwardingMessage] = useState<ApiMessage>();
  const [forwardSearch, setForwardSearch] = useState("");
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<ApiMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  const { data: messagesData } = useQuery<MessagesData>(MESSAGES_QUERY, {
    variables: { conversationId, limit: 50 },
  });
  const { hits: forwardHits, isSearching: isForwardSearching } = useUserSearch(forwardSearch);

  const [markReadMutation] = useMutation(MARK_CONVERSATION_READ_MUTATION);

  useEffect(() => {
    if (!attachment) {
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

  useEffect(() => {
    if (messagesData?.messages) {
      const timeout = window.setTimeout(() => {
        setLocalMessages(uniqueMessages(messagesData.messages));
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [messagesData?.messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isPeerTyping]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    joinConversationRoom(conversationId);
    void markReadMutation({ variables: { conversationId } }).then(() => {
      dispatchMessagingUnreadRefresh();
    });

    return () => {
      leaveConversationRoom(conversationId);
    };
  }, [conversationId, markReadMutation]);

  useEffect(() => {
    function onSocketEvent(event: Event) {
      const detail = (event as CustomEvent<MessagingSocketPayload>).detail;

      if (detail.type === "message:new") {
        const message = detail.message as ApiMessage;

        if (
          shouldPlayMessageSound({
            senderId: message.sender.id,
            viewerId: viewer.id,
            conversationId: message.conversationId,
            activeConversationId: conversationId,
          })
        ) {
          playNotificationSound("message", `message:${message.conversationId}:${message.sender.id}`);
        }

        if (message.conversationId === conversationId) {
          setLocalMessages((current) => {
            if (current.some((row) => row.id === message.id)) {
              return current;
            }

            return [...current, message];
          });

          void markReadMutation({ variables: { conversationId: message.conversationId } }).then(() => {
            dispatchMessagingUnreadRefresh();
          });
        }
      }

      if (detail.type === "message:deleted" && detail.payload.conversationId === conversationId) {
        setLocalMessages((current) => current.filter((message) => message.id !== detail.payload.messageId));
      }

      if (detail.type === "message:updated") {
        const updatedMessage = detail.message as ApiMessage;

        if (updatedMessage.conversationId === conversationId) {
          setLocalMessages((current) =>
            current.map((message) => (message.id === updatedMessage.id ? updatedMessage : message)),
          );
        }
      }

      if (detail.type === "conversation:deleted" && detail.payload.conversationId === conversationId) {
        setLocalMessages([]);
        onConversationDeleted?.(conversationId);
      }

      if (detail.type === "typing" && detail.payload.conversationId === conversationId) {
        if (detail.payload.userId !== viewer.id) {
          setIsPeerTyping(detail.payload.isTyping);
        }
      }
    }

    window.addEventListener(MESSAGING_SOCKET_EVENT, onSocketEvent);

    return () => {
      window.removeEventListener(MESSAGING_SOCKET_EVENT, onSocketEvent);
    };
  }, [conversationId, markReadMutation, onConversationDeleted, viewer.id]);

  function clearAttachment() {
    setAttachment(undefined);
    setAttachmentPreview("");
    setSendError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  }

  function selectAttachment(file: File) {
    if (file.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
      setSendError("File must be 1 GB or less.");
      return;
    }

    setAttachment(file);
    setAttachmentPreview("");
    setSendError("");
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSendError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type });
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setIsRecording(false);
        clearRecordingTimer();

        if (blob.size > 0) {
          selectAttachment(file);
        }
      });

      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1000);
      setSendError("");
      recorder.start();
    } catch {
      clearRecordingTimer();
      setIsRecording(false);
      setSendError("Could not start audio recording.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const handleSend = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const content = draft.trim();

      if ((!content && !attachment) || isSending) {
        return;
      }

      setIsSending(true);
      setSendError("");
      setDraft("");
      emitTypingStop(conversationId);

      try {
        const message = await sendMessage({ recipientId: peer.id, content, attachment });
        setLocalMessages((current) => {
          if (current.some((row) => row.id === message.id)) {
            return current;
          }

          return [...current, message];
        });
        clearAttachment();
      } catch {
        setDraft(content);
        setSendError("Could not send message.");
      } finally {
        setIsSending(false);
      }
    },
    [attachment, conversationId, draft, isSending, peer.id],
  );

  function handleDraftChange(value: string) {
    setDraft(value);
    emitTypingStart(conversationId);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      emitTypingStop(conversationId);
    }, 1200);
  }

  async function handleDeleteConversation() {
    const message = isArabic
      ? "تمسح الشات ده من عندك؟ الطرف التاني هيفضل شايفه."
      : "Delete this chat for you only? The other person will still see it.";

    const ok = await confirm({
      title: message,
      confirmLabel: isArabic ? "حذف" : "Delete",
      cancelLabel: isArabic ? "إلغاء" : "Cancel",
      destructive: true,
    });

    if (!ok) {
      return;
    }

    setIsDeletingConversation(true);
    setSendError("");

    try {
      await deleteConversation(conversationId);
      setLocalMessages([]);
      dispatchMessagingUnreadRefresh();
      onConversationDeleted?.(conversationId);
      onClose?.();
    } catch {
      setSendError(isArabic ? "تعذر حذف المحادثة." : "Could not delete conversation.");
    } finally {
      setIsDeletingConversation(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    const message = isArabic ? "تمسح الرسالة دي؟" : "Delete this message?";

    const ok = await confirm({
      title: message,
      confirmLabel: isArabic ? "حذف" : "Delete",
      cancelLabel: isArabic ? "إلغاء" : "Cancel",
      destructive: true,
    });

    if (!ok) {
      return;
    }

    setDeletingMessageId(messageId);
    setSendError("");

    try {
      await deleteMessage(messageId);
      setLocalMessages((current) => current.filter((row) => row.id !== messageId));
      dispatchMessagingUnreadRefresh();
    } catch {
      setSendError(isArabic ? "تعذر حذف الرسالة." : "Could not delete message.");
    } finally {
      setDeletingMessageId(undefined);
    }
  }

  function replaceLocalMessage(updatedMessage: ApiMessage) {
    setLocalMessages((current) =>
      current.map((message) => (message.id === updatedMessage.id ? updatedMessage : message)),
    );
  }

  async function handleReaction(messageId: string, type: string) {
    setSendError("");

    try {
      const updated = await reactToMessage(messageId, type);
      replaceLocalMessage(updated);
      setReactionPickerMessageId(undefined);
    } catch {
      setSendError(isArabic ? "تعذر إضافة الرياكت." : "Could not react to message.");
    }
  }

  async function handlePin(message: ApiMessage) {
    setSendError("");

    try {
      const updated = await pinMessage(message.id, !message.isPinned);
      replaceLocalMessage(updated);
      setActiveMessageMenuId(undefined);
    } catch {
      setSendError(isArabic ? "تعذر تثبيت الرسالة." : "Could not pin message.");
    }
  }

  async function handleForwardMessage(recipientId: string) {
    if (!forwardingMessage) {
      return;
    }

    setSendError("");

    try {
      await forwardMessage(forwardingMessage.id, recipientId);
      setForwardingMessage(undefined);
      setForwardSearch("");
      dispatchMessagingUnreadRefresh();
    } catch {
      setSendError(isArabic ? "تعذر إعادة توجيه الرسالة." : "Could not forward message.");
    }
  }

  async function openEditMessage(message: ApiMessage) {
    const nextContent = await prompt({
      title: isArabic ? "\u0639\u062f\u0651\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629" : "Edit message",
      defaultValue: message.content,
      confirmLabel: isArabic ? "\u062d\u0641\u0638" : "Save",
      cancelLabel: isArabic ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel",
    });

    if (nextContent === null) {
      setActiveMessageMenuId(undefined);
      return;
    }

    if (!nextContent.trim()) {
      setSendError(isArabic ? "اكتب نص الرسالة أولاً." : "Write message text first.");
      setActiveMessageMenuId(undefined);
      return;
    }

    setActiveMessageMenuId(undefined);
    void editMessage(message.id, nextContent)
      .then(replaceLocalMessage)
      .catch(() => {
        setSendError(isArabic ? "تعذر تعديل الرسالة." : "Could not edit message.");
      });
  }

  const profileHref = getProfileHref(peer.id);
  const isArabic = locale.startsWith("ar");
  const recordingLabel = isArabic ? "بيسجل" : "Recording";
  const voiceReadyLabel = isArabic ? "ريكورد فويس جاهز للإرسال" : "Voice message ready";
  const attachLabel = isArabic ? "إرفاق صورة أو فيديو أو صوت" : "Attach photo, video, or audio";
  const cameraLabel = isArabic ? "تصوير صورة بالكاميرا" : "Take photo";
  const voiceLabel = isRecording
    ? isArabic
      ? "إيقاف التسجيل"
      : "Stop recording"
    : isArabic
      ? "تسجيل فويس"
      : "Record voice";
  const pinnedMessage = localMessages.find((message) => message.isPinned);
  const forwardResults = forwardHits.map((hit) => hit.user).filter((user) => user.id !== viewer.id);

  return (
    <div className={cn("flex min-h-0 flex-col bg-surface", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border-light px-3 py-2.5">
        {profileHref ? (
          <Link className="flex min-w-0 flex-1 items-center gap-2.5" href={profileHref}>
            <img alt="" className="h-9 w-9 rounded-full object-cover" src={peer.avatarUrl || defaultAvatar} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-t-primary">{peer.name}</p>
              {isPeerTyping ? (
                <p className="text-[12px] font-medium text-fb">{t("messages.typing")}</p>
              ) : (
                <p className={cn("truncate text-[12px]", ui.textMuted)}>@{peer.username}</p>
              )}
            </div>
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <img alt="" className="h-9 w-9 rounded-full object-cover" src={peer.avatarUrl || defaultAvatar} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-t-primary">{peer.name}</p>
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          <div className="relative">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-t-muted transition hover:bg-surface-hover"
              onClick={() => setHeaderMenuOpen((open) => !open)}
              title={isArabic ? "خيارات المحادثة" : "Conversation options"}
              type="button"
            >
              <span className="text-lg leading-none">⋮</span>
            </button>
            {headerMenuOpen ? (
              <div className="absolute end-0 top-9 z-30 w-44 overflow-hidden rounded-xl bg-[#242526] py-1 text-start text-[13px] font-bold text-white shadow-[var(--shadow-elevated)]">
                <button
                  className="block w-full px-3 py-2 text-start text-red-200 hover:bg-white/10 disabled:opacity-60"
                  disabled={isDeletingConversation}
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    void handleDeleteConversation();
                  }}
                  type="button"
                >
                  {isArabic ? "حذف المحادثة من عندي" : "Delete chat for me"}
                </button>
              </div>
            ) : null}
          </div>
          <button
            className="hidden h-8 w-8 items-center justify-center rounded-full text-t-muted transition hover:bg-red-500/10 hover:text-danger disabled:opacity-50"
            disabled={isDeletingConversation}
            onClick={() => void handleDeleteConversation()}
            title={isArabic ? "حذف الشات من عندي" : "Delete chat for me"}
            type="button"
          >
            <span className="text-base leading-none">🗑️</span>
          </button>
          {onMinimize ? (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-t-muted transition hover:bg-surface-hover"
              onClick={onMinimize}
              title={t("messages.minimize")}
              type="button"
            >
              <span className="text-lg leading-none">−</span>
            </button>
          ) : null}
          {onClose ? (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-t-muted transition hover:bg-surface-hover"
              onClick={onClose}
              title={t("messages.close")}
              type="button"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          ) : null}
        </div>
      </div>

      {pinnedMessage ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border-light bg-surface px-3 py-2">
          <span className="text-base">📌</span>
          <button
            className="min-w-0 flex-1 text-start"
            onClick={() => {
              document.getElementById(`message-${pinnedMessage.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            type="button"
          >
            <p className="truncate text-[12px] font-bold text-t-primary">{isArabic ? "رسالة مثبتة" : "Pinned message"}</p>
            <p className={cn("truncate text-[12px]", ui.textMuted)}>{pinnedMessage.content}</p>
          </button>
          <button
            className="rounded-full px-2 py-1 text-[12px] font-bold text-t-muted transition hover:bg-surface-hover"
            onClick={() => void handlePin(pinnedMessage)}
            type="button"
          >
            {isArabic ? "إلغاء" : "Unpin"}
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto bg-surface-muted/40 px-3 py-3",
          compact ? "" : "",
        )}
      >
        {localMessages.map((message) => {
          const isMine = message.sender.id === viewer.id;
          const showText = message.content.trim() && !isGeneratedAttachmentLabel(message);

          return (
            <div
              className={cn(
                "group relative flex items-center gap-1.5",
                isMine ? "flex-row-reverse justify-start" : "justify-start",
              )}
              id={`message-${message.id}`}
              key={message.id}
            >
              {!isMine ? (
                <img
                  alt=""
                  className="h-7 w-7 shrink-0 self-end rounded-full object-cover ring-2 ring-surface"
                  src={message.sender.avatarUrl || defaultAvatar}
                />
              ) : null}
              <div
                className={cn(
                  "relative max-w-[85%] rounded-[18px] px-3 py-2 text-[14px] leading-relaxed shadow-sm",
                  isMine ? "bg-fb text-white" : "bg-surface text-t-primary ring-1 ring-border-light",
                )}
              >
                {!isMine ? (
                  <p className={cn("mb-0.5 truncate text-[11px] font-bold", ui.textMuted)}>
                    {message.sender.name}
                  </p>
                ) : null}
                {false ? (
                  <button
                    aria-label={isArabic ? "حذف الرسالة" : "Delete message"}
                    className={cn(
                      "absolute -top-2 end-1 flex h-7 w-7 items-center justify-center rounded-full text-[13px] opacity-0 shadow-sm ring-1 transition group-hover:opacity-100 focus:opacity-100",
                      isMine
                        ? "bg-white text-danger ring-white/60 hover:bg-red-50"
                        : "bg-surface text-danger ring-border-light hover:bg-surface-hover",
                    )}
                    disabled={deletingMessageId === message.id}
                    onClick={() => void handleDeleteMessage(message.id)}
                    title={isArabic ? "حذف الرسالة" : "Delete message"}
                    type="button"
                  >
                    🗑️
                  </button>
                ) : null}
                {showText ? <p>{message.content}</p> : null}
                {message.attachmentUrl && message.attachmentType === "image" ? (
                  <img
                    alt={message.attachmentName || ""}
                    className={cn(showText ? "mt-2" : "", "max-h-64 rounded-xl object-contain")}
                    src={message.attachmentUrl}
                  />
                ) : null}
                {message.attachmentUrl && message.attachmentType === "video" ? (
                  <video
                    className={cn(showText ? "mt-2" : "", "max-h-64 rounded-xl")}
                    controls
                    preload="metadata"
                    src={message.attachmentUrl}
                  />
                ) : null}
                {message.attachmentUrl && message.attachmentType === "audio" ? (
                  <div
                    className={cn(
                      showText ? "mt-2" : "",
                      "flex min-w-[210px] items-center gap-2 rounded-2xl px-2.5 py-2",
                      isMine ? "bg-white/15" : "bg-surface-muted",
                    )}
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      🎙️
                    </span>
                    <audio className="h-8 min-w-0 flex-1" controls src={message.attachmentUrl} />
                  </div>
                ) : null}
                <p className={cn("mt-0.5 text-[10px]", isMine ? "text-white/80" : ui.textMuted)}>
                  {formatTime(message.createdAt, locale)}
                  {message.editedAt ? ` · ${isArabic ? "تم التعديل" : "Edited"}` : ""}
                  {message.isPinned ? " · 📌" : ""}
                </p>
                {message.reactions?.length ? (
                  <div
                    className={cn(
                      "absolute -bottom-3 flex gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm ring-1",
                      isMine ? "start-2 bg-white text-slate-700 ring-white/70" : "end-2 bg-surface text-t-primary ring-border-light",
                    )}
                  >
                    {message.reactions.map((reaction) => (
                      <span key={reaction.type}>
                        {reaction.type}
                        {reaction.count > 1 ? reaction.count : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="relative flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[15px] text-t-muted shadow-sm ring-1 ring-border-light transition hover:bg-surface-hover"
                  onClick={() => {
                    setReactionPickerMessageId((current) => (current === message.id ? undefined : message.id));
                    setActiveMessageMenuId(undefined);
                  }}
                  title={isArabic ? "رياكت" : "React"}
                  type="button"
                >
                  ☺
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[15px] text-t-muted shadow-sm ring-1 ring-border-light transition hover:bg-surface-hover"
                  onClick={() => {
                    setForwardingMessage(message);
                    setActiveMessageMenuId(undefined);
                  }}
                  title={isArabic ? "إعادة توجيه" : "Forward"}
                  type="button"
                >
                  ↪
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[17px] font-bold text-t-muted shadow-sm ring-1 ring-border-light transition hover:bg-surface-hover"
                  onClick={() => {
                    setActiveMessageMenuId((current) => (current === message.id ? undefined : message.id));
                    setReactionPickerMessageId(undefined);
                  }}
                  title={isArabic ? "المزيد" : "More"}
                  type="button"
                >
                  ⋮
                </button>
                {reactionPickerMessageId === message.id ? (
                  <div className="absolute bottom-8 end-0 z-30 flex gap-1 rounded-full bg-surface px-2 py-1.5 shadow-[var(--shadow-elevated)] ring-1 ring-border-light">
                    {MESSAGE_REACTIONS.map((reaction) => (
                      <button
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-surface-hover",
                          message.viewerReaction === reaction && "bg-fb/10",
                        )}
                        key={reaction}
                        onClick={() => void handleReaction(message.id, reaction)}
                        type="button"
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                ) : null}
                {activeMessageMenuId === message.id ? (
                  <div className="absolute bottom-8 end-0 z-30 w-36 overflow-hidden rounded-xl bg-[#242526] py-1 text-start text-[13px] font-bold text-white shadow-[var(--shadow-elevated)]">
                    {isMine && showText && !message.attachmentUrl ? (
                      <button className="block w-full px-3 py-2 text-start hover:bg-white/10" onClick={() => void openEditMessage(message)} type="button">
                        {isArabic ? "تعديل" : "Edit"}
                      </button>
                    ) : null}
                    {isMine ? (
                      <button className="block w-full px-3 py-2 text-start hover:bg-white/10" onClick={() => void handleDeleteMessage(message.id)} type="button">
                        {isArabic ? "إلغاء الإرسال" : "Unsend"}
                      </button>
                    ) : null}
                    <button
                      className="block w-full px-3 py-2 text-start hover:bg-white/10"
                      onClick={() => {
                        setForwardingMessage(message);
                        setActiveMessageMenuId(undefined);
                      }}
                      type="button"
                    >
                      {isArabic ? "إعادة توجيه" : "Forward"}
                    </button>
                    <button className="block w-full px-3 py-2 text-start hover:bg-white/10" onClick={() => void handlePin(message)} type="button">
                      {message.isPinned ? (isArabic ? "إلغاء التثبيت" : "Unpin") : isArabic ? "تثبيت" : "Pin"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {forwardingMessage ? (
        <div className="shrink-0 border-t border-border-light bg-surface px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-t-primary">{isArabic ? "إعادة توجيه الرسالة" : "Forward message"}</p>
              <p className={cn("truncate text-[12px]", ui.textMuted)}>{forwardingMessage.content}</p>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-t-muted transition hover:bg-surface-hover"
              onClick={() => {
                setForwardingMessage(undefined);
                setForwardSearch("");
              }}
              type="button"
            >
              ×
            </button>
          </div>
          <input
            className="h-9 w-full rounded-full bg-surface-input px-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/25"
            onChange={(event) => setForwardSearch(event.target.value)}
            placeholder={isArabic ? "ابحث عن شخص لإعادة التوجيه..." : "Search someone to forward to..."}
            value={forwardSearch}
          />
          {forwardSearch.trim() ? (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-surface-muted p-1">
              {isForwardSearching ? (
                <p className={cn("px-3 py-2 text-[12px]", ui.textMuted)}>{isArabic ? "جاري البحث..." : "Searching..."}</p>
              ) : forwardResults.length === 0 ? (
                <p className={cn("px-3 py-2 text-[12px]", ui.textMuted)}>{isArabic ? "لا توجد نتائج" : "No results"}</p>
              ) : (
                forwardResults.map((user) => (
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start transition hover:bg-surface-hover"
                    key={user.id}
                    onClick={() => void handleForwardMessage(user.id)}
                    type="button"
                  >
                    <img alt="" className="h-7 w-7 rounded-full object-cover" src={user.avatarUrl || defaultAvatar} />
                    <span className="truncate text-[13px] font-semibold text-t-primary">{user.name}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <form className="shrink-0 border-t border-border-light bg-surface p-2" onSubmit={(event) => void handleSend(event)}>
        {attachment ? (
          <div className="mb-2 rounded-2xl bg-surface-muted p-2.5">
            <div className="flex items-center gap-2">
              {attachment.type.startsWith("image/") && attachmentPreview ? (
                <img alt="" className="h-20 w-20 rounded-lg object-cover" src={attachmentPreview} />
              ) : attachment.type.startsWith("video/") && attachmentPreview ? (
                <video className="h-20 w-20 rounded-lg object-cover" src={attachmentPreview} />
              ) : attachment.type.startsWith("audio/") && attachmentPreview ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fb text-xl text-white">
                  🎙️
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                {attachment.type.startsWith("audio/") ? (
                  <>
                    <p className="text-[13px] font-semibold text-t-primary">{voiceReadyLabel}</p>
                    {attachmentPreview ? <audio className="mt-1 h-8 w-full" controls src={attachmentPreview} /> : null}
                  </>
                ) : (
                  <>
                    <p className="truncate text-[13px] font-semibold text-t-primary">{attachment.name}</p>
                    <p className={ui.meta}>{Math.ceil(attachment.size / 1024 / 1024)} MB</p>
                  </>
                )}
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-t-muted transition hover:bg-surface-hover"
                aria-label={isArabic ? "حذف المرفق" : "Remove attachment"}
                onClick={() => {
                  clearAttachment();
                }}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}
        {sendError ? <p className="mb-2 text-[12px] font-semibold text-danger">{sendError}</p> : null}
        {isRecording ? (
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-red-600/10 px-3 py-2 text-red-600">
            <div className="flex items-center gap-2 text-[13px] font-bold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
              <span>{recordingLabel}</span>
              <span dir="ltr">{formatRecordingDuration(recordingSeconds)}</span>
            </div>
            <button
              aria-label={voiceLabel}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
              onClick={stopRecording}
              type="button"
            >
              ■
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-1.5 sm:gap-2">
          <button
            aria-label={attachLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-input text-lg text-t-secondary transition hover:bg-surface-hover"
            onClick={() => fileInputRef.current?.click()}
            title={attachLabel}
            type="button"
          >
            📎
          </button>
          <button
            aria-label={cameraLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-input text-lg text-t-secondary transition hover:bg-surface-hover"
            onClick={() => cameraInputRef.current?.click()}
            title={cameraLabel}
            type="button"
          >
            📷
          </button>
          <button
            aria-label={voiceLabel}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg transition",
              isRecording ? "bg-red-600 text-white" : "bg-surface-input text-t-secondary hover:bg-surface-hover",
            )}
            onClick={() => {
              if (isRecording) {
                stopRecording();
                return;
              }

              void startRecording();
            }}
            title={voiceLabel}
            type="button"
          >
            {isRecording ? "■" : "🎙️"}
          </button>
          <textarea
            className="max-h-24 min-h-[36px] flex-1 resize-none rounded-full bg-surface-input px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/25"
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend(event);
              }
            }}
            placeholder={t("messages.placeholder")}
            rows={1}
            value={draft}
          />
          <button
            aria-label={t("messages.send")}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fb text-white transition hover:bg-fb-hover disabled:opacity-50",
            )}
            disabled={(!draft.trim() && !attachment) || isSending}
            type="submit"
          >
            ➤
          </button>
        </div>
        <input
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            selectAttachment(file);
          }}
          ref={fileInputRef}
          type="file"
        />
        <input
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              selectAttachment(file);
            }
          }}
          ref={cameraInputRef}
          type="file"
        />
      </form>
      {ConfirmDialog}
    </div>
  );
}

export type { ApiConversation };
