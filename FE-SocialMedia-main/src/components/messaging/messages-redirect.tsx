"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMessengerOptional } from "@/components/messaging/messenger-context";

export function MessagesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messenger = useMessengerOptional();
  const withUserId = searchParams.get("with");

  useEffect(() => {
    if (!messenger) {
      return;
    }

    void (async () => {
      if (withUserId) {
        await messenger.openChat(withUserId);
      } else {
        messenger.openInbox();
      }

      router.replace("/");
    })();
  }, [messenger, router, withUserId]);

  return null;
}
