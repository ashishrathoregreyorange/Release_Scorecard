import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAllReleases } from "../api.js";
import UploadCsv from "./UploadCsv.jsx";

// Grid of every release ingested from /data/*.csv. One card per release.
// Clicking a card deep-links to its scorecard.
export default function AllReleases() {
  const nav = useNavigate();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setReleases(await fetchAllReleases());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  if (loading) return <div className="text-slate-500">Loading releases…</div>;
  if (error) return <div className="card text-amber-700">Failed to load: {error}</div>;
  if (!releases.length) {
    return (
      <div className="space-y-4">
        <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">No releases yet</h2>
            <p className="text-sm text-slate-500">
              Generate a scorecard by filling in the form, or upload a CSV.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav("/new")}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              Generate Release Scorecard
            </button>
            <UploadCsv onUploaded={reload} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            All Releases <span className="text-slate-400 font-normal">({releases.length})</span>
          </h2>
          <p className="text-xs text-slate-500">click any card to open its scorecard</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav("/new")}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            Generate Release Scorecard
          </button>
          <UploadCsv onUploaded={reload} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {releases.map((r) => (
          <ReleaseCard key={r.id} release={r} />
        ))}
      </div>
    </div>
  );
}

function ReleaseCard({ release }) {
  const sc = release.scorecard || {};
  const rec = sc.recommendation;
  const recClass =
    rec === "go" ? "pill-go" : rec === "conditional" ? "pill-conditional" : rec === "nogo" ? "pill-nogo" : "pill-neutral";
  return (
    <Link
      to={`/projects/${release.id}`}
      className="card block hover:shadow-md hover:border-slate-300 transition"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500 truncate">
            {release.customerName || release.projectName}
          </div>
          <div className="font-semibold text-slate-900 truncate">
            {release.projectName}{" "}
            <span className="text-slate-400 font-normal">{release.releaseVersion}</span>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="text-2xl font-bold text-slate-900">
            {sc.score == null ? "—" : sc.score}
          </div>
          <span className={recClass}>{rec ? rec.toUpperCase() : "UNKNOWN"}</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 flex flex-wrap gap-x-3">
        {release.releaseDate && <span>📅 {release.releaseDate}</span>}
        {release.owner && <span>👤 {release.owner}</span>}
        {release.totalBugs != null && <span>🐞 {release.totalBugs}</span>}
        {release.automationCoverage != null && <span>🤖 {release.automationCoverage}%</span>}
      </div>
    </Link>
  );
}
