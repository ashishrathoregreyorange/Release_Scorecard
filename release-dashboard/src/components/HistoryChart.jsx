import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function HistoryChart({ history = [] }) {
  if (history.length < 2) return null;
  const data = history.map((r) => ({
    release: r.releaseVersion,
    score: r.scorecard?.score ?? null,
  }));
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-800 mb-3">Score Trend</h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="release" fontSize={12} />
            <YAxis domain={[0, 100]} fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
