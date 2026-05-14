const SEVERITY_COLOR = {
  critical: "border-red-400 bg-red-50",
  high: "border-amber-400 bg-amber-50",
  medium: "border-sky-400 bg-sky-50",
  low: "border-slate-300 bg-slate-50",
};

export default function IssueCard({ issue }) {
  const tone = SEVERITY_COLOR[issue.severity] || SEVERITY_COLOR.medium;
  return (
    <div className={`rounded-2xl border-l-4 ${tone} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {issue.stage || issue.team || "Issue"} · {issue.severity}
          </div>
          <h4 className="mt-0.5 font-semibold text-slate-900">{issue.title}</h4>
          {issue.url && (
            <a
              href={issue.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-sky-700 hover:underline"
            >
              {issue.id} ↗
            </a>
          )}
        </div>
        <div className="text-right text-xs text-slate-600 shrink-0">
          {issue.owner && <div>👤 {issue.owner}</div>}
          {issue.dueDate && <div>📅 {issue.dueDate}</div>}
        </div>
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-500">RCA</div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {issue.rca || <span className="text-slate-400">— pending —</span>}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">CAPA</div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {issue.capa || <span className="text-slate-400">— pending —</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
