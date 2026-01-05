"use client";

import "../app/globals.css";
import { Toaster } from "sonner";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import FooterDemo from "@/components/spectrumui/footer-demo";
import { apiFetch } from "@/lib/api";

import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";

import ProfileMenu from "@/components/navbar/ProfileMenu";

type ProfileState = {
  username?: string;
  avatarUrl?: string | null;
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({});

  const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
  const syncAuthAndProfile = () => {
    const token = localStorage.getItem("access_token");
    const loggedIn = !!token;

    setIsLoggedIn(loggedIn);

    if (loggedIn) {
      loadProfile();
    } else {
      setProfile({});
    }
  };

  syncAuthAndProfile();

  window.addEventListener("profile-updated", syncAuthAndProfile);

  return () => {
    window.removeEventListener("profile-updated", syncAuthAndProfile);
  };
}, [loadProfile]);

  function handleLogout() {
  localStorage.removeItem("access_token");
  setIsLoggedIn(false);
  setProfile({});
  window.location.href = "/login";
}

  const publicNav = [
    { name: "Features", link: "/features" },
    { name: "Playground", link: "/playground" },
    { name: "Pricing", link: "/pricing" },
    { name: "Contact", link: "/contact" },
  ];

  const dashboardItem = [{ name: "Dashboard", link: "/dashboard" }];

  return (
    <html lang="en">
      <body>
        <Navbar className="fixed top-4 z-50">
          <NavBody>
            <Link href="/" className="text-xl font-bold text-white">
              AI SQL
            </Link>

            <NavItems items={isLoggedIn ? dashboardItem : publicNav} />

            <div className="flex items-center gap-4">
              {!isLoggedIn ? (
                <>
                  <NavbarButton variant="secondary" as={Link} href="/login">
                    Login
                  </NavbarButton>
                  <NavbarButton as={Link} href="/register">
                    Sign up
                  </NavbarButton>
                </>
              ) : (
                <ProfileMenu
                  username={profile.username}
                  avatarUrl={profile.avatarUrl}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </NavBody>
        </Navbar>

        <main className="pt-24 min-h-screen">{children}</main>
        <FooterDemo />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}