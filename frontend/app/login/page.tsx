"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Mail, Lock } from "lucide-react";
import { ensureCsrf, getCsrfToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Seed the CSRF cookie (double-submit) before the mutating POST so we have
    // a token to echo back. No-op if already seeded.
    await ensureCsrf();

    const form = new FormData();
    form.append("email", email);
    form.append("password", password);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(
        `${API_BASE}/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRF-Token": getCsrfToken() || "" },
          body: form,
        }
      );

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      // Tokens travel in HTTPOnly cookies set by the backend — nothing to store.
      toast.success("Logged in successfully");
      // Tell the root layout to re-check the session so the navbar flips to the
      // logged-in state without a full page reload (the layout persists across
      // client navigations and only re-syncs on this event / on mount).
      window.dispatchEvent(new Event("auth-changed"));
      // Land on the home page (not the dashboard) so the user sees the landing
      // first and can navigate into the app from there.
      router.push("/");
    } catch (err) {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-24">
      {/* glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.25), transparent 60%)",
          filter: "blur(50px)",
        }}
      />

      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        {/* Left: brand panel */}
        <div className="hidden flex-col justify-center lg:flex">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow">
              <Sparkles size={13} /> AI-Powered Analytics
            </span>
            <h1 className="mt-6 max-w-md">
              Talk to your data <span className="text-gradient">like ChatGPT</span>
            </h1>
            <p className="mt-5 max-w-sm text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
              Sign in to your workspace to turn natural language into optimized SQL,
              live charts, and instant business insights.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Schema detected", "Read-only SQL", "Secure processing"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border px-3 py-1.5 text-xs"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "var(--border-soft)",
                    color: "var(--text-soft)",
                  }}
                >
                  ✔ {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: form */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-static rounded-[var(--radius-2xl)] p-8 sm:p-10"
        >
          <div className="mb-7">
            <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
              Sign in to your AI SQL workspace
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <Field icon={<Mail size={15} />} label="Email">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field icon={<Lock size={15} />} label="Password">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && (
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              )}
            </button>

            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              Use your registered email & password
            </p>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-white hover:underline">
              Sign up
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]">
          {icon}
        </span>
        <div className="[&_input]:pl-10">{children}</div>
      </div>
    </label>
  );
}