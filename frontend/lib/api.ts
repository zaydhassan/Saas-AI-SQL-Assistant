// Thin fetch wrapper — cookie transport + CSRF + refresh-on-401.
//
// Phase 1 hardening:
// - Auth travels in HTTPOnly cookies (set by the backend); no Authorization
//   header, no localStorage token. `credentials: "include"` sends the cookies.
// - Mutating methods (POST/PUT/PATCH/DELETE) attach the X-CSRF-Token header
//   read from the non-HttpOnly `csrf` cookie (double-submit pattern).
// - On a 401 we attempt a single-flight /auth/refresh; if it succeeds we retry
//   the original request once. If refresh fails, the session is dead → /login.
// - AbortController timeout + safe JSON error parsing.

import { getCsrfToken } from "@/lib/auth";

// Empty base → same-origin relative URLs, proxied to the backend by
// next.config.ts rewrites. Set NEXT_PUBLIC_API_URL only for a cross-origin
// backend (requires COOKIE_DOMAIN + SameSite=None;Secure + CORS).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const DEFAULT_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || "API error");
    this.status = status;
    this.detail = detail;
  }
}

// --- single-flight refresh -------------------------------------------------
let refreshInFlight: Promise<boolean> | null = null;

function doRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCsrfToken() || "",
        },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// --- core ------------------------------------------------------------------

function buildHeaders(
  method: string,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra || {}),
  };
  if (method !== "GET" && method !== "HEAD") {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  return headers;
}

export async function apiFetch<T = any>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
    // Skip the automatic refresh-on-401 retry (used by /auth/refresh itself).
    skipRefresh?: boolean;
  },
): Promise<T> {
  const method = options?.method ?? "GET";
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const doFetch = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${API_BASE}${path}`, {
        method,
        credentials: "include",
        headers: buildHeaders(method, options?.headers),
        body: options?.body != null ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await doFetch();

  // Refresh-on-401: a single-flight refresh, then one retry of the original.
  if (res.status === 401 && !options?.skipRefresh) {
    const refreshed = await doRefresh();
    if (refreshed) {
      res = await doFetch();
    }
  }
  if (res.status === 401) {
    // Session is genuinely dead. Throw and let the caller decide (a public
    // page may ignore 401; a protected page may redirect to /login).
    throw new ApiError(401, "Not authenticated");
  }

  if (!res.ok) {
    let detail = "API error";
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }

  return res.status === 204 ? (null as T) : res.json();
}

/** Fetch helper for multipart/form-data uploads (file + fields). Cookies +
 * CSRF handled the same way as apiFetch; the body is a FormData, so we do NOT
 * set Content-Type (the browser sets the multipart boundary). */
export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
  options?: { method?: "POST" | "PUT"; timeoutMs?: number },
): Promise<T> {
  const method = options?.method ?? "POST";
  const timeoutMs = options?.timeoutMs ?? 60000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: { "X-CSRF-Token": getCsrfToken() || "" },
      body: formData,
      signal: controller.signal,
    });
    if (res.status === 401) {
      throw new ApiError(401, "Not authenticated");
    }
    if (!res.ok) {
      let detail = "API error";
      try {
        const err = await res.json();
        detail = err.detail || detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, detail);
    }
    return res.status === 204 ? (null as T) : res.json();
  } finally {
    clearTimeout(timer);
  }
}