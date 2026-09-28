export const NOTIFICATION_SOUNDS_ENABLED_KEY = "notification-sounds-enabled";

export type NotificationSoundKind = "message" | "notification";

/** Bump when replacing files in public/sounds/ so browsers skip stale cache. */
const SOUND_VERSION = "4";

const SOUND_PATHS: Record<NotificationSoundKind, string> = {
  message: `/sounds/message.wav?v=${SOUND_VERSION}`,
  notification: `/sounds/notification.wav?v=${SOUND_VERSION}`,
};

const SOUND_VOLUME: Record<NotificationSoundKind, number> = {
  message: 1,
  notification: 1,
};

let messengerOpenConversationIds = new Set<string>();

export function setMessengerOpenConversationIds(conversationIds: string[]) {
  messengerOpenConversationIds = new Set(conversationIds);
}

export function isMessengerConversationOpen(conversationId?: string) {
  if (!conversationId) {
    return false;
  }

  return messengerOpenConversationIds.has(conversationId);
}

export function getMessengerFocusedConversationId() {
  return messengerOpenConversationIds.values().next().value ?? null;
}

const DEDUP_TTL_MS = 2000;

const MESSAGE_NOTIFICATION_TYPES = new Set(["message"]);

const recentSounds = new Map<string, number>();
const audioCache = new Map<NotificationSoundKind, HTMLAudioElement>();
let audioPrimed = false;
let audioContext: AudioContext | null = null;

export function isSoundEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = window.localStorage.getItem(NOTIFICATION_SOUNDS_ENABLED_KEY);

  if (stored === null) {
    return true;
  }

  return stored !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(NOTIFICATION_SOUNDS_ENABLED_KEY, enabled ? "true" : "false");
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  return audioContext;
}

function playSynthPop(
  ctx: AudioContext,
  startTime: number,
  startHz: number,
  endHz: number,
  duration: number,
  volume: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(startHz, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endHz, 80), startTime + duration);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playSynthBell(
  ctx: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
  volume: number,
) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.setValueAtTime(frequency, startTime);
  osc2.frequency.setValueAtTime(frequency * 2.01, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(volume * 0.35, startTime + duration * 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration + 0.02);
  osc2.stop(startTime + duration + 0.02);
}

function playSynthSound(kind: NotificationSoundKind) {
  const ctx = getAudioContext();

  if (!ctx) {
    return;
  }

  void ctx.resume().then(() => {
    const now = ctx.currentTime;
    const master = SOUND_VOLUME[kind];

    if (kind === "message") {
      // Messenger-style double pop
      playSynthPop(ctx, now + 0.012, 620, 430, 0.085, master * 0.65);
      playSynthPop(ctx, now + 0.152, 760, 540, 0.095, master * 0.62);
      return;
    }

    // Facebook / mobile-style ding
    playSynthBell(ctx, now + 0.008, 880, 0.22, master * 0.58);
    playSynthBell(ctx, now + 0.118, 1174.7, 0.18, master * 0.32);
  }).catch(() => undefined);
}

function getAudio(kind: NotificationSoundKind) {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = audioCache.get(kind);

  if (cached) {
    return cached;
  }

  const audio = new Audio(SOUND_PATHS[kind]);
  audio.preload = "auto";
  audio.volume = SOUND_VOLUME[kind];
  audioCache.set(kind, audio);

  return audio;
}

export function primeNotificationAudio() {
  if (typeof window === "undefined" || audioPrimed) {
    return;
  }

  audioPrimed = true;

  for (const kind of Object.keys(SOUND_PATHS) as NotificationSoundKind[]) {
    const audio = getAudio(kind);

    if (!audio) {
      continue;
    }

    const primeVolume = SOUND_VOLUME[kind];
    audio.volume = 0.001;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = primeVolume;
      })
      .catch(() => {
        audio.volume = primeVolume;
      });
  }

  void getAudioContext()?.resume().catch(() => undefined);
}

function shouldDedupe(key: string) {
  const now = Date.now();

  for (const [entryKey, expiresAt] of recentSounds.entries()) {
    if (expiresAt <= now) {
      recentSounds.delete(entryKey);
    }
  }

  if (recentSounds.has(key)) {
    return true;
  }

  recentSounds.set(key, now + DEDUP_TTL_MS);
  return false;
}

export function notificationTypeToSoundKind(type?: string): NotificationSoundKind {
  if (type && MESSAGE_NOTIFICATION_TYPES.has(type)) {
    return "message";
  }

  return "notification";
}

export function shouldPlayMessageSound(options: {
  senderId?: string;
  viewerId?: string;
  conversationId?: string;
  activeConversationId?: string | null;
}) {
  if (options.senderId && options.viewerId && options.senderId === options.viewerId) {
    return false;
  }

  if (
    options.conversationId &&
    options.activeConversationId &&
    options.conversationId === options.activeConversationId
  ) {
    return false;
  }

  if (options.conversationId && isMessengerConversationOpen(options.conversationId)) {
    return false;
  }

  if (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/messages") &&
    options.conversationId &&
    options.activeConversationId &&
    options.conversationId === options.activeConversationId
  ) {
    return false;
  }

  return true;
}

export function playNotificationSound(kind: NotificationSoundKind, dedupeKey?: string) {
  if (typeof window === "undefined" || !isSoundEnabled()) {
    return;
  }

  if (dedupeKey && shouldDedupe(dedupeKey)) {
    return;
  }

  const template = getAudio(kind);

  if (!template) {
    playSynthSound(kind);
    return;
  }

  const audio = template.cloneNode(true) as HTMLAudioElement;
  audio.volume = SOUND_VOLUME[kind];
  audio.currentTime = 0;

  void audio.play().catch(() => {
    playSynthSound(kind);
  });
}

export function playNotificationSoundForType(type?: string, dedupeKey?: string) {
  playNotificationSound(notificationTypeToSoundKind(type), dedupeKey);
}
