"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ensureCsrf, getCsrfToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Seed the CSRF cookie (double-submit) before the mutating POST.
    await ensureCsrf();

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": getCsrfToken() || "",
        },
        body: new URLSearchParams({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      // Registration does NOT establish a session — go to login so the user
      // signs in explicitly.
      toast.success("Account created", { description: "Please log in to continue." });
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.25), transparent 60%)",
          filter: "blur(50px)",
        }}
      />

      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-col justify-center lg:flex"
        >
          <span className="eyebrow">
            <Sparkles size={13} /> Start free
          </span>
          <h1 className="mt-6 max-w-md">
            Analyze data with <span className="text-gradient">natural language</span>
          </h1>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Create your account in seconds. Upload a CSV, ask questions in plain English,
            and get insights — no SQL required.
          </p>
          <ul className="mt-8 space-y-3 text-sm" style={{ color: "var(--text-soft)" }}>
            {["Unlimited questions on every dataset", "Live charts & KPIs from your data", "Secure, read-only SQL execution"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-static rounded-[var(--radius-2xl)] p-8 sm:p-10"
        >
          <div className="mb-7">
            <h2 className="text-2xl font-semibold text-white">Create account</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
              Start analyzing data with AI
            </p>
          </div>

          {error && (
            <div
              className="mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-3 text-sm text-red-300"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <Field icon={<Mail size={15} />} label="Email">
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field icon={<Lock size={15} />} label="Password">
              <input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
            >
              {loading ? "Creating…" : "Sign up"}
              {!loading && (
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-white hover:underline">
              Login
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