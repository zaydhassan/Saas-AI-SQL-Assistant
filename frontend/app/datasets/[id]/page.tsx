import AskPanel from "../../../components/AskPanel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DatasetPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="container">
   
      <section className="dataset-header glass">
        <div>
          <h1>Dataset #{id}</h1>
          <p className="muted">
            Ask natural language questions and get instant insights
          </p>
        </div>

        <div className="dataset-meta-badges">
          <span className="meta-badge">📊 CSV Loaded</span>
          <span className="meta-badge glow">🤖 AI Ready</span>
        </div>
      </section>

      <section className="ask-section">
        <AskPanel datasetId={id} />
      </section>

      <section className="suggestion-section">
        <h3>Try asking</h3>
        <div className="suggestion-chips">
          <span>Total sales per month</span>
          <span>Top 5 products by revenue</span>
          <span>Sales trend over time</span>
          <span>Average order value</span>
        </div>
      </section>
    </main>
  );
}