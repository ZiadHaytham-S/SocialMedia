"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/api/tokens";
import { connectMessagingSocket, disconnectMessagingSocket } from "@/lib/messaging/socket-client";

export function MessagingSocketProvider() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      disconnectMessagingSocket();
      return;
    }

    let cancelled = false;

    async function connect() {
      const token = (await getAccessToken()) ?? session?.accessToken;

      if (!token || cancelled) {
        return;
      }

      connectMessagingSocket(token);
    }

    void connect();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      disconnectMessagingSocket();
    }
  }, [status]);

  return null;
}
