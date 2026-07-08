"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Menu, X, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProfileMenu from "@/components/navbar/ProfileMenu";
import CommandK from "@/components/ui/command-k";
import NotificationBell from "@/components/ui/notification-bell";
import { cn } from "@/lib/utils";

type NavItem = { name: string; link: string; protected?: boolean };

export default function FloatingNavbar({
  isLoggedIn,
  publicNav,
  dashboardItem,
  profile,
  onLogout,
}: {
  isLoggedIn: boolean;
  publicNav: NavItem[];
  dashboardItem: NavItem[];
  profile: { username?: string; avatarUrl?: string | null };
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const items = isLoggedIn ? dashboardItem : publicNav;

  const guardClick = (e: React.MouseEvent, item: NavItem) => {
    if (!item.protected) return;
    if (!isLoggedIn) {
      e.preventDefault();
      toast.info("Please log in to continue", { description: "Redirecting you to the login page…" });
      setMobileOpen(false);
      router.push("/login");
    }
  };

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 rounded-[var(--radius-xl)] transition-all duration-300",
          scrolled ? "py-2" : "py-2.5"
        )}
        style={{
          background: scrolled
            ? "rgba(10,14,35,0.72)"
            : "rgba(10,14,35,0.45)",
          border: "1px solid var(--border-soft)",
          backdropFilter: "blur(20px) saturate(150%)",
          WebkitBackdropFilter: "blur(20px) saturate(150%)",
          boxShadow: scrolled
            ? "0 18px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 8px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-4 px-4 sm:px-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
            >
              <Sparkles size={16} />
            </span>
            <span className="font-display text-[17px] font-semibold tracking-tight text-white">
              AI&nbsp;SQL
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="ml-2 hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const active = pathname === item.link;
              return (
                <Link
                  key={item.link}
                  href={item.link}
                  onClick={(e) => guardClick(e, item)}
                  className="relative rounded-lg px-3 py-2 text-sm transition-colors"
                  style={{ color: active ? "#fff" : "var(--muted)" }}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "rgba(99,102,241,0.16)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{item.name}</span>
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-px left-3 right-3 h-px"
                      style={{ background: "var(--gradient-brand)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Search trigger */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-white/[0.07] sm:flex"
            style={{ boxShadow: "none", background: "rgba(255,255,255,0.03)" }}
          >
            <Search size={14} />
            <span className="pr-6">Search</span>
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px]">
              ⌘K
            </kbd>
          </button>

          {isLoggedIn && (
            <div className="flex">
              <NotificationBell />
            </div>
          )}

          {!isLoggedIn ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5"
                style={{ boxShadow: "none", background: "transparent" }}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{
                  background: "var(--gradient-brand)",
                  boxShadow: "0 10px 28px var(--accent-glow)",
                }}
              >
                Sign up
              </Link>
            </div>
          ) : (
            <ProfileMenu
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              onLogout={onLogout}
            />
          )}

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white md:hidden"
            style={{ boxShadow: "none", background: "rgba(255,255,255,0.05)" }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 pb-4 pt-2">
                {items.map((item) => (
                  <Link
                    key={item.link}
                    href={item.link}
                    onClick={(e) => {
                      guardClick(e, item);
                      if (!item.protected || isLoggedIn) {
                        setMobileOpen(false);
                      }
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-white/5 hover:text-white"
                  >
                    {item.name}
                  </Link>
                ))}
                {!isLoggedIn && (
                  <div className="mt-2 flex gap-2">
                    <Link
                      href="/login"
                      className="flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium text-white"
                      style={{ boxShadow: "none", background: "rgba(255,255,255,0.05)" }}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <CommandK open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}