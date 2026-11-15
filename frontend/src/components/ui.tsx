import { ReactNode, useEffect, useState, forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, WifiOff, Sprout } from "lucide-react";
import { cn, STATUS_META } from "../lib/utils";
import { fetchBlobUrl } from "../lib/api";

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn("h-5 w-5 animate-spin", className)} aria-label="Loading" />;
export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-lg bg-sage-100", className)} />;

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || { label: status, tone: "bg-slate-100 text-slate-700" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", m.tone)}>{m.label}</span>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-sage-200 bg-white/60 px-6 py-12 text-center">
      <Sprout className="mb-3 h-8 w-8 text-forest-mid" aria-hidden />
      <p className="font-display text-lg font-bold">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children, title }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode; title?: string }) {
  const t = { info: ["bg-sky-50 text-sky-900 border-sky-200", Info], warn: ["bg-amber-50 text-amber-900 border-amber-200", AlertTriangle],
    error: ["bg-red-50 text-red-900 border-red-200", AlertTriangle], ok: ["bg-emerald-50 text-emerald-900 border-emerald-200", CheckCircle2] }[tone] as any;
  const Icon = t[1];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-3 text-sm", t[0])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{title && <p className="font-semibold">{title}</p>}<div>{children}</div></div>
    </div>
  );
}

export function FieldWrap({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-sm font-medium text-red-700" role="alert">{error}</p>}
    </div>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((p, r) => <input ref={r} {...p} className={cn("input", p.className)} />);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>((p, r) => <select ref={r} {...p} className={cn("input", p.className)} />);
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>((p, r) => <textarea ref={r} rows={3} {...p} className={cn("input py-2", p.className)} />);

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-soft">
      <p className={cn("font-display text-3xl font-extrabold text-forest", tone)}>{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

export function useOnline() {
  const [on, set] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => set(true), b = () => set(false);
    window.addEventListener("online", a); window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return on;
}
export const OfflineBanner = () => !useOnline() ? (
  <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
    <WifiOff className="h-4 w-4" /> You are offline. Nothing is submitted until the server confirms it.
  </div>) : null;

/** Image behind auth: fetched with the bearer token, shown via blob URL. */
export function AuthImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => { let u: string | undefined; fetchBlobUrl(path).then((x) => { u = x; setSrc(x); }).catch(() => setSrc(undefined)); return () => { if (u) URL.revokeObjectURL(u); }; }, [path]);
  return src ? <img src={src} alt={alt} className={className} loading="lazy" /> : <Skeleton className={cn("h-full w-full", className)} />;
}

let tid = 0;
const listeners = new Set<(t: any) => void>();
export const toast = (text: string, tone: "ok" | "error" = "ok") => { const t = { id: ++tid, tone, text }; listeners.forEach((l) => l(t)); };
export function ToastHost() {
  const [items, set] = useState<any[]>([]);
  useEffect(() => { const l = (t: any) => { set((x) => [...x, t]); setTimeout(() => set((x) => x.filter((y) => y.id !== t.id)), 4000); }; listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => <div key={t.id} className={cn("pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium text-white shadow-soft", t.tone === "error" ? "bg-red-700" : "bg-forest")}>{t.text}</div>)}
    </div>
  );
}
