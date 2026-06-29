// Bug classification matrix card. Designed to sit next to the Scorecard
// so reviewers can see at a glance — at the same level of prominence as
// the overall score — how the bug load splits across categories.
//
// Hidden when every cell is null / 0 so unfilled releases don't show
// noise. The "Total" tile is rendered prominently; the four breakdown
// cells sit below in a 2x2 grid.

export default function BugClassification({ data }) {
  const safe = data || {};
  const cells = [
    { key: "newRequirements", label: "New Requirements", color: "bg-sky-50 text-sky-900" },
    { key: "duplicates", label: "Duplicates", color: "bg-slate-100 text-slate-800" },
    { key: "leaksFromTesting", label: "Leaks from Testing", color: "bg-amber-50 text-amber-900" },
    { key: "tbd", label: "TBD", color: "bg-slate-50 text-slate-700" },
  ];

  const allEmpty =
    safe.total == null && cells.every((c) => safe[c.key] == null);

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Bug Classification</h3>
        {allEmpty && (
          <span className="text-xs text-slate-400 italic">click Edit to fill</span>
        )}
      </div>

      <div className="rounded-xl bg-slate-900 text-white px-4 py-3 mb-3 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-300">Total Bugs</span>
        <span className="text-3xl font-bold">{safe.total ?? "—"}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {cells.map((c) => (
          <div key={c.key} className={`rounded-lg ${c.color} p-3`}>
            <div className="text-[10px] uppercase tracking-wide opacity-80">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold">{safe[c.key] ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
