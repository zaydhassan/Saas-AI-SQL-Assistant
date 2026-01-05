
"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    // 🔧 Replace later with real API call
    await new Promise((r) => setTimeout(r, 1500));

    setLoading(false);
    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-[#020617] via-[#020617] to-black px-4 sm:px-6">
      
      {/* HERO */}
      <section className="mx-auto max-w-5xl pt-32 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
          Get in Touch
        </h1>
        <p className="mt-4 text-slate-400 max-w-xl mx-auto">
          Have a question, feedback, or need help?  
          We’d love to hear from you.
        </p>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-5xl grid gap-10 lg:grid-cols-2 pb-32">
        
        {/* CONTACT INFO */}
        <div className="space-y-6">
          <InfoCard
            icon={<Mail />}
            title="Email"
            text="zaydthirteen@gmail.com"
          />
          <InfoCard
            icon={<Phone />}
            title="Phone"
            text="+91 9100697101"
          />
          <InfoCard
            icon={<MapPin />}
            title="Office"
            text="123 Innovation Street, Tech City"
          />
        </div>

        {/* FORM */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 sm:p-8">
          {success ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-white">
                ✅ Message sent!
              </h3>
              <p className="mt-2 text-slate-400">
                We’ll get back to you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm text-slate-300">
                  Name
                </label>
                <input
                  required
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell us how we can help..."
                />
              </div>

              <button
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg hover:brightness-110 transition disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Message"}
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

/* ================= HELPERS ================= */

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-white">{text}</p>
      </div>
    </div>
  );
}