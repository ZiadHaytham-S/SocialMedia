import { Suspense } from "react";
import { FriendsPage } from "@/components/friends/friends-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FriendsPage />
    </Suspense>
  );
}
