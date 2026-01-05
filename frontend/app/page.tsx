"use client";

import { Vortex } from "@/components/ui/vortex";
import FaqSection from "@/components/FaqSection";
import AnimatedTestimonials from "@/components/AnimatedTestimonials";

export default function HomePage() {
  return (
    <>
    
      <section className="relative min-h-[90vh] w-screen overflow-hidden px-4 sm:px-6">
        <div className="absolute inset-0 bg-linear-to-br from-[#0f172a] via-[#020617] to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_70%)]" />

        <Vortex
  className="absolute inset-0 max-w-full pointer-events-none"
  backgroundColor="transparent"
  particleCount={
    typeof window !== "undefined" && window.innerWidth < 640 ? 120 : 400
  }
  rangeY={
    typeof window !== "undefined" && window.innerWidth < 640 ? 280 : 500
  }
  baseHue={215}
/>

        <div className="relative z-10 mx-auto w-full max-w-6xl min-h-[75vh] flex flex-col items-center justify-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1 text-xs sm:text-sm text-indigo-300 border border-indigo-400/30">
            ⚡ AI-Powered Analytics
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white">
            AI SQL{" "}
            <span className="bg-linear-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Analytics
            </span>
            <br />
            Assistant
          </h1>

          <p className="mt-5 max-w-xl sm:max-w-2xl text-base sm:text-lg md:text-xl text-slate-300">
            Upload a CSV and ask questions in plain English.
            <br />
            <span className="font-semibold text-white">
              No SQL. No dashboards. Just answers.
            </span>
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs sm:text-sm text-slate-400">
            <span>✔ Schema detected</span>
            <span>✔ Read-only SQL</span>
            <span>✔ Secure processing</span>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a
              href="/"
              className="w-full sm:w-auto rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-xl hover:scale-105 transition"
            >
              Upload Dataset
            </a>

            <a
              href="/playground"
              className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10 transition"
            >
              Try Demo
            </a>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">

        <Divider />

        <section className="text-center">
          <h2 className="section-title">Built for teams who work with data</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            <Card highlight title="Founders">🚀 Get answers without waiting for analysts.</Card>
            <Card title="Product Managers">📊 Track KPIs without dashboards.</Card>
            <Card title="Analysts">🧠 Explore datasets faster with fewer queries.</Card>
            <Card title="Developers">🛠 Debug and validate data instantly.</Card>
          </div>
        </section>

        <Divider />

        <section className="relative">
          <h2 className="section-title text-center">How it works</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <Step num="1" title="Upload CSV" desc="Any structured dataset" />
            <Step num="2" title="AI Understands" desc="Schema & relations" />
            <Step num="3" title="Ask in English" desc="No SQL required" />
            <Step num="4" title="Get Insights" desc="Charts & KPIs" />
          </div>
        </section>

        <Divider />

        <section>
          <h2 className="section-title text-center">
            From complex SQL to clear answers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <BeforeAfterCard
              title="❌ Before AI SQL"
              negative
              items={[
                "Writing long SQL queries",
                "Waiting for analysts",
                "Static dashboards",
                "Manual joins",
              ]}
            />

            <BeforeAfterCard
              title="✅ After AI SQL"
              items={[
                "Ask in plain English",
                "Instant insights",
                "Dynamic exploration",
                "Auto schema understanding",
              ]}
            />
          </div>
        </section>

        <Divider />

        <section className="text-center">
          <h2 className="section-title">What you can ask</h2>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Chip>📈 Sales trends</Chip>
            <Chip>🏆 Top products</Chip>
            <Chip>📊 MoM growth</Chip>
            <Chip>💰 Avg order value</Chip>
          </div>
        </section>

        <Divider />

        <section className="text-center">
          <h2 className="section-title">Common use cases</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            <Card highlight title="Sales Analytics">
              Revenue trends, top customers, growth by region.
            </Card>
            <Card title="E-commerce">
              AOV, retention, product performance, churn analysis.
            </Card>
            <Card title="Internal Tools">
              Debug datasets, validate pipelines, explore staging data.
            </Card>
          </div>
        </section>

        <Divider />

        <section className="text-center">
          <h2 className="section-title">Built with data safety in mind</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <Card>🔒 Read-only SQL</Card>
            <Card>🧠 No data used for training</Card>
            <Card>⚡ Fast & secure queries</Card>
            <Card>💳 Stripe-powered billing</Card>
          </div>
        </section>

        <Divider />

        <section className="text-center">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Start asking questions, not writing SQL
          </h3>
          <p className="text-slate-400 mb-8">
            Upload your data and get insights in minutes.
          </p>

          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-8 py-4 font-semibold text-white shadow-xl hover:scale-105 transition"
          >
            🚀 Get Started Free
          </a>
        </section>

        <Divider />

        <AnimatedTestimonials />
        <Divider />
        <section className="mt-24 mb-32 sm:mb-40">
  <FaqSection />
</section>
      </main>
    </>
  );
}

function Divider() {
  return (
    <div className="my-20 sm:my-28 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
  );
}

function Card({ title, children, highlight = false }: any) {
  return (
    <div
      className={`rounded-xl p-6 ${
        highlight
          ? "bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/40"
          : "bg-slate-900/60 border border-white/10"
      }`}
    >
      {title && <h4 className="font-semibold mb-2 text-white">{title}</h4>}
      <p className="text-slate-300 text-sm sm:text-base">{children}</p>
    </div>
  );
}

function Step({ num, title, desc }: any) {
  return (
    <div className="rounded-xl bg-slate-900/70 border border-white/10 p-6 text-center">
      <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white font-bold">
        {num}
      </div>
      <h4 className="font-semibold text-white">{title}</h4>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  );
}

function Chip({ children }: any) {
  return (
    <div className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-200">
      {children}
    </div>
  );
}

function BeforeAfterCard({ title, items, negative }: any) {
  return (
    <div
      className={`rounded-xl p-6 ${
        negative
          ? "bg-slate-900/60 border border-red-500/30"
          : "bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/40"
      }`}
    >
      <h4 className="font-semibold mb-4 text-white">{title}</h4>
      <ul className="space-y-2 text-slate-300 text-sm">
        {items.map((i: string) => (
          <li key={i}>
            {negative ? "✖" : "✔"} {i}
          </li>
        ))}
      </ul>
    </div>
  );
}