const PENDING_PASSWORD_PREFIX = "pendingSignupPassword:";

export function stashSignupPassword(email: string, password: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(`${PENDING_PASSWORD_PREFIX}${email.trim().toLowerCase()}`, password);
}

export function takeSignupPassword(email: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const key = `${PENDING_PASSWORD_PREFIX}${email.trim().toLowerCase()}`;
  const password = sessionStorage.getItem(key);

  if (password) {
    sessionStorage.removeItem(key);
  }

  return password ?? undefined;
}
