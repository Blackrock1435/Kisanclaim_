import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck,
  Coins,
  Cpu,
  MapPin,
  RefreshCw
} from "lucide-react";
import { api } from "../lib/api";
import { Spinner, StatusBadge } from "../components/ui";

export default function InsuranceAssessmentList() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [crop, setCrop] = useState("");
  const [disaster, setDisaster] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const statsQ = useQuery({
    queryKey: ["assessment-stats"],
    queryFn: () => api("/assessments/stats"),
    refetchInterval: 15000,
  });

  const claimsQ = useQuery({
    queryKey: ["assessments-list", search, district, crop, disaster, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("q", search);
      if (district) p.set("district", district);
      if (crop) p.set("crop", crop);
      if (disaster) p.set("disaster", disaster);
      if (statusFilter) p.set("status", statusFilter);
      return api(`/assessments?${p.toString()}`);
    },
    refetchInterval: 10000,
  });

  const stats = statsQ.data || {};
  const claims = claimsQ.data?.items || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-forest-light/30 px-3 py-0.5 text-xs font-bold text-forest-deep">
              <ShieldCheck className="h-4 w-4 text-forest" />
              <span>PMFBY Underwriting & Assessment</span>
            </span>
            <span className="rounded bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-navy">
              Actuarial Rules v2.4
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-navy">
            AI Crop Loss Assessment & Payout Desk
          </h1>
          <p className="mt-1 text-sm text-muted">
            Inspect individual farmer claims, review 6 AI agent telemetry, verify satellite crop loss, and submit PMFBY payout recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/admin/insurance-approval"
            className="btn bg-forest-deep text-white hover:bg-forest flex items-center gap-2 text-sm font-bold shadow-md"
          >
            <UserCheck className="h-4 w-4 text-gold" />
            <span>Admin Approvals ({stats?.submitted_for_approval || 0})</span>
          </Link>
          <button
            onClick={() => {
              statsQ.refetch();
              claimsQ.refetch();
            }}
            className="btn bg-white border border-sage-200 text-navy hover:bg-sage-50 p-2.5 rounded-xl shadow-xs"
            title="Refresh Table"
          >
            <RefreshCw className={`h-4 w-4 ${claimsQ.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="card border border-sage-200 bg-white p-3.5 shadow-xs">
          <p className="text-xs font-semibold text-muted">Total Claims</p>
          <p className="text-2xl font-black text-navy mt-1">{stats?.total_claims || 0}</p>
          <p className="text-[10px] text-muted mt-0.5">PMFBY Portal</p>
        </div>

        <div className="card border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-900">Awaiting Review</p>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800 mt-1">{stats?.awaiting_assessment || 0}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Action pending</p>
        </div>

        <div className="card border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-900">Officer Review</p>
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-800 mt-1">{stats?.under_officer_review || 0}</p>
          <p className="text-[10px] text-blue-700 mt-0.5">Drafts in progress</p>
        </div>

        <div className="card border border-purple-200 bg-purple-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-purple-900">For Approval</p>
            <UserCheck className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-800 mt-1">{stats?.submitted_for_approval || 0}</p>
          <p className="text-[10px] text-purple-700 mt-0.5">With Competent Auth</p>
        </div>

        <div className="card border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-900">Approved</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-1">{stats?.approved_count || 0}</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Sanctioned</p>
        </div>

        <div className="card border border-emerald-300 bg-emerald-100/60 p-3.5 shadow-xs col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-emerald-700" />
              <span>Approved Payout</span>
            </p>
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Sanctioned</span>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            ₹{(stats?.total_approved_payout || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-emerald-800 mt-0.5">
            DBT Disbursement Queue ({stats?.settlements?.awaiting_payment || 0} pending)
          </p>
        </div>
      </div>

      {/* Multi-Attribute Filter Bar */}
      <div className="card border border-sage-200 bg-white p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search Claim Ref, Farmer, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-sm"
            />
          </div>

          <div>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="input text-sm"
            >
              <option value="">All Districts (Karnataka)</option>
              <option value="Bengaluru Rural">Bengaluru Rural</option>
              <option value="Belagavi">Belagavi</option>
              <option value="Dharwad">Dharwad</option>
              <option value="Shivamogga">Shivamogga</option>
              <option value="Tumakuru">Tumakuru</option>
              <option value="Hassan">Hassan</option>
            </select>
          </div>

          <div>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="input text-sm"
            >
              <option value="">All Crops</option>
              <option value="Paddy">Paddy / Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Cotton">Cotton</option>
              <option value="Soybean">Soybean</option>
              <option value="Ragi">Ragi (Finger Millet)</option>
              <option value="Maize">Maize</option>
            </select>
          </div>

          <div>
            <select
              value={disaster}
              onChange={(e) => setDisaster(e.target.value)}
              className="input text-sm"
            >
              <option value="">All Calamities</option>
              <option value="flood">Flood / Inundation</option>
              <option value="heavy_rainfall">Heavy Rainfall</option>
              <option value="drought">Drought</option>
              <option value="hailstorm">Hailstorm</option>
              <option value="cyclone">Cyclone</option>
              <option value="landslide">Landslide</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="">All Claim Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="additional_evidence_required">Evidence Requested</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims Assessment Table */}
      <div className="card overflow-hidden border border-sage-200 bg-white shadow-soft">
        <div className="border-b border-sage-100 bg-sage-50/70 px-6 py-3.5 flex items-center justify-between">
          <p className="font-display text-sm font-bold text-navy flex items-center gap-2">
            <FileText className="h-4 w-4 text-forest" />
            <span>PMFBY Underwriting Register ({claims.length} Records)</span>
          </p>
          <span className="text-xs text-muted">
            Sorted by most recent incident
          </span>
        </div>

        {claimsQ.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-8 w-8 text-forest" />
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <ShieldCheck className="mx-auto h-12 w-12 text-sage-300 mb-3" />
            <p className="font-bold text-navy text-base">No claims match the selected criteria</p>
            <p className="text-xs mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-sage-100/50 text-xs font-bold uppercase tracking-wider text-muted border-b border-sage-200">
                <tr>
                  <th className="px-4 py-3">Claim Reference</th>
                  <th className="px-4 py-3">Farmer & Location</th>
                  <th className="px-4 py-3">Crop & Peril</th>
                  <th className="px-4 py-3">Ground Evidence</th>
                  <th className="px-4 py-3">AI Verification</th>
                  <th className="px-4 py-3">Estimated Payout</th>
                  <th className="px-4 py-3">Workflow State</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-100">
                {claims.map((c: any) => {
                  const aiScore = c.ai_verification?.score;
                  const isVerified = c.ai_verification?.has_run;
                  const estAmount = c.assessment?.ai_estimated_amount || 0;
                  const recAmount = c.assessment?.recommended_amount;
                  const appAmount = c.assessment?.approved_amount;

                  let scoreTone = "bg-slate-100 text-slate-700";
                  if (aiScore >= 80) scoreTone = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  else if (aiScore >= 60) scoreTone = "bg-amber-100 text-amber-800 border-amber-300";
                  else if (aiScore !== null) scoreTone = "bg-rose-100 text-rose-800 border-rose-300";

                  return (
                    <tr key={c.id} className="hover:bg-sage-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-navy text-xs sm:text-sm">{c.ref}</p>
                        <p className="text-[11px] text-muted">ID: #{c.id}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-bold text-navy">{c.farmer.name}</p>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-forest" />
                          <span>{c.farmer.district}</span>
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-navy">{c.crop_name}</p>
                        <span className="inline-block mt-0.5 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase">
                          {c.disaster_type}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-navy">
                          {c.evidence.photo_count} Photos
                        </p>
                        {c.evidence.has_geocamera ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                            GeoCamera (GPS)
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted">Standard</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {isVerified ? (
                          <div>
                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-black border ${scoreTone}`}>
                              <Cpu className="h-3 w-3" />
                              <span>{aiScore?.toFixed(1)}/100</span>
                            </span>
                            <p className="text-[10px] text-muted mt-0.5">
                              {c.ai_verification.outcome_category}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                            Pending AI Run
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {appAmount ? (
                          <div>
                            <p className="font-black text-emerald-800 text-sm">
                              ₹{appAmount.toLocaleString("en-IN")}
                            </p>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Approved</span>
                          </div>
                        ) : recAmount ? (
                          <div>
                            <p className="font-black text-purple-900 text-sm">
                              ₹{recAmount.toLocaleString("en-IN")}
                            </p>
                            <span className="text-[10px] font-bold text-purple-700 uppercase">Recommended</span>
                          </div>
                        ) : estAmount ? (
                          <div>
                            <p className="font-bold text-navy text-sm">
                              ₹{estAmount.toLocaleString("en-IN")}
                            </p>
                            <span className="text-[10px] text-muted">AI Estimate</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Not Evaluated</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => nav(`/app/insurance-assessment/${c.id}`)}
                          className="btn bg-forest text-white hover:bg-forest-deep px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5"
                        >
                          <span>Assess Claim</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
