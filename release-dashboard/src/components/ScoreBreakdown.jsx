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
    raw: b.raw,
    available: b.value != null,
  }));

  // Custom right-side label: shows "92" for filled rows or "no data" for
  // null rows. Without this, rows that score 0 (or are missing) had a
  // zero-width bar and nothing was visible against the dimension name.
  const renderScoreLabel = (props) => {
    const { x, y, width, height, index } = props;
    const d = data[index];
    if (!d) return null;
    const labelX = (Number(width) > 0 ? Number(x) + Number(width) : Number(x)) + 6;
    const labelY = Number(y) + Number(height) / 2 + 4;
    if (!d.available) {
      return (
        <text x={labelX} y={labelY} fontSize={11} fill="#94a3b8" fontStyle="italic">
          no data
        </text>
      );
    }
    const rawSuffix = d.raw != null ? `  (raw: ${d.raw})` : "";
    return (
      <text x={labelX} y={labelY} fontSize={11} fill="#0f172a">
        {d.score}
        <tspan fill="#94a3b8">{rawSuffix}</tspan>
      </text>
    );
  };

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
          <BarChart layout="vertical" data={data} margin={{ left: 30, right: 110 }}>
            <XAxis type="number" domain={[0, 100]} fontSize={12} />
            <YAxis type="category" dataKey="dimension" width={130} fontSize={12} />
            <Tooltip
              formatter={(v, _n, p) =>
                p.payload.available
                  ? [`${v} / 100${p.payload.raw != null ? ` · raw ${p.payload.raw}` : ""}`, p.payload.dimension]
                  : ["no data", p.payload.dimension]
              }
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} label={renderScoreLabel} isAnimationActive={false}>
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
