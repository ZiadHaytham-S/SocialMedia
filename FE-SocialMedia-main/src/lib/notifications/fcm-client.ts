"use client";

import { getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { FIREBASE_VAPID_KEY, firebaseConfig, isFirebaseConfigured } from "./firebase-config";

const FCM_TOKEN_STORAGE_KEY = "fcm_device_token";

let messagingInstance: Messaging | null = null;

function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }

  return getApps()[0];
}

async function getMessagingInstance() {
  if (messagingInstance) {
    return messagingInstance;
  }

  const supported = await isSupported();

  if (!supported) {
    return null;
  }

  messagingInstance = getMessaging(getFirebaseApp());
  return messagingInstance;
}

export function getStoredFcmToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
}

export function setStoredFcmToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!token) {
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    return;
  }

  localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
}

async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });

  await navigator.serviceWorker.ready;
  return registration;
}

export async function requestFcmToken(): Promise<string | null> {
  if (!isFirebaseConfigured() || typeof window === "undefined") {
    return null;
  }

  if (Notification.permission === "denied") {
    return null;
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return null;
    }
  }

  const messaging = await getMessagingInstance();

  if (!messaging) {
    return null;
  }

  const registration = await ensureServiceWorker();

  if (!registration) {
    return null;
  }

  const token = await getToken(messaging, {
    vapidKey: FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    setStoredFcmToken(token);
  }

  return token;
}

export function subscribeForegroundMessages(handler: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void) {
  if (!isFirebaseConfigured() || typeof window === "undefined") {
    return () => undefined;
  }

  let unsubscribe: (() => void) | null = null;

  void getMessagingInstance().then((messaging) => {
    if (!messaging) {
      return;
    }

    unsubscribe = onMessage(messaging, (payload) => {
      handler({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: (payload.data as Record<string, string> | undefined) ?? {},
      });
    });
  });

  return () => {
    unsubscribe?.();
  };
}

export async function clearFcmTokenLocally() {
  setStoredFcmToken(null);
}
