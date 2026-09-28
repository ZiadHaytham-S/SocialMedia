import { Suspense } from "react";
import { MessagesRedirect } from "@/components/messaging/messages-redirect";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MessagesRedirect />
    </Suspense>
  );
}
