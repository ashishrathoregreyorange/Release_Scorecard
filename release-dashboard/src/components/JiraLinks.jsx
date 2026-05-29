// Renders the release-level "JIRA IDs" list as clickable badges. The server
// surfaces a deduped list at release.jiraIds = [{id, url}]. We re-link any
// entries that arrived without a URL using the runtime base URL.
export default function JiraLinks({ ids = [], jiraBaseUrl }) {
  if (!ids || !ids.length) return null;
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-slate-800">JIRA Issues</h3>
        <span className="text-xs text-slate-500">{ids.length} linked</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ids.map(({ id, url }) => {
          const href = url || (jiraBaseUrl ? `${jiraBaseUrl}/browse/${id}` : null);
          return href ? (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-mono bg-sky-100 text-sky-800 hover:bg-sky-200"
              title={`Open ${id} in JIRA`}
            >
              {id} ↗
            </a>
          ) : (
            <span
              key={id}
              className="inline-block px-2.5 py-1 rounded-md text-sm font-mono bg-slate-100 text-slate-700"
              title="Set JIRA_BASE_URL in .env to make this clickable"
            >
              {id}
            </span>
          );
        })}
      </div>
    </div>
  );
}
