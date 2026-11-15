import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, CheckCircle2, CloudRain, FileText, Globe2, Handshake, Languages, Map, MapPinned, Satellite, Scale, ShieldAlert, Smartphone, Sprout, TimerReset, Users, XCircle } from "lucide-react";
import HeroField from "../components/HeroField";

const journey = [
  ["Open KisanClaim in your language", "Works in a phone browser. Choose English, Hindi or Kannada."],
  ["Mark your field", "Drop a pin or draw the boundary on a satellite map."],
  ["Add your evidence", "Upload geotagged photos and pick the date of the event."],
  ["See the result", "A map, a crop-health chart and a preliminary vegetation-change indicator."],
  ["Download and share", "Take the PDF report to your insurer or agriculture officer."],
];
const faqs = [
  ["Does KisanClaim approve my claim?", "No. KisanClaim prepares evidence and a preliminary assessment. Your insurer or an authorised officer makes the decision, and may still inspect your field."],
  ["What is NDVI?", "NDVI is a satellite vegetation health score. Healthy green crops reflect a lot of near-infrared light, so they score higher. A sharp fall after an event, compared with before, is one useful piece of evidence."],
  ["Does a drop in NDVI prove my crop was damaged?", "Not on its own. NDVI also changes with crop growth, harvest, irrigation and cloud. That is why the report shows it next to rainfall and your photos, lists data quality warnings, and always needs a person to review it."],
  ["What if my photos have no GPS location?", "That is common and it is not treated as a sign of fraud. The report simply notes that location data was not available."],
  ["What is a DIGIPIN?", "A 10-character location code from India Post. KisanClaim shows it next to your field's coordinates. It is a location reference only, not proof of ownership."],
  ["What does it cost?", "KisanClaim is a student prototype built on free, open satellite and weather data."],
  ["Is my data safe?", "You consent before submitting. Photos are stored privately, and only you, your assigned officer and administrators can open them. See the privacy policy."],
];

export default function Landing() {
  const { t } = useTranslation();
  return (
    <>
      <div className="relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('/images/tractor-bg.png')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-cream-bg/95 via-cream-bg/85 to-cream-bg/75 backdrop-blur-[2px]"></div>
        <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:pt-16">
          <div className="hero-in rounded-3xl bg-white/75 p-6 md:p-8 backdrop-blur-md shadow-soft border border-white/80">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-sage-100/90 px-3 py-1 text-sm font-semibold text-forest"><Satellite className="h-4 w-4" /> Satellite-backed crop damage evidence</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] text-forest-deep sm:text-5xl lg:text-6xl">{t("hero.title")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy/85">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="btn btn-primary !min-h-[52px] !px-7 text-base shadow-md">{t("hero.cta")}</Link>
              <a href="#how" className="btn btn-ghost !min-h-[52px] !px-7 text-base bg-white/80 hover:bg-white">{t("hero.cta2")}</a>
            </div>
            <p className="mt-5 max-w-md text-sm text-muted">KisanClaim produces a preliminary assessment from your evidence. It is not an insurance approval.</p>
          </div>
          <div className="rounded-3xl bg-white/80 p-2 md:p-3 backdrop-blur-md shadow-soft border border-white/80">
            <HeroField />
          </div>
        </section>
      </div>

      <section className="bg-forest-deep text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">A farmer can lose a crop in one night, then wait months to prove it.</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl bg-white/15 sm:grid-cols-3">
            {[[TimerReset, "Delayed", "Months of waiting for payouts."], [Scale, "Disputed", "No objective evidence to settle it."], [XCircle, "Rejected", "Proof is missing or filed late."]].map(([Icon, h, p]: any) => (
              <div key={h} className="bg-forest-deep p-6"><Icon className="h-6 w-6 text-gold" aria-hidden /><p className="mt-3 font-display text-xl font-bold">{h}</p><p className="mt-1 text-sm text-white/75">{p}</p></div>))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold text-forest-deep sm:text-4xl">Five steps from a flooded field to a claim-ready report</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-5">
          {journey.map(([h, p], i) => (
            <li key={h} className="relative rounded-xl border border-sage-200 bg-white p-5">
              <span className="font-display text-3xl font-extrabold text-gold">{i + 1}</span>
              <p className="mt-2 font-display font-bold leading-snug">{h}</p><p className="mt-2 text-sm text-muted">{p}</p>
            </li>))}
        </ol>
        <div className="mt-10 grid gap-6 rounded-2xl bg-sage-100 p-6 md:grid-cols-[1fr_2fr] md:p-8">
          <div><h3 className="text-xl font-bold">Behind the scenes</h3><p className="mt-2 text-sm text-navy/75">The same pipeline runs for every claim, and each step is recorded so an officer can trace it.</p></div>
          <ol className="grid gap-3 text-sm sm:grid-cols-2">
            {["Field location and photos are stored with a file fingerprint", "Sentinel-2 imagery and rainfall records are fetched", "Cloud and shadow pixels are masked, then NDVI before and after is compared", "Rules check rainfall and photo evidence against the claim", "A preliminary indicator is produced with data-quality warnings", "A PDF report with a QR code and integrity hash is generated"].map((s, i) => (
              <li key={s} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">{i + 1}</span>{s}</li>))}
          </ol>
        </div>
      </section>

      <section id="evidence" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="max-w-3xl text-3xl font-bold text-forest-deep sm:text-4xl">Three kinds of evidence in one report, built only from open data</h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {[[Satellite, "Satellite vegetation", "Sentinel-2 imagery is compared before and after the event using NDVI, the standard crop-health index. Clouds and shadows are masked and the share of usable pixels is reported."],
              [CloudRain, "Rainfall and weather", "Daily rainfall and temperatures for your field's location from the Open-Meteo archive, lined up with the date of the event."],
              [MapPinned, "Geotagged photographs", "Your original photos are kept untouched. Their capture time and GPS position are read when present, and each file gets a SHA-256 fingerprint."]].map(([Icon, h, p]: any) => (
              <div key={h}><Icon className="h-7 w-7 text-forest-mid" aria-hidden /><h3 className="mt-3 text-xl font-bold">{h}</h3><p className="mt-2 text-navy/75">{p}</p></div>))}
          </div>
          <div className="mt-12 grid gap-6 rounded-2xl border border-gold/60 bg-gold/10 p-6 md:grid-cols-2 md:p-8">
            <div><h3 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert className="h-5 w-5 text-gold-dark" /> What KisanClaim does not claim</h3>
              <ul className="mt-3 space-y-2 text-sm text-navy/85">
                <li>A fall in NDVI is not proof of damage. Growth stage, harvest and cloud also change it.</li>
                <li>Satellite data cannot show the cause of damage or its cost.</li>
                <li>We never produce a crop-loss percentage or approve a claim automatically.</li>
                <li>Missing rainfall data is shown as missing, never as zero.</li>
              </ul></div>
            <div><h3 className="flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="h-5 w-5 text-forest-mid" /> What the report does give you</h3>
              <ul className="mt-3 space-y-2 text-sm text-navy/85">
                <li>A plain-language vegetation-change indicator with the rules behind it.</li>
                <li>A consistency check between your claim, rainfall and photos that flags what needs a person to verify, without accusing anyone.</li>
                <li>Every data source, date and limitation, printed in the report.</li>
              </ul></div>
          </div>
        </div>
      </section>

      <section id="who" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold text-forest-deep sm:text-4xl">One report, three audiences</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[[Sprout, "Farmers", "Evidence they can carry to the insurer, in their own language, on any phone."],
            [Handshake, "Insurers", "Faster, cheaper verification from a consistent, traceable evidence pack."],
            [Users, "Agriculture officers", "A data-backed shortlist of fields to visit, with every action logged."]].map(([Icon, h, p]: any, i) => (
            <div key={h} className={`rounded-xl p-6 ${i === 0 ? "bg-forest text-white" : "bg-white shadow-soft"}`}><Icon className={`h-6 w-6 ${i === 0 ? "text-gold" : "text-forest-mid"}`} aria-hidden /><p className="mt-3 font-display text-xl font-bold">{h}</p><p className={`mt-1 text-sm ${i === 0 ? "text-white/80" : "text-muted"}`}>{p}</p></div>))}
        </div>
        <div className="mt-10 overflow-x-auto rounded-xl bg-white shadow-soft">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Existing approach compared with KisanClaim</caption>
            <thead><tr className="bg-sage-100 font-display"><th className="p-4">Existing approach</th><th className="p-4 text-forest">KisanClaim</th></tr></thead>
            <tbody>{[["Manual field inspections and crop-cutting experiments", "Satellite, rainfall and photo evidence in one report"],
              ["Paper claim forms", "A guided digital claim with a traceable history"],
              ["Satellite data used inside insurers, not reachable by farmers", "Farmer-first: the evidence is in the farmer's hands"],
              ["High verification cost", "Low cost, built on free open data"],
              ["Little way to spot mismatched claims", "A consistency check that flags where satellite data and claim disagree, for human review"]].map(([a, b]) => (
              <tr key={a} className="border-t border-sage-100 align-top"><td className="p-4 text-navy/75">{a}</td><td className="p-4 font-medium">{b}</td></tr>))}</tbody>
          </table>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div><h3 className="text-xl font-bold">Expected impact</h3><ul className="mt-3 space-y-2 text-navy/80"><li>Faster claim processing</li><li>Fewer disputed claims</li><li>Lower verification cost for insurers</li><li>More trust in crop insurance</li></ul></div>
          <div><h3 className="text-xl font-bold">Who benefits</h3><ul className="mt-3 space-y-2 text-navy/80"><li>Farmers (primary)</li><li>Insurance companies</li><li>Agriculture departments and banks</li><li>Cooperatives and NGOs</li></ul></div>
        </div>
      </section>

      <section className="bg-sage-100">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold text-forest-deep sm:text-4xl">Built to grow, starting with a pilot</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[[Globe2, "Any field, any country", "Satellite coverage works across India and beyond."], [Sprout, "More crops and disasters", "Extend to hail, pests and new crop types."],
              [FileText, "Portal integration", "APIs into government insurance portals."], [Smartphone, "Reach every farmer", "Mobile app, SMS or WhatsApp, voice interface."]].map(([Icon, h, p]: any) => (
              <div key={h} className="rounded-xl bg-white p-5"><Icon className="h-5 w-5 text-forest-mid" aria-hidden /><p className="mt-2 font-display font-bold">{h}</p><p className="mt-1 text-sm text-muted">{p}</p></div>))}
          </div>
          <ol className="mt-10 grid gap-0 overflow-hidden rounded-xl border border-sage-200 bg-white md:grid-cols-4">
            {[["Weeks 1 to 2", "Data pipeline", "NDVI and rainfall for sample fields."], ["Weeks 3 to 4", "Working app", "Web app, map, preliminary indicator, PDF."], ["Month 2", "Pilot", "Test with a farmer group or agri college; validate against real claims."], ["Month 3 and beyond", "Scale up", "Multilingual, mobile, insurer partnerships."]].map(([when, h, p], i) => (
              <li key={h} className={`p-5 ${i > 0 ? "border-t border-sage-100 md:border-l md:border-t-0" : ""}`}><p className="flex items-center gap-1 text-sm font-semibold text-gold-dark"><CalendarClock className="h-4 w-4" />{when}</p><p className="mt-1 font-display text-lg font-bold">{h}</p><p className="mt-1 text-sm text-muted">{p}</p></li>))}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold text-forest-deep sm:text-4xl">Questions farmers and officers ask</h2>
        <div className="mt-8 divide-y divide-sage-200 rounded-xl bg-white shadow-soft">
          {faqs.map(([q, a]) => (<details key={q} className="group p-5"><summary className="cursor-pointer list-none font-display font-bold marker:hidden">{q}</summary><p className="mt-2 text-navy/75">{a}</p></details>))}
        </div>
      </section>

      <section className="bg-forest text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-center">
          <div><h2 className="text-3xl font-bold sm:text-4xl">Prove crop loss in minutes, not months.</h2><p className="mt-2 text-white/80">Register free and mark your first field.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link to="/register" className="btn btn-gold !min-h-[52px] !px-7">{t("nav.register")}</Link><Link to="/officer-login" className="btn border border-white/40 text-white hover:bg-white/10 !min-h-[52px]"><Map className="h-4 w-4" /> {t("nav.officer")}</Link></div>
        </div>
      </section>
    </>
  );
}
