import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Lock, CheckCircle2, Sprout } from "lucide-react";
import { api } from "../lib/api";
import { Alert, Empty, FieldWrap, Input, Select, Skeleton, Spinner, toast } from "../components/ui";
import FieldMap, { Pt } from "../maps/FieldMap";
import DigipinPlotLockModal from "../components/DigipinPlotLockModal";
import CropHistoryModal from "../components/CropHistoryModal";
import { STATES, toGeoJSON } from "../lib/utils";

const farmSchema = z.object({ name: z.string().min(2, "Enter a farm name"), state: z.string().min(1, "Choose a state"), district: z.string().min(2, "Enter the district"), taluk: z.string().optional(), village: z.string().optional() });
const fieldSchema = z.object({ name: z.string().min(1, "Give the field a name"), crop: z.string().optional(), season: z.string().optional(), sowing_date: z.string().optional() });

function FarmForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(farmSchema) });
  const [err, setErr] = useState("");
  return (
    <form noValidate className="card space-y-4 p-5" onSubmit={handleSubmit(async (v) => {
      try { await api("/farms", { body: v }); toast("Farm saved"); qc.invalidateQueries({ queryKey: ["farms"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); reset(); onDone(); } catch (e: any) { setErr(e.message); }
    })}>
      <h3 className="font-display text-lg font-bold">Register a farm</h3>{err && <Alert tone="error">{err}</Alert>}
      <FieldWrap label="Farm name" error={errors.name?.message as string} htmlFor="fname"><Input id="fname" {...register("name")} /></FieldWrap>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrap label="State" error={errors.state?.message as string} htmlFor="state"><Select id="state" defaultValue="" {...register("state")}><option value="" disabled>Choose state</option>{STATES.map((s) => <option key={s}>{s}</option>)}</Select></FieldWrap>
        <FieldWrap label="District" error={errors.district?.message as string} htmlFor="district"><Input id="district" {...register("district")} /></FieldWrap>
        <FieldWrap label="Taluk (optional)" htmlFor="taluk"><Input id="taluk" {...register("taluk")} /></FieldWrap>
        <FieldWrap label="Village (optional)" htmlFor="village"><Input id="village" {...register("village")} /></FieldWrap>
      </div>
      <button className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : "Save farm"}</button>
    </form>
  );
}

function FieldForm({ farms, onDone }: { farms: any[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [pts, setPts] = useState<Pt[]>([]);
  const [farmId, setFarmId] = useState<string>(String(farms[0]?.id || ""));
  const [err, setErr] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(fieldSchema) });
  return (
    <form noValidate className="card space-y-4 p-5" onSubmit={handleSubmit(async (v) => {
      setErr("");
      if (pts.length < 3) return setErr("Draw the field boundary on the map first: tap at least 3 corners.");
      try {
        await api("/fields", { body: { farm_id: +farmId, ...v, crop: v.crop || null, season: v.season || null, sowing_date: v.sowing_date || null, boundary: toGeoJSON(pts) } });
        toast("Field saved"); setPts([]); reset(); qc.invalidateQueries({ queryKey: ["fields"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); onDone();
      } catch (e: any) { setErr(e.message); }
    })}>
      <h3 className="font-display text-lg font-bold">Add a field</h3>{err && <Alert tone="error">{err}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrap label="Farm" htmlFor="farm"><Select id="farm" value={farmId} onChange={(e) => setFarmId(e.target.value)}>{farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></FieldWrap>
        <FieldWrap label="Field name" error={errors.name?.message as string} htmlFor="n"><Input id="n" placeholder="e.g. North plot" {...register("name")} /></FieldWrap>
        <FieldWrap label="Crop (optional)" htmlFor="c"><Input id="c" placeholder="e.g. Paddy" {...register("crop")} /></FieldWrap>
        <FieldWrap label="Season (optional)" htmlFor="s"><Select id="s" defaultValue="" {...register("season")}><option value="">Not sure</option><option>Kharif</option><option>Rabi</option><option>Zaid</option></Select></FieldWrap>
        <FieldWrap label="Sowing date (optional)" htmlFor="sd"><Input id="sd" type="date" {...register("sowing_date")} /></FieldWrap>
      </div>
      <div><p className="label">Field boundary</p><FieldMap points={pts} onChange={setPts} /></div>
      <button className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? <Spinner /> : "Save field"}</button>
    </form>
  );
}

export default function Fields() {
  const qc = useQueryClient();
  const farms = useQuery({ queryKey: ["farms"], queryFn: () => api("/farms") });
  const fields = useQuery({ queryKey: ["fields"], queryFn: () => api("/fields") });
  const [showFarm, setShowFarm] = useState(false);
  const [showField, setShowField] = useState(false);
  const del = useMutation({ mutationFn: (id: number) => api(`/fields/${id}`, { method: "DELETE" }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["fields"] }); toast("Field deleted"); }, onError: (e: any) => toast(e.message, "error") });
  const [open, setOpen] = useState<number | null>(null);
  const [lockingField, setLockingField] = useState<any | null>(null);
  const [cropField, setCropField] = useState<any | null>(null);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold text-forest-deep">My farms and fields</h1><p className="text-muted">The drawn boundary is the official record of your field. The DIGIPIN is only a location reference.</p></div>
        <div className="flex gap-2"><button className="btn btn-ghost" onClick={() => setShowFarm(!showFarm)}><Plus className="h-4 w-4" /> Farm</button>
          <button className="btn btn-primary" disabled={!farms.data?.length} onClick={() => setShowField(!showField)}><Plus className="h-4 w-4" /> Field</button></div>
      </div>
      {showFarm && <FarmForm onDone={() => setShowFarm(false)} />}
      {showField && farms.data?.length > 0 && <FieldForm farms={farms.data} onDone={() => setShowField(false)} />}
      {farms.isLoading || fields.isLoading ? <Skeleton className="h-40" /> : !farms.data?.length ? (
        <Empty title="Start by registering a farm" text="A farm is the place where your fields are. Add its district and village." action={<button className="btn btn-primary" onClick={() => setShowFarm(true)}>Register a farm</button>} />
      ) : !fields.data?.length ? (
        <Empty title="No fields yet" text="Draw your field on the satellite map so we can check it after a disaster." action={<button className="btn btn-primary" onClick={() => setShowField(true)}>Add a field</button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{fields.data.map((f: any) => (
          <article key={f.id} className="card p-5">
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-display text-lg font-bold">{f.name}</h3><p className="text-sm text-muted">{f.farm_name}{f.crop ? ` | ${f.crop}` : ""}</p></div>
              <button aria-label={`Delete ${f.name}`} className="rounded-lg p-2 text-red-700 hover:bg-red-50" onClick={() => confirm(`Delete field "${f.name}"?`) && del.mutate(f.id)}><Trash2 className="h-4 w-4" /></button></div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">Area</dt><dd className="font-semibold">{f.area_ha.toFixed(2)} ha ({((f.area_ha || 0) * 2.471).toFixed(2)} acres)</dd></div>
              <div><dt className="text-muted">Coordinates</dt><dd className="font-semibold">{f.lat.toFixed(5)}, {f.lon.toFixed(5)}</dd></div>
              <div className="col-span-2"><dt className="text-muted">DIGIPIN (India Post)</dt><dd className="font-mono font-bold text-forest">{f.digipin || "Not available outside DIGIPIN coverage"}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-sage-100 pt-3">
              <button className="text-xs font-semibold text-forest underline" onClick={() => setOpen(open === f.id ? null : f.id)}>{open === f.id ? "Hide map" : "Show boundary"}</button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCropField(f)}
                  className="btn btn-ghost !min-h-[34px] !px-2.5 text-xs font-bold flex items-center gap-1.5 border border-sage-300 bg-sage-50 text-forest hover:bg-sage-100"
                >
                  <Sprout className="h-3.5 w-3.5 text-forest" />
                  <span>Crop History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLockingField(f)}
                  className="btn btn-ghost !min-h-[34px] !px-2.5 text-xs font-bold flex items-center gap-1.5 border border-sage-300 bg-sage-50 text-forest hover:bg-sage-100"
                >
                  <Lock className="h-3.5 w-3.5 text-forest" />
                  <span>Lock Plot</span>
                </button>
              </div>
            </div>
            {open === f.id && <div className="mt-3"><FieldMap readOnly height={260} points={f.boundary.coordinates[0].slice(0, -1).map(([lo, la]: number[]) => [la, lo] as Pt)} /></div>}
          </article>))}</div>)}

      {lockingField && (
        <DigipinPlotLockModal
          field={lockingField}
          isOpen={true}
          onClose={() => setLockingField(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["fields"] });
            toast("Plot locked successfully with official DIGIPIN addresses!");
          }}
        />
      )}

      {cropField && (
        <CropHistoryModal
          field={cropField}
          isOpen={true}
          onClose={() => setCropField(null)}
        />
      )}
    </div>
  );
}
