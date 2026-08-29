/**
 * API & WebSocket endpoint resolution and resilient fetch utilities
 */

/**
 * Returns the base API URL (e.g., "https://my-backend.onrender.com" or "" for same origin)
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  return envUrl;
}

/**
 * Normalizes an API path, prefixing it with VITE_API_URL if configured
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Resolves the WebSocket URL:
 * 1. Uses VITE_WS_URL if defined
 * 2. Or derives from VITE_API_URL if defined
 * 3. Or falls back to current window location protocol/host
 */
export function getWsUrl(): string {
  const customWs = (import.meta.env.VITE_WS_URL || "").trim();
  if (customWs) {
    let url = customWs;
    if (url.startsWith("http://")) url = url.replace("http://", "ws://");
    if (url.startsWith("https://")) url = url.replace("https://", "wss://");
    return url.endsWith("/ws") ? url : `${url.replace(/\/$/, "")}/ws`;
  }

  const customApi = getApiBaseUrl();
  if (customApi) {
    let url = customApi;
    if (url.startsWith("http://")) url = url.replace("http://", "ws://");
    if (url.startsWith("https://")) url = url.replace("https://", "wss://");
    return url.endsWith("/ws") ? url : `${url.replace(/\/$/, "")}/ws`;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  return "ws://localhost:3000/ws";
}

/**
 * Resilient fetch with customizable timeout and automatic retry on failure
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000,
  maxRetries: number = 1
): Promise<Response> {
  const targetUrl = getApiUrl(url);
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        ...options,
        signal: options.signal || controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        // Wait 800ms before retry
        await new Promise((res) => setTimeout(res, 800));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch from ${targetUrl}`);
}
