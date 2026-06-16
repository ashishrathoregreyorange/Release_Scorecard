import { Link } from "react-router-dom";

export default function ProjectHeader({ release, onSync, onExport, syncing }) {
  const rec = release.scorecard?.recommendation;
  const pillClass = `pill-${rec || "neutral"}`;
  return (
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {release.customerName || release.projectName}
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">
          {release.projectName}{" "}
          <span className="text-slate-400 font-normal">{release.releaseVersion}</span>
        </h2>
        <div className="mt-1 text-sm text-slate-600 flex flex-wrap gap-x-4">
          {release.releaseDate && <span>📅 {release.releaseDate}</span>}
          {release.owner && <span>👤 {release.owner}</span>}
          {release.currentBuildVersion && (
            <span className="text-slate-400">from {release.currentBuildVersion}</span>
          )}
          <span className={pillClass}>{rec ? rec.toUpperCase() : "UNKNOWN"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 no-print">
        <Link
          to={`/projects/${release.id}/edit`}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
        >
          Edit
        </Link>
        <button
          onClick={onSync}
          disabled={syncing}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync JIRA"}
        </button>
        <button
          onClick={onExport}
          className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800"
        >
          Export PDF
        </button>
      </div>
    </header>
  );
}
