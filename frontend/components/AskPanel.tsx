"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Database,
  TrendingUp,
  Hash,
  ArrowUpRight,
  Eraser,
  Check,
} from "lucide-react";
import ChartRenderer from "./ChartRenderer";
import InsightEngine from "./insight-engine";
import { apiFetch, ApiError } from "@/lib/api";

type Props = {
  datasetId: string;
};

const EXAMPLES = [
  { icon: TrendingUp, text: "What's the revenue trend over time?" },
  { icon: Hash, text: "How many records are in each category?" },
  { icon: ArrowUpRight, text: "Show the top 10 entries by value" },
];

const FOLLOW_UPS = ["Show last 6 months only", "Group by category", "Compare month over month"];

export default function AskPanel({ datasetId }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleAsk(q?: string) {
    const finalQuestion = q ?? question;
    if (!finalQuestion.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setFeedback(null);
    setLastQuestion(finalQuestion);

    try {
      const data = await apiFetch(`/api/datasets/${datasetId}/ask`, {
        method: "POST",
        body: { question: finalQuestion },
      });
      setAnswer(data);
      setQuestion("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("You are not logged in.");
      } else {
        setError((err as Error)?.message || "Backend not reachable");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [answer, loading]);

  function copySQL() {
    if (!answer?.sql) return;
    navigator.clipboard.writeText(answer.sql);
    setCopied(true);
    toast.success("SQL copied");
    setTimeout(() => setCopied(false), 1800);
  }

  function clearConversation() {
    setAnswer(null);
    setLastQuestion("");
    setError(null);
    setFeedback(null);
    setQuestion("");
  }

  return (
    <div className="surface-3 hairline flex flex-col rounded-[var(--radius-xl)] p-4 sm:p-5">
      {/* Chat header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
          >
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-white">AI Assistant</h3>
            <p className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--muted)" }}>
              <span className="dot dot-live" /> SQL Agent · ready
            </p>
          </div>
        </div>
        {(answer || lastQuestion) && (
          <button type="button" onClick={clearConversation} className="tool-btn">
            <Eraser size={13} /> Clear
          </button>
        )}
      </div>

      {/* Conversation area */}
      <div ref={scrollRef} className="min-h-[260px] flex-1 space-y-4">
        {/* User question bubble */}
        {lastQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <div
              className="max-w-[80%] rounded-[var(--radius-lg)] rounded-br-md px-4 py-3 text-[13.5px] text-white"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
            >
              {lastQuestion}
            </div>
          </motion.div>
        )}

        {/* Loading / typing */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3"
            >
              <Avatar />
              <div
                className="flex items-center gap-1.5 rounded-[var(--radius-lg)] rounded-tl-md px-5 py-4"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-soft)" }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--accent)" }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <div className="error-banner">{error}</div>}

        {/* Answer */}
        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <Avatar />
            <div className="w-full space-y-4">
              {/* SQL block */}
              <div
                className="overflow-hidden rounded-[var(--radius-lg)]"
                style={{ background: "rgba(5,8,22,0.5)", border: "1px solid var(--border-soft)" }}
              >
                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <span className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--muted)" }}>
                    <Database size={13} /> Generated SQL
                  </span>
                  <div className="flex gap-1.5">
                    <IconBtn onClick={copySQL} title="Copy">
                      {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                    </IconBtn>
                    <IconBtn onClick={() => handleAsk(lastQuestion)} title="Regenerate">
                      <RefreshCw size={14} />
                    </IconBtn>
                  </div>
                </div>
                <pre className="sql-pre !rounded-none !border-0">{answer.sql}</pre>
              </div>

              {/* Explanation */}
              {answer.explanation && (
                <div className="info-banner">
                  <strong>What this query does</strong>
                  <p className="mt-1">{answer.explanation}</p>
                </div>
              )}

              {/* Analysis KPIs */}
              {answer.analysis && (
                <div className="kpi-grid">
                  {answer.analysis.rows !== undefined && (
                    <KPI icon={<Hash size={14} />} label="Rows" value={answer.analysis.rows} />
                  )}
                  {answer.analysis.mean !== undefined && (
                    <KPI icon={<TrendingUp size={14} />} label="Average" value={Math.round(answer.analysis.mean)} />
                  )}
                  {answer.analysis.max !== undefined && (
                    <KPI icon={<ArrowUpRight size={14} />} label="Max" value={Math.round(answer.analysis.max)} />
                  )}
                </div>
              )}

              {/* Chart */}
              {answer.rows && answer.rows.length > 0 && <ChartRenderer rows={answer.rows} />}

              {/* AI Business Insights (Feature 1) */}
              {answer.insights && <InsightEngine insights={answer.insights} />}

              {/* Feedback row */}
              <div className="flex items-center gap-1.5 pt-1">
                <IconBtn onClick={() => setFeedback("up")} title="Good answer" active={feedback === "up"}>
                  <ThumbsUp size={14} />
                </IconBtn>
                <IconBtn onClick={() => setFeedback("down")} title="Needs improvement" active={feedback === "down"}>
                  <ThumbsDown size={14} />
                </IconBtn>
                <span className="mx-1 h-4 w-px" style={{ background: "var(--border-soft)" }} />
                <IconBtn onClick={() => handleAsk(lastQuestion)} title="Regenerate">
                  <RefreshCw size={14} />
                </IconBtn>
              </div>

              {/* Follow-ups */}
              <div>
                <p className="mb-2 text-[12px]" style={{ color: "var(--muted)" }}>Suggested follow-ups</p>
                <div className="suggestion-chips">
                  {FOLLOW_UPS.map((s) => (
                    <span key={s} className="chip" onClick={() => handleAsk(s)}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state with example cards */}
        {!loading && !answer && !lastQuestion && (
          <div className="flex items-start gap-3">
            <Avatar />
            <div className="w-full">
              <div
                className="rounded-[var(--radius-lg)] rounded-tl-md px-5 py-4 text-[13.5px]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}
              >
                Ask anything about this dataset — I&apos;ll write the SQL, run it securely,
                and show you charts and insights instantly.
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {EXAMPLES.map((ex) => {
                  const Icon = ex.icon;
                  return (
                    <button
                      key={ex.text}
                      type="button"
                      onClick={() => handleAsk(ex.text)}
                      className="group flex items-center gap-2.5 rounded-xl p-3 text-left text-[12.5px] transition-colors"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)", color: "var(--text-soft)", boxShadow: "none" }}
                    >
                      <Icon size={15} className="shrink-0 text-[var(--accent)]" />
                      <span className="flex-1">{ex.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ask bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="sticky bottom-4 mt-4"
      >
        <div
          className="flex items-end gap-2 rounded-[var(--radius-lg)] p-2"
          style={{
            background: "rgba(10,14,35,0.8)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Ask anything about this dataset…"
            rows={1}
            className="max-h-32 flex-1 resize-none !border-0 !bg-transparent px-3 py-2.5 text-[13.5px] text-white outline-none placeholder:text-[var(--muted-2)] focus:!shadow-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-white disabled:opacity-50"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px]" style={{ color: "var(--muted-2)" }}>
          <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">⏎</kbd> to send ·{" "}
          <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">⇧ ⏎</kbd> for newline
        </p>
      </form>
    </div>
  );
}

function Avatar() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
      style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
    >
      <Sparkles size={16} />
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{
        background: active ? "rgba(99,102,241,0.2)" : "transparent",
        color: active ? "#fff" : "var(--muted)",
        border: "1px solid var(--border-soft)",
        boxShadow: "none",
      }}
    >
      {children}
    </button>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="kpi">
      <div className="flex items-center gap-1.5">
        <span className="text-[var(--accent)]">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value.toLocaleString()}</div>
    </div>
  );
}