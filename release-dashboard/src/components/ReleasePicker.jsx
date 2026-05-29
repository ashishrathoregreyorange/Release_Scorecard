import { Link } from "react-router-dom";

// Horizontal list of all releases for the current project. Clicking one
// switches the route. Renders nothing when there's only a single release.
export default function ReleasePicker({ history = [], currentId }) {
  if (!history || history.length < 2) return null;

  const sorted = [...history].sort((a, b) =>
    (b.releaseDate || "").localeCompare(a.releaseDate || ""),
  );

  return (
    <div className="card no-print">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">
          All releases <span className="text-slate-400 font-normal">({history.length})</span>
        </h3>
        <span className="text-xs text-slate-400">click to switch</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((r) => {
          const isActive = r.id === currentId;
          const rec = r.scorecard?.recommendation;
          const dotColor =
            rec === "go" ? "bg-green-500" : rec === "conditional" ? "bg-amber-500" : rec === "nogo" ? "bg-red-500" : "bg-slate-300";
          return (
            <Link
              key={r.id}
              to={`/projects/${r.id}`}
              className={[
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
              title={`${r.releaseVersion}${r.releaseDate ? " · " + r.releaseDate : ""}${r.scorecard?.score != null ? " · score " + r.scorecard.score : ""}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
              <span className="font-medium">{r.releaseVersion}</span>
              {r.releaseDate && (
                <span className={`text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                  {r.releaseDate}
                </span>
              )}
              {r.scorecard?.score != null && (
                <span className={`text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                  {r.scorecard.score}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
