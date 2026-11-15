import { Link } from "react-router-dom";
export function Mark({ size = 32 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden><rect width="64" height="64" rx="14" fill="#14532D" />
    <path d="M32 48V26M32 36c-8 0-12-5-12-12 8 0 12 5 12 12zm0-6c0-8 4-13 12-13 0 8-4 13-12 13z" fill="none" stroke="#D6A84F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
export default function Logo({ light }: { light?: boolean }) {
  return (<Link to="/" className="flex items-center gap-2" aria-label="KisanClaim home"><Mark />
    <span className={`font-display text-xl font-extrabold ${light ? "text-white" : "text-forest"}`}>Kisan<span className="text-gold">Claim</span></span></Link>);
}
