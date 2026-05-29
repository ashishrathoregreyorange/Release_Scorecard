// Default teams shown even when they have no learnings, in this fixed order.
// Any extra teams that appear in the data are appended (alphabetical) so the
// CSV can introduce new teams without a code change.
const DEFAULT_TEAMS = ["Engineering", "QA", "Product", "Solutions"];

export default function TeamLearnings({ learnings = [] }) {
  const present = new Set();
  for (const l of learnings) {
    if (l?.team) present.add(String(l.team).trim());
  }
  const extras = [...present]
    .filter((t) => !DEFAULT_TEAMS.includes(t))
    .sort((a, b) => a.localeCompare(b));
  const teams = [...DEFAULT_TEAMS, ...extras];

  const byTeam = teams.reduce((acc, t) => ({ ...acc, [t]: [] }), {});
  for (const l of learnings) {
    const team = (l.team && String(l.team).trim()) || "Engineering";
    if (!byTeam[team]) byTeam[team] = [];
    byTeam[team].push(l);
  }

  // Grid widens with team count: 4 default = 4 columns; more = wrap.
  const colsClass =
    teams.length > 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-3 ${colsClass}`}>
      {teams.map((team) => (
        <div key={team} className="card">
          <h4 className="font-semibold text-slate-800 mb-2">{team}</h4>
          {byTeam[team].length === 0 ? (
            <p className="text-sm text-slate-400">No learnings logged.</p>
          ) : (
            <ul className="space-y-2">
              {byTeam[team].map((l, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <p>{l.learning}</p>
                  <div className="mt-1 text-xs text-slate-500">
                    {l.owner && <span>👤 {l.owner}</span>}
                    {l.owner && l.dueDate && <span> · </span>}
                    {l.dueDate && <span>📅 {l.dueDate}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
