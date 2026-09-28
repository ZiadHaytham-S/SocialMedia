import { signOut } from "next-auth/react";
import { clearStoredTokens } from "./client";
import { logoutUser } from "./user";

export async function signOutWithBackend(callbackUrl = "/login") {
  try {
    await logoutUser("CURRENT");
  } catch {
    // Ignore logout API errors and still clear the local session.
  }

  clearStoredTokens();
  await signOut({ callbackUrl });
}
