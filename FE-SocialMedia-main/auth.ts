import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type JsonRecord = Record<string, unknown>;

type BackendUser = {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  avatar?: string;
  profileImage?: string;
  profilePicture?: {
    url?: string;
    key?: string;
  };
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNestedRecord(source: unknown, keys: string[]) {
  if (!isRecord(source)) {
    return undefined;
  }

  let current: unknown = source;

  for (const key of keys) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return isRecord(current) ? current : undefined;
}

function findStringValue(source: unknown, keys: string[], depth = 0): string {
  if (!isRecord(source) || depth > 5) {
    return "";
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const found = findStringValue(value, keys, depth + 1);

    if (found) {
      return found;
    }
  }

  return "";
}

function unwrapAuthResponse(response: unknown): unknown {
  return (
    readNestedRecord(response, ["data", "result", "credentials"]) ??
    readNestedRecord(response, ["data", "credentials"]) ??
    readNestedRecord(response, ["result", "credentials"]) ??
    readNestedRecord(response, ["data", "result"]) ??
    readNestedRecord(response, ["data"]) ??
    readNestedRecord(response, ["result"]) ??
    readNestedRecord(response, ["credentials"]) ??
    response
  );
}

function readAccessToken(response: unknown) {
  return findStringValue(response, ["accessToken", "access_token", "token"]);
}

function readRefreshToken(response: unknown) {
  return findStringValue(response, ["refreshToken", "refresh_token"]);
}

function readUser(response: unknown): BackendUser {
  const user =
    readNestedRecord(response, ["user"]) ??
    readNestedRecord(response, ["data", "user"]) ??
    readNestedRecord(response, ["result", "user"]) ??
    readNestedRecord(response, ["credentials", "user"]) ??
    response;

  return isRecord(user) ? (user as BackendUser) : {};
}

function readErrorMessage(payload: unknown, fallback: string) {
  return findStringValue(payload, ["message", "error"]) || fallback;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials.email === "string" ? credentials.email : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const rawPayload = (await response.json().catch(() => undefined)) as unknown;

        if (!response.ok) {
          console.error("Backend login failed:", readErrorMessage(rawPayload, response.statusText || "Login failed"));
          return null;
        }

        const payload = unwrapAuthResponse(rawPayload);
        const token = readAccessToken(payload) || readAccessToken(rawPayload);
        const refreshToken = readRefreshToken(payload) || readRefreshToken(rawPayload);
        const user = readUser(payload);

        if (!token) {
          console.error("Backend login response did not include an access token.");
          return null;
        }

        return {
          id: user.id ?? user._id ?? email,
          name: user.name ?? user.fullName ?? user.username ?? email,
          email: user.email ?? email,
          image: user.avatarUrl ?? user.avatar ?? user.profileImage ?? user.profilePicture?.url,
          accessToken: token,
          refreshToken: refreshToken || undefined,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }

      if (trigger === "update" && session) {
        const nextSession = session as { accessToken?: string; refreshToken?: string };

        if (nextSession.accessToken) {
          token.accessToken = nextSession.accessToken;
        }

        if (nextSession.refreshToken) {
          token.refreshToken = nextSession.refreshToken;
        }
      }

      return token;
    },
    session({ session, token }) {
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : undefined;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "development" ? "development-only-social-media-secret" : undefined),
});
