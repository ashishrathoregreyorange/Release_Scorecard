function Metric({ label, value, suffix, sub }) {
  const display = value == null ? "—" : `${value}${suffix || ""}`;
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{display}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function MetricsGrid({ release }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Metric label="Test Pass Rate" value={release.testPassRate} suffix="%" />
      <Metric label="Automation Coverage" value={release.automationCoverage} suffix="%" />
      <Metric label="Critical Bugs Open" value={release.criticalBugsOpen} />
      <Metric label="Total Bugs" value={release.totalBugs} />
      <Metric label="Escaped Defects" value={release.escapedDefects} />
      <Metric
        label="MTTR"
        value={release.mttr}
        suffix=" hrs"
        sub={release.slaAdherence != null ? `SLA: ${release.slaAdherence}%` : null}
      />
    </div>
  );
}
