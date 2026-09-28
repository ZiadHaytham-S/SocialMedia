"use client";

import { useSession } from "next-auth/react";

export function useRequireAuth() {
  const { data: session, status } = useSession();

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
