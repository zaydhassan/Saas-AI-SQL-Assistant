"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileUpload } from "@/components/ui/file-upload";

export default function UploadDatasetForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function upload() {
    if (!file) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name.replace(".csv", ""));

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/datasets/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        let errorMessage = "Upload failed";
        try {
          const err = await res.json();
          errorMessage = err.detail || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      toast.success("Dataset uploaded successfully");
      setFile(null);
      window.dispatchEvent(new Event("dataset-updated"));
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

 return (
    <div className="glass upload-card">
      <h3>Upload CSV</h3>
      <p className="muted">
        Upload a CSV file. AI will analyze the schema automatically.
      </p>

      <div className="mt-6">
        <FileUpload
          accept=".csv"
          onChange={(files) => setFile(files?.[0] || null)}
        />
      </div>

      {file && (
        <div className="mt-3 text-sm muted">
          <strong>{file.name}</strong> •{" "}
          {(file.size / 1024).toFixed(1)} KB
        </div>
      )}

      <button
        onClick={upload}
        disabled={!file || loading}
        className="upload-btn mt-4"
      >
        {loading ? "Indexing dataset…" : "Upload Dataset"}
      </button>

      <div className="upload-hint">
        🤖 AI will infer columns, types, and relationships
      </div>
    </div>
  );
}