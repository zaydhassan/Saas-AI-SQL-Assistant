"use client";

import { useState } from "react";
import Link from "next/link";

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

  return (
    <div className="relative">
    <button
  type="button"
  onClick={() => setOpen(!open)}
  className="
    relative h-9 w-9 rounded-full overflow-hidden
    flex items-center justify-center
    bg-transparent
    shadow-none
    bg-none!
    p-0!
  "
  style={{
    background: "transparent",
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
    <span className="text-white font-semibold">
      {username?.[0]?.toUpperCase() || "U"}
    </span>
  )}
</button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-black/90 border border-white/10 backdrop-blur-xl">
          <Link
            href="/profile"
            className="block px-4 py-2 hover:bg-white/10"
          >
            Edit Profile
          </Link>
          <Link
            href="/reports"
            className="block px-4 py-2 hover:bg-white/10"
          >
            Saved Reports
          </Link>
          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}