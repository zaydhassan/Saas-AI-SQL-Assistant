"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  KeyRound,
  CreditCard,
  Users,
  Bell,
  Palette,
  Activity,
  FileText,
  Camera,
} from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import ThemeSwitcher from "@/components/ui/theme-switcher";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "api", label: "API Keys", icon: KeyRound },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "workspace", label: "Workspace", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "invoices", label: "Invoices", icon: FileText },
];

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("profile");
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

      localStorage.setItem("profile_updated", Date.now().toString());

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

    try {
      const data = await apiUpload<{ profile_image: string }>(
        `/api/profile/avatar`,
        formData,
      );
      setAvatar(data.profile_image);

      localStorage.setItem("profile_updated", Date.now().toString());
      window.dispatchEvent(new Event("profile-updated"));

      toast.success("Avatar updated");
    } catch (err) {
      toast.error("Failed to upload avatar");
    }
  }

  return (
    <AppShell title="Settings" description="Manage your account, security, billing, and workspace.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tabs */}
        <aside className="flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex shrink-0 items-center gap-2.5 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-sm transition-colors"
                style={{
                  background: active ? "rgba(99,102,241,0.14)" : "transparent",
                  color: active ? "#fff" : "var(--muted)",
                  boxShadow: "none",
                }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </aside>

        {/* Panel */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-static rounded-[var(--radius-2xl)] p-7 sm:p-9"
        >
          {tab === "profile" && (
            <div className="space-y-6">
              <SectionTitle title="Profile" desc="Update your display name and avatar." />

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative h-20 w-20 overflow-hidden rounded-full"
                  style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
                >
                  {avatar ? (
                    <img src={`${API_BASE}${avatar}`} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                      {name?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera size={20} className="text-white" />
                  </span>
                </button>
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
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Click the avatar to upload a new image.
                </p>
              </div>

              <Field label="Display name">
                <input type="text" placeholder="Username" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>

              <div>
                <button
                  disabled={loading}
                  onClick={saveProfile}
                  className="rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-6">
              <SectionTitle title="Change Password" desc="Use a strong, unique password." />
              <Field label="Current password">
                <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </Field>
              <Field label="New password">
                <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={changePassword}
                  className="rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "rgba(34,197,94,0.25)", border: "1px solid rgba(34,197,94,0.4)", boxShadow: "none" }}
                >
                  Change Password
                </button>
              </div>
            </div>
          )}

          {tab === "api" && (
            <MockSection
              title="API Keys"
              desc="Programmatic access to your datasets (coming soon)."
              rows={[
                { k: "Production", v: "sk-prod-••••••••4f2a", created: "Jun 12, 2025" },
                { k: "Staging", v: "sk-stg-••••••••91c7", created: "May 03, 2025" },
              ]}
            />
          )}

          {tab === "billing" && (
            <MockSection
              title="Billing"
              desc="Manage your subscription and payment method."
              rows={[
                { k: "Plan", v: "Free" },
                { k: "Payment method", v: "— (no card on file)" },
                { k: "Next billing date", v: "—" },
              ]}
            />
          )}

          {tab === "workspace" && (
            <MockSection
              title="Workspace"
              desc="Team members and roles."
              rows={[
                { k: "Owner", v: name || "You" },
                { k: "Members", v: "1" },
                { k: "Seats used", v: "1 / 1" },
              ]}
            />
          )}

          {tab === "notifications" && (
            <div className="space-y-4">
              <SectionTitle title="Notifications" desc="Choose what you hear about." />
              {[
                ["Query failures", "Email me when a query fails"],
                ["Anomaly alerts", "Notify on detected anomalies"],
                ["Weekly digest", "A summary of your activity each week"],
              ].map(([t, d]) => (
                <Toggle key={t} label={t} desc={d} defaultOn />
              ))}
            </div>
          )}

          {tab === "theme" && (
            <div className="space-y-4">
              <SectionTitle title="Theme" desc="Pick a palette — your choice is applied instantly and remembered next visit." />
              <ThemeSwitcher />
            </div>
          )}

          {tab === "usage" && (
            <MockSection
              title="Usage"
              desc="Your consumption this billing cycle."
              rows={[
                { k: "Queries", v: "1,284" },
                { k: "Datasets", v: "3 / 2 (Free limit)" },
                { k: "Avg execution", v: "0.4 ms" },
              ]}
            />
          )}

          {tab === "invoices" && (
            <div className="space-y-4">
              <SectionTitle title="Invoices" desc="Download past invoices." />
              <Empty text="No invoices yet — upgrade to Pro to see them here." />
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{desc}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block max-w-md space-y-1.5">
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      {children}
    </label>
  );
}

function MockSection({
  title,
  desc,
  rows,
}: {
  title: string;
  desc: string;
  rows: { k: string; v: string; created?: string }[];
}) {
  return (
    <div className="space-y-5">
      <SectionTitle title={title} desc={desc} />
      <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between py-3.5" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <div>
              <p className="text-sm text-white">{r.k}</p>
              {r.created && <p className="text-xs" style={{ color: "var(--muted)" }}>Created {r.created}</p>}
            </div>
            <span className="text-sm" style={{ color: "var(--muted)", fontFamily: r.v.startsWith("sk-") ? "var(--font-mono)" : undefined }}>
              {r.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, desc, defaultOn }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}>
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className="relative h-7 w-12 rounded-full transition-colors"
        style={{ background: on ? "var(--gradient-brand)" : "rgba(255,255,255,0.1)", boxShadow: "none" }}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="absolute top-1 h-5 w-5 rounded-full bg-white"
          style={{ left: on ? 26 : 4 }}
        />
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] p-8 text-center text-sm" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)", color: "var(--muted)" }}>
      {text}
    </div>
  );
}