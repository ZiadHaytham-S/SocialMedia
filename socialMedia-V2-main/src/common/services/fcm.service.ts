import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID } from "../../config/config";

let initialized = false;

function ensureFirebaseAdmin() {
  if (initialized) {
    return getApps().length > 0;
  }

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return false;
  }

  try {
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    initialized = true;
    return true;
  } catch (error) {
    console.warn("[FCM] Firebase Admin init failed:", error);
    return false;
  }
}

export type FcmPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendFcmToTokens(tokens: string[], payload: FcmPayload) {
  if (!tokens.length || !ensureFirebaseAdmin()) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] as string[] };
  }

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data ?? {},
    webpush: {
      fcmOptions: {
        link: payload.data?.url ?? "/",
      },
    },
  });

  const invalidTokens: string[] = [];

  response.responses.forEach((item, index) => {
    if (item.success) {
      return;
    }

    const code = item.error?.code ?? "";

    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      const stale = tokens[index];

      if (stale) {
        invalidTokens.push(stale);
      }
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  };
}
