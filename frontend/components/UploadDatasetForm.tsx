"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { apiUpload } from "@/lib/api";

export default function UploadDatasetForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string[][] | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted?.[0];
    if (!f) return;
    setFile(f);
    setSuccess(false);
    setProgress(0);
    // quick CSV preview (first 5 rows)
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).slice(0, 6).map((l) => l.split(","));
      setPreview(lines);
    };
    reader.readAsText(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  // simulate schema-detection animation while loading
  useEffect(() => {
    if (!loading) return;
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 18, 92);
      setProgress(p);
    }, 220);
    return () => clearInterval(interval);
  }, [loading]);

  async function upload() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name.replace(".csv", ""));

    setLoading(true);

    try {
      await apiUpload(`/api/datasets/upload`, formData);

      setProgress(100);
      setTimeout(() => {
        setSuccess(true);
        setFile(null);
        setPreview(null);
      }, 350);

      toast.success("Dataset uploaded successfully");
      window.dispatchEvent(new Event("dataset-updated"));
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-static rounded-[var(--radius-2xl)] p-7">
      <h3 className="text-lg font-semibold text-white">Upload CSV</h3>
      <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>
        Upload a CSV file. AI will analyze the schema automatically.
      </p>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] py-10 text-center"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ background: "rgba(34,197,94,0.25)" }}
            >
              <CheckCircle2 size={28} />
            </motion.span>
            <p className="text-sm font-medium text-white">Dataset indexed & ready</p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="mt-1 text-xs text-[var(--muted)] hover:text-white"
              style={{ boxShadow: "none", background: "transparent" }}
            >
              Upload another
            </button>
          </motion.div>
        ) : (
          <motion.div key="upload" className="mt-5 space-y-4">
            {/* dropzone */}
            <div
              {...getRootProps()}
              className="cursor-pointer rounded-[var(--radius-xl)] p-8 text-center transition-colors"
              style={{
                background: isDragActive ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.025)",
                border: `1.5px dashed ${isDragActive ? "var(--accent)" : "rgba(255,255,255,0.22)"}`,
              }}
            >
              <input {...getInputProps()} />
              <motion.span
                animate={{ y: isDragActive ? -6 : 0 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}
              >
                <UploadCloud size={26} />
              </motion.span>
              <p className="mt-4 text-sm text-white">
                {isDragActive ? "Drop your CSV here" : "Drag & drop your CSV, or click to browse"}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>.csv files only</p>
            </div>

            {/* selected file + preview */}
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div
                    className="flex items-center gap-3 rounded-[var(--radius-md)] p-3.5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)" }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-300" style={{ background: "rgba(34,197,94,0.12)" }}>
                      <FileSpreadsheet size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{file.name}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>

                  {/* progress */}
                  {loading && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-white">
                          <Loader2 size={12} className="animate-spin" /> Inferring schema…
                        </span>
                        <span style={{ color: "var(--muted)" }}>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "var(--gradient-brand)" }}
                          animate={{ width: `${progress}%` }}
                          transition={{ ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CSV preview */}
                  {preview && preview.length > 0 && !loading && (
                    <div className="table-wrap">
                      <table className="simple-table">
                        <thead>
                          <tr>
                            {preview[0]?.map((h, i) => (
                              <th key={i}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.slice(1, 5).map((row, i) => (
                            <tr key={i}>
                              {row.map((c, j) => (
                                <td key={j}>{c}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={upload}
              disabled={!file || loading}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 14px 36px var(--accent-glow)" }}
            >
              <Sparkles size={15} />
              {loading ? "Indexing dataset…" : "Upload Dataset"}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              🤖 AI will infer columns, types, and relationships
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}