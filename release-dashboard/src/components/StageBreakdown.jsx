import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STAGE_KEYS = [
  { key: "sqa", label: "SQA" },
  { key: "sit", label: "SIT/UAT/HAT" },
  { key: "production", label: "Production" },
];

// Renders the bugs-per-stage chart. Two modes depending on how much detail
// the underlying CSV carries:
//   - Rich schema (DHL CSV): stacked Product / Module / SA-SI bars.
//   - Simple schema (form-entered): single "Bugs" bar per stage using the
//     stage total. Without this fallback, simple-schema releases had an
//     empty chart even with bug counts entered.
export default function StageBreakdown({ stages }) {
  if (!stages) return null;

  const hasCategoryBreakdown = STAGE_KEYS.some(({ key }) => {
    const s = stages[key] || {};
    return (s.product || 0) + (s.module || 0) + (s.saSi || 0) > 0;
  });

  if (hasCategoryBreakdown) {
    const data = STAGE_KEYS.map(({ key, label }) => {
      const s = stages[key] || {};
      return {
        stage: label,
        Product: s.product || 0,
        Module: s.module || 0,
        "SA/SI": s.saSi || 0,
      };
    });
    return (
      <ChartCard title="Bugs by Stage & Category">
        <BarChart data={data}>
          <XAxis dataKey="stage" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Product" stackId="a" fill="#1d4ed8" />
          <Bar dataKey="Module" stackId="a" fill="#ea580c" />
          <Bar dataKey="SA/SI" stackId="a" fill="#16a34a" />
        </BarChart>
      </ChartCard>
    );
  }

  // Fallback: totals-only view.
  const totalsData = STAGE_KEYS.map(({ key, label }) => ({
    stage: label,
    Bugs: (stages[key] || {}).total || 0,
  }));
  const allZero = totalsData.every((d) => d.Bugs === 0);
  if (allZero) return null;

  return (
    <ChartCard title="Bugs by Stage">
      <BarChart data={totalsData}>
        <XAxis dataKey="stage" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Bar dataKey="Bugs" fill="#1d4ed8" />
      </BarChart>
    </ChartCard>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-800 mb-3">{title}</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
