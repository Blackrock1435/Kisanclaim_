import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function NdviChart({ series, incident, height = 260 }: { series: any[]; incident?: string; height?: number }) {
  if (!series?.length) return null;
  const hasRef = series.some((s) => s.reference != null);
  return (
    <div style={{ height }} role="img" aria-label="NDVI over time">
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#E4ECE0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => (/^W/.test(String(d)) ? String(d) : String(d).slice(5))} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: any) => (v == null ? "n/a" : v)} />
          {hasRef && <Legend />}
          {incident && <ReferenceLine x={incident} stroke="#D6A84F" strokeDasharray="4 4" label={{ value: "Event", fontSize: 11, fill: "#8A6A1F" }} />}
          {hasRef && <Line type="monotone" dataKey="reference" name="Healthy reference (illustrative)" stroke="#8FAE8A" strokeWidth={2} dot={false} />}
          <Line type="monotone" dataKey="ndvi" name="Field NDVI" stroke="#14532D" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
