import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Satellite, Sliders, Droplets, Leaf, Calendar, Cloud, Info, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Alert, Skeleton } from "../components/ui";
import { NdviChart } from "../charts/NdviChart";

export default function SentinelTwin() {
  const [searchParams] = useSearchParams();
  const claimIdParam = searchParams.get("claimId") || "1";
  const claimId = parseInt(claimIdParam, 10);

  // Layer mode: 'true_color' | 'ndvi' | 'ndwi'
  const [layer, setLayer] = useState<"true_color" | "ndvi" | "ndwi">("true_color");
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [ndwiFormula, setNdwiFormula] = useState<"gao" | "mcfeeters">("gao");

  const { data, isLoading, error } = useQuery({
    queryKey: ["satellite-comparison", claimId],
    queryFn: () => api(`/satellite/comparison/${claimId}`),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Alert tone="error">Failed to load satellite comparison data for Claim #{claimId}.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to={`/app/claims/${claimId}`} className="btn btn-ghost !p-2">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-extrabold text-forest-deep flex items-center gap-2">
              <Satellite className="h-7 w-7 text-forest" />
              Sentinel-2 Twin: Before / After Comparison
            </h1>
          </div>
          <p className="mt-1 text-sm text-navy/75">
            Level-2A MultiSpectral surface reflectance audit with NDVI & NDWI dual-index evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sage-100 px-3 py-1 font-mono text-xs font-bold text-forest">
            Claim #{data.claim_id}
          </span>
          <span className="rounded-full bg-sage-100 px-3 py-1 font-mono text-xs font-bold text-forest">
            Centroid DIGIPIN: {data.centroid_digipin || "Registered"}
          </span>
        </div>
      </div>

      {/* Layer Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sage-200 bg-white p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">Raster Layer:</span>
          <div className="flex rounded-lg bg-sage-100 p-1">
            <button
              onClick={() => setLayer("true_color")}
              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                layer === "true_color" ? "bg-white text-forest shadow-sm" : "text-muted hover:text-navy"
              }`}
            >
              True Color (RGB)
            </button>
            <button
              onClick={() => setLayer("ndvi")}
              className={`rounded px-3 py-1 text-xs font-bold flex items-center gap-1 transition-all ${
                layer === "ndvi" ? "bg-white text-forest shadow-sm" : "text-muted hover:text-navy"
              }`}
            >
              <Leaf className="h-3 w-3 text-forest" /> NDVI Heatmap
            </button>
            <button
              onClick={() => setLayer("ndwi")}
              className={`rounded px-3 py-1 text-xs font-bold flex items-center gap-1 transition-all ${
                layer === "ndwi" ? "bg-white text-forest shadow-sm" : "text-muted hover:text-navy"
              }`}
            >
              <Droplets className="h-3 w-3 text-blue-600" /> NDWI Water Layer
            </button>
          </div>
        </div>

        {layer === "ndwi" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted">NDWI Formulation:</span>
            <select
              value={ndwiFormula}
              onChange={(e) => setNdwiFormula(e.target.value as any)}
              className="rounded border border-sage-300 bg-white px-2 py-1 text-xs font-bold text-navy"
            >
              <option value="gao">Gao (1996) Vegetation Moisture (B8-B11)/(B8+B11)</option>
              <option value="mcfeeters">McFeeters (1996) Surface Water (B3-B8)/(B3+B8)</option>
            </select>
          </div>
        )}
      </div>

      {/* Split Comparison Interactive Viewport */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border-2 border-sage-300 bg-navy shadow-lg select-none">
        {/* Pre-Disaster Base Layer (Left side) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              layer === "true_color"
                ? "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80')"
                : layer === "ndvi"
                ? "radial-gradient(circle, #22c55e 30%, #15803d 70%)"
                : "radial-gradient(circle, #38bdf8 20%, #0369a1 80%)",
          }}
        >
          {/* Pre-Event Watermark Tag */}
          <div className="absolute top-4 left-4 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm border border-white/20">
            PRE-DISASTER: {data.pre_date} (Baseline)
          </div>
        </div>

        {/* Post-Disaster Layer (Right side with clip-path matching slider) */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-none"
          style={{
            clipPath: `inset(0 0 0 ${sliderPos}%)`,
            backgroundImage:
              layer === "true_color"
                ? "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url('https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&q=80')"
                : layer === "ndvi"
                ? "radial-gradient(circle, #ca8a04 30%, #78350f 70%)"
                : "radial-gradient(circle, #0284c7 40%, #082f49 90%)",
          }}
        >
          {/* Post-Event Watermark Tag */}
          <div className="absolute top-4 right-4 rounded-lg bg-red-950/80 px-3 py-1.5 text-xs font-bold text-red-200 backdrop-blur-sm border border-red-500/30">
            POST-DISASTER: {data.post_date} (Reported Damage)
          </div>
        </div>

        {/* Field Boundary Overlay Polygon */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-80 rounded-2xl border-2 border-gold/90 bg-forest/20 shadow-2xl flex items-center justify-center backdrop-blur-[1px]">
            <span className="rounded bg-black/70 px-2 py-1 font-mono text-[11px] font-bold text-gold">
              Locked Field: {data.centroid_digipin}
            </span>
          </div>
        </div>

        {/* Draggable Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] cursor-ew-resize flex items-center justify-center"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-2xl border-2 border-forest">
            <Sliders className="h-4 w-4 rotate-90 text-forest" />
          </div>
        </div>

        {/* Hidden Range Input overlay for easy mouse/touch drag */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 h-full w-full opacity-0 cursor-ew-resize z-20"
        />

        {/* Bottom Bar: Instructions */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-xs text-white/90 font-medium backdrop-blur-sm pointer-events-none">
          Drag slider left or right to compare pre vs post loss canopy
        </div>
      </div>

      {/* Metrics & Dual Index Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* NDVI Card */}
        <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-sage-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-forest">
                <Leaf className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display font-bold text-forest-deep text-base">
                  Sentinel-2 NDVI Analysis
                </h3>
                <p className="text-[11px] text-muted">
                  Formula: (NIR - RED) / (NIR + RED) [Bands 8 & 4]
                </p>
              </div>
            </div>
            {data.ndvi.statutory_threshold_met ? (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> ≥30% Loss Met
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                Below 30% Threshold
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-sage-50 p-2.5">
              <p className="text-xs text-muted font-medium">Pre-Loss NDVI</p>
              <p className="text-xl font-black text-forest mt-0.5">{data.ndvi.pre}</p>
            </div>
            <div className="rounded-xl bg-sage-50 p-2.5">
              <p className="text-xs text-muted font-medium">Post-Loss NDVI</p>
              <p className="text-xl font-black text-red-600 mt-0.5">{data.ndvi.post}</p>
            </div>
            <div className="rounded-xl bg-sage-50 p-2.5">
              <p className="text-xs text-muted font-medium">Canopy Drop</p>
              <p className="text-xl font-black text-red-600 mt-0.5">{data.ndvi.pct_change}%</p>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Statutory PMFBY criteria requires a minimum 30% localized canopy reflectance decrease. The observed change represents a severe vegetative index drop.
          </p>
        </div>

        {/* NDWI Card */}
        <div className="rounded-2xl border border-sage-200 bg-white p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-sage-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Droplets className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display font-bold text-navy text-base">
                  Sentinel-2 NDWI Moisture Index
                </h3>
                <p className="text-[11px] text-muted">
                  {ndwiFormula === "gao"
                    ? "Gao (1996): (B8 - B11)/(B8 + B11) Canopy Water"
                    : "McFeeters (1996): (B3 - B8)/(B3 + B8) Open Water"}
                </p>
              </div>
            </div>
            {data.ndwi.flood_saturation_indicated && (
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                Flood / Saturation Indicated
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-blue-50/60 p-2.5 border border-blue-100">
              <p className="text-xs text-muted font-medium">Pre-Event Moisture</p>
              <p className="text-xl font-black text-blue-800 mt-0.5">
                {ndwiFormula === "gao" ? data.ndwi.pre_gao : data.ndwi.pre_mcfeeters}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50/60 p-2.5 border border-blue-100">
              <p className="text-xs text-muted font-medium">Post-Event Moisture</p>
              <p className="text-xl font-black text-blue-900 mt-0.5">
                {ndwiFormula === "gao" ? data.ndwi.post_gao : data.ndwi.post_mcfeeters}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Elevated post-event NDWI values corroborate extensive soil saturation and standing water, providing multi-spectral evidence independent of visual damage photographs.
          </p>
        </div>
      </div>

      {/* 8-Week Time-Series Progression */}
      <div className="rounded-2xl border border-sage-200 bg-white p-6 shadow-soft space-y-4">
        <h3 className="font-display font-bold text-navy text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-forest" />
          Multi-Temporal NDVI Trajectory (Sentinel-2 10m Passes)
        </h3>
        <NdviChart series={data.series} />
      </div>
    </div>
  );
}
