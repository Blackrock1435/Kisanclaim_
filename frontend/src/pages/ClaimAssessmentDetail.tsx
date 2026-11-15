import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  Activity,
  CloudRain,
  MapPin,
  Lock,
  Layers,
  FileText,
  Download,
  ExternalLink,
  Coins,
  RefreshCw,
  Send,
  Save,
  Check,
  X,
  Cpu,
  Info
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Spinner, StatusBadge, AuthImage, toast } from "../components/ui";

export default function ClaimAssessmentDetail() {
  const { claimId } = useParams<{ claimId: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Active section tab
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "ai_agents" | "payout" | "assessment">("overview");

  // Form states for officer assessment
  const [recommendedAmount, setRecommendedAmount] = useState<number | "">("");
  const [assessedDamagePct, setAssessedDamagePct] = useState<number>(55.0);
  const [assessedAreaHa, setAssessedAreaHa] = useState<number | "">("");
  const [deductions, setDeductions] = useState<number>(0);
  const [officerRemarks, setOfficerRemarks] = useState("");
  const [officerDiffReason, setOfficerDiffReason] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Admin decision states
  const [adminDecision, setAdminDecision] = useState<"approve" | "modify" | "reject" | "return_for_evidence">("approve");
  const [adminApprovedAmount, setAdminApprovedAmount] = useState<number | "">("");
  const [adminModReason, setAdminModReason] = useState("");
  const [adminRejectReason, setAdminRejectReason] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");

  const claimQ = useQuery({
    queryKey: ["claim-assessment-context", claimId],
    queryFn: () => api(`/assessments/claim/${claimId}`),
    enabled: !!claimId,
  });

  const data = claimQ.data;
  const claim = data?.claim;
  const farmer = data?.farmer;
  const field = data?.field;
  const policy = data?.policy;
  const photos = data?.photos || [];
  const aiAgents = data?.ai_agents || [];
  const fusion = data?.fusion_summary;
  const payoutEstimate = data?.payout_estimate;
  const existingAssessment = data?.assessment;
  const settlement = data?.settlement;
  const dossier = data?.dossier;

  // Initialize form fields when data loads
  const [initialized, setInitialized] = useState(false);
  if (data && !initialized) {
    if (existingAssessment) {
      setRecommendedAmount(existingAssessment.recommended_amount ?? payoutEstimate?.estimated_amount ?? 0);
      setAssessedDamagePct(existingAssessment.assessed_damage_pct ?? payoutEstimate?.loss_percentage ?? 55.0);
      setAssessedAreaHa(existingAssessment.assessed_eligible_area_ha ?? field?.area_ha ?? 2.0);
      setDeductions(existingAssessment.deduction_amount ?? 0);
      setOfficerRemarks(existingAssessment.officer_remarks || "");
      setOfficerDiffReason(existingAssessment.officer_difference_reason || "");
      setDeclarationAccepted(true);
    } else if (payoutEstimate) {
      setRecommendedAmount(payoutEstimate.estimated_amount ?? 0);
      setAssessedDamagePct(payoutEstimate.loss_percentage ?? 55.0);
      setAssessedAreaHa(payoutEstimate.eligible_area_ha ?? field?.area_ha ?? 2.0);
      setDeductions(0);
      setOfficerRemarks(`Preliminary underwriting assessment conducted on ${new Date().toLocaleDateString()}. Crop damage verified via multi-evidence satellite and ground telemetry.`);
    }
    setInitialized(true);
  }

  // Recalculate AI Payout Mutation
  const recalcMut = useMutation({
    mutationFn: () => api(`/assessments/claim/${claimId}/calculate`, { method: "POST" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["claim-assessment-context", claimId] });
      toast("AI Payout re-calculated with latest satellite and sensor inputs", "ok");
    },
    onError: () => toast("Failed to recalculate payout estimate", "error"),
  });

  // Save Draft Mutation
  const saveDraftMut = useMutation({
    mutationFn: (body: any) => api(`/assessments/claim/${claimId}/save-draft`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim-assessment-context", claimId] });
      toast("Assessment draft saved successfully", "ok");
    },
    onError: (err: any) => toast(err.message || "Failed to save draft", "error"),
  });

  // Submit Recommendation Mutation
  const submitMut = useMutation({
    mutationFn: (body: any) => api(`/assessments/claim/${claimId}/submit`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim-assessment-context", claimId] });
      qc.invalidateQueries({ queryKey: ["assessment-stats"] });
      toast("Assessment submitted for Competent Authority approval", "ok");
    },
    onError: (err: any) => toast(err.message || "Submission failed", "error"),
  });

  // Admin Decision Mutation
  const adminDecisionMut = useMutation({
    mutationFn: ({ assessmentId, body }: { assessmentId: number; body: any }) =>
      api(`/assessments/${assessmentId}/admin-decision`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim-assessment-context", claimId] });
      qc.invalidateQueries({ queryKey: ["assessment-stats"] });
      toast("Admin decision recorded successfully", "ok");
    },
    onError: (err: any) => toast(err.message || "Decision submission failed", "error"),
  });

  // Generate Dossier Mutation
  const dossierMut = useMutation({
    mutationFn: () => api(`/assessments/claim/${claimId}/generate-dossier`, { method: "POST" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["claim-assessment-context", claimId] });
      toast("Official PMFBY PDF Dossier generated with QR Code seal", "ok");
      if (res.download_url) {
        window.open(res.download_url, "_blank");
      }
    },
    onError: () => toast("Failed to generate PDF dossier", "error"),
  });

  if (claimQ.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-8 w-8 text-forest" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-bold text-navy">Claim not found</p>
        <button onClick={() => nav(-1)} className="btn bg-forest text-white mt-4">
          Go Back
        </button>
      </div>
    );
  }

  const aiEst = payoutEstimate?.estimated_amount || 0;
  const isDiffSignificant = recommendedAmount !== "" && Math.abs(Number(recommendedAmount) - aiEst) / (aiEst || 1.0) > 0.10;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/app/insurance-assessment")}
            className="rounded-lg p-2 text-navy hover:bg-sage-100"
            title="Back to Assessment Desk"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-navy text-lg">{claim.ref}</span>
              <StatusBadge status={claim.status} />
              {existingAssessment?.status && (
                <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-900 uppercase">
                  {existingAssessment.status.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Farmer: <span className="font-semibold text-navy">{farmer?.name}</span> ({farmer?.district}) | Crop:{" "}
              <span className="font-semibold text-navy">{claim.crop_name}</span> | Calamity:{" "}
              <span className="font-semibold text-rose-800 uppercase">{claim.disaster_type}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dossier?.url ? (
            <a
              href={dossier.url}
              target="_blank"
              rel="noreferrer"
              className="btn bg-white border border-sage-200 text-forest hover:bg-sage-50 text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Dossier PDF</span>
            </a>
          ) : (
            <button
              onClick={() => dossierMut.mutate()}
              disabled={dossierMut.isPending}
              className="btn bg-white border border-sage-200 text-forest hover:bg-sage-50 text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              {dossierMut.isPending ? <Spinner className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <span>Generate Dossier PDF</span>
            </button>
          )}

          {dossier?.verify_url && (
            <Link
              to={dossier.verify_url}
              className="btn bg-gold text-navy hover:bg-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Verify QR Seal</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-sage-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-forest text-forest"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          1. Overview & Policy
        </button>
        <button
          onClick={() => setActiveTab("evidence")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "evidence"
              ? "border-forest text-forest"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          2. Ground Photos ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab("ai_agents")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "ai_agents"
              ? "border-forest text-forest"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          3. AI Verification Agents (6)
        </button>
        <button
          onClick={() => setActiveTab("payout")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "payout"
              ? "border-forest text-forest"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          4. PMFBY Payout Engine
        </button>
        <button
          onClick={() => setActiveTab("assessment")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "assessment"
              ? "border-forest text-forest"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          5. Underwriter Assessment Form
        </button>
      </div>

      {/* TAB 1: OVERVIEW & POLICY */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Farmer & Land Card */}
            <div className="card border border-sage-200 bg-white p-5 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-sage-100 pb-3">
                <p className="font-display text-sm font-bold text-navy flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-forest" />
                  <span>Farmer & Cadastral Parcel Identity</span>
                </p>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  e-KYC Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted font-semibold">Farmer Name</p>
                  <p className="font-bold text-navy mt-0.5 text-sm">{farmer?.name}</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Mobile Number</p>
                  <p className="font-bold text-navy mt-0.5 text-sm font-mono">+91 {farmer?.phone}</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">State / District</p>
                  <p className="font-bold text-navy mt-0.5">Karnataka / {farmer?.district}</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Village Circle</p>
                  <p className="font-bold text-navy mt-0.5">{farmer?.village || "Rural Circle"}</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Field Name & Area</p>
                  <p className="font-bold text-navy mt-0.5">
                    {field?.name} — {field?.area_ha} ha ({(field?.area_ha * 2.471).toFixed(2)} acres)
                  </p>
                </div>
                <div>
                  <p className="text-muted font-semibold">India Post DIGIPIN</p>
                  <p className="font-mono font-bold text-emerald-800 mt-0.5">{field?.digipin}</p>
                </div>
              </div>
            </div>

            {/* PMFBY Active Policy Schedule */}
            <div className="card border border-sage-200 bg-white p-5 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-sage-100 pb-3">
                <p className="font-display text-sm font-bold text-navy flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-forest" />
                  <span>PMFBY Underwriting Policy Schedule</span>
                </p>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  Active Coverage
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted font-semibold">Policy Number</p>
                  <p className="font-mono font-bold text-navy mt-0.5 text-sm">{policy?.policy_number}</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Insurance Company</p>
                  <p className="font-bold text-navy mt-0.5">{policy?.insurance_company}</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Crop & Season</p>
                  <p className="font-bold text-navy mt-0.5">{policy?.crop_name} ({policy?.season})</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Sum Insured per Hectare</p>
                  <p className="font-black text-forest mt-0.5 text-sm">
                    ₹{policy?.sum_insured_per_ha?.toLocaleString("en-IN")}/ha
                  </p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Total Insured Acreage</p>
                  <p className="font-bold text-navy mt-0.5">{policy?.insured_area_ha} ha</p>
                </div>
                <div>
                  <p className="text-muted font-semibold">Indemnity Level</p>
                  <p className="font-bold text-navy mt-0.5">{policy?.indemnity_level}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary Banner */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sage-50 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                AI Preliminary Multi-Evidence Consensus
              </p>
              <h3 className="text-lg font-black text-navy mt-1">
                {fusion?.outcome_category} — Score: {fusion?.score?.toFixed(1)}/100
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {fusion?.recommendation} (Evidence Completeness: {fusion?.evidence_completeness_pct?.toFixed(0)}%)
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted font-semibold">AI-Estimated Statutory Payout</p>
              <p className="text-2xl font-black text-forest-deep mt-0.5">
                ₹{payoutEstimate?.estimated_amount?.toLocaleString("en-IN")}
              </p>
              <button
                onClick={() => setActiveTab("assessment")}
                className="btn bg-forest text-white hover:bg-forest-deep text-xs font-bold mt-2 shadow-xs"
              >
                Proceed to Underwriter Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GROUND EVIDENCE PHOTOS */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-sage-100 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-navy">
                Field Evidence Photographs ({photos.length} Captured)
              </h3>
              <p className="text-xs text-muted">
                Each photograph is cryptographically fingerprinted via SHA-256 and verified against the field cadastral polygon.
              </p>
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="card p-12 text-center text-muted border border-dashed border-sage-300">
              <Camera className="mx-auto h-12 w-12 text-sage-300 mb-2" />
              <p className="font-bold text-navy">No ground photos uploaded for this claim</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p: any) => (
                <div key={p.id} className="card overflow-hidden border border-sage-200 bg-white shadow-soft">
                  <div className="relative aspect-video bg-sage-100 overflow-hidden">
                    <AuthImage
                      path={p.file_url}
                      alt={p.filename}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs">
                        {p.is_geocamera ? "Live GeoCamera" : "Standard Upload"}
                      </span>
                      {p.geofence_status === "inside" && (
                        <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          Inside Parcel
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-navy truncate max-w-[180px]">{p.filename}</p>
                      <span className="text-[11px] text-muted">{p.size_mb} MB</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-muted">
                      <div>
                        <span>GPS Coordinates:</span>
                        <p className="font-mono font-semibold text-navy">
                          {p.lat ? `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}` : "Unavailable"}
                        </p>
                      </div>
                      <div>
                        <span>Captured Time:</span>
                        <p className="font-semibold text-navy">
                          {p.taken_at ? new Date(p.taken_at).toLocaleTimeString() : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-sage-100 pt-2 text-[10px] font-mono text-muted truncate">
                      SHA-256: {p.sha256}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI VERIFICATION AGENTS */}
      {activeTab === "ai_agents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-sage-100 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-navy">
                Six Autonomous AI Verification Agents Scorecard
              </h3>
              <p className="text-xs text-muted">
                Transparent multi-sensor verification evaluating spatial, optical, spectral, and statutory consistency.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aiAgents.map((ag: any) => {
              let tone = "border-sage-200 bg-white";
              let badgeTone = "bg-emerald-100 text-emerald-800";
              if (ag.status === "warning") {
                tone = "border-amber-200 bg-amber-50/30";
                badgeTone = "bg-amber-100 text-amber-800";
              } else if (ag.status === "anomaly_detected" || ag.status === "error") {
                tone = "border-rose-200 bg-rose-50/30";
                badgeTone = "bg-rose-100 text-rose-800";
              }

              return (
                <div key={ag.id} className={`card border p-4 shadow-soft space-y-3 ${tone}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">
                        Agent #{ag.id} (Weight {ag.weight}%)
                      </p>
                      <h4 className="font-extrabold text-navy text-sm capitalize mt-0.5">
                        {ag.agent_name.replace("_", " ")} Agent
                      </h4>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-black ${badgeTone}`}>
                      {ag.score.toFixed(1)}/100
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    {ag.findings?.recommendation || ag.findings?.scoring_explanation || ag.findings?.error || "Verified against statutory thresholds."}
                  </p>

                  {ag.risk_flags && ag.risk_flags.length > 0 && (
                    <div className="space-y-1 rounded bg-rose-50 p-2 border border-rose-200">
                      <p className="text-[10px] font-bold text-rose-900 uppercase">Risk Flags Detected</p>
                      {ag.risk_flags.map((rf: string, idx: number) => (
                        <p key={idx} className="text-[11px] text-rose-800 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" />
                          <span>{rf}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted border-t border-sage-100 pt-2">
                    <span>Duration: {ag.duration_ms}ms</span>
                    <span className="uppercase font-semibold">{ag.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PMFBY PAYOUT ENGINE */}
      {activeTab === "payout" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-sage-100 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-navy">
                Statutory PMFBY Actuarial Payout Engine
              </h3>
              <p className="text-xs text-muted">
                Transparent calculation based on PMFBY Operational Guidelines for Localized Calamities.
              </p>
            </div>
            <button
              onClick={() => recalcMut.mutate()}
              disabled={recalcMut.isPending}
              className="btn bg-white border border-sage-200 text-forest hover:bg-sage-50 text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${recalcMut.isPending ? "animate-spin" : ""}`} />
              <span>Recalculate AI Payout</span>
            </button>
          </div>

          {/* Core Calculation Breakdown Card */}
          <div className="card border-2 border-forest/20 bg-white p-6 shadow-soft space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-sage-50/70 p-4 border border-sage-200">
                <p className="text-xs font-semibold text-muted">Assessed Eligible Area</p>
                <p className="text-2xl font-black text-navy mt-1">
                  {payoutEstimate?.eligible_area_ha?.toFixed(2)} ha
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Min(Claimed: {payoutEstimate?.claimed_area_ha} ha, Insured: {payoutEstimate?.insured_area_ha} ha)
                </p>
              </div>

              <div className="rounded-xl bg-sage-50/70 p-4 border border-sage-200">
                <p className="text-xs font-semibold text-muted">Sum Insured per Hectare</p>
                <p className="text-2xl font-black text-navy mt-1">
                  ₹{payoutEstimate?.sum_insured_per_ha?.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted mt-0.5">PMFBY District Scale of Finance</p>
              </div>

              <div className="rounded-xl bg-sage-50/70 p-4 border border-sage-200">
                <p className="text-xs font-semibold text-muted">Assessed Damage (%)</p>
                <p className="text-2xl font-black text-rose-700 mt-1">
                  {payoutEstimate?.loss_percentage?.toFixed(1)}%
                </p>
                <p className="text-[11px] text-muted mt-0.5">Multi-Evidence Blended Loss</p>
              </div>

              <div className="rounded-xl bg-emerald-50/80 p-4 border border-emerald-300">
                <p className="text-xs font-bold text-emerald-900">AI-Estimated Payout</p>
                <p className="text-3xl font-black text-emerald-800 mt-1">
                  ₹{payoutEstimate?.estimated_amount?.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  Indemnity Level: {payoutEstimate?.indemnity_level}%
                </p>
              </div>
            </div>

            {/* Formula Explanation */}
            <div className="rounded-xl bg-navy text-white p-4 font-mono text-xs space-y-1.5 shadow-inner">
              <p className="text-gold font-bold">PMFBY STATUTORY CALCULATION FORMULA:</p>
              <p className="text-white/90 text-sm">{payoutEstimate?.formula}</p>
              <p className="text-white/60 text-[11px] pt-1">
                Method: {payoutEstimate?.method} | Standard Deductions: ₹{payoutEstimate?.deduction_amount || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: UNDERWRITER ASSESSMENT FORM */}
      {activeTab === "assessment" && (
        <div className="space-y-6">
          <div className="card border border-sage-200 bg-white p-6 shadow-soft space-y-6">
            <div className="border-b border-sage-100 pb-4">
              <h3 className="text-base font-extrabold text-navy">
                Authorized Insurance Officer Recommendation Form
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Review the AI-estimated recommendation, adjust damage parameters based on field audit notes if needed, and submit for final approval.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="label text-xs font-bold text-navy">
                  Assessed Eligible Area (Hectares) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={assessedAreaHa}
                  onChange={(e) => setAssessedAreaHa(e.target.value === "" ? "" : Number(e.target.value))}
                  className="input text-sm font-semibold"
                  placeholder="2.0"
                />
                <p className="text-[11px] text-muted mt-1">
                  Cannot exceed insured policy area ({policy?.insured_area_ha} ha).
                </p>
              </div>

              <div>
                <label className="label text-xs font-bold text-navy">
                  Assessed Crop Loss / Damage Percentage (%) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="0.5"
                    value={assessedDamagePct}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setAssessedDamagePct(v);
                      // Auto-update recommended amount
                      if (assessedAreaHa !== "" && policy?.sum_insured_per_ha) {
                        const rec = Number(assessedAreaHa) * policy.sum_insured_per_ha * (v / 100.0) * ((policy.indemnity_level || 90) / 100.0) - deductions;
                        setRecommendedAmount(Math.round(Math.max(0, rec)));
                      }
                    }}
                    className="flex-1"
                  />
                  <span className="font-mono font-black text-rose-700 text-base min-w-[55px]">
                    {assessedDamagePct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <label className="label text-xs font-bold text-navy">
                  Recommended Payout Amount (₹) *
                </label>
                <input
                  type="number"
                  value={recommendedAmount}
                  onChange={(e) => setRecommendedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="input text-base font-black text-forest-deep"
                  placeholder="35000"
                />
                <p className="text-[11px] text-muted mt-1">
                  AI Estimated Benchmark: ₹{aiEst.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <label className="label text-xs font-bold text-navy">
                  Statutory Deductions / Salvage Value (₹)
                </label>
                <input
                  type="number"
                  value={deductions}
                  onChange={(e) => setDeductions(Number(e.target.value))}
                  className="input text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Mandatory Difference Reason if diverging from AI estimate */}
            {isDiffSignificant && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <p className="text-xs font-bold text-amber-950">
                    Underwriter Divergence Justification Required
                  </p>
                </div>
                <p className="text-xs text-amber-900">
                  Your recommended amount (₹{Number(recommendedAmount).toLocaleString("en-IN")}) differs by more than 10% from the AI estimate (₹{aiEst.toLocaleString("en-IN")}). Provide statutory rationale for underwriting audit:
                </p>
                <textarea
                  value={officerDiffReason}
                  onChange={(e) => setOfficerDiffReason(e.target.value)}
                  rows={2}
                  className="input text-xs bg-white"
                  placeholder="State ground inspection findings, pest infestation overlay, or weather station distance factor justifying variance..."
                />
              </div>
            )}

            <div>
              <label className="label text-xs font-bold text-navy">
                Underwriter Inspection & Technical Remarks *
              </label>
              <textarea
                value={officerRemarks}
                onChange={(e) => setOfficerRemarks(e.target.value)}
                rows={3}
                className="input text-sm"
                placeholder="Detailed notes on crop phenology, inundation duration, and ground photo consistency..."
              />
            </div>

            {/* Statutory Declaration Checkbox */}
            <div className="rounded-xl bg-sage-50/70 p-4 border border-sage-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-sage-300 text-forest focus:ring-forest"
                />
                <span className="text-xs text-navy leading-relaxed">
                  <b>Statutory PMFBY Underwriting Declaration:</b> I hereby certify that this crop loss evaluation has been conducted in accordance with Pradhan Mantri Fasal Bima Yojana operational guidelines. Satellite indicators and geotagged field photos have been verified against cadastral land records without conflict of interest.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sage-100 pt-4">
              <button
                onClick={() => {
                  saveDraftMut.mutate({
                    recommended_amount: recommendedAmount === "" ? null : Number(recommendedAmount),
                    assessed_damage_pct: assessedDamagePct,
                    assessed_eligible_area_ha: assessedAreaHa === "" ? null : Number(assessedAreaHa),
                    deduction_amount: deductions,
                    officer_remarks: officerRemarks,
                    officer_difference_reason: officerDiffReason,
                  });
                }}
                disabled={saveDraftMut.isPending}
                className="btn bg-white border border-sage-200 text-navy hover:bg-sage-50 text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Save className="h-4 w-4" />
                <span>Save Draft</span>
              </button>

              <button
                onClick={() => {
                  if (!declarationAccepted) {
                    toast("Please accept the underwriting declaration", "error");
                    return;
                  }
                  if (recommendedAmount === "" || Number(recommendedAmount) < 0) {
                    toast("Please specify a valid recommended amount", "error");
                    return;
                  }
                  if (isDiffSignificant && !officerDiffReason.trim()) {
                    toast("Please provide justification for difference with AI estimate", "error");
                    return;
                  }
                  submitMut.mutate({
                    recommended_amount: Number(recommendedAmount),
                    assessed_damage_pct: assessedDamagePct,
                    assessed_eligible_area_ha: Number(assessedAreaHa),
                    deduction_amount: deductions,
                    officer_remarks: officerRemarks,
                    officer_difference_reason: officerDiffReason,
                    declaration_accepted: declarationAccepted,
                  });
                }}
                disabled={submitMut.isPending || !declarationAccepted}
                className="btn bg-forest-deep text-white hover:bg-forest text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {submitMut.isPending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4 text-gold" />}
                <span>Submit for Competent Authority Approval</span>
              </button>
            </div>
          </div>

          {/* Admin Adjudication Block (visible if user is Admin or if decision exists) */}
          {user?.role === "admin" && existingAssessment && existingAssessment.status === "submitted_for_approval" && (
            <div className="card border-2 border-purple-300 bg-purple-50/40 p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-800" />
                  <h3 className="font-display text-sm font-black text-purple-950">
                    Competent Authority Final Adjudication
                  </h3>
                </div>
                <span className="rounded bg-purple-200 px-2 py-0.5 text-xs font-bold text-purple-900">
                  Admin Authority
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label text-xs font-bold text-purple-950">Decision Action</label>
                  <select
                    value={adminDecision}
                    onChange={(e: any) => setAdminDecision(e.target.value)}
                    className="input text-sm bg-white"
                  >
                    <option value="approve">Approve Recommended Amount (₹{existingAssessment.recommended_amount?.toLocaleString("en-IN")})</option>
                    <option value="modify">Modify Approved Amount</option>
                    <option value="reject">Reject Claim</option>
                    <option value="return_for_evidence">Return for Additional Ground Evidence</option>
                  </select>
                </div>

                {adminDecision === "modify" && (
                  <div>
                    <label className="label text-xs font-bold text-purple-950">Modified Approved Amount (₹) *</label>
                    <input
                      type="number"
                      value={adminApprovedAmount}
                      onChange={(e) => setAdminApprovedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="input text-sm bg-white font-bold text-emerald-800"
                      placeholder="Enter sanctioned amount"
                    />
                  </div>
                )}
              </div>

              {adminDecision === "modify" && (
                <div>
                  <label className="label text-xs font-bold text-purple-950">Mandatory Justification for Modification *</label>
                  <textarea
                    value={adminModReason}
                    onChange={(e) => setAdminModReason(e.target.value)}
                    rows={2}
                    className="input text-xs bg-white"
                    placeholder="Enter statutory reason for adjusting underwriter recommended amount..."
                  />
                </div>
              )}

              {adminDecision === "reject" && (
                <div>
                  <label className="label text-xs font-bold text-purple-950">Mandatory Statutory Rejection Reason *</label>
                  <textarea
                    value={adminRejectReason}
                    onChange={(e) => setAdminRejectReason(e.target.value)}
                    rows={2}
                    className="input text-xs bg-white"
                    placeholder="Specify grounds for denial under PMFBY guidelines..."
                  />
                </div>
              )}

              {adminDecision === "return_for_evidence" && (
                <div>
                  <label className="label text-xs font-bold text-purple-950">Instructions for Farmer / Officer *</label>
                  <textarea
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    rows={2}
                    className="input text-xs bg-white"
                    placeholder="Describe specific field evidence required..."
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    adminDecisionMut.mutate({
                      assessmentId: existingAssessment.id,
                      body: {
                        decision: adminDecision,
                        approved_amount: adminDecision === "modify" ? Number(adminApprovedAmount) : existingAssessment.recommended_amount,
                        modification_reason: adminModReason,
                        rejection_reason: adminRejectReason,
                        remarks: adminRemarks,
                      }
                    });
                  }}
                  disabled={adminDecisionMut.isPending}
                  className="btn bg-purple-900 text-white hover:bg-purple-950 text-xs font-bold px-4 py-2 shadow-md"
                >
                  {adminDecisionMut.isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Confirm Authority Decision</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
