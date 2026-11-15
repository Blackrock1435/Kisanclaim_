import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RainChart({ daily, incident, height = 220 }: { daily: any[]; incident?: string; height?: number }) {
  if (!daily?.length) return null;
  return (
    <div style={{ height }} role="img" aria-label="Daily rainfall in millimetres">
      <ResponsiveContainer>
        <BarChart data={daily} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#E4ECE0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => String(d).slice(5)} minTickGap={18} />
          <YAxis tick={{ fontSize: 11 }} unit=" mm" />
          <Tooltip formatter={(v: any) => (v == null ? "missing" : `${v} mm`)} />
          {incident && <ReferenceLine x={incident} stroke="#D6A84F" strokeDasharray="4 4" />}
          <Bar dataKey="precip_mm" name="Rainfall" fill="#2E7D9A" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
