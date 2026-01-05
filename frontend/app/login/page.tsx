"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveToken } from "@/lib/auth";
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);

  const form = new FormData();
  form.append("email", email);
  form.append("password", password);

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
      {
        method: "POST",
        body: form,
      }
    );

    if (!res.ok) {
      throw new Error("Invalid credentials");
    }

    const data = await res.json();

    saveToken(data.access_token);

    toast.success("Logged in successfully");
    router.push("/");
  } catch (err) {
    toast.error("Login failed");
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] px-4">
      <form
        onSubmit={handleLogin}
        className="glass w-full max-w-sm rounded-2xl border border-white/10 p-8 space-y-5"
      >
    
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold text-white">
            Welcome back
          </h2>
          <p className="text-sm text-muted">
            Sign in to your AI SQL workspace
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2 text-white outline-none focus:border-indigo-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2 text-white outline-none focus:border-indigo-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="signup-btn w-full py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-xs text-muted">
          Use your registered email & password
        </p>
      </form>
    </main>
  );
}