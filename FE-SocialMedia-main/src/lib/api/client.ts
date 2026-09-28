import {
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  persistTokens,
  readTokenPair,
} from "./tokens";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

let refreshInFlight: Promise<string | undefined> | null = null;

async function rotateAccessToken(): Promise<string | undefined> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return undefined;
    }

    const response = await fetch(`${API_URL}/user/rotate-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as unknown;
    const { accessToken, refreshToken: nextRefresh } = readTokenPair(payload);

    if (!accessToken) {
      return undefined;
    }

    persistTokens(accessToken, nextRefresh ?? refreshToken);

    return accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function parseErrorMessage(response: Response) {
  let message = `Request failed: ${response.status}`;

  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    message = payload.message ?? payload.error ?? message;
  } catch {
    message = response.statusText || message;
  }

  return message;
}

async function executeRequest<T>(
  path: string,
  init: RequestInit,
  options: { isPublic?: boolean; allowRetry?: boolean } = {},
): Promise<T> {
  const token = options.isPublic ? undefined : await getAccessToken();
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    const hint =
      error instanceof TypeError
        ? `Network error — is the API running at ${API_URL}? (Backend PORT=3000, frontend usually :3001)`
        : "Network request failed";
    throw new Error(hint);
  }

  if (response.status === 401 && !options.isPublic && options.allowRetry !== false && path !== "/user/rotate-token") {
    const nextToken = await rotateAccessToken();

    if (nextToken) {
      return executeRequest<T>(path, init, { ...options, allowRetry: false });
    }

    clearStoredTokens();

    if (typeof window !== "undefined") {
      const { signOut } = await import("next-auth/react");
      await signOut({ callbackUrl: "/login?reason=session" });
    }
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return executeRequest<T>(path, init);
}

export async function publicApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return executeRequest<T>(path, init, { isPublic: true });
}

export { clearStoredTokens, persistTokens, rotateAccessToken };
