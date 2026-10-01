// Notification destinations belong to this app, including old stored localhost URLs.
// Keep this function self-contained: the service worker embeds it in its script.
export function notificationPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value, "https://notification.invalid");
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!/^\/(?:$|friends\/?$|messages\/?$|profile(?:\/[a-f\d]{24})?\/?$|post\/[a-f\d]{24}\/?$|story\/[a-f\d]{24}\/?$)/i.test(url.pathname)) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}
