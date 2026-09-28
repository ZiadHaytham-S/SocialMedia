import { getSession } from "next-auth/react";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const AUTH_TOKENS_UPDATED_EVENT = "auth:tokens-updated";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function unwrapPayload(value: unknown): unknown {
  const record = asRecord(value);
  const data = asRecord(record.data);

  return data.result ?? data.updated ?? data.credentials ?? record.result ?? record.data ?? value;
}

function readStoredAccessToken() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    localStorage.getItem("accessToken") ??
    localStorage.getItem("token") ??
    undefined
  );
}

function readStoredRefreshToken() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem("refreshToken") ?? undefined;
}

function writeTokensToStorage(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("token", accessToken);

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem("refreshToken", refreshToken);
  }
}

export function persistTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") {
    return;
  }

  writeTokensToStorage(accessToken, refreshToken);

  window.dispatchEvent(
    new CustomEvent(AUTH_TOKENS_UPDATED_EVENT, {
      detail: { accessToken, refreshToken },
    }),
  );
}

export function syncSessionTokensToStorage(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") {
    return;
  }

  writeTokensToStorage(accessToken, refreshToken);
}

export function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem("refreshToken");
}

export async function getAccessToken() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const stored = readStoredAccessToken();

  if (stored) {
    return stored;
  }

  const session = await getSession();
  return session?.accessToken;
}

export async function getRefreshToken() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const stored = readStoredRefreshToken();

  if (stored) {
    return stored;
  }

  const session = await getSession();
  return session?.refreshToken;
}

function readTokensFromRecord(record: Record<string, unknown>) {
  const accessToken =
    (typeof record.access_token === "string" && record.access_token) ||
    (typeof record.accessToken === "string" && record.accessToken) ||
    (typeof record.token === "string" && record.token) ||
    undefined;

  const refreshToken =
    (typeof record.refresh_token === "string" && record.refresh_token) ||
    (typeof record.refreshToken === "string" && record.refreshToken) ||
    undefined;

  return { accessToken, refreshToken };
}

export function readTokenPair(payload: unknown): { accessToken?: string; refreshToken?: string } {
  const data = asRecord(asRecord(payload).data);

  const candidates = [
    payload,
    unwrapPayload(payload),
    asRecord(payload).updated,
    asRecord(payload).credentials,
    data.updated,
    data.credentials,
    data,
  ];

  for (const candidate of candidates) {
    const tokens = readTokensFromRecord(asRecord(candidate));

    if (tokens.accessToken) {
      return tokens;
    }
  }

  return {};
}

export function extractLoginCredentials(payload: unknown) {
  const { accessToken, refreshToken } = readTokenPair(unwrapPayload(payload));

  if (!accessToken) {
    throw new Error("error.missingTokens");
  }

  persistTokens(accessToken, refreshToken);

  return {
    accessToken,
    refreshToken,
  };
}
