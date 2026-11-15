import React, { useState } from "react";
import { Lock, MapPin, Check, AlertCircle, X, Compass, Layers } from "lucide-react";
import { api } from "../lib/api";
import { Alert, Spinner } from "../components/ui";
import FieldMap, { Pt } from "../maps/FieldMap";

interface DigipinPlotLockModalProps {
  field: {
    id: number;
    name: string;
    area_ha?: number;
    digipin?: string;
    boundary?: any;
    centroid_lat?: number;
    centroid_lon?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lockedData: any) => void;
}

export default function DigipinPlotLockModal({
  field,
  isOpen,
  onClose,
  onSuccess,
}: DigipinPlotLockModalProps) {
  // Extract initial 4 points or default around field centroid
  const getInitialPoints = (): Pt[] => {
    if (field.boundary?.coordinates?.[0]?.length >= 4) {
      return field.boundary.coordinates[0].slice(0, 4).map((p: number[]) => [p[1], p[0]] as Pt);
    }
    const cLat = field.centroid_lat || 13.111796;
    const cLon = field.centroid_lon || 80.202643;
    const offset = 0.0015;
    return [
      [cLat - offset, cLon - offset],
      [cLat + offset, cLon - offset],
      [cLat + offset, cLon + offset],
      [cLat - offset, cLon + offset],
    ];
  };

  const [points, setPoints] = useState<Pt[]>(getInitialPoints());
  const [reason, setReason] = useState("Official India Post DIGIPIN 4-Corner Cadastral Plot Lock");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!isOpen) return null;

  const handleLock = async () => {
    if (points.length !== 4) {
      setErr("A locked parcel must contain exactly 4 corner coordinates.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await api("/parcel/lock", {
        method: "POST",
        body: JSON.stringify({
          field_id: field.id,
          coords: points,
          reason,
        }),
      });
      onSuccess(res);
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to lock parcel geometry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sage-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white shadow-soft">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-forest-deep">
                DIGIPIN Plot Lock (4-Corner Cadastral Lock)
              </h2>
              <p className="text-xs text-muted">
                Field: {field.name} • Official India Post 10-Character Geotag Specification
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-sage-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {err && <Alert tone="error">{err}</Alert>}

        {/* Map Viewport for 4 draggable corners */}
        <div className="rounded-xl overflow-hidden border border-sage-200">
          <FieldMap points={points} onChange={(pts) => setPoints(pts.slice(0, 4))} height={340} />
        </div>

        {/* 4 Corner Readouts */}
        <div className="rounded-xl bg-sage-50 p-3 text-xs border border-sage-200 space-y-2">
          <p className="font-bold text-forest flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" /> 4-Corner Boundary Vertices (Draggable on Map):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            {points.map((p, idx) => (
              <div key={idx} className="rounded bg-white p-2 border border-sage-200">
                <span className="text-muted block text-[10px] font-bold">Corner {idx + 1}</span>
                <span className="font-bold text-navy truncate block">
                  {p[0].toFixed(5)}, {p[1].toFixed(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="text-xs font-semibold text-muted block mb-1">
            Cadastral Reason / Audit Trail Note:
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input text-xs"
            placeholder="Audit trail note..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-sage-100 pt-3">
          <button type="button" onClick={onClose} className="btn btn-ghost text-xs">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLock}
            disabled={loading || points.length !== 4}
            className="btn btn-primary text-xs font-bold flex items-center gap-2"
          >
            {loading ? <Spinner /> : <><Lock className="h-3.5 w-3.5" /> <span>Confirm & Lock Parcel</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
