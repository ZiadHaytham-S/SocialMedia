import { getSession, signIn } from "next-auth/react";
import { persistTokens } from "@/lib/api/tokens";
import { takeSignupPassword } from "@/lib/auth/pending-signup";

export type AutoLoginResult =
  | { ok: true }
  | { ok: false; reason: "missing_password" | "sign_in_failed" };

export async function autoLoginAfterConfirm(email: string): Promise<AutoLoginResult> {
  const password = takeSignupPassword(email);

  if (!password) {
    return { ok: false, reason: "missing_password" };
  }

  const result = await signIn("credentials", {
    email: email.trim(),
    password,
    redirect: false,
  });

  if (result?.error) {
    return { ok: false, reason: "sign_in_failed" };
  }

  const session = await getSession();

  if (session?.accessToken) {
    persistTokens(session.accessToken, session.refreshToken);
  }

  return { ok: true };
}
