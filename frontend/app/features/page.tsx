import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Sparkles, Upload, MessageSquare, BarChart3, ShieldCheck,
  Zap, Database, Brain, Lock, FileSearch, LineChart, Download, CheckCircle2,
  XCircle, Layers, Cpu, Eye, History, GitBranch, Wand2, Gauge, Server, Code2,
} from "lucide-react";
import {
  FadeUp, StaggerContainer, StaggerItem, Reveal, AnimatedCounter, HoverCard,
} from "@/components/motion/primitives";

export default function FeaturesPage() {
  return (
    <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-12 sm:pt-20">
      {/* ===================== HERO ===================== */}
      <section className="relative">
        <div className="grid-bg pointer-events-none absolute inset-x-0 -top-10 h-[420px] opacity-70" />
        <div className="relative text-center">
          <FadeUp>
            <span className="eyebrow">
              <span className="dot dot-live" /> Platform · v2.0
            </span>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h1 className="mx-auto mt-6 max-w-3xl">
              Intelligent data exploration{" "}
              <span className="text-gradient">without writing SQL</span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.16}>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed" style={{ color: "var(--muted)" }}>
              Upload your datasets and ask questions in plain English. Get answers
              instantly — with generated SQL, live charts, KPIs, and AI explanations.
            </p>
          </FadeUp>
          <FadeUp delay={0.24}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
                Try the live demo
              </Link>
            </div>
          </FadeUp>

          {/* Stats strip */}
          <FadeUp delay={0.32}>
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { v: 10000, suffix: "+", l: "Queries answered" },
                { v: 99.9, suffix: "%", l: "Uptime", dec: 1 },
                { v: 4.9, suffix: "★", l: "Avg rating", dec: 1 },
                { v: 2400, suffix: "", l: "GitHub stars" },
              ].map((s) => (
                <div key={s.l} className="surface-2 rounded-2xl px-4 py-5">
                  <p className="text-2xl font-bold tracking-tight text-white">
                    <AnimatedCounter value={s.v} suffix={s.suffix} decimals={s.dec || 0} />
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>{s.l}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ===================== BENTO GRID ===================== */}
      <section className="relative mt-32">
        <FadeUp className="mb-10 text-center">
          <span className="eyebrow">Capabilities</span>
          <h2 className="mt-5">Everything you need to go from CSV to decision</h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px]" style={{ color: "var(--muted)" }}>
            One platform for uploading, querying, visualizing, and sharing data — no SQL, no dashboards, no waiting.
          </p>
        </FadeUp>

        <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Large hero tile — natural language */}
          <StaggerItem className="sm:col-span-2 lg:row-span-2">
            <HoverCard className="h-full">
              <div
                className="surface-3 hairline group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-2xl)] p-6"
                style={{ background: "linear-gradient(160deg, rgba(99,102,241,0.16), rgba(139,92,246,0.05) 60%, rgba(59,130,246,0.08))", borderColor: "rgba(99,102,241,0.3)" }}
              >
                <span className="icon-tile h-11 w-11"><MessageSquare size={18} /></span>
                <h3 className="mt-5 text-xl font-semibold text-white">Ask in plain English</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
                  No SQL knowledge required. Ask questions like “total sales last quarter” and get accurate answers, transparent SQL, and explanations instantly.
                </p>

                {/* Mock chat visual */}
                <div className="mt-6 space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2 text-[12.5px] text-white"
                      style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 22px var(--accent-glow)" }}>
                      Top 5 products by revenue this month?
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-brand)" }}>
                      <Sparkles size={13} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md px-3.5 py-2.5"
                      style={{ background: "rgba(5,8,22,0.5)", border: "1px solid var(--border-soft)" }}>
                      <p className="text-[11px]" style={{ color: "var(--muted)" }}>Generated SQL</p>
                      <code className="block whitespace-pre-wrap text-[11.5px] text-emerald-300" style={{ fontFamily: "var(--font-mono)" }}>
                        SELECT product, SUM(price) AS revenue{"\n"}FROM orders WHERE month = '07'{"\n"}GROUP BY product ORDER BY revenue DESC LIMIT 5;
                      </code>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  {["NLP understanding", "Transparent SQL", "Read-only"].map((t) => (
                    <span key={t} className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </HoverCard>
          </StaggerItem>

          {/* Upload tile */}
          <BentoTile
            icon={<Upload size={17} />} title="Upload & understand"
            body="Drop a CSV and schema, types, and structure are detected automatically — zero config."
            tags={["Auto schema", "CSV validation"]}
          />
          {/* Visualization tile */}
          <BentoTile
            icon={<BarChart3 size={17} />} title="Smart visuals"
            body="Results auto-visualized with the right chart — trends, comparisons, KPIs at a glance."
            tags={["Auto charts", "Insight summaries"]}
          />
          {/* Security tile */}
          <BentoTile
            icon={<ShieldCheck size={17} />} title="Secure by design"
            body="Every query is validated and executed in a read-only, audited environment."
            tags={["Read-only", "Audit logs"]}
          />
          {/* Speed tile */}
          <BentoTile
            icon={<Zap size={17} />} title="Fast & live"
            body="Answers in seconds with dynamic exploration — no stale dashboards, no waiting."
            tags={["Live exploration", "Instant"]}
          />
        </StaggerContainer>
      </section>

      {/* ===================== DEEP-DIVE SHOWCASES ===================== */}
      <section className="relative mt-32">
        <FadeUp className="mb-16 text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-5">A closer look at the platform</h2>
        </FadeUp>

        <div className="space-y-28">
          <Showcase
            n="01"
            eyebrow="Ingestion"
            title="Upload & understand data quickly"
            body="Simply upload CSV files and the system automatically detects schema, data types, and structure — no configuration required. Large datasets validate in seconds."
            points={["Automatic schema detection", "Fast CSV validation", "Support for large datasets"]}
            image="/features/upload.webp"
            alt="Upload and understand data"
            caption="Schema detected · 12,480 rows"
          />
          <Showcase
            reverse
            n="02"
            eyebrow="Querying"
            title="Ask questions in natural language"
            body="No SQL knowledge required. Ask questions like “total sales last quarter” and get accurate answers instantly — with the exact SQL shown for full transparency."
            points={["AI-powered NLP understanding", "Transparent SQL generation", "Read-only execution"]}
            image="/features/ai-query.jpg"
            alt="Ask questions in natural language"
            caption="Plain English → SQL"
          />
          <Showcase
            n="03"
            eyebrow="Visualization"
            title="Smart visual insights"
            body="Results are automatically visualized using the most appropriate charts — trends, comparisons, and KPIs at a glance. Export-ready and shareable."
            points={["Auto chart selection", "Insight summaries", "Export-ready results"]}
            image="/features/visualization.webp"
            alt="Smart visual insights"
            caption="Auto-selected chart"
          />
          <Showcase
            reverse
            n="04"
            eyebrow="Trust & safety"
            title="Secure & safe by design"
            body="Every query is validated, logged, and executed in a secure, read-only environment — built for business use and ready for role-based access."
            points={["Query safety engine", "Audit logging", "Role-based access ready"]}
            image="/features/security.webp"
            alt="Secure analytics"
            caption="Validated · read-only"
          />
        </div>
      </section>

      {/* ===================== MICRO CAPABILITIES ===================== */}
      <section className="relative mt-32">
        <FadeUp className="mb-10 text-center">
          <span className="eyebrow">Under the hood</span>
          <h2 className="mt-5">Built for real data work</h2>
        </FadeUp>
        <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { icon: <Database size={16} />, t: "Auto schema detection" },
            { icon: <FileSearch size={16} />, t: "CSV validation" },
            { icon: <Layers size={16} />, t: "Large dataset support" },
            { icon: <Brain size={16} />, t: "NLP understanding" },
            { icon: <Code2 size={16} />, t: "Transparent SQL" },
            { icon: <Lock size={16} />, t: "Read-only execution" },
            { icon: <LineChart size={16} />, t: "Auto chart selection" },
            { icon: <Wand2 size={16} />, t: "Insight summaries" },
            { icon: <Download size={16} />, t: "Export-ready results" },
            { icon: <History size={16} />, t: "Query history" },
            { icon: <GitBranch size={16} />, t: "Audit logging" },
            { icon: <Gauge size={16} />, t: "Fast execution" },
          ].map((c) => (
            <StaggerItem key={c.t}>
              <div className="surface-2 flex items-center gap-3 rounded-xl p-3.5 transition-colors hover:border-[var(--border)]">
                <span className="icon-tile h-8 w-8 shrink-0">{c.icon}</span>
                <span className="text-[13px] font-medium text-white">{c.t}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ===================== COMPARISON ===================== */}
      <section className="relative mt-32">
        <FadeUp className="mb-12 text-center">
          <span className="eyebrow">The difference</span>
          <h2 className="mt-5">Why teams switch to AI SQL</h2>
        </FadeUp>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* VS badge */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <span className="flex h-12 w-12 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 12px 30px var(--accent-glow)", border: "4px solid var(--bg)" }}>
              VS
            </span>
          </div>

          <FadeUp>
            <div className="surface-3 h-full rounded-[var(--radius-xl)] p-7"
              style={{ background: "linear-gradient(180deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))", borderColor: "rgba(239,68,68,0.3)" }}>
              <h3 className="text-base font-semibold text-white">The old way</h3>
              <p className="mt-1 text-[12.5px]" style={{ color: "var(--muted)" }}>Spreadsheets, SQL tickets, and stale dashboards.</p>
              <ul className="mt-5 space-y-3 text-sm">
                {["Write complex SQL by hand", "Wait days for analyst availability", "Static dashboards that go stale", "Manual joins and exports"].map((i) => (
                  <li key={i} className="flex items-center gap-3" style={{ color: "#fca5a5" }}>
                    <XCircle size={16} className="shrink-0" style={{ color: "#ef4444" }} /> {i}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div className="surface-3 hairline h-full rounded-[var(--radius-xl)] p-7"
              style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.16), rgba(139,92,246,0.05))", borderColor: "rgba(99,102,241,0.4)" }}>
              <h3 className="text-base font-semibold text-white">With AI SQL</h3>
              <p className="mt-1 text-[12.5px]" style={{ color: "var(--muted)" }}>Conversational, live, and instant.</p>
              <ul className="mt-5 space-y-3 text-sm">
                {["Ask in plain English", "Answers in seconds", "Dynamic, live exploration", "Auto schema understanding"].map((i) => (
                  <li key={i} className="flex items-center gap-3" style={{ color: "var(--text-soft)" }}>
                    <CheckCircle2 size={16} className="shrink-0" style={{ color: "var(--accent)" }} /> {i}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ===================== STATS BAND ===================== */}
      <section className="relative mt-32">
        <div className="surface-3 hairline relative overflow-hidden rounded-[var(--radius-2xl)] px-6 py-12"
          style={{ background: "linear-gradient(120deg, rgba(99,102,241,0.14), rgba(59,130,246,0.06))" }}>
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              { icon: <Server size={18} />, v: 10000, suffix: "+", l: "Queries answered" },
              { icon: <Cpu size={18} />, v: 99.9, suffix: "%", l: "Uptime SLA", dec: 1 },
              { icon: <Eye size={18} />, v: 4.9, suffix: "★", l: "User rating", dec: 1 },
              { icon: <Zap size={18} />, v: 3, suffix: "x", l: "Faster than SQL" },
            ].map((s) => (
              <Reveal key={s.l} className="flex flex-col items-center">
                <span className="icon-tile mb-3 h-10 w-10">{s.icon}</span>
                <p className="text-3xl font-bold tracking-tight text-white">
                  <AnimatedCounter value={s.v} suffix={s.suffix} decimals={s.dec || 0} />
                </p>
                <p className="mt-1 text-[12.5px]" style={{ color: "var(--muted)" }}>{s.l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="relative mt-32 flex justify-center">
        <FadeUp>
          <div className="cta-card">
            <h2 className="cta-title text-gradient">Ready to explore your data?</h2>
            <p className="cta-text">
              Upload your first dataset and start asking questions in minutes. No SQL.
              No dashboards. Just answers.
            </p>
            <Link href="/playground" className="cta-button inline-flex items-center gap-2">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </FadeUp>
      </section>
    </main>
  );
}

/* ---------------- Bento tile ---------------- */
function BentoTile({
  icon, title, body, tags,
}: {
  icon: React.ReactNode; title: string; body: string; tags: string[];
}) {
  return (
    <StaggerItem className="h-full">
      <HoverCard className="h-full">
        <div className="surface-3 group flex h-full flex-col rounded-[var(--radius-xl)] p-5">
          <span className="icon-tile h-10 w-10">{icon}</span>
          <h3 className="mt-4 text-[15px] font-semibold text-white">{title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>{body}</p>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {tags.map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </HoverCard>
    </StaggerItem>
  );
}

/* ---------------- Deep-dive showcase ---------------- */
function Showcase({
  n, eyebrow, title, body, points, image, alt, caption, reverse,
}: {
  n: string; eyebrow: string; title: string; body: string; points: string[];
  image: string; alt: string; caption: string; reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      {/* Content */}
      <Reveal className={reverse ? "md:order-2" : ""}>
        <div className="flex items-center gap-4">
          <span
            className="font-display text-5xl font-bold leading-none"
            style={{ background: "var(--gradient-text)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            {n}
          </span>
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-white md:text-[30px] md:leading-tight">{title}</h2>
        <p className="mt-4 max-w-md leading-relaxed" style={{ color: "var(--muted)" }}>{body}</p>
        <ul className="mt-6 space-y-3 text-sm">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-3" style={{ color: "var(--text-soft)" }}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.35)" }}>
                <CheckCircle2 size={12} style={{ color: "var(--accent)" }} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </Reveal>

      {/* Image */}
      <Reveal delay={0.1} className={reverse ? "md:order-1" : ""}>
        <div className="relative">
          {/* glow */}
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[var(--radius-2xl)] opacity-60"
            style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(99,102,241,0.25), transparent 70%)" }} />
          <div className="surface-3 hairline relative overflow-hidden rounded-[var(--radius-2xl)] p-2">
            <Image src={image} alt={alt} width={560} height={400} className="w-full rounded-[var(--radius-xl)]" />
            {/* floating caption chip */}
            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(10,14,35,0.85)", border: "1px solid var(--border)", backdropFilter: "blur(12px)" }}>
              <span className="dot dot-live" />
              <span className="text-[12px] font-medium text-white">{caption}</span>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}