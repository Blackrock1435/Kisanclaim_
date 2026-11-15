import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, RotateCw, Save, XCircle, Mic, Sparkles, AlertTriangle } from "lucide-react";
import { api, getToken, getBaseApiUrl } from "../lib/api";
import { Alert, AuthImage, Empty, FieldWrap, Input, Select, Skeleton, Spinner, Textarea, toast } from "../components/ui";
import FieldMap, { Pt } from "../maps/FieldMap";
import LandPlotMapSelector from "../components/LandPlotMapSelector";
import { DISASTERS, cn, disasterLabel } from "../lib/utils";
import VoiceClaimAssistant from "../components/VoiceClaimAssistant";
import ErrorBoundary from "../components/ErrorBoundary";

const STEPS = ["Field", "Crop", "Disaster", "Photos", "Review"];
const KEY = "kc_claim_form";
const blank = { field_id: "", crop_name: "", variety: "", sowing_date: "", season: "", expected_harvest: "", disaster_type: "flood", incident_date: "", duration_days: "", description: "", remarks: "", consent: false };
type Up = { id: string; name: string; status: "uploading" | "done" | "error"; pct: number; error?: string; file?: File; ev?: any };

function xhrUpload(claimId: number, file: File, onPct: (n: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    const baseUrl = getBaseApiUrl();
    const cleanUrl = `${baseUrl}/claims/${claimId}/evidence`;
    x.open("POST", cleanUrl);
    const token = getToken();
    if (token) x.setRequestHeader("Authorization", `Bearer ${token}`);

    // Capped at 95% until server actually confirms receipt and persistence
    x.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.min(95, Math.round((e.loaded / e.total) * 95));
        onPct(pct);
      }
    };

    x.onload = () => {
      let j: any = {};
      try {
        j = JSON.parse(x.responseText);
      } catch {
        /* ignore */
      }
      if (x.status >= 200 && x.status < 300) {
        onPct(100);
        resolve(Array.isArray(j) ? j[0] : j);
      } else {
        const errMsg = typeof j.detail === "string" ? j.detail : `Server error (HTTP ${x.status})`;
        reject(new Error(errMsg));
      }
    };

    x.onerror = () => {
      reject(new Error("Connection error. Check your internet connection and tap Retry."));
    };

    const f = new FormData();
    f.append("file", file);
    x.send(f);
  });
}

export default function ClaimWizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fields = useQuery({ queryKey: ["fields"], queryFn: () => api("/fields") });
  const [step, setStep] = useState(0);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mapMode, setMapMode] = useState<"cadastral" | "standard">("cadastral");
  const [f, setF] = useState<any>(() => { try { return { ...blank, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return blank; } });
  const [claimId, setClaimId] = useState<number | null>(id ? +id : null);
  const [ups, setUps] = useState<Up[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const loaded = useRef(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(f)); }, [f]); // unsent form survives refresh / signal loss

  useEffect(() => {
    if (!id || loaded.current) return;
    loaded.current = true;
    api(`/claims/${id}`).then((c) => {
      setClaimId(c.id);
      setF({
        field_id: String(c.field_id),
        crop_name: c.crop_name,
        variety: c.variety || "",
        sowing_date: c.sowing_date || "",
        season: c.season || "",
        expected_harvest: c.expected_harvest || "",
        disaster_type: c.disaster_type,
        incident_date: c.incident_date,
        duration_days: c.duration_days ?? "",
        description: c.description || "",
        remarks: c.remarks || "",
        consent: false,
      });
      if (Array.isArray(c.evidence)) {
        setUps(c.evidence.map((e: any) => ({
          id: `e${e.id}`,
          name: e.filename,
          status: "done" as const,
          pct: 100,
          ev: e,
        })));
      }
    }).catch((e) => setErr(e.message));
  }, [id]);

  const field = fields.data?.find((x: any) => String(x.id) === String(f.field_id));
  const pts: Pt[] = field ? field.boundary.coordinates[0].slice(0, -1).map(([lo, la]: number[]) => [la, lo] as Pt) : [];
  const today = new Date().toISOString().slice(0, 10);

  const validate = (s: number) => {
    if (s === 0 && !f.field_id) return "Choose the field that was damaged.";
    if (s === 1 && f.crop_name.trim().length < 2) return "Enter the crop name.";
    if (s === 2) {
      if (!f.incident_date) return "Enter the date of the disaster.";
      if (f.incident_date > today) return "The disaster date cannot be in the future.";
    }
    return "";
  };

  const payload = () => ({
    field_id: +f.field_id,
    crop_name: f.crop_name,
    variety: f.variety || null,
    sowing_date: f.sowing_date || null,
    season: f.season || null,
    expected_harvest: f.expected_harvest || null,
    disaster_type: f.disaster_type,
    incident_date: f.incident_date,
    duration_days: f.duration_days === "" ? null : +f.duration_days,
    description: f.description || null,
    remarks: f.remarks || null,
    consent: !!f.consent,
  });

  async function saveDraft(): Promise<number> {
    const c = claimId
      ? await api(`/claims/${claimId}`, { method: "PUT", body: payload() })
      : await api("/claims", { body: payload() });
    setClaimId(c.id);
    qc.invalidateQueries({ queryKey: ["claims"] });
    if (!id) {
      nav(`/app/claims/${c.id}/edit`, { replace: true });
    }
    return c.id;
  }

  const next = async () => {
    const e = validate(step);
    if (e) return setErr(e);
    setErr("");
    if (step === 2) {
      setBusy(true);
      try {
        await saveDraft();
      } catch (x: any) {
        setBusy(false);
        return setErr(x.message);
      }
      setBusy(false);
    }
    if (step === 3) {
      // Step 3 is Photos. Check if any photo is actively uploading
      if (ups.some((u) => u.status === "uploading")) {
        return setErr("Please wait for all photo uploads to finish before proceeding.");
      }
      // Re-sync saved evidence list from backend to ensure state consistency
      if (claimId) {
        try {
          const fresh = await api(`/claims/${claimId}`);
          if (fresh?.evidence) {
            setUps(fresh.evidence.map((ev: any) => ({
              id: `e${ev.id}`,
              name: ev.filename,
              status: "done" as const,
              pct: 100,
              ev,
            })));
          }
        } catch {}
      }
    }
    setStep(step + 1);
  };

  const upload = async (cid: number, u: Up) => {
    setUps((l) => l.map((x) => (x.id === u.id ? { ...x, status: "uploading", pct: 0, error: undefined } : x)));
    try {
      const ev = await xhrUpload(cid, u.file!, (pct) =>
        setUps((l) => l.map((x) => (x.id === u.id ? { ...x, pct } : x)))
      );
      setUps((l) => l.map((x) => (x.id === u.id ? { ...x, status: "done", pct: 100, ev } : x)));
    } catch (e: any) {
      setUps((l) => l.map((x) => (x.id === u.id ? { ...x, status: "error", error: e.message } : x)));
    }
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Ensure draft claim is saved on server before uploading evidence photos
    let cid = claimId;
    if (!cid) {
      setBusy(true);
      try {
        cid = await saveDraft();
      } catch (err: any) {
        setBusy(false);
        setErr(err.message || "Please complete field and crop details before uploading photos.");
        return;
      }
      setBusy(false);
    }

    const list = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      status: "uploading" as const,
      pct: 0,
      file,
    }));

    const bad = list.filter(
      (u) => !["image/jpeg", "image/png", "image/webp"].includes(u.file.type) || u.file.size > 10 * 1024 * 1024
    );
    if (bad.length) {
      setErr(`Skipped ${bad.map((b) => b.name).join(", ")}: only JPEG, PNG or WebP photos up to 10 MB are accepted.`);
    }

    const ok = list.filter((u) => !bad.includes(u));
    // Filter duplicates by filename
    const existingNames = new Set(ups.map((x) => x.name));
    const toAdd = ok.filter((u) => !existingNames.has(u.name));
    if (toAdd.length < ok.length) {
      toast("Duplicate photo already added.", "error");
    }
    if (toAdd.length === 0) return;

    setUps((l) => [...l, ...toAdd]);
    toAdd.forEach((u) => upload(cid!, u));
  };

  const submit = async () => {
    if (!f.consent) return setErr("Please confirm your consent before submitting.");
    if (ups.some((u) => u.status === "uploading")) return setErr("Wait for the photo uploads to finish.");
    setBusy(true);
    setErr("");
    try {
      const cid = await saveDraft();
      const c = await api(`/claims/${cid}/submit`, { method: "POST" });
      localStorage.removeItem(KEY);
      qc.invalidateQueries();
      toast(`Claim ${c.ref} submitted`);
      nav(`/app/claims/${cid}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  if (fields.isLoading) return <Skeleton className="h-64" />;
  if (!fields.data?.length) return <Empty title="Add a field first" text="A claim is linked to a field with a drawn boundary." action={<Link to="/app/fields" className="btn btn-primary">Go to my fields</Link>} />;
  const failed = ups.filter((u) => u.status === "error");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-forest-deep">{id ? "Continue your claim" : "New damage claim"}</h1>
          <p className="text-xs text-muted">Fill step-by-step or use voice assistance to auto-complete.</p>
        </div>
        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          className="btn bg-gold text-navy hover:bg-amber-400 shadow-soft flex items-center gap-2 !min-h-[42px] px-4 font-bold"
        >
          <Mic className="h-4 w-4 animate-bounce text-forest-deep" />
          <span>Voice Filing (किसान वाणी)</span>
        </button>
      </div>

      <VoiceClaimAssistant
        fields={fields.data || []}
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onComplete={(voiceData) => {
          setF((prev: any) => ({
            ...prev,
            field_id: voiceData.field_id,
            crop_name: voiceData.crop_name,
            disaster_type: voiceData.disaster_type,
            incident_date: voiceData.incident_date,
            description: voiceData.description,
          }));
          toast("Details filled via voice assistant! You can proceed to upload photos.");
          setStep(3); // Jump straight to photo uploads
        }}
      />

      <ol className="flex gap-1" aria-label="Progress">{STEPS.map((s, i) => (
        <li key={s} className={cn("flex-1 rounded-lg px-2 py-2 text-center text-xs font-semibold sm:text-sm", i === step ? "bg-forest text-white" : i < step ? "bg-sage-200 text-forest" : "bg-white text-muted")} aria-current={i === step ? "step" : undefined}>{i + 1}. {s}</li>))}</ol>
      {err && <Alert tone="error">{err}</Alert>}

      <div className="card space-y-4 p-5">
        {step === 0 && <>
          <FieldWrap label="Which field was damaged?" htmlFor="field"><Select id="field" value={f.field_id} onChange={(e) => { set("field_id", e.target.value); const fl = fields.data.find((x: any) => String(x.id) === e.target.value); if (fl && !f.crop_name && fl.crop) set("crop_name", fl.crop); }}>
            <option value="" disabled>Choose a field</option>{fields.data.map((x: any) => <option key={x.id} value={x.id}>{x.name} ({x.farm_name}, {x.area_ha.toFixed(1)} ha)</option>)}</Select></FieldWrap>
          {field && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Field Boundary & Cadastral Verification</span>
                <div className="flex gap-1 bg-sage-100 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMapMode("cadastral")}
                    className={cn("px-2.5 py-1 rounded-md transition-colors", mapMode === "cadastral" ? "bg-forest text-white shadow-xs font-semibold" : "text-forest-deep hover:bg-sage-200")}
                  >
                    Satellite Twin & DIGIPIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapMode("standard")}
                    className={cn("px-2.5 py-1 rounded-md transition-colors", mapMode === "standard" ? "bg-forest text-white shadow-xs font-semibold" : "text-forest-deep hover:bg-sage-200")}
                  >
                    Simple Map
                  </button>
                </div>
              </div>
              {mapMode === "cadastral" ? (
                <LandPlotMapSelector
                  key={field.id}
                  initialCenterLat={pts[0]?.[0] || 13.2456}
                  initialCenterLon={pts[0]?.[1] || 77.7123}
                  initialCoords={pts.length >= 3 ? pts : undefined}
                  surveyNumber={`SRV-${field.id}`}
                />
              ) : (
                <FieldMap readOnly points={pts} height={280} />
              )}
            </div>
          )}
          <p className="text-sm text-muted">Need a new field? <Link to="/app/fields" className="font-semibold text-forest">Draw it first</Link>.</p></>}
        {step === 1 && <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrap label="Crop name" htmlFor="crop"><Input id="crop" value={f.crop_name} onChange={(e) => set("crop_name", e.target.value)} placeholder="e.g. Paddy" /></FieldWrap>
          <FieldWrap label="Variety (if known)" htmlFor="var"><Input id="var" value={f.variety} onChange={(e) => set("variety", e.target.value)} /></FieldWrap>
          <FieldWrap label="Sowing date" htmlFor="sow"><Input id="sow" type="date" max={today} value={f.sowing_date} onChange={(e) => set("sowing_date", e.target.value)} /></FieldWrap>
          <FieldWrap label="Season" htmlFor="seas"><Select id="seas" value={f.season} onChange={(e) => set("season", e.target.value)}><option value="">Not sure</option><option>Kharif</option><option>Rabi</option><option>Zaid</option></Select></FieldWrap>
          <FieldWrap label="Expected harvest date (if known)" htmlFor="harv"><Input id="harv" type="date" value={f.expected_harvest} onChange={(e) => set("expected_harvest", e.target.value)} /></FieldWrap></div>}
        {step === 2 && <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrap label="What happened?" htmlFor="dis"><Select id="dis" value={f.disaster_type} onChange={(e) => set("disaster_type", e.target.value)}>{DISASTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FieldWrap>
          <FieldWrap label="Date it happened" hint="If it lasted several days, use the first day." htmlFor="inc"><Input id="inc" type="date" max={today} value={f.incident_date} onChange={(e) => set("incident_date", e.target.value)} /></FieldWrap>
          <FieldWrap label="How many days did it last? (approx.)" htmlFor="dur"><Input id="dur" type="number" min={0} max={365} value={f.duration_days} onChange={(e) => set("duration_days", e.target.value)} /></FieldWrap>
          <div className="sm:col-span-2"><FieldWrap label="Describe the damage" htmlFor="desc"><Textarea id="desc" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Water stood in the field for 4 days; most plants collapsed." /></FieldWrap></div>
          <div className="sm:col-span-2"><FieldWrap label="Anything else? (optional)" htmlFor="rem"><Textarea id="rem" value={f.remarks} onChange={(e) => set("remarks", e.target.value)} /></FieldWrap></div></div>}
        {step === 3 && <div className="space-y-4">
          <Alert tone="info">Take photos in the field with location turned on if you can. If your photos have no location data, that is fine and will not count against you. Original photos are stored unchanged.</Alert>
          <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sage-200 bg-sage-50 p-6 text-center hover:border-forest">
            <ImagePlus className="h-8 w-8 text-forest-mid" /><span className="font-display font-bold">Add photographs</span><span className="text-sm text-muted">JPEG, PNG or WebP, up to 10 MB each. Three or more recommended.</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={!claimId} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /></label>
          {ups.length > 0 && <ul className="space-y-2">{ups.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-lg border border-sage-100 p-2">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-sage-100">{u.ev && <AuthImage path={`/evidence/${u.ev.id}/file`} alt={u.name} className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{u.name}</p>
                {u.status === "uploading" && <div className="mt-1 h-2 overflow-hidden rounded-full bg-sage-100" role="progressbar" aria-valuenow={u.pct}><div className="h-full bg-forest transition-all" style={{ width: `${u.pct}%` }} /></div>}
                {u.status === "done" && <p className="flex items-center gap-1 text-xs text-forest"><CheckCircle2 className="h-3 w-3" /> Saved on server. {u.ev?.has_gps ? "Location found in photo." : "No location data in this photo."}</p>}
                {u.status === "error" && <p className="flex items-center gap-1 text-xs text-red-700"><XCircle className="h-3 w-3" /> {u.error}</p>}</div>
              {u.status === "error" && u.file && <button className="btn btn-ghost !min-h-[40px]" onClick={() => upload(claimId!, u)}><RotateCw className="h-4 w-4" /> Retry</button>}
            </li>))}</ul>}
          {failed.length > 0 && <Alert tone="warn">{failed.length} photo(s) did not upload. Retry them before submitting.</Alert>}</div>}
        {step === 4 && <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Check your claim</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Field", field?.name],
              ["Crop", `${f.crop_name}${f.variety ? ` (${f.variety})` : ""}`],
              ["Disaster", disasterLabel(f.disaster_type)],
              ["Date", f.incident_date],
              ["Duration", f.duration_days ? `${f.duration_days} days` : "Not given"],
              ["Photos uploaded", `${ups.filter((u) => u.status === "done").length} verified`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-muted">Description</dt>
              <dd>{f.description || "Not given"}</dd>
            </div>
          </dl>

          {/* Verified Evidence Photo Previews */}
          <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-forest-deep flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-forest" />
                Evidence Photographs ({ups.filter((u) => u.status === "done").length} Saved on Server)
              </h3>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-semibold text-forest underline hover:text-forest-deep"
              >
                + Manage Photos
              </button>
            </div>

            {ups.filter((u) => u.status === "done").length === 0 ? (
              <div className="rounded-lg border border-dashed border-sage-300 p-4 text-center">
                <p className="text-xs text-muted">No photographs verified yet on server.</p>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="mt-2 text-xs font-bold text-forest underline"
                >
                  Go to Step 4 to attach photos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ups.filter((u) => u.status === "done").map((u) => (
                  <div key={u.id} className="group relative rounded-xl border border-sage-200 bg-white p-2 shadow-xs">
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-sage-100">
                      {u.ev ? (
                        <AuthImage
                          path={`/evidence/${u.ev.id}/file`}
                          alt={u.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted">
                          <ImagePlus className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-xs font-semibold text-navy" title={u.name}>
                      {u.name}
                    </p>
                    <p className="text-[10px] text-muted">
                      {u.ev?.size ? `${(u.ev.size / (1024 * 1024)).toFixed(2)} MB` : "Confirmed"} •{" "}
                      {u.ev?.has_gps ? "📍 GPS Verified" : "No GPS"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {ups.some((u) => u.status === "uploading") && (
            <Alert tone="warn" title="Uploads in progress">
              Some photographs are still uploading to the server. Please wait for them to finish before submitting.
            </Alert>
          )}

          {failed.length > 0 && (
            <Alert tone="error" title="Upload errors detected">
              {failed.length} photograph(s) failed to upload. Tap "Manage Photos" above to retry or remove them.
            </Alert>
          )}

          {ups.filter((u) => u.status === "done").length < 3 && (
            <Alert tone="warn">
              Fewer than 3 photos. You can still submit, but more photos make the report stronger.
            </Alert>
          )}

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-forest"
              checked={f.consent}
              onChange={(e) => set("consent", e.target.checked)}
            />
            <span>
              I confirm the information and photographs are true and are from my own field. I consent to KisanClaim
              analysing them with satellite and weather data and sharing the result with the assigned officer.
            </span>
          </label>
          <Alert tone="info">
            After you submit, we fetch satellite and rainfall data and prepare a preliminary report. It is not an
            insurance approval.
          </Alert>
        </div>}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button className="btn btn-ghost" disabled={step === 0 || busy} onClick={() => { setErr(""); setStep(step - 1); }}>Back</button>
        <div className="flex gap-3">
          {step >= 2 && step < 4 && <button className="btn btn-ghost" disabled={busy} onClick={async () => { const e = validate(2); if (e && step >= 2) return setErr(e); try { await saveDraft(); toast("Draft saved"); } catch (x: any) { setErr(x.message); } }}><Save className="h-4 w-4" /> Save draft</button>}
          {step < 4 ? <button className="btn btn-primary" disabled={busy} onClick={next}>{busy ? <Spinner /> : "Next"}</button>
            : <button className="btn btn-gold" disabled={busy} onClick={submit}>{busy ? <Spinner /> : "Submit claim"}</button>}
        </div>
      </div>
    </div>
  );
}
