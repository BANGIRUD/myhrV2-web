const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const env = {
  apiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_API_BASE_URL || "http://localhost:9520/api",
  ),
  appName: import.meta.env.VITE_APP_NAME || "Fleet",
} as const;

/** Same host as the API, with the HTTP scheme swapped to WebSocket. */
export function notifySocketUrl(token: string): string {
  const root = env.apiBaseUrl.replace(/\/api$/i, "");
  const wsRoot = root.replace(/^http/i, "ws");
  return `${wsRoot}/ws?token=${encodeURIComponent(token)}`;
}

/** Build a full API URL from a path, e.g. apiUrl("/auth/login") */
export function apiUrl(path = ""): string {
  if (!path) return env.apiBaseUrl;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${env.apiBaseUrl}${normalized}`;
}
