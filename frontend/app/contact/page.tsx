"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send, MessageSquare, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/motion/primitives";

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
    <main className="relative mx-auto max-w-5xl px-4 py-24">
      <FadeUp className="mx-auto max-w-2xl text-center">
        <span className="eyebrow">
          <MessageSquare size={13} /> Contact
        </span>
        <h1 className="mt-5">Get in touch</h1>
        <p className="mt-4 text-[16px]" style={{ color: "var(--muted)" }}>
          Have a question, feedback, or need help? We&apos;d love to hear from you.
        </p>
      </FadeUp>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {/* Info */}
        <div className="space-y-4">
          <InfoCard icon={<Mail size={18} />} title="Email" text="zaydthirteen@gmail.com" />
          <InfoCard icon={<Phone size={18} />} title="Phone" text="+91 9100697101" />
          <InfoCard icon={<MapPin size={18} />} title="Office" text="123 Innovation Street, Tech City" />
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-static rounded-[var(--radius-2xl)] p-7 sm:p-9"
        >
          {success ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
                style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
              >
                <CheckCircle2 size={28} />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-white">Message sent!</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                We&apos;ll get back to you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Name">
                <input required placeholder="Your name" />
              </Field>
              <Field label="Email">
                <input type="email" required placeholder="you@company.com" />
              </Field>
              <Field label="Message">
                <textarea required rows={5} placeholder="Tell us how we can help…" />
              </Field>
              <button
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
              >
                {loading ? "Sending…" : "Send Message"}
                <Send size={16} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass flex items-center gap-4 rounded-[var(--radius-lg)] p-5">
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
        style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}
      >
        {icon}
      </span>
      <div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>{title}</p>
        <p className="text-[15px] text-white">{text}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      {children}
    </label>
  );
}