"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    apiFetch("/api/profile")
      .then((data: any) => {
        setName(data.name || "");
        setAvatar(data.profile_image || null);
      })
      .catch(() => {
        toast.error("Failed to load profile");
      });
  }, []);

  async function saveProfile() {
    try {
      setLoading(true);
      await apiFetch("/api/profile", {
        method: "PUT",
        body: { name },
      });

      localStorage.setItem(
        "profile_updated",
        Date.now().toString()
      );

      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      toast.error("Fill all password fields");
      return;
    }

    try {
      setLoading(true);
      await apiFetch("/api/profile/password", {
        method: "PUT",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });

      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast.error("Password update failed");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("access_token");

  if (!token) {
    toast.error("Not authenticated");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/profile/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, 
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    const data = await res.json();
    setAvatar(data.profile_image);

    localStorage.setItem("profile_updated", Date.now().toString());
    window.dispatchEvent(new Event("profile-updated"));

    toast.success("Avatar updated");
  } catch (err) {
    toast.error("Failed to upload avatar");
  }
}

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-semibold text-white">
        Profile Settings
      </h1>

      <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-6">
        <h3 className="text-white font-medium">Profile</h3>

        <div className="flex items-center gap-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="h-20 w-20 rounded-full overflow-hidden cursor-pointer
            bg-linear-to-br from-indigo-500 to-violet-600
            flex items-center justify-center text-white text-2xl font-semibold"
          >
            {avatar ? (
              <img
                src={`${API_BASE}${avatar}`}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              name?.[0]?.toUpperCase() || "U"
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                uploadAvatar(e.target.files[0]);
              }
            }}
          />

          <p className="text-sm text-neutral-400">
            Click avatar to upload image
          </p>
        </div>

        <input
          type="text"
          placeholder="Username"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-black/30 border border-white/10
          rounded-md px-3 py-2 text-white"
        />

        <button
          disabled={loading}
          onClick={saveProfile}
          className="px-4 py-2 rounded-md bg-purple-600
          hover:bg-purple-700 disabled:opacity-50 text-white"
        >
          Save Profile
        </button>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-4">
        <h3 className="text-white font-medium">Change Password</h3>

        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-black/30 border border-white/10
          rounded-md px-3 py-2 text-white"
        />

        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-black/30 border border-white/10
          rounded-md px-3 py-2 text-white"
        />

        <button
          type="button"
          disabled={loading}
          onClick={changePassword}
          className="px-4 py-2 rounded-md bg-emerald-600
          hover:bg-emerald-700 disabled:opacity-50 text-white"
        >
          Change Password
        </button>
      </div>
    </div>
  );
}