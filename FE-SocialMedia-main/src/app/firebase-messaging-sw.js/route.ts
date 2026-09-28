export const runtime = "nodejs";

function firebasePublicConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

export async function GET() {
  const config = firebasePublicConfig();

  const script = `
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notification = payload.notification || {};
  const title = notification.title || "إشعار جديد";
  const options = {
    body: notification.body || "",
    icon: "/default-avatar.svg",
    badge: "/default-avatar.svg",
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);

  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
    clients.forEach(function (client) {
      client.postMessage({
        type: "notifications:refresh",
        notificationType: (payload.data && payload.data.type) || undefined,
        notificationId: (payload.data && payload.data.notificationId) || undefined,
      });
    });
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
`.trim();

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
