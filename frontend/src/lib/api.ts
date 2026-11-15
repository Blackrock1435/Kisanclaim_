const TOKEN_KEY = "kc_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function message(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => `${(d.loc || []).slice(1).join(".")}: ${String(d.msg || "").replace("Value error, ", "")}`).join("; ");
  return "Something went wrong. Please try again.";
}

export function getBaseApiUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    // When running in development on Vite port 5173/5174 or on localhost, connect directly to port 8000
    const port = window.location.port;
    if (port === "5173" || port === "5174" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `http://${window.location.hostname}:8000/api`;
    }
  }
  return "/api";
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const reqInit = {
    method: opts.method || (opts.body || opts.form ? "POST" : "GET"),
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  };

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getBaseApiUrl();
  const primaryUrl = `${baseUrl}${cleanPath}`;
  const fallbackUrl = primaryUrl.startsWith("http")
    ? `/api${cleanPath}`
    : `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8000/api${cleanPath}`;

  let res: Response;
  try {
    res = await fetch(primaryUrl, reqInit);
    if (res.status >= 500 && fallbackUrl !== primaryUrl) {
      try {
        const alt = await fetch(fallbackUrl, reqInit);
        if (alt.status < 500) {
          res = alt;
        }
      } catch {}
    }
  } catch {
    try {
      res = await fetch(fallbackUrl, reqInit);
    } catch {
      throw new ApiError(0, "Cannot reach the server. Check your internet connection and try again.");
    }
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = message(data.detail);
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export async function fetchBlobUrl(path: string): Promise<string> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getBaseApiUrl();
  const primaryUrl = `${baseUrl}${cleanPath}`;
  const fallbackUrl = primaryUrl.startsWith("http")
    ? `/api${cleanPath}`
    : `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8000/api${cleanPath}`;

  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res: Response;
  try {
    res = await fetch(primaryUrl, { headers });
    if (!res.ok && res.status >= 500 && fallbackUrl !== primaryUrl) {
      try {
        const alt = await fetch(fallbackUrl, { headers });
        if (alt.ok) res = alt;
      } catch {}
    }
  } catch {
    res = await fetch(fallbackUrl, { headers });
  }
  if (!res.ok) throw new ApiError(res.status, "Could not load file");
  return URL.createObjectURL(await res.blob());
}

export async function downloadFile(path: string, name: string) {
  const url = await fetchBlobUrl(path);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
