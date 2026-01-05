import Image from "next/image";

export default function FeaturesPage() {
  return (
    <main className="container py-24 space-y-32">
      
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Intelligent Data Exploration <br />
          <span className="text-accent">Without SQL</span>
        </h1>

        <p className="mt-6 text-lg text-muted leading-relaxed">
          Upload your datasets and ask questions in plain English — get insights
          instantly with charts, tables, and explanations.
        </p>
      </section>

      {/* Feature 1 */}
      <section className="grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold">
            Upload & Understand Data Quickly
          </h2>

          <p className="mt-4 text-muted leading-relaxed">
            Simply upload CSV files and the system automatically detects schema,
            data types, and structure — no configuration required.
          </p>

          <ul className="mt-6 space-y-3 text-muted">
            <li>✔ Automatic schema detection</li>
            <li>✔ Fast CSV validation</li>
            <li>✔ Support for large datasets</li>
          </ul>
        </div>

        <div className="flex justify-center">
          <Image
            src="/features/upload.webp"
            alt="Upload and understand data"
            width={460}
            height={360}
            className="feature-image"
            priority
          />
        </div>
      </section>

      {/* Feature 2 */}
      <section className="grid md:grid-cols-2 gap-16 items-center">
        <div className="order-last md:order-first flex justify-center">
          <Image
            src="/features/ai-query.jpg"
            alt="Ask questions in natural language"
            width={460}
            height={360}
            className="feature-image"
          />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-semibold">
            Ask Questions in Natural Language
          </h2>

          <p className="mt-4 text-muted leading-relaxed">
            No SQL knowledge required. Ask questions like
            <span className="italic"> “total sales last quarter” </span>
            and get accurate answers instantly.
          </p>

          <ul className="mt-6 space-y-3 text-muted">
            <li>✔ AI-powered NLP understanding</li>
            <li>✔ Transparent SQL generation</li>
            <li>✔ Read-only execution</li>
          </ul>
        </div>
      </section>

      {/* Feature 3 */}
      <section className="grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold">
            Smart Visual Insights
          </h2>

          <p className="mt-4 text-muted leading-relaxed">
            Results are automatically visualized using the most appropriate
            charts — trends, comparisons, and KPIs at a glance.
          </p>

          <ul className="mt-6 space-y-3 text-muted">
            <li>✔ Auto chart selection</li>
            <li>✔ Insight summaries</li>
            <li>✔ Export-ready results</li>
          </ul>
        </div>

        <div className="flex justify-center">
          <Image
            src="/features/visualization.webp"
            alt="Smart visual insights"
            width={460}
            height={360}
            className="feature-image"
          />
        </div>
      </section>

      {/* Feature 4 */}
      <section className="grid md:grid-cols-2 gap-16 items-center">
        <div className="order-last md:order-first flex justify-center">
          <Image
            src="/features/security.webp"
            alt="Secure analytics"
            width={460}
            height={360}
            className="feature-image"
          />
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-semibold">
            Secure & Safe by Design
          </h2>

          <p className="mt-4 text-muted leading-relaxed">
            Every query is validated, logged, and executed in a secure,
            read-only environment — built for business use.
          </p>

          <ul className="mt-6 space-y-3 text-muted">
            <li>✔ Query safety engine</li>
            <li>✔ Audit logging</li>
            <li>✔ Role-based access ready</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-card">
          <h2 className="cta-title">
            Ready to explore your data?
          </h2>

          <p className="cta-text">
            Upload your first dataset and start asking questions in minutes.
            No SQL. No dashboards. Just answers.
          </p>

          <a href="/app" className="cta-button">
            Get Started
          </a>
        </div>
      </section>
    </main>
  );
}