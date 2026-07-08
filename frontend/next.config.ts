import type { NextConfig } from "next";

// Backend the dev server proxies to. Same-origin (relative) fetches from the
// browser are forwarded here so auth cookies (incl. the non-HttpOnly csrf
// cookie the SPA must read via document.cookie) stay scoped to the frontend
// origin. Cross-origin cookies set by the backend are unreadable by the SPA
// (and SameSite=Lax wouldn't even be sent cross-site), which broke the CSRF
// double-submit → 403 on /auth/register. The proxy makes everything same-origin.
//
// In production, put a reverse proxy (or host FE/BE same-origin) and leave
// NEXT_PUBLIC_API_URL empty so calls stay relative.
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const PROXIED_PREFIXES = [
  "/auth/:path*",
  "/api/:path*",
  "/me",
  "/webhook/:path*",
  "/ws/:path*",
  "/health",
  "/stripe/:path*",
  "/uploads/:path*",
];

const nextConfig: NextConfig = {
  async rewrites() {
    return PROXIED_PREFIXES.map((source) => ({
      source,
      destination: `${BACKEND}${source}`,
    }));
  },
};

export default nextConfig;