import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sprout, Plus, Trash2, Calendar, Award } from "lucide-react";
import { api } from "../lib/api";
import { Alert, FieldWrap, Input, Select, Spinner, toast } from "./ui";
import { fmtDate } from "../lib/utils";

interface CropHistoryModalProps {
  field: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function CropHistoryModal({ field, isOpen, onClose }: CropHistoryModalProps) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [cropName, setCropName] = useState("");
  const [variety, setVariety] = useState("");
  const [season, setSeason] = useState("Kharif 2026");
  const [sowingDate, setSowingDate] = useState("");
  const [status, setStatus] = useState("sown");
  const [yieldQuintals, setYieldQuintals] = useState("");

  const cropsQuery = useQuery({
    queryKey: ["field-crops", field?.id],
    queryFn: () => (field?.id ? api(`/fields/${field.id}/crops`) : []),
    enabled: !!field?.id && isOpen,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api(`/fields/${field.id}/crops`, {
        body: {
          crop_name: cropName,
          variety: variety || null,
          season,
          sowing_date: sowingDate || null,
          status,
          yield_quintals: yieldQuintals ? parseFloat(yieldQuintals) : null,
        },
      }),
    onSuccess: () => {
      toast("Seasonal crop record added successfully");
      setShowAdd(false);
      setCropName("");
      setVariety("");
      setSowingDate("");
      setYieldQuintals("");
      qc.invalidateQueries({ queryKey: ["field-crops", field?.id] });
      qc.invalidateQueries({ queryKey: ["fields"] });
    },
    onError: (err: any) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (cropId: number) => api(`/fields/${field.id}/crops/${cropId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast("Crop record removed");
      qc.invalidateQueries({ queryKey: ["field-crops", field?.id] });
    },
    onError: (err: any) => toast(err.message, "error"),
  });

  if (!isOpen || !field) return null;

  const crops = cropsQuery.data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-sage-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-forest/10 p-2 text-forest">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-navy">
                Seasonal Crop History & Cultivation
              </h3>
              <p className="text-xs text-muted">
                Field: <span className="font-semibold text-forest">{field.name}</span> ({field.area_ha?.toFixed(2)} ha)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-sage-100">✕</button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            PMFBY insurance verification correlates historical sowing records against satellite vegetation indices.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="btn btn-primary !min-h-[36px] !px-3 text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAdd ? "Cancel" : "Add Crop Season"}
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className="rounded-xl border border-sage-200 bg-sage-50/70 p-4 space-y-3">
            <h4 className="font-display text-sm font-bold text-navy">Declare Seasonal Sowing / Harvest</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldWrap label="Crop Name *" htmlFor="crop-name">
                <Input
                  id="crop-name"
                  placeholder="e.g. Paddy, Ragi, Cotton"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                />
              </FieldWrap>
              <FieldWrap label="Crop Variety" htmlFor="variety">
                <Input
                  id="variety"
                  placeholder="e.g. IR-64, GPU-28"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                />
              </FieldWrap>
              <FieldWrap label="Season *" htmlFor="season">
                <Select id="season" value={season} onChange={(e) => setSeason(e.target.value)}>
                  <option value="Kharif 2026">Kharif 2026</option>
                  <option value="Rabi 2025-26">Rabi 2025-26</option>
                  <option value="Zaid 2026">Zaid 2026</option>
                  <option value="Kharif 2025">Kharif 2025</option>
                </Select>
              </FieldWrap>
              <FieldWrap label="Sowing Date" htmlFor="sow-dt">
                <Input
                  id="sow-dt"
                  type="date"
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                />
              </FieldWrap>
              <FieldWrap label="Crop Stage" htmlFor="crop-st">
                <Select id="crop-st" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="sown">Sown (Early vegetative)</option>
                  <option value="vegetative">Vegetative Canopy</option>
                  <option value="flowering">Flowering / Grain Formation</option>
                  <option value="harvested">Harvested</option>
                  <option value="damaged">Damaged by Disaster</option>
                </Select>
              </FieldWrap>
              <FieldWrap label="Expected/Actual Yield (Quintals)" htmlFor="yield">
                <Input
                  id="yield"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 18.5"
                  value={yieldQuintals}
                  onChange={(e) => setYieldQuintals(e.target.value)}
                />
              </FieldWrap>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!cropName.trim() || addMutation.isPending}
                onClick={() => addMutation.mutate()}
                className="btn btn-primary !min-h-[38px] text-xs font-semibold"
              >
                {addMutation.isPending ? <Spinner /> : "Save Crop Record"}
              </button>
            </div>
          </div>
        )}

        {/* Crop History List */}
        {cropsQuery.isLoading ? (
          <div className="py-8 text-center"><Spinner className="h-6 w-6 text-forest mx-auto" /></div>
        ) : crops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sage-200 p-8 text-center">
            <Sprout className="h-8 w-8 text-muted mx-auto mb-2" />
            <p className="text-sm font-semibold text-navy">No seasonal crop records yet</p>
            <p className="text-xs text-muted mt-1">
              Add your current or past sowing details to build an official PMFBY cultivation trail.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-sage-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-sage-100 font-display">
                <tr>
                  <th className="p-3">Season</th>
                  <th className="p-3">Crop & Variety</th>
                  <th className="p-3">Sowing Date</th>
                  <th className="p-3">Stage / Status</th>
                  <th className="p-3">Yield</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-100">
                {crops.map((c: any) => (
                  <tr key={c.id} className="hover:bg-sage-50/50">
                    <td className="p-3 font-semibold text-forest-deep">{c.season}</td>
                    <td className="p-3">
                      <span className="font-bold text-navy">{c.crop_name}</span>
                      {c.variety && <span className="text-muted ml-1">({c.variety})</span>}
                    </td>
                    <td className="p-3">{c.sowing_date ? fmtDate(c.sowing_date) : "-"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          c.status === "harvested"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === "damaged"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium">
                      {c.yield_quintals != null ? `${c.yield_quintals} Qtl` : "-"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete crop record for ${c.crop_name} (${c.season})?`)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        title="Delete crop record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-sage-100">
          <button onClick={onClose} className="btn btn-ghost !min-h-[38px] text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
