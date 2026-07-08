"use client";

import "../app/globals.css";
import { Inter, Inter_Tight } from "next/font/google";
import { Toaster } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { logout, ensureCsrf } from "@/lib/auth";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import FloatingNavbar from "@/components/ui/floating-navbar";
import FooterDemo from "@/components/spectrumui/footer-demo";
import AuroraBackground from "@/components/ui/aurora-background";
import MouseGlow from "@/components/ui/mouse-glow";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

type ProfileState = {
  username?: string;
  avatarUrl?: string | null;
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({});
  const pathname = usePathname();

  // Hide chrome (footer) on authentication screens for a focused auth experience.
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const loadProfile = useCallback(async () => {
    const data = await apiFetch("/api/profile");

    setProfile({
      username: data.name,
      avatarUrl: data.profile_image
        ? `${API_BASE}${data.profile_image}`
        : null,
    });
  }, []);

  useEffect(() => {
    // Seed the CSRF cookie once on boot so mutations have a token to echo.
    ensureCsrf();

    // With cookie transport there is no localStorage token to check; the
    // source of truth is whether /api/profile (which requires an auth cookie)
    // resolves. A 401 means no session.
    const syncAuthAndProfile = async () => {
      try {
        await loadProfile();
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
        setProfile({});
      }
    };

    syncAuthAndProfile();

    // Re-sync auth state when login/logout/profile changes happen in another
    // route (the root layout persists across client navigations, so its mount
    // effect does NOT re-run on /login → /command-center, etc.).
    window.addEventListener("profile-updated", syncAuthAndProfile);
    window.addEventListener("auth-changed", syncAuthAndProfile);

    return () => {
      window.removeEventListener("profile-updated", syncAuthAndProfile);
      window.removeEventListener("auth-changed", syncAuthAndProfile);
    };
  }, [loadProfile]);

  async function handleLogout() {
    setIsLoggedIn(false);
    setProfile({});
    await logout(); // server revokes jtis + clears cookies, then redirects to /login
  }

  const publicNav = [
    { name: "Features", link: "/features" },
    { name: "Playground", link: "/playground", protected: true },
    { name: "Pricing", link: "/pricing" },
    { name: "Contact", link: "/contact" },
  ];

  const dashboardItem = [{ name: "Dashboard", link: "/dashboard", protected: true }];

  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable}`}
      // The theme init script (THEME_INIT_SCRIPT below) sets data-theme on
      // <html> before React hydrates, so the server-rendered <html> won't have
      // it. That's intentional — suppress the resulting hydration warning.
      suppressHydrationWarning
    >
      <body
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <script
          // Set the saved theme on <html> before first paint to avoid a flash.
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <AuroraBackground />
        <MouseGlow />

        <FloatingNavbar
          isLoggedIn={isLoggedIn}
          publicNav={publicNav}
          dashboardItem={dashboardItem}
          profile={profile}
          onLogout={handleLogout}
        />

        <main className="relative z-10 min-h-screen pt-28">{children}</main>
        {!isAuthPage && <FooterDemo isLoggedIn={isLoggedIn} />}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}