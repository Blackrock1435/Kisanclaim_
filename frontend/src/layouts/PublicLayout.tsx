import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Logo from "../components/Logo";
import { OfflineBanner } from "../components/ui";
import { useAuth } from "../lib/auth";
import LangSwitch from "../components/LangSwitch";

export default function PublicLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const anchor = (id: string) => (loc.pathname === "/" ? `#${id}` : `/#${id}`);
  const links = [["how", t("nav.how")], ["evidence", t("nav.evidence")], ["who", t("nav.who")], ["faq", t("nav.faq")]];
  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <header className="sticky top-0 z-40 border-b border-sage-100 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
            {links.map(([id, l]) => <a key={id} href={anchor(id)} className="text-sm font-medium text-navy/80 hover:text-forest">{l}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <LangSwitch />
            {user ? <Link to="/app" className="btn btn-primary">Open dashboard</Link> : <>
              <Link to="/login" className="btn btn-ghost">{t("nav.login")}</Link>
              <Link to="/register" className="btn btn-primary">{t("nav.register")}</Link></>}
          </div>
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <div className="space-y-1 border-t border-sage-100 bg-canvas px-4 pb-4 md:hidden">
            {links.map(([id, l]) => <a key={id} onClick={() => setOpen(false)} href={anchor(id)} className="block rounded-lg px-2 py-3 font-medium">{l}</a>)}
            <div className="flex flex-col gap-2 pt-2"><LangSwitch />
              {user ? <Link to="/app" className="btn btn-primary">Open dashboard</Link> : <>
                <Link to="/login" className="btn btn-ghost">{t("nav.login")}</Link>
                <Link to="/register" className="btn btn-primary">{t("nav.register")}</Link></>}</div>
          </div>)}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="bg-navy text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          <div className="md:col-span-2"><Logo light /><p className="mt-3 max-w-sm text-sm">Evidence support for crop damage claims. KisanClaim produces preliminary assessments from submitted evidence and open datasets. It does not approve claims or guarantee compensation.</p></div>
          <div><p className="font-display font-bold text-white">Platform</p><ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/login" className="hover:text-white">Farmer login</Link></li><li><Link to="/officer-login" className="hover:text-white">Officer login</Link></li><li><Link to="/register" className="hover:text-white">Register</Link></li></ul></div>
          <div><p className="font-display font-bold text-white">Legal</p><ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-white">Privacy policy</Link></li><li><Link to="/terms" className="hover:text-white">Terms of service</Link></li><li><a href="mailto:hello@kisanclaim.example" className="hover:text-white">Contact</a></li></ul></div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs">Built for Colossus 3.0. KisanClaim is a student prototype and is not affiliated with any government body or insurer.</div>
      </footer>
    </div>
  );
}
