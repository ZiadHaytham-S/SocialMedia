"use client";

import { useEffect } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { SessionProvider, useSession } from "next-auth/react";
import { AUTH_TOKENS_UPDATED_EVENT, syncSessionTokensToStorage } from "@/lib/api/tokens";
import { LocaleHead } from "@/components/locale-head";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { FcmProvider } from "@/components/notifications/fcm-provider";
import { NotificationEventsProvider } from "@/components/notifications/notification-events-provider";
import { MessagingSocketProvider } from "@/components/messaging/messaging-socket-provider";
import { MessengerDock } from "@/components/messaging/messenger-dock";
import { MessengerProvider } from "@/components/messaging/messenger-context";
import { apolloClient } from "@/lib/graphql/client";

function AuthTokenBridge() {
  const { data: session, update } = useSession();

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const stored = localStorage.getItem("access_token");

    if (!stored) {
      syncSessionTokensToStorage(session.accessToken, session.refreshToken);
      return;
    }

    if (stored !== session.accessToken) {
      const refreshToken = localStorage.getItem("refresh_token") ?? session.refreshToken ?? undefined;
      void update({ accessToken: stored, refreshToken });
    }
  }, [session?.accessToken, session?.refreshToken, update]);

  useEffect(() => {
    function onTokensUpdated(event: Event) {
      const detail = (event as CustomEvent<{ accessToken: string; refreshToken?: string }>).detail;

      void update({
        accessToken: detail.accessToken,
        refreshToken: detail.refreshToken,
      });
    }

    window.addEventListener(AUTH_TOKENS_UPDATED_EVENT, onTokensUpdated);

    return () => {
      window.removeEventListener(AUTH_TOKENS_UPDATED_EVENT, onTokensUpdated);
    };
  }, [update]);

  return null;
}

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider>
          <LocaleProvider>
            <LocaleHead />
            <AuthTokenBridge />
            <FcmProvider />
            <NotificationEventsProvider />
            <MessagingSocketProvider />
            <MessengerProvider>
              <MessengerDock />
              {children}
            </MessengerProvider>
          </LocaleProvider>
        </ThemeProvider>
      </ApolloProvider>
    </SessionProvider>
  );
}
