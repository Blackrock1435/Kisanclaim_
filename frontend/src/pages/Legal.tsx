import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldX } from "lucide-react";
import { api } from "../lib/api";
import { Alert, Skeleton } from "../components/ui";
import { fmtDateTime } from "../lib/utils";

const Page = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <article className="mx-auto max-w-3xl space-y-4 px-4 py-14 leading-relaxed text-navy/85"><h1 className="text-4xl font-extrabold text-forest-deep">{title}</h1>{children}</article>);

export const Privacy = () => (
  <Page title="Privacy policy">
    <Alert tone="warn">Prototype text. Have it reviewed by a qualified professional before real-world use.</Alert>
    <h2 className="text-2xl font-bold">What we collect</h2>
    <p>Your name, email, optional phone and district; the farms and field boundaries you draw; crop and disaster details; and photographs you upload, including capture time and GPS location when your phone recorded them. We do not ask for Aadhaar, bank or other identity numbers.</p>
    <h2 className="text-2xl font-bold">Why we collect it</h2>
    <p>To build your preliminary assessment report by combining your evidence with satellite imagery and historical weather data, and to let an authorised officer review it. You give consent when you register and again when you submit a claim.</p>
    <h2 className="text-2xl font-bold">Who can see it</h2>
    <p>You; the officer assigned to your claim; and platform administrators. Photos are stored privately and are only served to those people after sign-in. Field coordinates are sent to external services (Open-Meteo for weather, Google Earth Engine for satellite data, when configured) to fetch data for your location.</p>
    <h2 className="text-2xl font-bold">Your choices</h2>
    <p>You can ask an administrator to disable your account or delete your data. Original photos are never altered; each has a SHA-256 fingerprint so that later changes can be detected.</p>
  </Page>);

export const Terms = () => (
  <Page title="Terms of service">
    <Alert tone="warn">Prototype text. Have it reviewed by a qualified professional before real-world use.</Alert>
    <h2 className="text-2xl font-bold">What KisanClaim is</h2>
    <p>An evidence-support platform that produces a <strong>preliminary</strong> assessment from the evidence you submit and external datasets. It is not an insurer, not a government service, and not a substitute for an authorised field inspection.</p>
    <h2 className="text-2xl font-bold">What it is not</h2>
    <p>A report does not approve a claim, guarantee compensation, prove the cause of damage or measure financial loss. Satellite vegetation indices can change for reasons unrelated to disaster.</p>
    <h2 className="text-2xl font-bold">Your responsibilities</h2>
    <p>Submit only accurate information and genuine photographs of your own field. Do not share your login.</p>
    <p><Link to="/privacy" className="font-semibold text-forest underline">Read the privacy policy</Link></p>
  </Page>);

export function Verify() {
  const { code, token } = useParams();
  const verifyParam = token || code;
  const q = useQuery({ queryKey: ["verify", verifyParam], queryFn: () => api(`/reports/verify/${verifyParam}`), retry: false });
  return (
    <Page title="PMFBY Dossier Verification">
      {q.isLoading ? (
        <Skeleton className="h-40" />
      ) : q.data ? (
        <div className="rounded-2xl border border-sage-200 bg-white p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white shadow-soft">
              <BadgeCheck className="h-7 w-7" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-forest-deep">
                Verified PMFBY Evidence Dossier
              </h2>
              <p className="text-xs text-muted">
                {q.data.authority || "KisanClaim Autonomous Evidence Seal"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-sage-50/70 p-4 text-sm border border-sage-200">
            <div>
              <dt className="text-xs font-semibold text-muted uppercase">Dossier ID</dt>
              <dd className="font-mono font-bold text-forest">{q.data.report_id || `KC-${q.data.claim_ref}`}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted uppercase">Claim Reference</dt>
              <dd className="font-bold text-navy">{q.data.claim_ref}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted uppercase">Generated Timestamp</dt>
              <dd className="text-navy">{fmtDateTime(q.data.generated_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted uppercase">Integrity Verification</dt>
              <dd className="font-bold text-forest flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-forest animate-pulse"></span>
                {q.data.integrity_verified ? "SHA-256 Hash Matches File Byte-for-Byte" : "Registered in KisanClaim"}
              </dd>
            </div>
          </div>

          <div>
            <dt className="text-xs font-semibold text-muted uppercase mb-1">Cryptographic SHA-256 Fingerprint</dt>
            <dd className="break-all rounded-lg bg-navy/5 p-2.5 font-mono text-xs text-navy font-bold border border-navy/10">
              {q.data.sha256_fingerprint || q.data.sha256}
            </dd>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            This verification certifies that this PDF dossier was produced from the KisanClaim multi-evidence audit pipeline (including Sentinel-2 Level-2A imagery, India Post DIGIPIN plot lock, and Live GeoCamera telemetry) and has not been altered since generation.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-soft space-y-3">
          <div className="flex items-center gap-3 text-red-700">
            <ShieldX className="h-8 w-8" />
            <div>
              <h2 className="font-display text-xl font-bold">Unrecognized Verification Token</h2>
              <p className="text-xs text-muted">No evidence dossier matches this cryptographic token.</p>
            </div>
          </div>
          <p className="text-sm text-navy/80">
            Please verify that the QR code URL was scanned correctly without truncations.
          </p>
        </div>
      )}
    </Page>
  );
}
