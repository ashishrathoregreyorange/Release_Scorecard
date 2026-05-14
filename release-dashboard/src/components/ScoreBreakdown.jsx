import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const LABELS = {
  testPassRate: "Test Pass Rate",
  automationCoverage: "Automation Coverage",
  criticalBugsOpen: "Critical Bugs Open",
  escapedDefects: "Escaped Defects",
  slaAdherence: "SLA Adherence",
};

export default function ScoreBreakdown({ scorecard }) {
  if (!scorecard?.breakdown) return null;

  const data = Object.entries(scorecard.breakdown).map(([key, b]) => ({
    dimension: LABELS[key] || key,
    score: b.value == null ? 0 : Math.round(b.value),
    weight: b.weight,
    contribution: b.contribution,
    available: b.value != null,
  }));

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Score Breakdown</h3>
        <span className="text-xs text-slate-500">
          weights renormalized over {scorecard.weightsApplied}% of dimensions
        </span>
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart layout="vertical" data={data} margin={{ left: 30, right: 30 }}>
            <XAxis type="number" domain={[0, 100]} fontSize={12} />
            <YAxis type="category" dataKey="dimension" width={130} fontSize={12} />
            <Tooltip
              formatter={(v, _n, p) =>
                p.payload.available ? [`${v} / 100`, p.payload.dimension] : ["missing", p.payload.dimension]
              }
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={!d.available ? "#cbd5e1" : d.score >= 80 ? "#16a34a" : d.score >= 60 ? "#d97706" : "#dc2626"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
