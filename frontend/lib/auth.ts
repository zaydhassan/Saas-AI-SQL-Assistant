// SESSION HANDLING (cookie transport — Phase 1 hardening)
//
// Tokens travel in HTTPOnly cookies set by the backend; the SPA never sees the
// access/refresh tokens (no localStorage). The only auth-related value the SPA
// can read is the non-HttpOnly `csrf` cookie, which it echoes back as the
// X-CSRF-Token header on mutations.
//
// `clearSession()` is an explicit logout (calls /auth/logout so the backend
// revokes the jtis), rather than just clearing localStorage.

/** Read the double-submit CSRF token from the non-HttpOnly csrf cookie. */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/** Best-effort one-time seed of the csrf cookie by hitting the backend endpoint
 * that the CSRF middleware seeds on response. Called on app boot. */
export async function ensureCsrf(): Promise<void> {
  if (typeof document === "undefined") return;
  if (getCsrfToken()) return;
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    await fetch(`${API_BASE}/api/auth/csrf`, { credentials: "include" });
  } catch {
    // Non-fatal: the next authenticated GET will also seed the cookie.
  }
}

/** Explicit logout: server revokes access+refresh jtis and clears cookies. */
export async function logout(): Promise<void> {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    // Best-effort; ignore failures (cookie may already be gone).
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": getCsrfToken() || "" },
    });
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/** Synchronous clear + redirect used when the session is known-dead (e.g. a
 * rejected refresh). Does not contact the server. */
export function clearSessionLocal(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}