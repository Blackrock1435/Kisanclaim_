import { useMemo, useState } from "react";
import { NdviChart } from "../charts/NdviChart";

// Weekly NDVI pattern from the KisanClaim pitch deck. ILLUSTRATIVE sample data, not a measurement.
const HEALTHY = [0.45, 0.58, 0.7, 0.78, 0.82, 0.84, 0.83, 0.8];
const DAMAGED = [0.45, 0.57, 0.69, 0.77, 0.35, 0.3, 0.31, 0.33];
const COLS = 14, ROWS = 10;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function color(v: number) {
  const stops: [number, [number, number, number]][] = [[0.2, [138, 106, 59]], [0.45, [201, 180, 88]], [0.65, [120, 160, 70]], [0.85, [20, 83, 45]]];
  const x = Math.max(0.2, Math.min(0.85, v));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (x <= b) { const t = (x - a) / (b - a); return `rgb(${ca.map((c, k) => Math.round(lerp(c, cb[k], t))).join(",")})`; }
  }
  return "rgb(20,83,45)";
}
const noise = (x: number, y: number) => (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;

export default function HeroField() {
  const [week, setWeek] = useState(2);
  const w = week - 1;
  const cells = useMemo(() => {
    const out: { x: number; y: number; flooded: boolean; n: number }[] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) out.push({ x, y, flooded: y > 3.2 + Math.sin(x * 0.6) * 1.6, n: noise(x, y) });
    return out;
  }, []);
  const val = (c: { flooded: boolean; n: number }) => (week >= 5 && c.flooded ? DAMAGED[w] : HEALTHY[w]) + c.n * 0.05;
  const avg = cells.reduce((s, c) => s + val(c), 0) / cells.length;
  const series = HEALTHY.map((h, i) => ({ date: `W${i + 1}`, reference: h, ndvi: DAMAGED[i] }));
  const cw = 26, ch = 22;

  return (
    <div className="hero-in rounded-2xl bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold">Satellite view of one field</p>
        <p className="text-sm text-muted">Week {week}{week === 5 ? ", after the flood" : ""}</p>
      </div>
      <svg viewBox={`0 0 ${COLS * cw} ${ROWS * ch}`} className="w-full rounded-lg" role="img" aria-label={`Illustrative field showing vegetation health in week ${week}. Average NDVI ${avg.toFixed(2)}.`}>
        <defs><clipPath id="parcel"><path d={`M14 20 L${COLS * cw * 0.55} 4 L${COLS * cw - 10} 30 L${COLS * cw - 24} ${ROWS * ch - 14} L${COLS * cw * 0.4} ${ROWS * ch - 4} L8 ${ROWS * ch - 30} Z`} /></clipPath></defs>
        <rect width={COLS * cw} height={ROWS * ch} fill="#cdd8c6" />
        <g clipPath="url(#parcel)">{cells.map((c) => <rect key={`${c.x}-${c.y}`} x={c.x * cw} y={c.y * ch} width={cw + 0.5} height={ch + 0.5} fill={color(val(c))} style={{ transition: "fill .35s" }} />)}</g>
        <path d={`M14 20 L${COLS * cw * 0.55} 4 L${COLS * cw - 10} 30 L${COLS * cw - 24} ${ROWS * ch - 14} L${COLS * cw * 0.4} ${ROWS * ch - 4} L8 ${ROWS * ch - 30} Z`} fill="none" stroke="#D6A84F" strokeWidth="2.5" />
      </svg>
      <div className="mt-3">
        <label htmlFor="week" className="label">Drag through the weeks</label>
        <input id="week" type="range" min={1} max={8} value={week} onChange={(e) => setWeek(+e.target.value)} className="w-full accent-forest" />
        <div className="flex justify-between text-xs text-muted"><span>W1</span><span>W4</span><span className="font-semibold text-gold-dark">Event</span><span>W8</span></div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-sage-50 p-3">
        <div className="h-3 flex-1 rounded-full" style={{ background: "linear-gradient(90deg,#8a6a3b,#c9b458,#78a046,#14532d)" }} aria-hidden />
        <p className="whitespace-nowrap text-sm font-semibold">NDVI {avg.toFixed(2)}</p>
      </div>
      <div className="mt-3"><NdviChart series={series} incident="W5" height={170} /></div>
      <p className="mt-1 text-xs text-muted">Illustrative sample data, not a measured result.</p>
    </div>
  );
}
