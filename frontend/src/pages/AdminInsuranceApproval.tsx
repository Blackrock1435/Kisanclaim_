import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Coins,
  RefreshCw,
  Search,
  ExternalLink,
  Download,
  CreditCard,
  UserCheck,
  XCircle,
  FileText,
  Building2,
  Send
} from "lucide-react";
import { api } from "../lib/api";
import { Spinner, StatusBadge, toast } from "../components/ui";

export default function AdminInsuranceApproval() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"approval_queue" | "disbursements">("approval_queue");
  const [search, setSearch] = useState("");

  // Modal states for adjudication
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [decision, setDecision] = useState<"approve" | "modify" | "reject" | "return_for_evidence">("approve");
  const [approvedAmount, setApprovedAmount] = useState<number | "">("");
  const [modReason, setModReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [remarks, setRemarks] = useState("");

  // Modal states for payment disbursement update
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [newPayStatus, setNewPayStatus] = useState("PAYMENT_PROCESSING");
  const [txRef, setTxRef] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const statsQ = useQuery({
    queryKey: ["assessment-stats"],
    queryFn: () => api("/assessments/stats"),
    refetchInterval: 15000,
  });

  const claimsQ = useQuery({
    queryKey: ["admin-claims-list", search],
    queryFn: () => api(`/assessments?limit=100${search ? `&q=${search}` : ""}`),
    refetchInterval: 10000,
  });

  const stats = statsQ.data || {};
  const allClaims = claimsQ.data?.items || [];

  // Filter for approval queue: status is under_review or assessment is submitted_for_approval
  const approvalQueue = allClaims.filter(
    (c: any) => c.assessment?.status === "submitted_for_approval" || (c.status === "under_review" && c.assessment?.status === "draft")
  );

  // Filter for disbursements: claims with approved status or settlement records
  const disbursementQueue = allClaims.filter(
    (c: any) => c.status === "approved" || c.settlement?.status !== "NOT_APPROVED" || c.assessment?.status === "approved" || c.assessment?.status === "modified_approved"
  );

  // Adjudication mutation
  const decisionMut = useMutation({
    mutationFn: ({ assessmentId, body }: { assessmentId: number; body: any }) =>
      api(`/assessments/${assessmentId}/admin-decision`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-claims-list"] });
      qc.invalidateQueries({ queryKey: ["assessment-stats"] });
      setSelectedClaim(null);
      toast("Competent Authority decision successfully recorded", "ok");
    },
    onError: (err: any) => toast(err.message || "Decision submission failed", "error"),
  });

  // Payment status update mutation
  const paymentMut = useMutation({
    mutationFn: ({ claimId, body }: { claimId: number; body: any }) =>
      api(`/assessments/claim/${claimId}/update-payment`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-claims-list"] });
      qc.invalidateQueries({ queryKey: ["assessment-stats"] });
      setSelectedSettlement(null);
      toast("DBT Payment status updated successfully", "ok");
    },
    onError: (err: any) => toast(err.message || "Payment update failed", "error"),
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold text-purple-900 border border-purple-200">
              <UserCheck className="h-4 w-4 text-purple-700" />
              <span>Competent Authority Adjudication</span>
            </span>
            <span className="rounded bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-navy">
              PMFBY Governance Desk
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-navy">
            Insurance Claim Sanctioning & DBT Disbursement
          </h1>
          <p className="mt-1 text-sm text-muted">
            Authorize underwriter recommendations, audit divergence justification, and manage Aadhaar-linked DBT payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/insurance-assessment"
            className="btn bg-white border border-sage-200 text-forest hover:bg-sage-50 text-xs font-bold shadow-xs"
          >
            Go to Assessment Desk
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card border border-purple-200 bg-purple-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-purple-900">Submitted for Approval</p>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-950 mt-1">{approvalQueue.length}</p>
          <p className="text-[11px] text-purple-700 mt-0.5">Pending your review</p>
        </div>

        <div className="card border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-900">Approved Payout</p>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            ₹{(stats?.total_approved_payout || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">{stats?.approved_count || 0} Claims Sanctioned</p>
        </div>

        <div className="card border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-900">DBT Queue (Awaiting)</p>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-1">
            {stats?.settlements?.awaiting_payment || 0}
          </p>
          <p className="text-[11px] text-blue-700 mt-0.5">Ready for PFMS / Bank Credit</p>
        </div>

        <div className="card border border-emerald-300 bg-emerald-100/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-950">Disbursed (PAID)</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-black text-emerald-950 mt-1">
            {stats?.settlements?.paid || 0}
          </p>
          <p className="text-[11px] text-emerald-800 mt-0.5">Credit confirmed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sage-200 gap-4">
        <button
          onClick={() => setActiveTab("approval_queue")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "approval_queue"
              ? "border-purple-800 text-purple-900"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Approval Queue ({approvalQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("disbursements")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "disbursements"
              ? "border-emerald-700 text-emerald-900"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>DBT Disbursement & Settlement Desk ({disbursementQueue.length})</span>
        </button>
      </div>

      {/* TAB 1: APPROVAL QUEUE */}
      {activeTab === "approval_queue" && (
        <div className="card overflow-hidden border border-sage-200 bg-white shadow-soft">
          <div className="border-b border-sage-100 bg-sage-50/70 px-6 py-3.5 flex items-center justify-between">
            <p className="font-display text-sm font-bold text-navy flex items-center gap-2">
              <FileText className="h-4 w-4 text-forest" />
              <span>Underwriter Recommendations Awaiting Final Authorization</span>
            </p>
          </div>

          {approvalQueue.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-2" />
              <p className="font-bold text-navy text-base">Approval Queue is Clear</p>
              <p className="text-xs mt-1">All submitted underwriter assessments have been adjudicated.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-sage-100/50 text-xs font-bold uppercase tracking-wider text-muted border-b border-sage-200">
                  <tr>
                    <th className="px-4 py-3">Claim Reference</th>
                    <th className="px-4 py-3">Farmer & District</th>
                    <th className="px-4 py-3">Crop / Peril</th>
                    <th className="px-4 py-3">AI Estimate</th>
                    <th className="px-4 py-3">Recommended</th>
                    <th className="px-4 py-3">Underwriter Notes</th>
                    <th className="px-4 py-3 text-right">Adjudication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100">
                  {approvalQueue.map((c: any) => {
                    const aiEst = c.assessment?.ai_estimated_amount || 0;
                    const rec = c.assessment?.recommended_amount || 0;
                    const diffPct = aiEst > 0 ? ((rec - aiEst) / aiEst) * 100 : 0;

                    return (
                      <tr key={c.id} className="hover:bg-sage-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-mono font-bold text-navy text-xs sm:text-sm">{c.ref}</p>
                          <p className="text-[11px] text-muted">ID: #{c.id}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-bold text-navy">{c.farmer.name}</p>
                          <p className="text-xs text-muted">{c.farmer.district}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-navy">{c.crop_name}</p>
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase">
                            {c.disaster_type}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-bold text-navy">
                          ₹{aiEst.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-black text-purple-900 text-sm">
                            ₹{rec.toLocaleString("en-IN")}
                          </p>
                          {Math.abs(diffPct) > 10 && (
                            <span className="text-[10px] font-bold text-amber-700">
                              {diffPct > 0 ? `+${diffPct.toFixed(0)}%` : `${diffPct.toFixed(0)}%`} vs AI
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="text-xs text-muted line-clamp-2">
                            {c.assessment?.officer_remarks || "Standard inspection completed."}
                          </p>
                          {c.assessment?.officer_difference_reason && (
                            <p className="text-[11px] text-amber-800 font-medium mt-0.5 truncate">
                              Rationale: {c.assessment.officer_difference_reason}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedClaim(c);
                                setDecision("approve");
                                setApprovedAmount(c.assessment?.recommended_amount || 0);
                                setModReason("");
                                setRejectReason("");
                                setRemarks("");
                              }}
                              className="btn bg-purple-900 text-white hover:bg-purple-950 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs"
                            >
                              Adjudicate
                            </button>
                            <Link
                              to={`/app/insurance-assessment/${c.id}`}
                              className="btn bg-white border border-sage-200 text-navy hover:bg-sage-50 p-1.5 rounded-lg shadow-xs"
                              title="Inspect Full Claim Context"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DBT DISBURSEMENT & SETTLEMENT DESK */}
      {activeTab === "disbursements" && (
        <div className="card overflow-hidden border border-sage-200 bg-white shadow-soft">
          <div className="border-b border-sage-100 bg-sage-50/70 px-6 py-3.5 flex items-center justify-between">
            <p className="font-display text-sm font-bold text-navy flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-700" />
              <span>Aadhaar-Linked Direct Benefit Transfer (DBT) Disbursement Register</span>
            </p>
          </div>

          {disbursementQueue.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <Building2 className="mx-auto h-12 w-12 text-sage-300 mb-2" />
              <p className="font-bold text-navy">No approved claims awaiting disbursement</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-sage-100/50 text-xs font-bold uppercase tracking-wider text-muted border-b border-sage-200">
                  <tr>
                    <th className="px-4 py-3">Claim Ref</th>
                    <th className="px-4 py-3">Farmer & Aadhaar Bank</th>
                    <th className="px-4 py-3">Sanctioned Payout</th>
                    <th className="px-4 py-3">DBT Payment Status</th>
                    <th className="px-4 py-3">UTR / Transaction Ref</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100">
                  {disbursementQueue.map((c: any) => {
                    const payStatus = c.settlement?.status || (c.status === "approved" ? "APPROVED_AWAITING_PAYMENT" : "NOT_APPROVED");
                    const amt = c.settlement?.payout_amount || c.assessment?.approved_amount || 0;

                    let badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
                    if (payStatus === "PAID") badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
                    else if (payStatus === "PAYMENT_PROCESSING") badgeColor = "bg-blue-100 text-blue-900 border-blue-300 font-semibold";
                    else if (payStatus === "PAYMENT_FAILED") badgeColor = "bg-rose-100 text-rose-900 border-rose-300 font-bold";

                    return (
                      <tr key={c.id} className="hover:bg-sage-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-mono font-bold text-navy text-xs sm:text-sm">{c.ref}</p>
                          <p className="text-[11px] text-muted">ID: #{c.id}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-bold text-navy">{c.farmer.name}</p>
                          <p className="text-xs text-muted">
                            Canara Bank (Aadhaar Seeded) • XXXX-XXXX-4819
                          </p>
                        </td>

                        <td className="px-4 py-3.5 font-black text-emerald-800 text-base">
                          ₹{amt.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs border ${badgeColor}`}>
                            {payStatus.replace(/_/g, " ")}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs">
                          {c.settlement?.transaction_reference ? (
                            <span className="font-bold text-navy">
                              {c.settlement.transaction_reference}
                            </span>
                          ) : (
                            <span className="text-muted">Pending PFMS generation</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedSettlement(c);
                              setNewPayStatus(payStatus === "PAID" ? "PAID" : "PAYMENT_PROCESSING");
                              setTxRef(c.settlement?.transaction_reference || `PFMS-KA-${Date.now().toString().slice(-8)}`);
                              setFailureReason("");
                              setPaymentNotes("");
                            }}
                            className="btn bg-emerald-800 text-white hover:bg-emerald-900 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Update DBT</span>
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
      )}

      {/* MODAL 1: ADJUDICATION DECISION */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg border border-sage-300 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  PMFBY Claim Adjudication
                </p>
                <h3 className="text-lg font-black text-navy mt-0.5">
                  Claim Ref: {selectedClaim.ref}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-muted hover:text-navy p-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-sage-50/70 p-3 text-xs space-y-1">
              <p><b>Farmer:</b> {selectedClaim.farmer.name} ({selectedClaim.farmer.district})</p>
              <p><b>Crop:</b> {selectedClaim.crop_name} | <b>Calamity:</b> {selectedClaim.disaster_type}</p>
              <p><b>AI Estimated:</b> ₹{(selectedClaim.assessment?.ai_estimated_amount || 0).toLocaleString("en-IN")}</p>
              <p><b>Officer Recommended:</b> ₹{(selectedClaim.assessment?.recommended_amount || 0).toLocaleString("en-IN")}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label text-xs font-bold text-navy">Statutory Action *</label>
                <select
                  value={decision}
                  onChange={(e: any) => {
                    setDecision(e.target.value);
                    if (e.target.value === "approve") {
                      setApprovedAmount(selectedClaim.assessment?.recommended_amount || 0);
                    }
                  }}
                  className="input text-sm font-semibold"
                >
                  <option value="approve">Approve Recommended Amount (₹{(selectedClaim.assessment?.recommended_amount || 0).toLocaleString("en-IN")})</option>
                  <option value="modify">Modify Sanctioned Amount</option>
                  <option value="reject">Reject Claim</option>
                  <option value="return_for_evidence">Return for Additional Field Evidence</option>
                </select>
              </div>

              {decision === "modify" && (
                <div>
                  <label className="label text-xs font-bold text-navy">Modified Approved Amount (₹) *</label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="input text-sm font-black text-emerald-800"
                    placeholder="Enter sanctioned amount"
                  />
                  <div className="mt-2">
                    <label className="label text-xs font-bold text-navy">Mandatory Modification Justification *</label>
                    <textarea
                      value={modReason}
                      onChange={(e) => setModReason(e.target.value)}
                      rows={2}
                      className="input text-xs"
                      placeholder="Explain reason for variance from underwriter recommendation..."
                    />
                  </div>
                </div>
              )}

              {decision === "reject" && (
                <div>
                  <label className="label text-xs font-bold text-navy">Mandatory Statutory Rejection Reason *</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="input text-xs"
                    placeholder="Specify grounds for denial under PMFBY guidelines..."
                  />
                </div>
              )}

              {decision === "return_for_evidence" && (
                <div>
                  <label className="label text-xs font-bold text-navy">Instructions for Additional Evidence *</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    className="input text-xs"
                    placeholder="Specify evidence required from field inspector or farmer..."
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-sage-100 pt-3">
              <button
                onClick={() => setSelectedClaim(null)}
                className="btn bg-white border border-sage-200 text-muted hover:bg-sage-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (decision === "modify" && (!approvedAmount || Number(approvedAmount) < 0 || !modReason.trim())) {
                    toast("Please specify amount and modification reason", "error");
                    return;
                  }
                  if (decision === "reject" && !rejectReason.trim()) {
                    toast("Please specify rejection reason", "error");
                    return;
                  }
                  if (decision === "return_for_evidence" && !remarks.trim()) {
                    toast("Please specify instructions for return", "error");
                    return;
                  }

                  const assessmentId = selectedClaim.assessment?.id;
                  if (!assessmentId) {
                    toast("No assessment record exists for this claim", "error");
                    return;
                  }

                  decisionMut.mutate({
                    assessmentId,
                    body: {
                      decision,
                      approved_amount: decision === "modify" ? Number(approvedAmount) : selectedClaim.assessment?.recommended_amount,
                      modification_reason: modReason,
                      rejection_reason: rejectReason,
                      remarks,
                    }
                  });
                }}
                disabled={decisionMut.isPending}
                className="btn bg-purple-900 text-white hover:bg-purple-950 text-xs font-bold"
              >
                {decisionMut.isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Confirm Decision</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE DBT PAYMENT STATUS */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md border border-sage-300 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Update DBT Disbursement Status
                </p>
                <h3 className="text-base font-black text-navy mt-0.5">
                  Claim Ref: {selectedSettlement.ref}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSettlement(null)}
                className="text-muted hover:text-navy p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label text-xs font-bold text-navy">DBT Payment Status *</label>
                <select
                  value={newPayStatus}
                  onChange={(e) => setNewPayStatus(e.target.value)}
                  className="input text-sm font-semibold"
                >
                  <option value="APPROVED_AWAITING_PAYMENT">APPROVED_AWAITING_PAYMENT</option>
                  <option value="PAYMENT_PROCESSING">PAYMENT_PROCESSING</option>
                  <option value="PAID">PAID (Disbursement Credited)</option>
                  <option value="PAYMENT_FAILED">PAYMENT_FAILED</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                </select>
              </div>

              <div>
                <label className="label text-xs font-bold text-navy">UTR / PFMS Transaction Reference</label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="input text-sm font-mono font-bold"
                  placeholder="PFMS-KA-2026-98124"
                />
              </div>

              {newPayStatus === "PAYMENT_FAILED" && (
                <div>
                  <label className="label text-xs font-bold text-rose-800">Failure Reason *</label>
                  <input
                    type="text"
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="input text-xs"
                    placeholder="e.g., Aadhaar bank account dormant or IFSC mismatch"
                  />
                </div>
              )}

              <div>
                <label className="label text-xs font-bold text-navy">Audit Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="input text-xs"
                  placeholder="Optional internal remarks for finance audit log..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-sage-100 pt-3">
              <button
                onClick={() => setSelectedSettlement(null)}
                className="btn bg-white border border-sage-200 text-muted hover:bg-sage-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  paymentMut.mutate({
                    claimId: selectedSettlement.id,
                    body: {
                      status: newPayStatus,
                      transaction_reference: txRef,
                      failure_reason: failureReason,
                      notes: paymentNotes,
                    }
                  });
                }}
                disabled={paymentMut.isPending}
                className="btn bg-emerald-800 text-white hover:bg-emerald-900 text-xs font-bold"
              >
                {paymentMut.isPending ? <Spinner className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                <span>Save Payment Status</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
