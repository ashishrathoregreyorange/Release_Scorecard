import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STAGE_KEYS = [
  { key: "sqa", label: "SQA" },
  { key: "sit", label: "SIT/UAT/HAT" },
  { key: "production", label: "Production" },
];

export default function StageBreakdown({ stages }) {
  if (!stages) return null;
  const data = STAGE_KEYS.map(({ key, label }) => {
    const s = stages[key] || {};
    return {
      stage: label,
      Product: s.product || 0,
      Module: s.module || 0,
      "SA/SI": s.saSi || 0,
    };
  });
  const empty = data.every((d) => d.Product + d.Module + d["SA/SI"] === 0);
  if (empty) return null;

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-800 mb-3">Bugs by Stage &amp; Category</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="stage" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Product" stackId="a" fill="#1d4ed8" />
            <Bar dataKey="Module" stackId="a" fill="#ea580c" />
            <Bar dataKey="SA/SI" stackId="a" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
