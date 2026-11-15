import { clsx, type ClassValue } from "clsx";
export const cn = (...i: ClassValue[]) => clsx(i);

export const STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-slate-100 text-slate-700" },
  submitted: { label: "Submitted", tone: "bg-blue-50 text-blue-800" },
  evidence_processing: { label: "Evidence processing", tone: "bg-blue-50 text-blue-800" },
  analysis_pending: { label: "Analysis pending", tone: "bg-amber-50 text-amber-800" },
  analysis_completed: { label: "Analysis completed", tone: "bg-sage-100 text-forest" },
  under_review: { label: "Under officer review", tone: "bg-indigo-50 text-indigo-800" },
  additional_evidence_required: { label: "Additional evidence required", tone: "bg-orange-50 text-orange-800" },
  approved: { label: "Approved", tone: "bg-emerald-100 text-emerald-900" },
  rejected: { label: "Rejected", tone: "bg-red-50 text-red-800" },
  closed: { label: "Closed", tone: "bg-slate-200 text-slate-700" },
};
export const DISASTERS: [string, string][] = [["flood", "Flood"], ["drought", "Drought"], ["heavy_rainfall", "Heavy rainfall"],
  ["cyclone", "Cyclone"], ["hailstorm", "Hailstorm"], ["landslide", "Landslide"], ["other", "Other natural disaster"]];
export const disasterLabel = (k: string) => DISASTERS.find((d) => d[0] === k)?.[1] ?? k;
export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "n/a");
export const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "n/a");
export const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other"];

/** Approximate polygon area (ha) for instant feedback while drawing; the server computes the authoritative geodesic area. */
export function approxAreaHa(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  const lat0 = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [la1, lo1] = pts[i], [la2, lo2] = pts[(i + 1) % pts.length];
    a += lo1 * kx * (la2 * ky) - lo2 * kx * (la1 * ky);
  }
  return Math.abs(a / 2) / 10000;
}
export const toGeoJSON = (pts: [number, number][]) => ({ type: "Polygon", coordinates: [[...pts, pts[0]].map(([la, lo]) => [lo, la])] });
