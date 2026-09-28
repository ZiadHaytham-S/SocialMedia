export type ShareTargetType = "post" | "story" | "profile";

export function getAppOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "";
}

export function getSharePath(type: ShareTargetType, id: string) {
  const trimmed = id.trim();

  if (!trimmed) {
    return "";
  }

  switch (type) {
    case "post":
      return `/post/${trimmed}`;
    case "story":
      return `/story/${trimmed}`;
    case "profile":
      return `/profile/${trimmed}`;
  }
}

export function getShareUrl(type: ShareTargetType, id: string) {
  const path = getSharePath(type, id);

  if (!path) {
    return "";
  }

  const origin = getAppOrigin();

  return origin ? `${origin}${path}` : path;
}
