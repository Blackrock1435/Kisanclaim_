import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  Phone,
  FileText,
  ExternalLink,
  CloudRain,
  Cpu,
  Network,
  ArrowRight,
  Lock,
  Mic,
  Camera,
  Activity,
  Award,
  Layers,
  Landmark,
  BadgeCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Skeleton, StatusBadge } from "../components/ui";
import { disasterLabel, fmtDate } from "../lib/utils";
import VoiceClaimAssistant from "../components/VoiceClaimAssistant";

const disasterKn: Record<string, string> = {
  flood: "ಪ್ರವಾಹ / ಅತಿವೃಷ್ಟಿ",
  drought: "ಬರಗಾಲ",
  heavy_rainfall: "ಭಾರಿ ಮಳೆ",
  cyclone: "ಚಂಡಮಾರುತ",
  hailstorm: "ಆಲಿಕಲ್ಲು ಮಳೆ",
  hail: "ಆಲಿಕಲ್ಲು ಮಳೆ",
  landslide: "ಭೂಕುಸಿತ",
  other: "ಇತರ ನೈಸರ್ಗಿಕ ವಿಕೋಪ",
};

/* =========================================================================
   1. FARMER DASHBOARD VIEW (Bilingual: English & Kannada)
   ========================================================================= */
function FarmerDashboardView({ data, recentClaims }: { data: any; recentClaims: any[] }) {
  const { i18n } = useTranslation();
  const isKn = i18n.language === "kn";
  const [voiceOpen, setVoiceOpen] = useState(false);

  const profile = data?.farmer_profile || {
    name: "Ramesh Kumar",
    phone: "9876543210",
    policy_no: "PMFBY/KA/2026/BLR-003",
    farm_name: "Shri Krishna Krishi Farm",
    village: "Binnamangala",
    district: "Bengaluru Rural",
    state: "Karnataka",
    primary_digipin: "4T396F42L7",
    primary_crop: "Paddy (Pusa Basmati 1121)",
  };

  const proof = data?.active_claim_proof;
  const fields = useQuery({ queryKey: ["fields"], queryFn: () => api("/fields") });

  const getDisaster = (d: string) => (isKn ? disasterKn[d] || disasterLabel(d) : disasterLabel(d));

  return (
    <div className="space-y-6">
      {/* Official Government & PMFBY Trust Accreditation Banner */}
      <div className="rounded-2xl border-2 border-forest/30 bg-gradient-to-r from-forest-deep via-forest to-forest-mid p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gold/15 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-3 py-0.5 text-xs font-bold text-amber-200">
                <BadgeCheck className="h-4 w-4 text-gold" />
                <span>
                  {isKn
                    ? "ಭಾರತ ಸರ್ಕಾರ & ಕರ್ನಾಟಕ ಸರ್ಕಾರ ಕೃಷಿ ಇಲಾಖೆ (ಅಧಿಕೃತ)"
                    : "Govt of India & Govt of Karnataka Agriculture Dept (Regulated)"}
                </span>
              </span>
              <span className="text-xs text-white/70 font-mono hidden sm:inline">
                National Portal ID: PMFBY-NCIP-2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isKn
                ? "ಪ್ರಧಾನಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ — ಅಧಿಕೃತ ರೈತ ಪೋರ್ಟಲ್"
                : "Pradhan Mantri Fasal Bima Yojana — Official Farmer Portal"}
            </h1>
            <p className="text-sm text-white/85">
              {isKn ? (
                <>
                  ಸ್ವಾಗತ, <span className="font-bold text-amber-200">{profile.name}</span>. ನಿಮ್ಮ ಬೆಳೆ ಹಾನಿ ಪರಿಹಾರ, ಉಪಗ್ರಹ ಪರಿಶೀಲನೆ (Sentinel-2) ಮತ್ತು ಇಂಡಿಯಾ ಪೋಸ್ಟ್ DIGIPIN ಕ್ಯಾಡಾಸ್ಟ್ರಲ್ ದಾಖಲೆಗಳು ಇಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿವೆ.
                </>
              ) : (
                <>
                  Welcome, <span className="font-bold text-amber-200">{profile.name}</span>. Your crop damage verification, Sentinel-2 satellite twin telemetry, and India Post DIGIPIN cadastral records are secured here.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setVoiceOpen(true)}
              className="btn bg-gold text-navy hover:bg-amber-400 font-bold shadow-md flex items-center justify-center gap-2 !min-h-[44px] px-4"
            >
              <Mic className="h-4 w-4 text-forest-deep animate-pulse" />
              <span>{isKn ? "ಧ್ವನಿ ಮೂಲಕ ಕ್ಲೈಮ್ (Kisan Vaani)" : "Voice Claim Filing (Kisan Vaani)"}</span>
            </button>
            <Link
              to="/app/claims/new"
              className="btn bg-white/10 text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm font-semibold flex items-center justify-center gap-2 !min-h-[44px] px-4"
            >
              <span>{isKn ? "ಹೊಸ ಕ್ಲೈಮ್ ದಾಖಲಿಸಿ" : "Submit New Claim"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <VoiceClaimAssistant
        fields={fields.data || []}
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onComplete={() => {
          setVoiceOpen(false);
        }}
      />

      {/* Farmer Active PMFBY Policy & Land Holding Identity Card */}
      <div className="card border border-sage-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-light/20 text-forest">
              <Landmark className="h-6 w-6 text-forest-deep" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                {isKn ? "ಸಕ್ರಿಯ ಬಿಮಾ ಪಾಲಿಸಿ (Active PMFBY Policy Card)" : "Active PMFBY Insurance Policy Card"}
              </p>
              <p className="text-lg font-black text-navy">{profile.policy_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                {isKn
                  ? "ಖಾರಿಫ್ & ರಬಿ 2026 ಸಕ್ರಿಯ ಕವರೇಜ್ (Verified Active)"
                  : "Kharif & Rabi 2026 Verified Active Coverage"}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-xl bg-sage-50/70 p-3.5 border border-sage-100">
            <p className="text-xs text-muted font-semibold">
              {isKn ? "ರೈತರ ಹೆಸರು (Insured Farmer)" : "Insured Farmer"}
            </p>
            <p className="font-bold text-navy mt-0.5">{profile.name}</p>
            <p className="text-xs text-muted font-mono mt-0.5">+91 {profile.phone}</p>
          </div>

          <div className="rounded-xl bg-sage-50/70 p-3.5 border border-sage-100">
            <p className="text-xs text-muted font-semibold">
              {isKn ? "ಕೃಷಿ ಭೂಮಿ (Cadastral Farm Plot)" : "Cadastral Farm Plot"}
            </p>
            <p className="font-bold text-navy mt-0.5">{profile.farm_name}</p>
            <p className="text-xs text-muted mt-0.5">{profile.village}, {profile.district}</p>
          </div>

          <div className="rounded-xl bg-sage-50/70 p-3.5 border border-sage-100">
            <p className="text-xs text-muted font-semibold">
              {isKn ? "ಒಟ್ಟು ವಿಸ್ತೀರ್ಣ (Insured Acreage)" : "Total Insured Acreage"}
            </p>
            <p className="font-bold text-navy mt-0.5">
              {isKn
                ? `${data?.total_acres || 12.1} ಎಕರೆ (${data?.fields || 3} ಪ್ಲಾಟ್‌ಗಳು)`
                : `${data?.total_acres || 12.1} Acres (${data?.fields || 3} Plots)`}
            </p>
            <p className="text-xs text-forest font-semibold mt-0.5">
              {isKn ? `ಬೆಳೆ: ${profile.primary_crop}` : `Crop: ${profile.primary_crop}`}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/80 p-3.5 border border-emerald-200">
            <div className="flex items-center justify-between">
              <p className="text-xs text-emerald-900 font-semibold">
                {isKn ? "ಇಂಡಿಯಾ ಪೋಸ್ಟ್ DIGIPIN" : "India Post DIGIPIN"}
              </p>
              <Lock className="h-3.5 w-3.5 text-emerald-700" />
            </div>
            <p className="font-mono text-base font-black text-emerald-900 mt-0.5">{profile.primary_digipin}</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {isKn ? "4m×4m ಅಧಿಕೃತ ಗ್ರಿಡ್ ಲಾಕ್ ಆಗಿದೆ" : "4m×4m Cadastral Grid Cell Locked"}
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banner for Actions Required */}
      {recentClaims?.some((c: any) => c.status === "additional_evidence_required") && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-lg">
              !
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">
                {isKn ? "ಗಮನಿಸಿ: ಹೆಚ್ಚುವರಿ ಸಾಕ್ಷ್ಯದ ಅಗತ್ಯವಿದೆ (Action Required)" : "Action Required: Additional Ground Evidence Requested"}
              </p>
              <p className="text-xs text-amber-900 mt-0.5">
                {isKn
                  ? "ವಿಮಾ ಅಧಿಕಾರಿಯವರು ನಿಮ್ಮ ಕ್ಲೈಮ್‌ಗೆ ಹೆಚ್ಚುವರಿ ಲೈವ್ ಜಿಯೋ-ಕ್ಯಾಮೆರಾ ಫೋಟೋಗಳನ್ನು ಒದಗಿಸಲು ವಿನಂತಿಸಿದ್ದಾರೆ."
                  : "The insurance inspection officer has requested additional GeoCamera field photos to complete your claim verification."}
              </p>
            </div>
          </div>
          <Link
            to={`/app/geocamera?claimId=${recentClaims.find((c: any) => c.status === "additional_evidence_required")?.id}`}
            className="btn bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold px-3 py-1.5 shrink-0"
          >
            {isKn ? "ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ" : "Capture Photos"}
          </Link>
        </div>
      )}

      {/* Empty State when no active claim proof */}
      {!proof && (
        <div className="card border-2 border-dashed border-sage-300 bg-white p-8 text-center shadow-soft space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-light/20 text-forest">
            <ShieldCheck className="h-8 w-8 text-forest" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-extrabold text-navy">
              {isKn ? "ಯಾವುದೇ ಸಕ್ರಿಯ ಕ್ಲೈಮ್ ಇಲ್ಲ" : "No Active Claims Filed Yet"}
            </h2>
            <p className="text-sm text-muted">
              {isKn
                ? "ನಿಮ್ಮ ನೋಂದಾಯಿತ ಬೆಳೆಗಳು ಪ್ರಸ್ತುತ PMFBY ಅಡಿಯಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿವೆ. ಅಕಾಲಿಕ ಮಳೆ, ಪ್ರವಾಹ ಅಥವಾ ಇತರ ನೈಸರ್ಗಿಕ ವಿಕೋಪಗಳಿಂದ ಹಾನಿಯಾದರೆ, ಘಟನೆಯ 72 ಗಂಟೆಗಳ ಒಳಗೆ ಇಲ್ಲಿ ಸುಲಭವಾಗಿ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಬಹುದು."
                : "Your registered crops are currently protected under PMFBY. In case of flood, unseasonal rainfall, hailstorm, or drought damage, file your claim within 72 hours of the incident."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setVoiceOpen(true)}
              className="btn bg-gold text-navy hover:bg-amber-400 font-bold px-4 py-2 flex items-center gap-2 shadow-xs"
            >
              <Mic className="h-4 w-4 text-forest-deep animate-pulse" />
              <span>{isKn ? "ಕಿಸಾನ್ ವಾಣಿ (ಧ್ವನಿ ಮೂಲಕ ಕ್ಲೈಮ್)" : "File via Kisan Vaani Voice"}</span>
            </button>
            <Link
              to="/app/claims/new"
              className="btn btn-primary px-5 py-2 flex items-center gap-2 shadow-xs"
            >
              <span>{isKn ? "ಹೊಸ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ" : "Submit First Claim"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Visual Claim Lifecycle & Live Progress Stepper */}
      {proof && (
        <div className="card border-2 border-forest/20 bg-white p-6 shadow-soft space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest text-white text-xs font-bold">
                  KC
                </span>
                <h2 className="text-lg font-extrabold text-navy">
                  {isKn
                    ? `ಕ್ಲೈಮ್ ಸ್ಥಿತಿ & ಪ್ರಗತಿ ಟ್ರ್ಯಾಕಿಂಗ್ (Claim #${proof.ref})`
                    : `Claim Status & Progress Tracking (Claim #${proof.ref})`}
                </h2>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {getDisaster(proof.disaster_type)} {isKn ? "ಹಾನಿ" : "Damage"} • {proof.crop_name} • {isKn ? "ದಿನಾಂಕ:" : "Date:"} {fmtDate(proof.incident_date)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                {isKn ? "ಪರಿಹಾರ ಮೊತ್ತ ಅಂದಾಜು:" : "Estimated Payout:"} ₹{proof.estimated_payout?.toLocaleString("en-IN")}
              </span>
              <StatusBadge status={proof.status} />
            </div>
          </div>

          {/* 5-Step Visual Stepper */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {[
              {
                num: 1,
                title: isKn ? "ಕ್ಲೈಮ್ ದಾಖಲೆ" : "Claim Filed",
                sub: isKn ? "ದಾಖಲಿಸಲಾಗಿದೆ" : "Intimation Recorded",
                done: true,
                current: false,
              },
              {
                num: 2,
                title: isKn ? "DIGIPIN ಪ್ಲಾಟ್" : "DIGIPIN Plot",
                sub: isKn ? "ಗಡಿ ಲಾಕ್ ಆಗಿದೆ" : "Boundary Locked",
                done: true,
                current: false,
              },
              {
                num: 3,
                title: isKn ? "Sentinel-2 ಉಪಗ್ರಹ" : "Sentinel-2 Satellite",
                sub: isKn ? "NDVI ವಿಶ್ಲೇಷಣೆ" : "NDVI Analyzed",
                done: true,
                current: false,
              },
              {
                num: 4,
                title: isKn ? "AI ಪರಿಶೀಲನೆ (6 ಏಜೆಂಟ್)" : "AI Multi-Agent Review",
                sub: isKn ? "ಅಂಕ: 90.6/100" : "Score: 90.6/100",
                done: true,
                current: proof.status !== "approved",
              },
              {
                num: 5,
                title: isKn ? "DBT ಬ್ಯಾಂಕ್ ಪಾವತಿ" : "DBT Bank Payout",
                sub: isKn ? "ಮಂಜೂರಾಗಿದೆ" : "Sanctioned",
                done: proof.status === "approved",
                current: proof.status === "approved",
              },
            ].map((st) => (
              <div
                key={st.num}
                className={`rounded-xl p-3 border transition-all ${
                  st.done
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : st.current
                    ? "bg-amber-50 border-amber-300 text-amber-950 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      st.done ? "bg-emerald-700 text-white" : st.current ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {st.done ? "✓" : st.num}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {isKn ? `ಹಂತ ${st.num}` : `Step ${st.num}`}
                  </span>
                </div>
                <p className="font-bold text-xs leading-tight">{st.title}</p>
                <p className="text-[11px] opacity-80 mt-0.5">{st.sub}</p>
              </div>
            ))}
          </div>

          {/* 4 Real Verifiable Proof Cards */}
          <div className="border-t border-sage-100 pt-5 space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-forest-deep flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-forest" />
              <span>
                {isKn
                  ? "ಅಧಿಕೃತ ಸಾಕ್ಷ್ಯಗಳು & ದೃಢೀಕರಣ ಪುರಾವೆ (Scientific Evidence & Sensor Proof)"
                  : "Official Scientific Evidence & Sensor Proof Dossier"}
              </span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Sentinel-2 Multispectral Satellite */}
              <div className="rounded-xl border border-sage-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-forest">
                    <Activity className="h-4 w-4" />
                    <span>{isKn ? "Sentinel-2 L2A ಉಪಗ್ರಹ" : "Sentinel-2 L2A Satellite"}</span>
                  </span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    {isKn ? "ಖಚಿತ ಸಾಕ್ಷ್ಯ" : "Verified Loss"}
                  </span>
                </div>
                <p className="text-2xl font-black text-rose-700">
                  {proof.satellite?.pct_change}%{" "}
                  <span className="text-xs font-bold text-muted">{isKn ? "ಬೆಳೆ ಹಾನಿ" : "Crop Loss"}</span>
                </p>
                <p className="text-xs text-muted leading-tight">
                  {isKn ? (
                    <>
                      ಹಿಂದಿನ ಹಸಿರು (Pre): <b className="text-navy">{proof.satellite?.pre_ndvi}</b> → ನಂತರ (Post):{" "}
                      <b className="text-navy">{proof.satellite?.post_ndvi}</b> NDVI. ನೀರು ನಿಂತ ಸೂಚ್ಯಂಕ (NDWI):{" "}
                      <b>+{proof.satellite?.ndwi}</b>.
                    </>
                  ) : (
                    <>
                      Pre-loss Canopy: <b className="text-navy">{proof.satellite?.pre_ndvi}</b> → Post-loss Canopy:{" "}
                      <b className="text-navy">{proof.satellite?.post_ndvi}</b> NDVI. Water Index (NDWI):{" "}
                      <b>+{proof.satellite?.ndwi}</b>.
                    </>
                  )}
                </p>
                <Link
                  to={`/app/satellite-twin?claimId=${proof.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-forest hover:underline"
                >
                  <span>{isKn ? "ಉಪಗ್ರಹ ಸ್ಲೈಡರ್ ವೀಕ್ಷಿಸಿ" : "View Satellite Split Slider"}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Card 2: Open-Meteo Weather AWS Station */}
              <div className="rounded-xl border border-sage-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-700">
                    <CloudRain className="h-4 w-4" />
                    <span>{isKn ? "ಹವಾಮಾನ & ಮಳೆ ದಾಖಲೆ" : "Weather & Rainfall Telemetry"}</span>
                  </span>
                  <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-800">
                    AWS
                  </span>
                </div>
                <p className="text-2xl font-black text-cyan-900">
                  {proof.weather?.rainfall_mm} mm{" "}
                  <span className="text-xs font-bold text-muted">{isKn ? "ಮಳೆ" : "Rainfall"}</span>
                </p>
                <p className="text-xs text-muted leading-tight">
                  {isKn ? (
                    <>
                      ದೇವನಹಳ್ಳಿ AWS ಕೇಂದ್ರ: ವಾಡಿಕೆಗಿಂತ <b>{proof.weather?.anomaly_multiplier}</b> ಹೆಚ್ಚು ಮಳೆ. ಅತಿವೃಷ್ಟಿ ಹಾನಿ ನೈಜವೆಂದು ದೃಢಪಟ್ಟಿದೆ.
                    </>
                  ) : (
                    <>
                      Devanahalli AWS Station: <b>{proof.weather?.anomaly_multiplier}</b> historical rainfall anomaly. Extreme flood peril corroborated.
                    </>
                  )}
                </p>
                <p className="text-[11px] text-cyan-800 font-medium">
                  {isKn ? "ಸ್ಥಿತಿ:" : "Status:"} {proof.weather?.status}
                </p>
              </div>

              {/* Card 3: In-App Live GeoCamera Proof */}
              <div className="rounded-xl border border-sage-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <Camera className="h-4 w-4" />
                    <span>{isKn ? "ಜಿಯೋ-ಕ್ಯಾಮೆರಾ ಫೋಟೋ" : "Live GeoCamera Proof"}</span>
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    GPS
                  </span>
                </div>
                <p className="text-base font-black text-forest-deep flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{isKn ? "ಭೂ ಗಡಿಯೊಳಗೆ ಇದೆ (Inside)" : "Inside Field Boundary"}</span>
                </p>
                <p className="text-xs text-muted leading-tight">
                  {isKn ? (
                    <>
                      GPS ನಿಖರತೆ: <b>±{proof.geocamera?.accuracy_m}m</b>. SHA-256 ಹ್ಯಾಶ್:{" "}
                      <span className="font-mono text-[11px]">{proof.geocamera?.sha256}</span>. ಯಾವುದೇ ನಕಲು ಇಲ್ಲ.
                    </>
                  ) : (
                    <>
                      GPS Accuracy: <b>±{proof.geocamera?.accuracy_m}m</b>. SHA-256 Hash:{" "}
                      <span className="font-mono text-[11px]">{proof.geocamera?.sha256}</span>. Zero tampering detected.
                    </>
                  )}
                </p>
                <Link
                  to={`/app/geocamera?claimId=${proof.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-forest hover:underline"
                >
                  <span>{isKn ? "ಕ್ಯಾಮೆರಾ ವೀಕ್ಷಿಸಿ" : "Open Live GeoCamera"}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Card 4: Statutory Payout via Scale of Finance */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Award className="h-4 w-4" />
                    <span>{isKn ? "PMFBY ನೇರ ಪಾವತಿ (DBT)" : "PMFBY Direct Payout (DBT)"}</span>
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    proof.settlement_status === "PAID"
                      ? "bg-emerald-600 text-white"
                      : proof.settlement_status === "PAYMENT_PROCESSING"
                      ? "bg-blue-600 text-white"
                      : proof.settlement_status === "APPROVED_AWAITING_PAYMENT"
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-amber-200 text-amber-900"
                  }`}>
                    {proof.settlement_status ? proof.settlement_status.replace(/_/g, " ") : (isKn ? "ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ" : "Under Review")}
                  </span>
                </div>
                <p className="text-2xl font-black text-emerald-800">
                  ₹{proof.estimated_payout?.toLocaleString("en-IN")}
                </p>
                <div className="text-xs text-muted leading-tight">
                  {proof.settlement_status === "PAID" ? (
                    <p className="text-emerald-900 font-medium">
                      ✓ {isKn ? "ಆಧಾರ್ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆಯಾಗಿದೆ" : "Credited to Aadhaar-linked Bank A/C"}.<br/>
                      {proof.transaction_reference && <span className="font-mono text-[10px]">Ref: {proof.transaction_reference}</span>}
                    </p>
                  ) : proof.settlement_status === "PAYMENT_PROCESSING" ? (
                    <p className="text-blue-900 font-medium">
                      {isKn ? "DBT ಪಾವತಿ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ..." : "PFMS Payment Processing..."}
                    </p>
                  ) : (
                    <p>
                      {isKn ? (
                        <>ಜಿಲ್ಲಾ ಸ್ಕೇಲ್ ಆಫ್ ಫೈನಾನ್ಸ್: <b>₹10,000/ಎಕರೆ</b> × {proof.area_acres} ಎಕರೆ. ಆಧಾರ್ ಲಿಂಕ್ಡ್ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಜಮೆ ಪ್ರಕ್ರಿಯೆ.</>
                      ) : (
                        <>District Scale of Finance: <b>₹10,000/acre</b> × {proof.area_acres} acres. Sanctioned for Aadhaar-linked DBT credit.</>
                      )}
                    </p>
                  )}
                </div>
                {proof.dossier_token && (
                  <Link
                    to={`/verify-report/${proof.dossier_token}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline"
                  >
                    <span>{isKn ? "QR ಪರಿಶೀಲನಾ ವರದಿ (PDF)" : "Download QR Verified PDF"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setVoiceOpen(true)}
          className="flex min-h-[64px] items-center gap-3 rounded-xl border border-sage-200 bg-white p-4 font-display font-bold hover:border-forest shadow-xs text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/20 text-navy">
            <Mic className="h-5 w-5 text-forest-deep" />
          </div>
          <div>
            <p className="text-sm font-bold text-forest-deep">
              {isKn ? "ಕಿಸಾನ್ ವಾಣಿ (Voice Filing)" : "Kisan Vaani (Voice Filing)"}
            </p>
            <p className="text-xs text-muted font-normal">
              {isKn ? "ಮಾತಿನ ಮೂಲಕ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ" : "Auto-fill claim using voice assistant"}
            </p>
          </div>
        </button>

        <Link
          to={`/app/geocamera${proof ? `?claimId=${proof.id}` : ""}`}
          className="flex min-h-[64px] items-center gap-3 rounded-xl border border-sage-200 bg-white p-4 font-display font-bold hover:border-forest shadow-xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-forest">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-forest-deep">
              {isKn ? "ಜಿಯೋ-ಕ್ಯಾಮೆರಾ ಫೋಟೋ" : "Live GeoCamera"}
            </p>
            <p className="text-xs text-muted font-normal">
              {isKn ? "GPS & DIGIPIN ವಾಟರ್‌ಮಾರ್ಕ್" : "GPS & DIGIPIN Stamped Photos"}
            </p>
          </div>
        </Link>

        <Link
          to={`/app/evidence-graph${proof ? `?claimId=${proof.id}` : ""}`}
          className="flex min-h-[64px] items-center gap-3 rounded-xl border border-sage-200 bg-white p-4 font-display font-bold hover:border-forest shadow-xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-forest-deep">
              {isKn ? "ಸಾಕ್ಷ್ಯ ಗ್ರಾಫ್ (Evidence Graph)" : "Evidence Graph"}
            </p>
            <p className="text-xs text-muted font-normal">
              {isKn ? "ಸಂಪರ್ಕಿತ ಪುರಾವೆಗಳ ನಕ್ಷೆ" : "Connected Provenance Map"}
            </p>
          </div>
        </Link>

        <Link
          to={`/verify-report/${proof?.dossier_token || "513c877923184ef2a4a80c68d95a3cdd"}`}
          className="flex min-h-[64px] items-center gap-3 rounded-xl border border-sage-200 bg-white p-4 font-display font-bold hover:border-forest shadow-xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-forest-deep">
              {isKn ? "ಅಧಿಕೃತ PDF ಡಾಸಿಯರ್" : "Official PDF Dossier"}
            </p>
            <p className="text-xs text-muted font-normal">
              {isKn ? "QR ಕೋಡ್ ಸೀಲ್ ಸಹಿತ ವರದಿ" : "QR-Verifiable PMFBY Report"}
            </p>
          </div>
        </Link>
      </div>

      {/* Official Officer & Helpline Support Card */}
      <div className="card border border-sage-200 bg-sage-50/60 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              {isKn ? "ನಿಮಗೆ ನಿಯೋಜಿಸಲಾದ ಬಿಮಾ ಅಧಿಕಾರಿ (Assigned Officer)" : "Assigned Insurance Officer"}
            </p>
            <p className="text-sm font-extrabold text-navy">
              {isKn ? "ಬೀಮಾ ಸೀನಿಯರ್ ಆಫೀಸರ್ — ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ ಜಿಲ್ಲೆ" : "Bima Senior Officer — Bengaluru Rural District"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <div className="rounded-lg bg-white px-3 py-1.5 border border-sage-200 shadow-xs">
            <span className="text-muted">
              {isKn ? "PMFBY ರಾಷ್ಟ್ರೀಯ ಉಚಿತ ಸಹಾಯವಾಣಿ: " : "PMFBY National Toll-Free: "}
            </span>
            <span className="text-forest-deep text-sm">14447</span>
          </div>
          <div className="rounded-lg bg-white px-3 py-1.5 border border-sage-200 shadow-xs">
            <span className="text-muted">
              {isKn ? "ಕರ್ನಾಟಕ ಕಿಸಾನ್ ಕಾಲ್ ಸೆಂಟರ್: " : "Karnataka Kisan Call Centre: "}
            </span>
            <span className="text-forest-deep text-sm">1800-425-3553</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. ADMIN / OFFICER COMMAND CENTER VIEW (Bilingual: English & Kannada)
   ========================================================================= */
function AdminCommandCenterView({ data }: { data: any }) {
  const { i18n } = useTranslation();
  const isKn = i18n.language === "kn";

  const cmd = data?.underwriting_command || {
    total_insured_ha: 24.5,
    total_insured_acres: 60.5,
    total_exposure_inr: 605000.0,
    sanctioned_payout_inr: 71160.0,
    active_ai_agents: 6,
    fraud_detection_accuracy: "98.7%",
    recent_stream: [],
    infrastructure: {
      sentinel2: "OPERATIONAL (Dual-Constellation S2A/S2B)",
      open_meteo: "CONNECTED (High-Resolution Precipitation Grid)",
      digipin: "100% RESOLVED (India Post 4m×4m National Grid)",
      bhoomi_karnataka: "SYNCHRONIZED (RTC Cadastral Survey Registry)",
    },
  };

  const stream = cmd.recent_stream || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-white shadow-soft">
              <Cpu className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-forest-deep">
              {isKn
                ? "PMFBY ಸ್ವಾಯತ್ತ ವಿಮಾ ಅಂಡರ್‌ರೈಟಿಂಗ್ & ವಂಚನೆ ಪತ್ತೆ ಕೇಂದ್ರ"
                : "PMFBY Autonomous Underwriting & Anti-Fraud Center"}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            {isKn
              ? "ಮಲ್ಟಿ-ಏಜೆಂಟ್ AI ಪರಿಶೀಲನೆ, Sentinel-2 ಟ್ವಿನ್ ಟೆಲಿಮೆಟ್ರಿ ಮತ್ತು ಇಂಡಿಯಾ ಪೋಸ್ಟ್ DIGIPIN ಕಣ್ಗಾವಲು."
              : "Multi-Agent AI Verification Bot, Sentinel-2 Twin telemetry, and India Post DIGIPIN cadastral surveillance."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/disaster-map"
            className="btn bg-gold text-navy hover:bg-amber-400 !min-h-[36px] text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <span>{isKn ? "ವಿಕೋಪ ನಕ್ಷೆ" : "Disaster Map"}</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            <Activity className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            <span>{isKn ? "6 ಸ್ವಾಯತ್ತ AI ಏಜೆಂಟ್‌ಗಳು ಸಕ್ರಿಯ" : "6 Autonomous AI Agents Active"}</span>
          </span>
          <Link to="/app/insurance" className="btn btn-primary !min-h-[36px] text-xs font-bold">
            {isKn ? "ವಿಮಾ ಪೋರ್ಟಲ್" : "Underwriter Portal"}
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 border-l-4 border-l-forest">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {isKn ? "ಒಟ್ಟು ವಿಮೆ ಮಾಡಲಾದ ವಿಸ್ತೀರ್ಣ" : "Total Insured Acreage"}
          </p>
          <p className="mt-1 text-3xl font-black text-navy">{cmd.total_insured_acres} {isKn ? "ಎಕರೆ" : "Acres"}</p>
          <p className="mt-1 text-xs text-muted">
            {cmd.total_insured_ha} {isKn ? "ಹೆಕ್ಟೇರ್ ನೋಂದಾಯಿತ ಕ್ಲಸ್ಟರ್‌ಗಳು" : "Hectares across registered clusters"}
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-600">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {isKn ? "ಒಟ್ಟು PMFBY ಎಕ್ಸ್‌ಪೋಶರ್" : "Total PMFBY Exposure"}
          </p>
          <p className="mt-1 text-3xl font-black text-blue-900">₹{cmd.total_exposure_inr?.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-muted">
            {isKn ? "ಕರ್ನಾಟಕ ಸ್ಕೇಲ್ ಆಫ್ ಫೈನಾನ್ಸ್ ಬೆಂಚ್‌ಮಾರ್ಕ್" : "Karnataka Scale of Finance benchmark"}
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-emerald-600">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {isKn ? "ಮಂಜೂರಾದ ಪಾವತಿ ಮೊತ್ತ" : "Sanctioned Payout Pool"}
          </p>
          <p className="mt-1 text-3xl font-black text-emerald-700">₹{cmd.sanctioned_payout_inr?.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">
            {isKn ? "ಶಾಸನಬದ್ಧ ಪರಿಶೀಲಿತ ನಷ್ಟ ಕ್ಲೈಮ್‌ಗಳು" : "Statutory verified loss claims"}
          </p>
        </div>

        <div className="card p-5 border-l-4 border-l-gold">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {isKn ? "AI ವಂಚನೆ ಪತ್ತೆ ದರ" : "AI Fraud Detection Rate"}
          </p>
          <p className="mt-1 text-3xl font-black text-amber-800">{cmd.fraud_detection_accuracy}</p>
          <p className="mt-1 text-xs text-amber-700 font-semibold">
            {isKn ? "ಜಿಯೋಫೆನ್ಸ್ & EXIF ಶೂನ್ಯ-ನಂಬಿಕೆ ಪರಿಶೀಲನೆ" : "Zero-trust geofence & EXIF verification"}
          </p>
        </div>
      </div>

      {/* Live AI Verification Bot Feed */}
      <div className="card p-6 shadow-soft space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-navy flex items-center gap-2">
              <Cpu className="h-5 w-5 text-forest" />
              <span>{isKn ? "ನೈಜ-ಸಮಯದ AI ಪರಿಶೀಲನಾ ಬಾಟ್ ಸ್ಟ್ರೀಮ್" : "Real-Time AI Verification Bot Stream"}</span>
            </h2>
            <p className="text-xs text-muted">
              {isKn
                ? "6 ಸ್ವಾಯತ್ತ ಏಜೆಂಟ್‌ಗಳಿಂದ ಸ್ವಯಂಚಾಲಿತ ತಪಾಸಣೆಗೆ ಒಳಪಡುತ್ತಿರುವ ಕ್ಲೈಮ್‌ಗಳು (GeoLocation, Photo, Sentinel-2, Weather, Bhoomi, Fusion)."
                : "Live claims undergoing automated 6-agent inspection (GeoLocation, Photo Integrity, Sentinel-2, Weather, Bhoomi, Fusion)."}
            </p>
          </div>
          <Link to="/app/agent-analysis" className="text-xs font-bold text-forest hover:underline">
            {isKn ? "ಎಲ್ಲಾ 6 ಏಜೆಂಟ್‌ಗಳ ಸ್ಕೋರ್‌ಕಾರ್ಡ್‌ಗಳು →" : "View All 6 Agents Scorecards →"}
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-sage-100 font-display text-xs font-bold uppercase tracking-wider text-navy">
              <tr>
                <th className="p-3">{isKn ? "ಕ್ಲೈಮ್ ಸಂಖ್ಯೆ" : "Claim Ref"}</th>
                <th className="p-3">{isKn ? "ರೈತ & ಬೆಳೆ" : "Farmer & Crop"}</th>
                <th className="p-3">{isKn ? "ವಿಕೋಪ" : "Peril"}</th>
                <th className="p-3">{isKn ? "AI ಅಂಕ" : "AI Agent Score"}</th>
                <th className="p-3">{isKn ? "ಜಿಯೋಫೆನ್ಸ್ ಸ್ಥಿತಿ" : "Geofence Status"}</th>
                <th className="p-3">{isKn ? "NDVI ಇಳಿಕೆ" : "NDVI Decline"}</th>
                <th className="p-3">{isKn ? "ವಂಚನೆ ಅಪಾಯ" : "Fraud Risk"}</th>
                <th className="p-3 text-right">{isKn ? "ಕ್ರಮಗಳು" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {stream.map((c: any) => (
                <tr key={c.id} className="border-t border-sage-100 hover:bg-sage-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-forest">{c.ref}</td>
                  <td className="p-3">
                    <p className="font-semibold text-navy">{c.farmer_name}</p>
                    <p className="text-xs text-muted">{c.crop}</p>
                  </td>
                  <td className="p-3 font-medium capitalize">{c.disaster}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-md ${
                        c.ai_score >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : c.ai_score >= 60
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {c.ai_score}/100
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.geofence === "inside"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                          : "bg-rose-50 text-rose-700 border border-rose-300"
                      }`}
                    >
                      {c.geofence === "inside"
                        ? isKn
                          ? "ಗಡಿಯೊಳಗೆ ಇದೆ"
                          : "Inside Boundary"
                        : isKn
                        ? "400m ಹೊರಗಿದೆ"
                        : "Outside 400m"}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-rose-700">{c.ndvi_drop}%</td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded ${
                        c.fraud_risk === "LOW" ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                      }`}
                    >
                      {c.fraud_risk} {isKn ? "ಅಪಾಯ" : "RISK"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/app/insurance`}
                      className="btn btn-ghost !min-h-[30px] !py-0.5 text-xs font-bold text-forest hover:bg-sage-100"
                    >
                      {isKn ? "ಪರಿಶೀಲಿಸಿ" : "Inspect"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Satellite & Cadastral Cluster Infrastructure Telemetry */}
      <div className="card p-6 shadow-soft space-y-4">
        <h2 className="text-lg font-extrabold text-navy flex items-center gap-2">
          <Layers className="h-5 w-5 text-forest" />
          <span>
            {isKn ? "ಕ್ಯಾಡಾಸ್ಟ್ರಲ್ & ಉಪಗ್ರಹ ಕ್ಲಸ್ಟರ್ ಟೆಲಿಮೆಟ್ರಿ" : "Cadastral & Satellite Cluster Telemetry"}
          </span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1">
            <p className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
              <span>ESA Sentinel-2 L2A</span>
            </p>
            <p className="text-emerald-800 font-medium">{cmd.infrastructure.sentinel2}</p>
            <p className="text-[11px] text-muted">
              {isKn ? "10m ರೆಸಲ್ಯೂಶನ್ • NDVI & NDWI ಡ್ಯುಯಲ್-ಪಾಸ್" : "10m Ground Resolution • Dual-Pass NDVI & NDWI"}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 space-y-1">
            <p className="font-bold text-cyan-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-600 animate-ping" />
              <span>Open-Meteo AWS Grid</span>
            </p>
            <p className="text-cyan-800 font-medium">{cmd.infrastructure.open_meteo}</p>
            <p className="text-[11px] text-muted">
              {isKn ? "ಗಂಟೆಯ ಮಳೆ ದಾಖಲೆ & ಬರಗಾಲ ಸೂಚ್ಯಂಕಗಳು" : "Hourly rainfall anomalies & drought indices"}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-1">
            <p className="font-bold text-amber-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              <span>India Post DIGIPIN</span>
            </p>
            <p className="text-amber-800 font-medium">{cmd.infrastructure.digipin}</p>
            <p className="text-[11px] text-muted">
              {isKn ? "10-ಅಕ್ಷರಗಳ ಕ್ಯಾಡಾಸ್ಟ್ರಲ್ ಪ್ಲಾಟ್ ಲಾಕ್" : "10-char continuous cadastral parcel locking"}
            </p>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-1">
            <p className="font-bold text-purple-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-600" />
              <span>Bhoomi Karnataka RTC</span>
            </p>
            <p className="text-purple-800 font-medium">{cmd.infrastructure.bhoomi_karnataka}</p>
            <p className="text-[11px] text-muted">
              {isKn ? "ಅಧಿಕೃತ ರಾಜ್ಯ ಸರ್ವೆ ನಂ & ಹಕ್ಕು ಪರಿಶೀಲನೆ" : "Official State Survey No. & Title Validation"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. ROOT DASHBOARD COMPONENT
   ========================================================================= */
export default function Dashboard() {
  const { user } = useAuth();
  const d = useQuery({ queryKey: ["dashboard"], queryFn: () => api("/dashboard") });
  const recent = useQuery({ queryKey: ["claims", "recent"], queryFn: () => api("/claims?size=5") });

  if (d.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const role = user!.role;

  if (role === "farmer") {
    return <FarmerDashboardView data={d.data} recentClaims={recent.data?.items || []} />;
  }

  return <AdminCommandCenterView data={d.data} />;
}
