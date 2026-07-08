"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, FileText, LogOut, ChevronDown } from "lucide-react";

interface ProfileMenuProps {
  username?: string;
  avatarUrl?: string | null;
  onLogout: () => void;
}

export default function ProfileMenu({
  username,
  avatarUrl,
  onLogout,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-0.5 pl-1 transition-colors"
        style={{ background: "transparent", boxShadow: "none" }}
        aria-label="Account menu"
      >
        <span
          className="relative h-8 w-8 overflow-hidden rounded-full flex items-center justify-center"
          style={{
            background: avatarUrl ? "transparent" : "var(--gradient-brand)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="text-sm font-semibold text-white">
              {username?.[0]?.toUpperCase() || "U"}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          className="hidden text-[var(--muted)] sm:block"
          style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-12 w-60 overflow-hidden rounded-[var(--radius-lg)] p-1.5"
            style={{
              background: "rgba(10,14,35,0.92)",
              border: "1px solid var(--border-soft)",
              backdropFilter: "blur(20px) saturate(150%)",
              WebkitBackdropFilter: "blur(20px) saturate(150%)",
              boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
            }}
          >
            <div className="px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-[var(--muted-2)]">
                Signed in
              </p>
              <p className="truncate text-sm font-medium text-white">
                {username || "Account"}
              </p>
            </div>
            <div className="h-px w-full" style={{ background: "var(--border-soft)" }} />
            <MenuLink href="/profile" icon={<User size={15} />} label="Edit Profile" onClick={() => setOpen(false)} />
            <MenuLink href="/reports" icon={<FileText size={15} />} label="Saved Reports" onClick={() => setOpen(false)} />
            <div className="h-px w-full my-1" style={{ background: "var(--border-soft)" }} />
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
              style={{ boxShadow: "none", background: "transparent" }}
            >
              <LogOut size={15} />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--text-soft)] transition-colors hover:bg-white/5 hover:text-white"
    >
      <span className="text-[var(--muted)]">{icon}</span>
      {label}
    </Link>
  );
}