"use client";

import React, { useState } from "react";
import ChartRenderer from "./ChartRenderer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

type Props = {
  datasetId: string;
};

export default function AskPanel({ datasetId }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(q?: string) {
    const finalQuestion = q ?? question;
    if (!finalQuestion.trim()) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("You are not logged in.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/datasets/${datasetId}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question: finalQuestion }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || "Query failed");
      } else {
        setAnswer(data);
        setQuestion("");
      }
    } catch {
      setError("Backend not reachable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      {/* Ask Bar */}
      <div className="ask-card glass">
        <form
          className="ask-bar"
          onSubmit={e => {
            e.preventDefault();
            handleAsk();
          }}
        >
          <input
            className="input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything about this dataset…"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing…" : "Ask"}
          </button>
        </form>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {answer && (
        <div className="result-stack">
         
          <div className="glass fade-in">
            <strong>Generated SQL</strong>
            <pre className="sql-pre">{answer.sql}</pre>
          </div>

          {answer.explanation && (
            <div className="info-banner glass fade-in">
              <strong>What this query does</strong>
              <p>{answer.explanation}</p>
            </div>
          )}

          {answer.analysis && (
            <div className="glass fade-in">
              <h4 className="mb-3">Quick Insights</h4>
              <div className="kpi-grid">
                {answer.analysis.rows !== undefined && (
                  <div className="kpi">
                    <div className="kpi-label">Rows</div>
                    <div className="kpi-value">
                      {answer.analysis.rows}
                    </div>
                  </div>
                )}
                {answer.analysis.mean !== undefined && (
                  <div className="kpi">
                    <div className="kpi-label">Average</div>
                    <div className="kpi-value">
                      {Math.round(answer.analysis.mean)}
                    </div>
                  </div>
                )}
                {answer.analysis.max !== undefined && (
                  <div className="kpi">
                    <div className="kpi-label">Max</div>
                    <div className="kpi-value">
                      {Math.round(answer.analysis.max)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {answer.rows && answer.rows.length > 0 && (
            <ChartRenderer rows={answer.rows} />
          )}

          <div className="glass fade-in">
            <h4 className="mb-3">Try refining your question</h4>
            <div className="chip-group">
              {[
                "Show last 6 months only",
                "Group by category",
                "Compare month over month",
              ].map(s => (
                <span
                  key={s}
                  className="chip"
                  onClick={() => handleAsk(s)}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}