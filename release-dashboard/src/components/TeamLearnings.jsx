const TEAMS = ["Engineering", "QA", "Product", "Solutions"];

export default function TeamLearnings({ learnings = [] }) {
  const byTeam = TEAMS.reduce((acc, t) => ({ ...acc, [t]: [] }), {});
  for (const l of learnings) {
    const team = TEAMS.includes(l.team) ? l.team : "Engineering";
    byTeam[team].push(l);
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {TEAMS.map((team) => (
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
