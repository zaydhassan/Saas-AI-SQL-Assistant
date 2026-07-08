"use client";

export const dynamic = "force-dynamic";

import { Check, Sparkles, Zap, Crown, Building2, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { apiFetch, ApiError } from "@/lib/api";

export default function PricingClient() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);
  const searchParams = useSearchParams();
  const successHandled = useRef(false);

  async function refreshUserWithRetry(retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const data = await apiFetch<{ is_pro: boolean }>(`/me`, {
          skipRefresh: true,
        });
        if (data.is_pro) {
          setIsPro(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Not logged in — stop retrying silently.
          setLoading(false);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    setLoading(false);
  }

  useEffect(() => {
    refreshUserWithRetry();
  }, []);

  useEffect(() => {
    if (
      searchParams.get("success") === "true" &&
      !successHandled.current
    ) {
      successHandled.current = true;
      toast.success("🎉 Subscription activated! Welcome to Pro");
      setLoading(true);
      refreshUserWithRetry();
    }
  }, [searchParams]);

  async function startCheckout() {
    try {
      const data = await apiFetch<{ url: string }>(`/stripe/checkout`, {
        method: "POST",
      });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Please login first");
        window.location.href = "/login";
      } else {
        toast.error("Checkout failed");
      }
    }
  }

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-24">
      <FadeUp className="mx-auto max-w-2xl text-center">
        <span className="eyebrow">
          <Sparkles size={13} /> Pricing
        </span>
        <h1 className="mt-5">Simple, transparent pricing</h1>
        <p className="mt-4 text-[16px]" style={{ color: "var(--muted)" }}>
          Upgrade anytime. Cancel anytime. Start free — no credit card required.
        </p>
      </FadeUp>

      {/* Billing toggle */}
      <FadeUp delay={0.1} className="mt-8 flex items-center justify-center gap-4">
        <span className="text-sm" style={{ color: yearly ? "var(--muted)" : "#fff" }}>
          Monthly
        </span>
        <button
          type="button"
          onClick={() => setYearly((v) => !v)}
          aria-label="Toggle billing period"
          className="relative h-8 w-16 rounded-full transition-colors"
          style={{
            background: yearly ? "var(--gradient-brand)" : "rgba(255,255,255,0.1)",
            boxShadow: "none",
          }}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute top-1 h-6 w-6 rounded-full bg-white"
            style={{ left: yearly ? 34 : 4 }}
          />
        </button>
        <span className="text-sm" style={{ color: yearly ? "#fff" : "var(--muted)" }}>
          Yearly{" "}
          <span className="ml-1 rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: "rgba(34,197,94,0.2)" }}>
            Save 20%
          </span>
        </span>
      </FadeUp>

      {/* Cards */}
      <StaggerContainer className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        <StaggerItem>
          <PlanCard
            icon={<Zap size={18} />}
            title="Free"
            price="₹0"
            period="forever"
            features={["2 datasets", "Basic queries", "Schema detection", "Community support"]}
          />
        </StaggerItem>

        <StaggerItem>
          <PlanCard
            popular
            icon={<Crown size={18} />}
            title="Pro"
            price={yearly ? "₹799" : "₹999"}
            period="/ month"
            features={["Unlimited datasets", "Fast queries", "Charts & KPIs", "AI insights", "Priority support"]}
            loading={loading}
            isPro={isPro}
            onUpgrade={startCheckout}
          />
        </StaggerItem>

        <StaggerItem>
          <PlanCard
            icon={<Building2 size={18} />}
            title="Team"
            price="Custom"
            period="/ year"
            features={["Multi-user", "RBAC", "Shared dashboards", "SSO & audit logs", "Dedicated support"]}
            cta="Contact sales"
            ctaHref="/contact"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* ROI calculator (mock) */}
      <FadeUp delay={0.15} className="mt-20">
        <div className="glass-static mx-auto max-w-4xl rounded-[var(--radius-2xl)] p-8 sm:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="eyebrow">ROI Calculator</span>
              <h3 className="mt-4 text-2xl">See how much time you save</h3>
              <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
                Estimate hours saved per week by replacing manual SQL work with
                natural-language queries.
              </p>
              <div className="mt-6">
                <label className="text-xs" style={{ color: "var(--muted)" }}>
                  Queries per week
                </label>
                <input
                  type="text"
                  defaultValue="40"
                  className="mt-2 max-w-xs"
                />
              </div>
            </div>
            <div
              className="rounded-[var(--radius-xl)] p-8 text-center"
              style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Estimated time saved
              </p>
              <p className="mt-2 text-5xl font-bold text-gradient">~12 hrs</p>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>per week</p>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Feature comparison */}
      <FadeUp delay={0.1} className="mt-24">
        <h2 className="text-center">Compare plans</h2>
        <div className="glass-static mt-8 overflow-hidden rounded-[var(--radius-xl)]">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <th className="p-4 text-left font-medium" style={{ color: "var(--muted)" }}>Feature</th>
                <th className="p-4 text-center font-medium" style={{ color: "var(--muted)" }}>Free</th>
                <th className="p-4 text-center font-medium text-white">Pro</th>
                <th className="p-4 text-center font-medium" style={{ color: "var(--muted)" }}>Team</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Datasets", "2", "Unlimited", "Unlimited"],
                ["Query speed", "Standard", "Fast", "Fastest"],
                ["Charts & KPIs", "—", "✓", "✓"],
                ["AI insights", "—", "✓", "✓"],
                ["Scheduled reports", "—", "—", "✓"],
                ["Team seats", "1", "1", "Custom"],
                ["Support", "Community", "Priority", "Dedicated"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td className="p-4 text-[var(--text-soft)]">{row[0]}</td>
                  <td className="p-4 text-center text-[var(--muted)]">{row[1]}</td>
                  <td className="p-4 text-center text-white">{row[2]}</td>
                  <td className="p-4 text-center text-[var(--muted)]">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FadeUp>

      {/* Enterprise */}
      <FadeUp delay={0.1} className="mt-20">
        <div className="glass-static flex flex-col items-center gap-6 rounded-[var(--radius-2xl)] p-12 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
          >
            <Building2 size={24} />
          </span>
          <h2 className="max-w-xl">Enterprise-grade analytics for your whole org</h2>
          <p className="max-w-lg text-[16px]" style={{ color: "var(--muted)" }}>
            SSO, audit logs, custom data residency, and a dedicated success manager.
            Built for teams that need scale and governance.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-6 py-3 text-sm font-semibold text-white"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
          >
            Talk to sales <ArrowRight size={16} />
          </a>
        </div>
      </FadeUp>

      {/* FAQ */}
      <FadeUp delay={0.1} className="mt-24">
        <h2 className="text-center">Frequently asked questions</h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {[
            ["Can I change plans anytime?", "Yes — upgrade, downgrade, or cancel at any time from your billing settings."],
            ["Is my data used for training?", "No. Your data is never used to train models. Queries run read-only against your dataset."],
            ["What payment methods do you accept?", "All major cards via Stripe. Annual invoicing available on the Team plan."],
            ["Do you offer refunds?", "Yes — a 14-day money-back guarantee on every paid plan."],
          ].map(([q, a], i) => (
            <FaqRow key={i} q={q} a={a} />
          ))}
        </div>
      </FadeUp>
    </main>
  );
}

function PlanCard({
  icon,
  title,
  price,
  period,
  features,
  popular = false,
  loading,
  isPro,
  onUpgrade,
  cta,
  ctaHref,
}: {
  icon: React.ReactNode;
  title: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  loading?: boolean;
  isPro?: boolean;
  onUpgrade?: () => void;
  cta?: string;
  ctaHref?: string;
}) {
  return (
    <div
      className="relative flex h-full flex-col rounded-[var(--radius-2xl)] p-8"
      style={{
        background: popular
          ? "linear-gradient(180deg, rgba(99,102,241,0.16), rgba(139,92,246,0.06))"
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        border: popular ? "1px solid rgba(99,102,241,0.45)" : "1px solid var(--border-soft)",
        boxShadow: popular ? "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(99,102,241,0.2)" : "var(--shadow-card)",
        backdropFilter: "blur(18px)",
      }}
    >
      {popular && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
          style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
        >
          Most Popular
        </span>
      )}

      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
        style={{ background: popular ? "var(--gradient-brand)" : "rgba(255,255,255,0.06)" }}
      >
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-sm" style={{ color: "var(--muted)" }}>{period}</span>
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5" style={{ color: "var(--text-soft)" }}>
            <Check size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {cta && ctaHref ? (
          <a
            href={ctaHref}
            className="block w-full rounded-[var(--radius-sm)] border px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)", boxShadow: "none", background: "transparent" }}
          >
            {cta}
          </a>
        ) : loading ? (
          <button
            disabled
            className="w-full rounded-[var(--radius-sm)] py-3 text-sm text-white opacity-70"
            style={{ background: "rgba(255,255,255,0.1)", boxShadow: "none" }}
          >
            Checking plan…
          </button>
        ) : isPro ? (
          <button
            disabled
            className="w-full rounded-[var(--radius-sm)] py-3 text-sm font-semibold text-white"
            style={{ background: "rgba(34,197,94,0.25)", boxShadow: "none", cursor: "not-allowed" }}
          >
            You&apos;re on Pro ✅
          </button>
        ) : (
          <button
            onClick={onUpgrade}
            className="group flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] py-3 text-sm font-semibold text-white"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
          >
            Upgrade to Pro
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)]"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white"
        style={{ boxShadow: "none", background: "transparent" }}
      >
        {q}
        <span className="text-[var(--muted)]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm" style={{ color: "var(--muted)" }}>
          {a}
        </p>
      )}
    </div>
  );
}