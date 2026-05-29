import { useRef, useState } from "react";
import { uploadCsv } from "../api.js";

// Inline CSV upload control. Reads the file as text in the browser, POSTs
// to /api/upload, and reports the post-ingest release count so the user
// knows whether anything was actually added.
export default function UploadCsv({ onUploaded }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus({ kind: "error", text: "File must be a .csv" });
      return;
    }
    setBusy(true);
    setStatus({ kind: "info", text: `Uploading ${file.name}…` });
    try {
      const content = await file.text();
      const result = await uploadCsv(file.name, content);
      setStatus({
        kind: "ok",
        text: `Saved as ${result.savedAs} — ${result.ingestedCount} release(s) in store.`,
      });
      onUploaded?.(result);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setStatus({ kind: "error", text: `Upload failed: ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  const toneClass =
    status?.kind === "error" ? "text-red-700"
    : status?.kind === "ok" ? "text-green-700"
    : "text-slate-500";

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handlePick}
        disabled={busy}
        className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload CSV"}
      </button>
      <a
        href="/api/sample/release-csv"
        className="text-xs text-sky-700 hover:underline"
        title="Download the sample CSV template"
      >
        sample template ↓
      </a>
      {status && (
        <span className={`text-xs ${toneClass}`} title={status.text}>
          {status.text}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
