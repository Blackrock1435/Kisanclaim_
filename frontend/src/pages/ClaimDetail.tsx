import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, FileWarning, MapPin, PlayCircle, RefreshCw, Camera, Satellite, Cpu, Network, ShieldCheck, FileCheck, FileText, CheckCircle2, MessageSquare, AlertCircle, PlusCircle } from "lucide-react";
import { api, downloadFile } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Alert, AuthImage, Skeleton, Spinner, StatusBadge, Textarea, Select, toast } from "../components/ui";
import FieldMap, { Pt } from "../maps/FieldMap";
import { NdviChart } from "../charts/NdviChart";
import { RainChart } from "../charts/RainChart";
import { disasterLabel, fmtDate, fmtDateTime } from "../lib/utils";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="card p-5"><h2 className="mb-3 font-display text-lg font-bold">{title}</h2>{children}</section>;
const KV = ({ k, v }: { k: string; v: React.ReactNode }) => <div><dt className="text-sm text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>;
const PROCESSING = ["submitted", "evidence_processing", "analysis_pending"];

function ReviewPanel({ c }: { c: any }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteType, setNoteType] = useState("inspection");
  const [noteContent, setNoteContent] = useState("");
  const [farmerAction, setFarmerAction] = useState("");
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqItems, setReqItems] = useState<string[]>(["geocamera_photos"]);
  const [reqAction, setReqAction] = useState("Please upload 2-3 live GeoCamera photos of the affected field parcel within 400m geofence.");

  const m = useMutation({
    mutationFn: (action: string) => api(`/claims/${c.id}/review`, { body: { action, comment } }),
    onSuccess: () => {
      toast("Action recorded");
      setComment("");
      qc.invalidateQueries({ queryKey: ["claim", String(c.id)] });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const noteMutation = useMutation({
    mutationFn: () =>
      api(`/claims/${c.id}/notes`, {
        body: {
          note_type: noteType,
          content: noteContent,
          action_required_from_farmer: farmerAction || null,
        },
      }),
    onSuccess: () => {
      toast("Officer note submitted");
      setNoteContent("");
      setFarmerAction("");
      setShowNoteForm(false);
      qc.invalidateQueries({ queryKey: ["claim", String(c.id)] });
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const reqMutation = useMutation({
    mutationFn: () =>
      api(`/claims/${c.id}/request-evidence`, {
        body: {
          action_required: reqAction,
          requested_items: reqItems,
        },
      }),
    onSuccess: () => {
      toast("Additional evidence request dispatched to farmer");
      setShowReqModal(false);
      qc.invalidateQueries({ queryKey: ["claim", String(c.id)] });
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const A = ({ a, label, cls = "btn-ghost" }: { a: string; label: string; cls?: string }) => (
    <button className={`btn ${cls} !min-h-[40px] text-xs font-semibold`} disabled={m.isPending} onClick={() => m.mutate(a)}>
      {label}
    </button>
  );

  return (
    <Section title="Officer Review & Verification Actions">
      <Alert tone="info">
        Approve or reject only after reviewing the multi-source evidence. Automated AI indicators are preliminary and support underwriter judgement.
      </Alert>

      {/* Decision Actions */}
      <div className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="cm">
            Decision Comment / Formal Statutory Reason
          </label>
          <Textarea
            id="cm"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Required for approval, rejection, or formal comments..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <A a="start_review" label="Start Review" cls="btn-primary" />
          <A a="evidence_reviewed" label="Mark Evidence Reviewed" />
          <button
            type="button"
            className="btn btn-gold !min-h-[40px] text-xs font-semibold flex items-center gap-1.5"
            onClick={() => setShowReqModal(true)}
          >
            <AlertCircle className="h-3.5 w-3.5" /> Request Evidence
          </button>
          <button
            type="button"
            className="btn btn-ghost !min-h-[40px] text-xs font-semibold flex items-center gap-1.5 border border-sage-200"
            onClick={() => setShowNoteForm(!showNoteForm)}
          >
            <MessageSquare className="h-3.5 w-3.5 text-forest" />
            {showNoteForm ? "Cancel Note" : "Add Inspection Note"}
          </button>
          <A a="approve" label="Approve Claim" cls="btn-primary" />
          <A a="reject" label="Reject Claim" cls="btn-danger" />
          <A a="close" label="Close Claim" />
        </div>
      </div>

      {/* Add Inspection Note Sub-Form */}
      {showNoteForm && (
        <div className="mt-4 rounded-xl border border-sage-200 bg-sage-50/60 p-4 space-y-3">
          <h4 className="font-display text-sm font-bold text-navy flex items-center gap-2">
            <FileText className="h-4 w-4 text-forest" /> Record Structured Officer Observation
          </h4>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="note-type">Note Category</label>
              <Select id="note-type" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                <option value="inspection">Field Inspection Observation</option>
                <option value="clarification_request">Clarification Request</option>
                <option value="review_finding">Review Finding / Loss Audit</option>
              </Select>
            </div>
            <div>
              <label className="label" htmlFor="farmer-act">Action Required from Farmer (Optional)</label>
              <input
                id="farmer-act"
                className="input"
                placeholder="e.g. Provide RTC survey extract copy"
                value={farmerAction}
                onChange={(e) => setFarmerAction(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="note-txt">Observation / Technical Findings</label>
            <Textarea
              id="note-txt"
              rows={3}
              placeholder="Record ground conditions, crop canopy state, water-logging depth, or audit notes..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button
              className="btn btn-primary !min-h-[36px] text-xs"
              disabled={!noteContent.trim() || noteMutation.isPending}
              onClick={() => noteMutation.mutate()}
            >
              {noteMutation.isPending ? <Spinner /> : "Save Inspection Note"}
            </button>
          </div>
        </div>
      )}

      {/* Request Evidence Modal */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-sage-100 pb-3">
              <h3 className="font-display text-lg font-bold text-navy flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Request Additional Evidence from Farmer
              </h3>
              <button onClick={() => setShowReqModal(false)} className="rounded p-1 text-muted hover:bg-sage-100">✕</button>
            </div>

            <p className="text-xs text-muted">
              Select specific evidence items required under PMFBY guidelines. The claim status will transition to{" "}
              <span className="font-semibold text-amber-700">Additional Evidence Required</span> and notify the farmer.
            </p>

            <div className="space-y-2">
              <label className="label">Checklist of Required Items:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "geocamera_photos", label: "GeoCamera Photos (in 400m)" },
                  { id: "sowing_certificate", label: "Sowing Certificate / RTC" },
                  { id: "damage_closeups", label: "Crop Damage Close-ups" },
                  { id: "drainage_furrows", label: "Drainage / Canal Photos" },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2 rounded-lg border border-sage-200 p-2 cursor-pointer hover:bg-sage-50">
                    <input
                      type="checkbox"
                      checked={reqItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) setReqItems([...reqItems, item.id]);
                        else setReqItems(reqItems.filter((x) => x !== item.id));
                      }}
                      className="rounded text-forest focus:ring-forest"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="req-act">Direct Instructions for Farmer</label>
              <Textarea
                id="req-act"
                rows={3}
                value={reqAction}
                onChange={(e) => setReqAction(e.target.value)}
                placeholder="Specify exact camera angle, affected parcel side, or document needed..."
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-sage-100 pt-3">
              <button onClick={() => setShowReqModal(false)} className="btn btn-ghost !min-h-[38px] text-xs">
                Cancel
              </button>
              <button
                disabled={!reqAction.trim() || reqMutation.isPending}
                onClick={() => reqMutation.mutate()}
                className="btn btn-gold !min-h-[38px] text-xs font-semibold"
              >
                {reqMutation.isPending ? <Spinner /> : "Dispatch Evidence Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function AdminPanel({ c }: { c: any }) {
  const qc = useQueryClient();
  const officers = useQuery({ queryKey: ["officers"], queryFn: () => api("/admin/users?role=officer") });
  const [oid, setOid] = useState("");
  const assign = useMutation({ mutationFn: () => api(`/admin/claims/${c.id}/assign?officer_id=${oid}`, { method: "POST" }), onSuccess: () => { toast("Officer assigned"); qc.invalidateQueries({ queryKey: ["claim", String(c.id)] }); }, onError: (e: any) => toast(e.message, "error") });
  const rerun = useMutation({ mutationFn: () => api(`/claims/${c.id}/rerun`, { method: "POST" }), onSuccess: () => { toast("Analysis re-run queued"); setTimeout(() => qc.invalidateQueries({ queryKey: ["claim", String(c.id)] }), 3000); } });
  return (
    <Section title="Administration">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1"><label className="label" htmlFor="off">Assign officer</label><Select id="off" value={oid} onChange={(e) => setOid(e.target.value)}><option value="">Choose officer</option>{officers.data?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></div>
        <button className="btn btn-primary" disabled={!oid || assign.isPending} onClick={() => assign.mutate()}>Assign</button>
        <button className="btn btn-ghost" disabled={rerun.isPending} onClick={() => rerun.mutate()}><RefreshCw className="h-4 w-4" /> Re-run analysis</button></div>
      <p className="mt-2 text-sm text-muted">Currently assigned to: {c.officer_name || "nobody"}</p>
    </Section>
  );
}

export default function ClaimDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["claim", id], queryFn: () => api(`/claims/${id}`), refetchInterval: (query) => (PROCESSING.includes((query.state.data as any)?.status) ? 3000 : false) });
  const [dl, setDl] = useState(false);
  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.error) return <Alert tone="error">{(q.error as Error).message}</Alert>;
  const c = q.data, sat = c.satellite, wx = c.weather, a = c.assessments[0];
  const pts: Pt[] = c.field.boundary.coordinates[0].slice(0, -1).map(([lo, la]: number[]) => [la, lo] as Pt);
  const role = user!.role;
  const gpsPhotos = c.evidence.filter((e: any) => e.has_gps).map((e: any) => ({ lat: e.lat, lon: e.lon, label: e.filename }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-muted"><Link to="/app/claims" className="font-semibold text-forest">Claims</Link> / {c.ref || "Draft"}</p>
          <h1 className="text-3xl font-extrabold text-forest-deep">{c.ref || "Draft claim"}</h1>
          <p className="mt-1 text-muted">{disasterLabel(c.disaster_type)} on {fmtDate(c.incident_date)} | {c.crop_name} | {c.field.name}</p></div>
        <div className="flex flex-col items-end gap-2"><StatusBadge status={c.status} />
          {c.report && <button className="btn btn-primary" disabled={dl} onClick={async () => { setDl(true); try { await downloadFile(`/reports/${c.id}/download`, `${c.ref}-assessment.pdf`); } catch (e: any) { toast(e.message, "error"); } setDl(false); }}>{dl ? <Spinner /> : <Download className="h-4 w-4" />} Download PDF report</button>}
          {role === "farmer" && ["draft", "additional_evidence_required"].includes(c.status) && <Link className="btn btn-gold" to={`/app/claims/${c.id}/edit`}>{c.status === "draft" ? "Continue draft" : "Add evidence and resubmit"}</Link>}</div></div>

      {/* Advanced Autonomous Verification Strip */}
      <div className="rounded-2xl border-2 border-forest/20 bg-sage-50/70 p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-forest-deep text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-forest" />
              Autonomous Claim Verification & Anti-Fraud Tools
            </h3>
            <p className="text-xs text-muted">
              Inspect multi-source evidence: Live GeoCamera, Sentinel-2 before/after, 6 AI agents, and explainable graph.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/app/geocamera?claimId=${c.id}`}
              className="btn btn-primary !min-h-[38px] !px-3 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Camera className="h-3.5 w-3.5" /> Live GeoCamera
            </Link>
            <Link
              to={`/app/satellite-twin?claimId=${c.id}`}
              className="btn btn-ghost !min-h-[38px] !px-3 text-xs font-bold flex items-center gap-1.5 bg-white border border-sage-200"
            >
              <Satellite className="h-3.5 w-3.5 text-forest" /> Sentinel-2 Twin
            </Link>
            <Link
              to={`/app/agent-analysis?claimId=${c.id}`}
              className="btn btn-ghost !min-h-[38px] !px-3 text-xs font-bold flex items-center gap-1.5 bg-white border border-sage-200"
            >
              <Cpu className="h-3.5 w-3.5 text-forest" /> 6 AI Agents
            </Link>
            <Link
              to={`/app/evidence-graph?claimId=${c.id}`}
              className="btn btn-ghost !min-h-[38px] !px-3 text-xs font-bold flex items-center gap-1.5 bg-white border border-sage-200"
            >
              <Network className="h-3.5 w-3.5 text-forest" /> Evidence Graph
            </Link>
          </div>
        </div>
      </div>

      {PROCESSING.includes(c.status) && <Alert tone="info" title="Analysis in progress"><span className="inline-flex items-center gap-2"><Spinner className="h-4 w-4" /> Fetching satellite and rainfall data. This page updates by itself.</span></Alert>}
      {c.status === "additional_evidence_required" && <Alert tone="warn" title="The officer asked for more evidence">{c.reviews.filter((r: any) => r.action === "request_evidence").slice(-1)[0]?.comment}</Alert>}
      {a?.is_demo && <Alert tone="warn" title="Demonstration data">The satellite values below are illustrative samples, not measured. This claim's report is marked as a demonstration.</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Field"><FieldMap readOnly height={280} points={pts} extra={gpsPhotos} />
          <dl className="mt-3 grid grid-cols-2 gap-3"><KV k="Area" v={`${c.field.area_ha.toFixed(2)} ha`} /><KV k="Coordinates" v={`${c.field.lat.toFixed(5)}, ${c.field.lon.toFixed(5)}`} />
            <KV k="DIGIPIN" v={<span className="font-mono">{c.field.digipin || "Not available"}</span>} /><KV k="Farm" v={`${c.farm.name}, ${c.farm.district}`} /></dl>
          {gpsPhotos.length > 0 && <p className="mt-2 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3 text-blue-600" /> Blue dots are photo locations from EXIF.</p>}</Section>
        <Section title="Claim details"><dl className="grid grid-cols-2 gap-3">
          <KV k="Farmer" v={c.farmer_name} /><KV k="Crop" v={`${c.crop_name}${c.variety ? ` (${c.variety})` : ""}`} /><KV k="Sowing date" v={fmtDate(c.sowing_date)} /><KV k="Season" v={c.season || "n/a"} />
          <KV k="Disaster" v={disasterLabel(c.disaster_type)} /><KV k="Incident date" v={fmtDate(c.incident_date)} /><KV k="Duration" v={c.duration_days ? `${c.duration_days} days` : "n/a"} /><KV k="Submitted" v={fmtDateTime(c.submitted_at)} />
          <div className="col-span-2"><KV k="Farmer's description" v={<span className="font-normal">{c.description || "None"}</span>} /></div></dl></Section>
      </div>

      <Section title={`Photographs (${c.evidence.length})`}>
        {!c.evidence.length ? <p className="text-sm text-muted">No photographs uploaded.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{c.evidence.map((e: any) => (
            <figure key={e.id} className="overflow-hidden rounded-lg border border-sage-100"><div className="aspect-[4/3] bg-sage-100"><AuthImage path={`/evidence/${e.id}/file`} alt={e.filename} className="h-full w-full object-cover" /></div>
              <figcaption className="space-y-0.5 p-3 text-xs"><p className="truncate text-sm font-semibold">{e.filename}</p>
                <p>Captured: {e.taken_at ? fmtDateTime(e.taken_at) : "not recorded in photo"}</p><p>Uploaded: {fmtDateTime(e.uploaded_at)}</p>
                <p>GPS: {e.has_gps ? `${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}` : "GPS metadata not available"}</p><p className="break-all font-mono text-[10px] text-muted">SHA-256 {e.sha256.slice(0, 20)}...</p></figcaption></figure>))}</div>)}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Satellite vegetation (NDVI)">
          {!sat ? <p className="text-sm text-muted">Not run yet.</p> : sat.pre_ndvi != null ? <>
            {sat.status === "demo" && <div className="mb-3"><Alert tone="warn" title="DEMONSTRATION DATA">Illustrative sample, not satellite-measured.</Alert></div>}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4"><KV k="Before event" v={sat.pre_ndvi} /><KV k="After event" v={sat.post_ndvi} /><KV k="Difference" v={sat.diff > 0 ? `+${sat.diff}` : sat.diff} /><KV k="Change" v={sat.pct_change == null ? "n/a" : `${sat.pct_change}%`} /></dl>
            <div className="mt-3"><NdviChart series={sat.series} incident={c.incident_date} /></div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted"><div>Images: {sat.pre_date} and {sat.post_date}</div><div>Valid pixels: {sat.valid_pixel_pct_pre ?? "n/a"}% / {sat.valid_pixel_pct_post ?? "n/a"}%</div><div className="col-span-2">Source: {sat.source}. Processed {fmtDateTime(sat.processed_at)}.</div></dl></> :
            <Alert tone={sat.status === "config_required" ? "info" : "warn"} title={sat.status === "config_required" ? "Satellite source not configured" : "Satellite data unavailable"}>{sat.error}</Alert>}
          {sat?.limitations && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">{sat.limitations.map((l: string) => <li key={l}>{l}</li>)}</ul>}
        </Section>
        <Section title="Historical rainfall">
          {!wx ? <p className="text-sm text-muted">Not run yet.</p> : wx.status === "completed" ? <>
            <RainChart daily={wx.daily} incident={c.incident_date} />
            <p className="mt-2 text-xs text-muted">Source: {wx.source}. {wx.range[0]} to {wx.range[1]}. Retrieved {fmtDateTime(wx.retrieved_at)}.</p></> :
            <Alert tone="warn" title="Weather data unavailable">{wx.error}. Missing data is not treated as zero rainfall.</Alert>}
          {wx?.limitations && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">{wx.limitations.map((l: string) => <li key={l}>{l}</li>)}</ul>}
        </Section>
      </div>

      {a && <Section title={`Preliminary assessment (v${a.version}, rules ${a.rule_version})`}>
        <p className="font-display text-xl font-bold text-forest">{a.category_text}</p>
        <p className="mt-1 text-sm text-muted">Evidence consistency: {a.consistency.replace(/_/g, " ")}. Manual review required. This is not a crop-loss percentage or an insurance decision.</p>
        <ul className="mt-3 space-y-2 text-sm">{a.signals.map((s: any) => <li key={s.name}><span className="font-semibold">{s.name}</span> <span className="rounded bg-sage-100 px-1.5 py-0.5 text-xs">{s.status}</span><br />{s.text}</li>)}</ul>
        {a.warnings.length > 0 && <div className="mt-4 space-y-2"><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-700" /> Data quality warnings</p>{a.warnings.map((w: string) => <p key={w} className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{w}</p>)}</div>}
        {c.assessments.length > 1 && <p className="mt-3 text-xs text-muted">Earlier versions kept for traceability: {c.assessments.slice(1).map((x: any) => `v${x.version} (${x.category_text})`).join(", ")}.</p>}
      </Section>}
      {!a && !PROCESSING.includes(c.status) && c.status !== "draft" && <Alert tone="warn" title="No assessment yet"><span className="inline-flex items-center gap-2"><FileWarning className="h-4 w-4" /> The automated analysis did not complete. {role !== "farmer" ? "Use Re-run analysis in the administration panel." : "An officer will follow up."}</span></Alert>}

      {role === "officer" || role === "admin" ? <ReviewPanel c={c} /> : null}
      {role === "admin" && <AdminPanel c={c} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Status history"><ol className="space-y-3 border-l-2 border-sage-200 pl-4">{c.history.map((h: any, i: number) => (
          <li key={i}><p className="text-sm font-semibold"><StatusBadge status={h.to} /></p><p className="mt-1 text-xs text-muted">{fmtDateTime(h.at)}</p>{h.note && <p className="text-sm">{h.note}</p>}</li>))}</ol></Section>
        <Section title={`Officer Notes & Audit Log (${(c.officer_notes?.length || 0) + (c.reviews?.length || 0)})`}>
          {!(c.officer_notes?.length || c.reviews?.length) ? (
            <p className="text-sm text-muted">No notes or review actions recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {c.officer_notes?.map((n: any) => (
                <div key={n.id} className="rounded-xl border border-sage-200 bg-white p-3.5 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          n.note_type === "inspection"
                            ? "bg-blue-100 text-blue-800"
                            : n.note_type === "clarification_request"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {n.note_type === "inspection"
                          ? "Field Inspection"
                          : n.note_type === "clarification_request"
                          ? "Clarification Request"
                          : "Audit Finding"}
                      </span>
                      <span className="text-xs font-semibold text-navy">{n.officer_name}</span>
                    </div>
                    <span className="text-[11px] text-muted">{fmtDateTime(n.created_at)}</span>
                  </div>

                  <p className="text-xs text-navy whitespace-pre-wrap">{n.content}</p>

                  {n.action_required_from_farmer && (
                    <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 border border-amber-200">
                      <span className="font-bold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-700" /> Action Required from Farmer:
                      </span>
                      <p className="mt-0.5">{n.action_required_from_farmer}</p>
                    </div>
                  )}
                </div>
              ))}

              {c.reviews?.map((r: any) => (
                <div key={r.id} className="rounded-lg bg-sage-50/60 p-3 text-xs border border-sage-100">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-navy">
                      {r.officer}: <span className="capitalize">{r.action.replace(/_/g, " ")}</span>
                    </p>
                    <span className="text-[11px] text-muted">{fmtDateTime(r.at)}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-muted">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted"><PlayCircle className="h-3 w-3" /> KisanClaim provides preliminary evidence support only. Final decisions rest with the insurer or an authorised officer.</p>
    </div>
  );
}
