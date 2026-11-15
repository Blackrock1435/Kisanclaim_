import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu, ShieldCheck, AlertTriangle, Play, RefreshCw, CheckCircle2,
  ChevronRight, Scale, MapPin, Camera, Satellite, CloudRain, FileCheck,
  Layers, ArrowLeft, Search, User, FileText, Download, History,
  Sparkles, TrendingUp, BarChart3, Clock, AlertCircle, FileSpreadsheet,
  Check, ArrowRight, ShieldAlert, Award
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api, getBaseApiUrl } from "../lib/api";
import { Alert, AuthImage, Spinner, toast } from "../components/ui";
import ErrorBoundary from "../components/ErrorBoundary";

const AGENT_ICONS: Record<string, any> = {
  geolocation: MapPin,
  photo_integrity: Camera,
  satellite: Satellite,
  weather: CloudRain,
  land_policy: FileCheck,
  fusion_risk: Layers,
};

const AGENT_TITLES: Record<string, string> = {
  geolocation: "1. GeoLocation Verification Agent",
  photo_integrity: "2. Photo Integrity Agent",
  satellite: "3. Satellite Analysis Agent",
  weather: "4. Weather Verification Agent",
  land_policy: "5. Land & Policy / Bhoomi Agent",
  fusion_risk: "6. Multi-Evidence Fusion & Risk Agent",
};

export default function AgentAnalysis() {
  return (
    <ErrorBoundary>
      <AgentAnalysisContent />
    </ErrorBoundary>
  );
}

function AgentAnalysisContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Mode: "individual" (primary claim verification) vs "analytics" (overall platform stats)
  const [mode, setMode] = useState<"individual" | "analytics">("individual");

  // Selection states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>("fusion_risk");
  const [generatedDossier, setGeneratedDossier] = useState<any | null>(null);

  // 1. Fetch Farmers for Search & Selector
  const { data: farmers = [], isLoading: farmersLoading } = useQuery({
    queryKey: ["agent-farmers", searchQuery],
    queryFn: () => api(`/agents/farmers${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`),
  });

  // Handle URL param initialization (e.g. ?claimId=7 or ?farmerId=3)
  useEffect(() => {
    const claimParam = searchParams.get("claimId");
    const farmerParam = searchParams.get("farmerId");
    if (claimParam) {
      const cid = parseInt(claimParam, 10);
      if (!isNaN(cid)) setSelectedClaimId(cid);
    }
    if (farmerParam) {
      const fid = parseInt(farmerParam, 10);
      if (!isNaN(fid)) setSelectedFarmerId(fid);
    }
  }, [searchParams]);

  // If no farmer selected yet but farmers list loaded, auto-select first farmer
  useEffect(() => {
    if (!selectedFarmerId && farmers && farmers.length > 0) {
      setSelectedFarmerId(farmers[0].id);
    }
  }, [farmers, selectedFarmerId]);

  // 2. Fetch Selected Farmer Profile and their Claims
  const { data: farmerProfile, isLoading: farmerProfileLoading } = useQuery({
    queryKey: ["agent-farmer-profile", selectedFarmerId],
    queryFn: () => api(`/agents/farmers/${selectedFarmerId}`),
    enabled: !!selectedFarmerId,
  });

  // When farmer profile loads, auto-select a claim if none selected or if current claim doesn't belong to this farmer
  useEffect(() => {
    if (farmerProfile?.claims && farmerProfile.claims.length > 0) {
      const belongs = farmerProfile.claims.some((c: any) => c.id === selectedClaimId);
      if (!selectedClaimId || !belongs) {
        setSelectedClaimId(farmerProfile.claims[0].id);
        setSelectedExecutionId(null);
      }
    }
  }, [farmerProfile, selectedClaimId]);

  // 3. Fetch Selected Claim Context (Evidence inventory, details)
  const { data: claimContext, isLoading: claimContextLoading } = useQuery({
    queryKey: ["agent-claim-context", selectedClaimId],
    queryFn: () => api(`/agents/claims/${selectedClaimId}`),
    enabled: !!selectedClaimId,
  });

  // 4. Fetch Claim Agent Results & Execution History
  const {
    data: agentData,
    isLoading: resultsLoading,
    refetch: refetchResults,
  } = useQuery({
    queryKey: ["agent-results", selectedClaimId, selectedExecutionId],
    queryFn: () =>
      api(`/agents/results/${selectedClaimId}${selectedExecutionId ? `?execution_id=${selectedExecutionId}` : ""}`),
    enabled: !!selectedClaimId,
  });

  // 5. Fetch Mode B: Overall Platform Analytics
  const { data: platformAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["agent-platform-analytics"],
    queryFn: () => api("/agents/platform-analytics"),
    enabled: mode === "analytics",
  });

  // Mutation: Run Verification for This Claim
  const runMutation = useMutation({
    mutationFn: () => api(`/agents/run/${selectedClaimId}`, { method: "POST" }),
    onSuccess: (res: any) => {
      setSelectedExecutionId(res.execution_id);
      queryClient.invalidateQueries({ queryKey: ["agent-results", selectedClaimId] });
      queryClient.invalidateQueries({ queryKey: ["agent-farmer-profile", selectedFarmerId] });
      queryClient.invalidateQueries({ queryKey: ["agent-platform-analytics"] });
      refetchResults();
      toast("Verification completed across all 6 autonomous agents!");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to run claim verification", "error");
    },
  });

  // Mutation: Generate Claim PDF Report
  const reportMutation = useMutation({
    mutationFn: () => api(`/reports/dossier/${selectedClaimId}`, { method: "POST" }),
    onSuccess: (res: any) => {
      setGeneratedDossier(res);
      toast("Evidence Dossier PDF generated successfully with verification token!");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to generate dossier report", "error");
    },
  });

  const activeAgent =
    agentData?.executions?.find((e: any) => e.agent_name === selectedAgent) ||
    agentData?.executions?.[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Top Header & Mode Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white shadow-soft">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-deep tracking-tight">
                AI Verification Agents System
              </h1>
              <p className="text-xs sm:text-sm text-navy/70">
                Transparent multi-evidence evaluation: GeoLocation, Photo Integrity, Sentinel-2, ERA5 Weather, Bhoomi & Fusion.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Mode Switcher */}
        <div className="inline-flex rounded-xl border border-sage-200 bg-sage-50/80 p-1 shadow-xs">
          <button
            onClick={() => setMode("individual")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              mode === "individual"
                ? "bg-forest text-white shadow-sm"
                : "text-navy/70 hover:text-navy hover:bg-white/50"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Mode A: Individual Claim Verification</span>
          </button>
          <button
            onClick={() => setMode("analytics")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              mode === "analytics"
                ? "bg-forest text-white shadow-sm"
                : "text-navy/70 hover:text-navy hover:bg-white/50"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Mode B: Overall Platform Analytics</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE B: OVERALL PLATFORM ANALYTICS                                        */}
      {/* ========================================================================= */}
      {mode === "analytics" && (
        <div className="space-y-6">
          {/* Statutory Isolation Notice */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-950 mb-0.5">
                Macro Administrative Monitoring Mode
              </p>
              <p className="leading-relaxed">
                Overall platform analytics represent aggregate administrative metrics across all enrolled farmers and claims.
                <strong> Under PMFBY statutory rules, aggregate statistics are strictly separated and are never used as evidence or underwriting criteria for an individual farmer's claim.</strong>
              </p>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner className="h-8 w-8 text-forest" />
            </div>
          ) : platformAnalytics ? (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-xl border border-sage-200 bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Total Enrolled Farmers
                  </span>
                  <p className="mt-1 text-2xl font-black text-navy">
                    {platformAnalytics.metrics.total_farmers}
                  </p>
                  <p className="mt-1 text-[11px] text-forest flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> All KYC verified
                  </p>
                </div>

                <div className="rounded-xl border border-sage-200 bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Total Claims Filed
                  </span>
                  <p className="mt-1 text-2xl font-black text-navy">
                    {platformAnalytics.metrics.total_claims}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">Kharif & Rabi seasons</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Pending Claims
                  </span>
                  <p className="mt-1 text-2xl font-black text-amber-900">
                    {platformAnalytics.metrics.pending_claims}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">Awaiting officer review</p>
                </div>

                <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-800">
                    Completed AI Runs
                  </span>
                  <p className="mt-1 text-2xl font-black text-green-900">
                    {platformAnalytics.metrics.completed_verifications}
                  </p>
                  <p className="mt-1 text-[11px] text-green-700">Multi-agent verified</p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">
                    Manual Review Required
                  </span>
                  <p className="mt-1 text-2xl font-black text-red-900">
                    {platformAnalytics.metrics.claims_requiring_manual_review}
                  </p>
                  <p className="mt-1 text-[11px] text-red-700">Risk flags detected</p>
                </div>
              </div>

              {/* Risk Distribution Breakdown */}
              <div className="rounded-2xl border border-sage-200 bg-white p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-forest-deep flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-forest" />
                    Overall Claim Risk Distribution
                  </h3>
                  <span className="text-xs text-muted">
                    Evaluated: {platformAnalytics.risk_distribution.total_evaluated} claims
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-green-200 bg-green-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-green-800 uppercase">
                        Low Risk (Score ≥ 80)
                      </span>
                      <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-extrabold text-green-900">
                        {platformAnalytics.risk_distribution.low_risk}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-green-900 leading-relaxed">
                      Statutory criteria satisfied; corroborated by Sentinel-2 NDVI canopy decline and rainfall anomaly.
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 uppercase">
                        Moderate Risk (60–79)
                      </span>
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-900">
                        {platformAnalytics.risk_distribution.moderate_risk}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-amber-900 leading-relaxed">
                      Minor discrepancies or incomplete evidence; surveyor physical cross-inspection advised.
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-800 uppercase">
                        High Risk (&lt; 60)
                      </span>
                      <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-extrabold text-red-900">
                        {platformAnalytics.risk_distribution.high_risk}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-red-900 leading-relaxed">
                      Severe contradiction flags detected (duplicate photo, geofence mismatch, or weather disagreement).
                    </p>
                  </div>
                </div>
              </div>

              {/* Agent Performance Table */}
              <div className="rounded-2xl border border-sage-200 bg-white p-6 shadow-soft space-y-4">
                <h3 className="font-display font-bold text-lg text-forest-deep flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-forest" />
                  Autonomous Agent Execution Performance
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-sage-50 text-navy/80 uppercase tracking-wider font-bold border-b border-sage-200">
                      <tr>
                        <th className="py-3 px-4">Verification Agent</th>
                        <th className="py-3 px-4">Total Invocations</th>
                        <th className="py-3 px-4">Average Score</th>
                        <th className="py-3 px-4">Avg Duration</th>
                        <th className="py-3 px-4">Anomaly Flag Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-100">
                      {platformAnalytics.agent_performance.map((ap: any) => {
                        const Icon = AGENT_ICONS[ap.agent_name] || Cpu;
                        return (
                          <tr key={ap.agent_name} className="hover:bg-sage-50/50">
                            <td className="py-3.5 px-4 font-semibold text-navy flex items-center gap-2">
                              <Icon className="h-4 w-4 text-forest" />
                              <span>{AGENT_TITLES[ap.agent_name] || ap.agent_name}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono">{ap.total_runs}</td>
                            <td className="py-3.5 px-4 font-bold text-forest-deep">{ap.average_score} / 100</td>
                            <td className="py-3.5 px-4 font-mono text-muted">{ap.average_duration_ms} ms</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`rounded px-2 py-0.5 font-bold ${
                                  ap.anomaly_rate_pct > 15
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {ap.anomaly_rate_pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE A: INDIVIDUAL CLAIM VERIFICATION (PRIMARY WORKFLOW)                  */}
      {/* ========================================================================= */}
      {mode === "individual" && (
        <div className="space-y-6">
          {/* 1. Farmer & Claim Selection Panel */}
          <div className="rounded-2xl border-2 border-forest/20 bg-white p-5 shadow-soft space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-white text-xs font-black">
                  1
                </span>
                <h2 className="font-display font-bold text-base text-navy">
                  Select Farmer and Claim Context
                </h2>
              </div>
              <span className="text-xs text-muted">
                Every agent execution is strictly scoped to the selected farmer and claim ID.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Search Farmer Input */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-forest" />
                  Search Farmer (Name, Phone, ID, Claim ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Ramesh, 9876543210, 3, or claim ID..."
                    className="w-full rounded-xl border border-sage-300 bg-sage-50/50 px-3.5 py-2.5 text-xs text-navy placeholder:text-muted focus:border-forest focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                  {farmersLoading && (
                    <div className="absolute right-3 top-2.5">
                      <Spinner className="h-4 w-4 text-forest" />
                    </div>
                  )}
                </div>
              </div>

              {/* Select Farmer Dropdown */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-forest" />
                  Select Registered Farmer
                </label>
                <select
                  value={selectedFarmerId || ""}
                  onChange={(e) => {
                    const fid = parseInt(e.target.value, 10);
                    setSelectedFarmerId(fid);
                    setSelectedClaimId(null);
                    setSelectedExecutionId(null);
                    setSearchParams({ farmerId: String(fid) });
                  }}
                  className="w-full rounded-xl border border-sage-300 bg-sage-50/50 px-3 py-2.5 text-xs font-medium text-navy focus:border-forest focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest"
                >
                  {farmers.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (ID: #{f.id} • {f.phone} • {f.claims_count} claims)
                    </option>
                  ))}
                  {farmers.length === 0 && (
                    <option value="">No farmers found</option>
                  )}
                </select>
              </div>

              {/* Select Claim Dropdown */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-forest" />
                  Select Claim
                </label>
                <select
                  value={selectedClaimId || ""}
                  onChange={(e) => {
                    const cid = parseInt(e.target.value, 10);
                    setSelectedClaimId(cid);
                    setSelectedExecutionId(null);
                    setSearchParams({ claimId: String(cid), farmerId: String(selectedFarmerId) });
                  }}
                  disabled={!farmerProfile?.claims || farmerProfile.claims.length === 0}
                  className="w-full rounded-xl border border-sage-300 bg-sage-50/50 px-3 py-2.5 text-xs font-medium text-navy focus:border-forest focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest disabled:opacity-50"
                >
                  {farmerProfile?.claims?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      Claim #{c.id} ({c.crop_name} • {c.disaster_type} • {c.status})
                    </option>
                  ))}
                  {(!farmerProfile?.claims || farmerProfile.claims.length === 0) && (
                    <option value="">No claims submitted</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Farmer Profile & Claim Information Cards */}
          {farmerProfile && claimContext && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Farmer Profile Card */}
              <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-sage-100 pb-2.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-forest">
                    Farmer Profile & Registry
                  </span>
                  <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-bold text-forest">
                    ID #{farmerProfile.farmer.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted block text-[11px]">Farmer Name</span>
                    <strong className="text-navy text-sm">{farmerProfile.farmer.name}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Phone Number</span>
                    <strong className="text-navy">{farmerProfile.farmer.phone}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">District & State</span>
                    <strong className="text-navy">{farmerProfile.farmer.district}, Karnataka</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Village / Taluk</span>
                    <strong className="text-navy">{farmerProfile.farmer.village}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Registered Farmland</span>
                    <strong className="text-navy">
                      {farmerProfile.farmer.farms_count} farm(s) • {farmerProfile.farms?.[0]?.fields?.length || 0} field(s)
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Total Submitted Claims</span>
                    <strong className="text-forest-deep">{farmerProfile.farmer.claims_count} claim(s)</strong>
                  </div>
                </div>
              </div>

              {/* Claim Details Card */}
              <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-sage-100 pb-2.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-forest">
                    Selected Claim Information
                  </span>
                  <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 uppercase">
                    {claimContext.claim.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted block text-[11px]">Claim Reference</span>
                    <strong className="text-navy font-mono text-sm">{claimContext.claim.ref}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Crop & Season</span>
                    <strong className="text-navy">
                      {claimContext.claim.crop_name} ({claimContext.claim.season})
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Declared Disaster</span>
                    <strong className="text-navy uppercase text-red-700">
                      {claimContext.claim.disaster_type} • {claimContext.claim.incident_date}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Field Parcel & DIGIPIN</span>
                    <strong className="text-navy">
                      {claimContext.claim.field_name} • <span className="font-mono text-forest">{claimContext.claim.digipin}</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Acreage Area</span>
                    <strong className="text-navy">
                      {claimContext.claim.area_ha} ha ({(claimContext.claim.area_ha * 2.471).toFixed(2)} acres)
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Damage Photographs</span>
                    <strong className="text-navy font-bold">
                      {claimContext.evidence_counts.total_photos} verified photo(s)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Submitted Evidence Inspection Drawer */}
          {claimContext && (
            <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-sage-100 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-forest" />
                  <h3 className="font-display font-bold text-sm text-navy">
                    Submitted Evidence Inventory for Claim #{claimContext.claim.id}
                  </h3>
                </div>
                <span className="text-xs text-muted">
                  {claimContext.evidence.length} standard photo(s) • {claimContext.evidence_counts.geocamera_photos} GeoCamera photo(s)
                </span>
              </div>

              {claimContext.evidence && claimContext.evidence.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {claimContext.evidence.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="group relative rounded-xl border border-sage-200 bg-sage-50/50 p-2 shadow-2xs hover:border-forest transition-all"
                    >
                      <div className="aspect-video w-full overflow-hidden rounded-lg bg-sage-100">
                        <AuthImage
                          path={`/evidence/${ev.id}/file`}
                          alt={ev.filename}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="mt-1.5 truncate text-[11px] font-bold text-navy" title={ev.filename}>
                        {ev.filename}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-muted">
                        <span>{ev.size_mb ? `${ev.size_mb} MB` : "Uploaded"}</span>
                        <span
                          className={`font-semibold ${
                            ev.has_gps ? "text-green-700" : "text-amber-700"
                          }`}
                        >
                          {ev.has_gps ? "📍 GPS Tagged" : "No GPS"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sage-300 p-6 text-center text-xs text-muted">
                  <Camera className="h-8 w-8 text-sage-400 mx-auto mb-2" />
                  <p className="font-semibold text-navy">No ground photos submitted yet</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Agent 2 will flag missing photographic evidence and require surveyor site inspection.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. Action Controls Bar & Re-verification History Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-forest/20 bg-gradient-to-r from-forest-deep via-forest to-forest-deep p-5 text-white shadow-soft">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold">
                Claim Verification Execution Control
              </span>
              <h3 className="font-display font-black text-xl flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-300" />
                Run Autonomous Verification Engine
              </h3>
              <p className="text-xs text-white/80 max-w-xl mt-1">
                Executes all 6 independent agents against this specific claim. Each execution is preserved in audit history with a unique ID.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* History / Re-verification Selector Dropdown */}
              {agentData?.history && agentData.history.length > 1 && (
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/20 text-xs">
                  <History className="h-4 w-4 text-gold shrink-0" />
                  <span className="text-[11px] font-semibold text-white/90">Run:</span>
                  <select
                    value={agentData.execution_id || ""}
                    onChange={(e) => setSelectedExecutionId(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    {agentData.history.map((h: any) => (
                      <option key={h.execution_id} value={h.execution_id} className="text-navy">
                        Run #{h.run_number} ({new Date(h.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) — Score {h.score}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Run Verification Button */}
              <button
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending || !selectedClaimId}
                className="btn btn-gold !min-h-[44px] !px-5 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {runMutation.isPending ? (
                  <Spinner className="h-4 w-4 text-navy" />
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-navy text-navy" />
                    <span>Run Verification for This Claim</span>
                  </>
                )}
              </button>

              {/* Generate PDF Report Button */}
              <button
                onClick={() => reportMutation.mutate()}
                disabled={reportMutation.isPending || !selectedClaimId}
                className="btn btn-ghost !text-white !border-white/30 hover:!bg-white/15 text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                {reportMutation.isPending ? (
                  <Spinner className="h-4 w-4 text-white" />
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Generate Claim Report (PDF)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Re-verification Comparison Banner (if comparing runs) */}
          {agentData?.comparison && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900 block">
                    Re-Verification Audit Comparison
                  </span>
                  <span>
                    Compared to previous Run (
                    {new Date(agentData.comparison.previous_date).toLocaleString()}):{" "}
                    <strong>
                      Score Delta: {agentData.comparison.score_delta >= 0 ? `+${agentData.comparison.score_delta}` : agentData.comparison.score_delta} pts
                    </strong>
                    {" • "}Risk Flags: {agentData.comparison.flags_delta >= 0 ? `+${agentData.comparison.flags_delta}` : agentData.comparison.flags_delta}
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-200/80 px-3 py-1 text-[11px] font-bold text-emerald-900">
                Audit Trail Preserved
              </span>
            </div>
          )}

          {/* Generated Dossier Notification Banner */}
          {generatedDossier && (
            <div className="rounded-xl border border-gold/40 bg-amber-50 p-4 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <FileCheck className="h-5 w-5 text-amber-800 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 block text-sm">
                    Evidence Dossier PDF Ready
                  </span>
                  <span className="font-mono text-[11px] text-amber-800">
                    Token: {generatedDossier.token} • SHA-256: {generatedDossier.sha256_hash?.slice(0, 24)}...
                  </span>
                </div>
              </div>
              <a
                href={`${getBaseApiUrl()}/reports/download/${generatedDossier.token}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Signed PDF</span>
              </a>
            </div>
          )}

          {/* 5. Underwriting Score & Statutory Recommendation Banner */}
          {agentData && (
            <div className="rounded-2xl border-2 border-forest/30 bg-gradient-to-r from-forest-deep via-forest to-forest-deep text-white p-6 shadow-soft flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-gold font-bold">
                    Autonomous PMFBY Evidence Score
                  </span>
                  <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
                    {agentData.execution_id}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black">{agentData.final_score}</span>
                  <span className="text-xl text-white/70 font-semibold">/ 100</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      agentData.final_score >= 80
                        ? "bg-green-500/25 text-green-300 border border-green-400/40"
                        : agentData.final_score >= 60
                        ? "bg-amber-500/25 text-amber-300 border border-amber-400/40"
                        : "bg-red-500/25 text-red-300 border border-red-400/40"
                    }`}
                  >
                    {agentData.outcome_category}
                  </span>
                </div>
                <p className="text-sm text-white/85 max-w-xl mt-2 leading-relaxed">
                  {agentData.recommendation}
                </p>
                <p className="text-xs text-emerald-200/90 font-medium pt-1">
                  Evidence Completeness: <strong>{agentData.evidence_completeness_pct}%</strong>
                </p>
              </div>

              {/* Component Weights Breakdown Pill */}
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/15 text-xs space-y-1.5">
                <p className="font-bold text-gold uppercase tracking-wider">Transparent Weights</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/90">
                  <span>GeoLocation: <strong>15%</strong></span>
                  <span>Photo Integrity: <strong>15%</strong></span>
                  <span>Satellite: <strong>25%</strong></span>
                  <span>Weather: <strong>15%</strong></span>
                  <span>Land & Policy: <strong>20%</strong></span>
                  <span>Consistency: <strong>10%</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Grid: 6 Agent Cards on Left, Detailed Inspector on Right */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
            {/* Left Column: 6 Agent Execution Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="font-display font-bold text-sm text-navy uppercase tracking-wider">
                  Independent Verification Findings
                </h3>
                <span className="text-xs text-muted">Click an agent to inspect evidence</span>
              </div>

              {agentData?.executions?.map((exec: any) => {
                const Icon = AGENT_ICONS[exec.agent_name] || Cpu;
                const isSelected = (selectedAgent || agentData.executions[0].agent_name) === exec.agent_name;
                return (
                  <div
                    key={exec.agent_name}
                    onClick={() => setSelectedAgent(exec.agent_name)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-forest bg-sage-50/80 shadow-soft ring-1 ring-forest/30"
                        : "border-sage-200 bg-white hover:border-sage-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-xs ${
                            exec.status === "success"
                              ? "bg-forest text-white"
                              : exec.status === "warning"
                              ? "bg-amber-500 text-white"
                              : "bg-red-600 text-white"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h4 className="font-display font-bold text-navy text-sm">
                            {AGENT_TITLES[exec.agent_name] || exec.agent_name}
                          </h4>
                          <p className="text-[11px] text-muted">
                            Weight: {exec.weight}% • Executed in {exec.duration_ms}ms
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-display text-lg font-black text-forest-deep">
                          {exec.score}
                        </span>
                        <span className="text-[11px] text-muted block font-medium">
                          Contrib: {exec.weighted_score} pts
                        </span>
                      </div>
                    </div>

                    {exec.risk_flags && exec.risk_flags.length > 0 && (
                      <div className="mt-2.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200 flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">{exec.risk_flags[0]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Column: Detailed Agent Findings Inspector */}
            {activeAgent && (
              <div className="rounded-2xl border border-sage-200 bg-white p-6 shadow-soft space-y-5">
                <div className="flex items-center justify-between border-b border-sage-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted">
                      Claim-Specific Agent Inspector
                    </span>
                    <h3 className="font-display font-bold text-xl text-forest-deep">
                      {AGENT_TITLES[activeAgent.agent_name] || activeAgent.agent_name}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      activeAgent.status === "success"
                        ? "bg-green-100 text-green-800"
                        : activeAgent.status === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {activeAgent.status.replace("_", " ")}
                  </span>
                </div>

                {/* Score Breakdown Row */}
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-sage-50/70 p-3 text-center border border-sage-200">
                  <div>
                    <span className="text-[11px] text-muted font-medium">Component Score</span>
                    <p className="text-2xl font-black text-navy mt-0.5">{activeAgent.score} / 100</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted font-medium">Assigned Weight</span>
                    <p className="text-2xl font-black text-forest mt-0.5">{activeAgent.weight}%</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted font-medium">Weighted Contribution</span>
                    <p className="text-2xl font-black text-forest-deep mt-0.5">{activeAgent.weighted_score}</p>
                  </div>
                </div>

                {/* Detected Risk Flags & Alerts */}
                <div>
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Detected Risk Flags & Alerts ({activeAgent.risk_flags?.length ?? 0})
                  </h4>
                  {activeAgent.risk_flags && activeAgent.risk_flags.length > 0 ? (
                    <ul className="space-y-1.5">
                      {activeAgent.risk_flags.map((flag: string, idx: number) => (
                        <li
                          key={idx}
                          className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200 flex items-start gap-2"
                        >
                          <span className="font-bold text-amber-600 mt-0.5">•</span>
                          <span className="leading-relaxed">{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg bg-green-50 p-3 text-xs text-green-800 border border-green-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <span>Zero risk flags detected. Evidence matches declared claim profile.</span>
                    </div>
                  )}
                </div>

                {/* Execution Context & Telemetry Tree */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-navy text-xs uppercase tracking-wider">
                      Structured Evidence Telemetry
                    </h4>
                    <span className="text-[10px] font-mono text-muted">
                      Execution: {activeAgent.execution_id || agentData.execution_id}
                    </span>
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-xl bg-navy/95 p-4 font-mono text-xs text-emerald-400 border border-navy/20 leading-relaxed">
                    {JSON.stringify(activeAgent.findings, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
