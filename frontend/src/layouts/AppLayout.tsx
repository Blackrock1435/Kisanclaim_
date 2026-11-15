import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { Bell, ClipboardList, LayoutDashboard, LogOut, Map, Menu, PlusCircle, ScrollText, Users, X, ShieldCheck, Compass, Network, Cpu, Camera, Server, MapPin, Coins, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { OfflineBanner, ToastHost } from "../components/ui";
import ErrorBoundary from "../components/ErrorBoundary";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { cn, fmtDateTime } from "../lib/utils";

function Bells() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api("/notifications"), refetchInterval: 30000 });
  const mark = useMutation({ mutationFn: () => api("/notifications/read-all", { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const unread = q.data?.unread || 0;
  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open && unread) mark.mutate(); }} className="relative rounded-lg p-2 hover:bg-sage-100" aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 max-w-[90vw] overflow-auto rounded-xl border border-sage-200 bg-white shadow-soft">
          <p className="border-b border-sage-100 px-4 py-3 font-display font-bold">Notifications</p>
          {!q.data?.items.length ? <p className="p-4 text-sm text-muted">Nothing yet. Updates on your claims will appear here.</p> :
            q.data.items.map((n: any) => (
              <button key={n.id} onClick={() => { setOpen(false); n.claim_id && nav(`/app/claims/${n.claim_id}`); }} className="block w-full border-b border-sage-100 px-4 py-3 text-left hover:bg-sage-50">
                <p className="text-sm font-semibold">{n.title}</p>{n.body && <p className="text-sm text-muted">{n.body}</p>}<p className="mt-1 text-xs text-muted">{fmtDateTime(n.at)}</p></button>))}
        </div>)}
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const items = [
    { to: "/app", end: true, icon: LayoutDashboard, label: t("app.dashboard"), roles: ["farmer", "officer", "admin"] },
    { to: "/app/disaster-map", icon: MapPin, label: "Disaster Map", roles: ["farmer", "officer", "admin"] },
    { to: "/app/insurance", icon: ShieldCheck, label: "Insurance Portal", roles: ["officer", "admin"] },
    { to: "/app/insurance-assessment", icon: Coins, label: "Assessment & Payout", roles: ["officer", "admin"] },
    { to: "/app/admin/insurance-approval", icon: UserCheck, label: "Claim Sanctioning", roles: ["admin"] },
    { to: "/app/agent-analysis", icon: Cpu, label: "AI Verification Agents", roles: ["officer", "admin"] },
    { to: "/app/evidence-graph", icon: Network, label: "Evidence Graph", roles: ["farmer", "officer", "admin"] },
    { to: "/app/digipin", icon: Compass, label: "DIGIPIN Explorer", roles: ["farmer", "officer", "admin"] },
    { to: "/app/fields", icon: Map, label: t("app.fields"), roles: ["farmer"] },
    { to: "/app/claims", icon: ClipboardList, label: t("app.claims"), roles: ["farmer", "officer", "admin"] },
    { to: "/app/claims/new", icon: PlusCircle, label: t("app.newClaim"), roles: ["farmer"] },
    { to: "/app/admin/users", icon: Users, label: t("app.users"), roles: ["admin"] },
    { to: "/app/admin/integrations", icon: Server, label: "Integrations", roles: ["admin"] },
    { to: "/app/admin/audit", icon: ScrollText, label: t("app.audit"), roles: ["admin"] },
  ].filter((i) => i.roles.includes(user!.role));
  const links = (
    <nav className="space-y-1" aria-label="App">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} onClick={() => setOpen(false)}
          className={({ isActive }) => cn("flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[15px] font-medium", isActive ? "bg-forest text-white" : "text-navy hover:bg-sage-100")}>
          <i.icon className="h-5 w-5" aria-hidden />{i.label}</NavLink>))}
    </nav>
  );
  return (
    <div className="min-h-screen">
      <OfflineBanner />
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-sage-100 bg-white px-4">
        <div className="flex items-center gap-2"><button className="rounded-lg p-2 lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><Logo /></div>
        <div className="flex items-center gap-1 sm:gap-3">
          <span className="hidden rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold capitalize text-forest sm:inline">{user!.role}</span>
          <div className="hidden sm:block"><LangSwitch /></div>
          <Bells />
          <button onClick={() => { logout(); nav("/"); }} className="rounded-lg p-2 hover:bg-sage-100" aria-label="Log out"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 p-4 lg:block">{links}<div className="mt-6 border-t border-sage-100 pt-4 text-sm"><p className="font-semibold">{user!.name}</p><p className="break-all text-muted">{user!.email}</p></div></aside>
        {open && <div className="fixed inset-x-0 top-16 z-30 border-b border-sage-100 bg-white p-4 shadow-soft lg:hidden">{links}<div className="mt-3 sm:hidden"><LangSwitch /></div></div>}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ToastHost />
    </div>
  );
}
