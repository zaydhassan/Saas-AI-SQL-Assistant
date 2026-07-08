"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import {
  Sparkles,
  ArrowRight,
  Star,
  Github,
  Trophy,
  ShieldCheck,
  Lock,
  Zap,
  Brain,
  Database,
  LineChart,
  Upload,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import FaqSection from "@/components/FaqSection";
import AnimatedTestimonials from "@/components/AnimatedTestimonials";

const chartData = [
  { d: "Mon", v: 120 },
  { d: "Tue", v: 180 },
  { d: "Wed", v: 150 },
  { d: "Thu", v: 240 },
  { d: "Fri", v: 310 },
  { d: "Sat", v: 280 },
  { d: "Sun", v: 380 },
];

export default function HomePage() {
  return (
    <main className="relative">
      {/* ===================== HERO ===================== */}
      <section className="relative mx-auto max-w-6xl px-4 pt-12 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* Left */}
          <div>
            <FadeUp>
              <span className="eyebrow">
                <Sparkles size={13} /> AI-Powered Analytics
              </span>
            </FadeUp>
            <FadeUp delay={0.08}>
              <h1 className="mt-6">
                Talk to your data <br />
                <span className="text-gradient">like ChatGPT</span>
              </h1>
            </FadeUp>
            <FadeUp delay={0.16}>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Upload a CSV and ask questions in plain English. No SQL. No
                dashboards. Just answers — with live charts, KPIs, and business
                insights in seconds.
              </p>
            </FadeUp>

            <FadeUp delay={0.24}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-6 py-3.5 text-sm font-semibold text-white"
                  style={{ background: "var(--gradient-brand)", boxShadow: "0 16px 40px var(--accent-glow)" }}
                >
                  Get started free
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/playground"
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/5"
                  style={{ border: "1px solid var(--border)", boxShadow: "none", background: "rgba(255,255,255,0.03)" }}
                >
                  Try the demo
                </Link>
              </div>
            </FadeUp>

            {/* Social proof */}
            <FadeUp delay={0.32}>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Proof icon={<Star size={14} />} label="4.9/5" sub="Avg rating" />
                <Proof icon={<Github size={14} />} label="2.4k" sub="GitHub stars" />
                <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "rgba(255,181,71,0.12)", border: "1px solid rgba(255,181,71,0.25)" }}>
                  <Trophy size={14} style={{ color: "#ffb547" }} />
                  <span className="text-xs font-medium" style={{ color: "#ffb547" }}>Product Hunt #1</span>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.4}>
              <p className="mt-8 text-xs uppercase tracking-wider" style={{ color: "var(--muted-2)" }}>
                Trusted by data teams at
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm" style={{ color: "var(--muted)" }}>
                {["Acme Co", "Northwind", "Globex", "Initech", "Umbrella"].map((c) => (
                  <span key={c} className="font-display font-semibold opacity-70">{c}</span>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Right: 3D dashboard preview */}
          <FadeUp delay={0.2}>
            <HeroPreview />
          </FadeUp>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="mx-auto max-w-6xl px-4 pt-32">
        <FadeUp className="text-center">
          <span className="eyebrow">Features</span>
          <h2 className="mt-5">Built for teams who work with data</h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px]" style={{ color: "var(--muted)" }}>
            Everything you need to go from raw CSV to decision-ready insight —
            without writing a single line of SQL.
          </p>
        </FadeUp>

        <StaggerContainer className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Hero feature tile */}
          <StaggerItem className="sm:col-span-2 lg:row-span-2">
            <div
              className="surface-3 hairline group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-2xl)] p-7"
              style={{ background: "linear-gradient(160deg, rgba(99,102,241,0.16), rgba(139,92,246,0.05) 60%, rgba(59,130,246,0.08))", borderColor: "rgba(99,102,241,0.3)" }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}>
                <MessageSquare size={20} />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-white">Conversational SQL</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
                Ask questions in plain English. Get transparent SQL, explanations, KPIs, and the right chart — instantly.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2 text-[12.5px] text-white"
                    style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 22px var(--accent-glow)" }}>
                    Top 5 products by revenue?
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-brand)" }}>
                    <Sparkles size={13} />
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md px-3.5 py-2.5"
                    style={{ background: "rgba(5,8,22,0.5)", border: "1px solid var(--border-soft)" }}>
                    <code className="block whitespace-pre-wrap text-[11.5px] text-emerald-300" style={{ fontFamily: "var(--font-mono)" }}>
                      SELECT product, SUM(price) AS revenue{"\n"}GROUP BY product ORDER BY revenue DESC LIMIT 5;
                    </code>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {["NLP", "Transparent SQL", "Read-only"].map((t) => (
                  <span key={t} className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </StaggerItem>

          {[
            { icon: <Upload size={17} />, title: "Auto schema detection", text: "Drop a CSV — types & structure are detected for you." },
            { icon: <LineChart size={17} />, title: "Smart visualizations", text: "Results auto-charted as trends, comparisons & KPIs." },
            { icon: <Brain size={17} />, title: "AI insights", text: "Patterns, anomalies and recommendations surfaced automatically." },
            { icon: <Database size={17} />, title: "Dataset library", text: "Upload, pin and manage all your data in one place." },
          ].map((c) => (
            <StaggerItem key={c.title}>
              <div className="card-saas h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}>
                  {c.icon}
                </span>
                <h3 className="mt-5 text-base">{c.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{c.text}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="mx-auto max-w-6xl px-4 pt-32">
        <FadeUp className="text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-5">From CSV to insight in 4 steps</h2>
        </FadeUp>

        <StaggerContainer className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "1", t: "Upload CSV", d: "Any structured dataset" },
            { n: "2", t: "AI Understands", d: "Schema & relations" },
            { n: "3", t: "Ask in English", d: "No SQL required" },
            { n: "4", t: "Get Insights", d: "Charts & KPIs" },
          ].map((s) => (
            <StaggerItem key={s.n}>
              <div className="how-step h-full">
                <span>{s.n}</span>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ===================== BEFORE / AFTER ===================== */}
      <section className="mx-auto max-w-6xl px-4 pt-32">
        <FadeUp className="text-center">
          <span className="eyebrow">The difference</span>
          <h2 className="mt-5">From complex SQL to clear answers</h2>
        </FadeUp>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <BeforeAfter
            negative
            title="Before AI SQL"
            items={["Writing long SQL queries", "Waiting for analysts", "Static dashboards", "Manual joins"]}
          />
          <BeforeAfter
            title="After AI SQL"
            items={["Ask in plain English", "Instant insights", "Dynamic exploration", "Auto schema understanding"]}
          />
        </div>
      </section>

      {/* ===================== USE CASES ===================== */}
      <section className="mx-auto max-w-6xl px-4 pt-32">
        <FadeUp className="text-center">
          <span className="eyebrow">Use cases</span>
          <h2 className="mt-5">Common use cases</h2>
        </FadeUp>
        <StaggerContainer className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <BarChart3 size={18} />, t: "Sales Analytics", d: "Revenue trends, top customers, growth by region." },
            { icon: <Database size={18} />, t: "E-commerce", d: "AOV, retention, product performance, churn analysis." },
            { icon: <Brain size={18} />, t: "Internal Tools", d: "Debug datasets, validate pipelines, explore staging data." },
          ].map((c) => (
            <StaggerItem key={c.t}>
              <div className="card-saas h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)" }}>
                  {c.icon}
                </span>
                <h3 className="mt-5 text-base">{c.t}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{c.d}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ===================== SAFETY ===================== */}
      <section className="mx-auto max-w-6xl px-4 pt-32">
        <FadeUp className="text-center">
          <span className="eyebrow">Security</span>
          <h2 className="mt-5">Built with data safety in mind</h2>
        </FadeUp>
        <StaggerContainer className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Lock size={18} />, t: "Read-only SQL" },
            { icon: <Brain size={18} />, t: "No training on your data" },
            { icon: <Zap size={18} />, t: "Fast & secure queries" },
            { icon: <ShieldCheck size={18} />, t: "Stripe-powered billing" },
          ].map((c) => (
            <StaggerItem key={c.t}>
              <div className="glass-static flex items-center gap-3 rounded-[var(--radius-lg)] p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}>
                  {c.icon}
                </span>
                <span className="text-sm text-white">{c.t}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="mx-auto max-w-6xl px-4 pt-32">
        <FadeUp>
          <div className="cta-card">
            <h2 className="cta-title text-gradient">Start asking questions, not writing SQL</h2>
            <p className="cta-text">Upload your data and get insights in minutes.</p>
            <Link href="/register" className="cta-button inline-flex items-center gap-2">
              Get started free <ArrowRight size={16} />
            </Link>
          </div>
        </FadeUp>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <AnimatedTestimonials />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 pb-32">
        <FaqSection />
      </section>
    </main>
  );
}

/* ---------------- Hero preview (floating 3D cards + chart) ---------------- */
function HeroPreview() {
  return (
    <motion.div
      className="relative"
      style={{ perspective: 1200 }}
      whileInView="show"
      initial="hidden"
      viewport={{ once: true }}
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 30, rotateY: 8 }, show: { opacity: 1, y: 0, rotateY: 0 } }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
        className="glass-static rounded-[var(--radius-2xl)] p-6"
      >
        {/* window header */}
        <div className="mb-5 flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
          <span className="ml-3 text-xs" style={{ color: "var(--muted)" }}>analytics.ai</span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Revenue", v: "$48.2k", d: "+12%" },
            { l: "Queries", v: "1,284", d: "+8%" },
            { l: "Avg time", v: "0.4s", d: "-3%" },
          ].map((k) => (
            <div key={k.l} className="rounded-[var(--radius-md)] p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)" }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{k.l}</p>
              <p className="mt-1 text-base font-bold text-white">{k.v}</p>
              <p className="text-[10px]" style={{ color: "#34d399" }}>{k.d}</p>
            </div>
          ))}
        </div>

        {/* chart */}
        <div className="mt-4 rounded-[var(--radius-md)] p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}>
          <p className="mb-1 text-xs" style={{ color: "var(--muted)" }}>Query volume</p>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#5f6688" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <RTooltip
                  contentStyle={{
                    background: "rgba(10,14,35,0.95)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} fill="url(#hg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI panel */}
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-md)] p-3" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-brand)" }}>
            <Sparkles size={13} />
          </span>
          <div>
            <p className="text-xs font-medium text-white">Top product by revenue</p>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              <code style={{ fontFamily: "var(--font-mono)", color: "#c4b5fd" }}>SELECT product, SUM(price)…</code>
            </p>
          </div>
        </div>
      </motion.div>

      {/* floating accent cards */}
      <motion.div
        className="absolute -left-6 top-16 hidden sm:block"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="glass-static rounded-2xl px-4 py-3" style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-brand)" }}>
              <MessageSquare size={14} />
            </span>
            <div>
              <p className="text-[11px] font-medium text-white">Ask anything</p>
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>in plain English</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-4 bottom-10 hidden sm:block"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="glass-static rounded-2xl px-4 py-3" style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>Anomaly detected</p>
          <p className="text-xs font-semibold text-white">+38% spike on Fri</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Proof({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "#fbbf24" }}>{icon}</span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>{sub}</p>
      </div>
    </div>
  );
}

function BeforeAfter({ title, items, negative }: { title: string; items: string[]; negative?: boolean }) {
  return (
    <FadeUp>
      <div
        className="rounded-[var(--radius-xl)] p-7"
        style={{
          background: negative
            ? "linear-gradient(180deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))"
            : "linear-gradient(180deg, rgba(99,102,241,0.16), rgba(139,92,246,0.05))",
          border: negative ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(99,102,241,0.4)",
          backdropFilter: "blur(18px)",
        }}
      >
        <h3 className="mb-4 text-base font-semibold text-white">{title}</h3>
        <ul className="space-y-2.5 text-sm">
          {items.map((i) => (
            <li key={i} className="flex items-center gap-2.5" style={{ color: negative ? "#fca5a5" : "var(--text-soft)" }}>
              <span style={{ color: negative ? "#ef4444" : "var(--accent)" }}>{negative ? "✖" : "✔"}</span>
              {i}
            </li>
          ))}
        </ul>
      </div>
    </FadeUp>
  );
}