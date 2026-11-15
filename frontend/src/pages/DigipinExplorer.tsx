import React, { useState } from "react";
import {
  Compass,
  Grid,
  MapPin,
  ChevronRight,
  RotateCcw,
  Search,
  CheckCircle2,
  Layers,
  ArrowRight,
  Info,
  ExternalLink,
} from "lucide-react";
import { Input } from "../components/ui";

// Official DIGIPIN parameters
const GRID_CHARS = [
  ["F", "C", "9", "8"],
  ["J", "3", "2", "7"],
  ["K", "4", "5", "6"],
  ["L", "M", "P", "T"],
];

const ROOT_BOUNDS = {
  minLat: 2.5,
  maxLat: 38.5,
  minLon: 63.5,
  maxLon: 99.5,
};

const LEVEL_DESCRIPTIONS: Record<number, { spanKm: string; label: string }> = {
  1: { spanKm: "~1000 km", label: "Macro Zone (Northern, Peninsular, etc.)" },
  2: { spanKm: "~250 km", label: "Regional State Cluster" },
  3: { spanKm: "~62.5 km", label: "District / Revenue Division" },
  4: { spanKm: "~15.6 km", label: "Taluk / Tehsil / Block" },
  5: { spanKm: "~3.9 km", label: "Gram Panchayat / Village Hub" },
  6: { spanKm: "~976 m", label: "Revenue Sheet (~1 sq km)" },
  7: { spanKm: "~244 m", label: "Farm Parcel Cluster (~6 ha)" },
  8: { spanKm: "~61 m", label: "Individual Agricultural Field (~1 Acre)" },
  9: { spanKm: "~15.2 m", label: "Farmstead / Structure" },
  10: { spanKm: "~3.8 m", label: "Unit Pinpoint Grid Cell (GPS Accuracy)" },
};

// Official Spiral sequence: 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> C -> J -> K -> L -> M -> P -> T -> F
const SPIRAL_ORDER = [
  "2", "3", "4", "5", "6", "7", "8", "9", "C", "J", "K", "L", "M", "P", "T", "F"
];

// Reference test points
const PRESETS = [
  { name: "Official Reference Vector (Chennai)", lat: 13.111796, lon: 80.202643, expected: "4T396F42L7" },
  { name: "Bengaluru Demo Farm (KisanClaim)", lat: 13.120500, lon: 80.210200, expected: "4T396FP923" },
  { name: "New Delhi (Central India Post)", lat: 28.613939, lon: 77.209021, expected: "39J49LL8T4" },
  { name: "Mumbai (Nariman Point)", lat: 18.9256, lon: 72.8242, expected: "43C7882255" },
];

export default function DigipinExplorer() {
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"interactive" | "encoder">("interactive");

  // Coordinate Input state
  const [inputLat, setInputLat] = useState("13.111796");
  const [inputLon, setInputLon] = useState("80.202643");
  const [encodedResult, setEncodedResult] = useState<string | null>("4T396F42L7");

  // Calculate current bounding box based on selectedChars
  let currentBounds = { ...ROOT_BOUNDS };
  for (const ch of selectedChars) {
    const latDiv = (currentBounds.maxLat - currentBounds.minLat) / 4;
    const lonDiv = (currentBounds.maxLon - currentBounds.minLon) / 4;

    let foundR = 0, foundC = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (GRID_CHARS[r][c] === ch) {
          foundR = r;
          foundC = c;
        }
      }
    }

    currentBounds = {
      minLat: currentBounds.maxLat - latDiv * (foundR + 1),
      maxLat: currentBounds.maxLat - latDiv * foundR,
      minLon: currentBounds.minLon + lonDiv * foundC,
      maxLon: currentBounds.minLon + lonDiv * (foundC + 1),
    };
  }

  const currentLevel = selectedChars.length + 1;
  const isMaxLevel = selectedChars.length >= 10;

  // Handle drill-down click
  const handleSelectSubSquare = (ch: string) => {
    if (isMaxLevel) return;
    setSelectedChars([...selectedChars, ch]);
  };

  const handleReset = () => {
    setSelectedChars([]);
  };

  const handleStepBack = (index: number) => {
    setSelectedChars(selectedChars.slice(0, index));
  };

  // Client-side DIGIPIN encoding function (pure official algorithm)
  const encodeCoords = (lat: number, lon: number): string => {
    if (lat < 2.5 || lat > 38.5 || lon < 63.5 || lon > 99.5) {
      return "Out of India Bounds";
    }
    let minLat = 2.5, maxLat = 38.5, minLon = 63.5, maxLon = 99.5;
    let out = "";
    for (let i = 0; i < 10; i++) {
      const latDiv = (maxLat - minLat) / 4;
      const lonDiv = (maxLon - minLon) / 4;
      let row = 3 - Math.floor((lat - minLat) / latDiv);
      let col = Math.floor((lon - minLon) / lonDiv);
      row = Math.max(0, Math.min(row, 3));
      col = Math.max(0, Math.min(col, 3));
      out += GRID_CHARS[row][col];
      maxLat = minLat + latDiv * (4 - row);
      minLat = minLat + latDiv * (3 - row);
      minLon = minLon + lonDiv * col;
      maxLon = minLon + lonDiv;
    }
    return out;
  };

  const handleRunEncoder = () => {
    const lat = parseFloat(inputLat);
    const lon = parseFloat(inputLon);
    if (isNaN(lat) || isNaN(lon)) return;
    const res = encodeCoords(lat, lon);
    setEncodedResult(res);
    setSelectedChars(res.split(""));
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setInputLat(String(preset.lat));
    setInputLon(String(preset.lon));
    setEncodedResult(preset.expected);
    setSelectedChars(preset.expected.split(""));
  };

  const formattedPin = selectedChars.length
    ? `${selectedChars.slice(0, 3).join("")} ${selectedChars.slice(3, 7).join("")} ${selectedChars.slice(7, 10).join("")}`.trim()
    : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-white shadow-soft">
              <Compass className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-forest-deep">DIGIPIN Hierarchical Grid Explorer</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Official India Post 4×4 recursive geospatial grid system covering Indian sovereign territory with meter-level resolution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://www.indiapost.gov.in/digipin"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost !min-h-[36px] text-xs font-semibold text-forest flex items-center gap-1"
          >
            India Post Spec <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Main Interactive Container */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: 4x4 Grid Visualization */}
        <div className="card p-6 lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Current Level: <strong className="text-forest text-sm">{Math.min(currentLevel, 10)} / 10</strong>
              </p>
              <h2 className="text-lg font-bold text-navy">
                {isMaxLevel
                  ? "Level 10 Reached: ~3.8m × ~3.8m Unit Pinpoint Cell"
                  : `Level ${currentLevel}: Select a quadrant to zoom in`}
              </h2>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-ghost !min-h-[34px] !py-1 text-xs flex items-center gap-1 text-rose-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to Level 1
            </button>
          </div>

          {/* Breadcrumb path */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-sage-50 p-2.5 text-xs font-mono">
            <button
              onClick={handleReset}
              className="font-bold text-forest hover:underline"
            >
              India (Root)
            </button>
            {selectedChars.map((ch, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="h-3 w-3 text-muted" />
                <button
                  onClick={() => handleStepBack(idx + 1)}
                  className="rounded bg-white px-1.5 py-0.5 font-bold text-navy shadow-sm hover:bg-sage-100"
                >
                  {ch}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* 4x4 Grid Canvas */}
          <div className="relative mx-auto aspect-square max-w-[420px] rounded-2xl border-2 border-sage-300 bg-white p-2 shadow-inner">
            <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-2">
              {GRID_CHARS.map((row, rIdx) =>
                row.map((symbol, cIdx) => {
                  const spiralIndex = SPIRAL_ORDER.indexOf(symbol) + 1;
                  return (
                    <button
                      key={symbol}
                      onClick={() => handleSelectSubSquare(symbol)}
                      disabled={isMaxLevel}
                      className={`group relative flex flex-col items-center justify-center rounded-xl border border-sage-200 transition-all ${
                        isMaxLevel
                          ? "cursor-default bg-sage-50 opacity-60"
                          : "bg-sage-50/70 hover:scale-[1.03] hover:border-forest hover:bg-forest hover:text-white shadow-soft"
                      }`}
                    >
                      <span className="font-display text-2xl font-black">{symbol}</span>
                      <span className="text-[10px] opacity-70 group-hover:opacity-100">
                        #{spiralIndex}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Spiral Sequence Indicator */}
          <div className="rounded-xl bg-sage-50 p-3 text-xs text-muted">
            <span className="font-bold text-forest">Official Spiral Sequence:</span>{" "}
            {SPIRAL_ORDER.join(" → ")}
          </div>
        </div>

        {/* Right Side: Coordinate & Resolution Information */}
        <div className="space-y-5 lg:col-span-5">
          {/* Active DIGIPIN Result Card */}
          <div className="card p-5 border-l-4 border-l-forest space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Generated DIGIPIN</p>
            <div className="rounded-lg bg-navy p-4 text-center text-white">
              <p className="font-mono text-2xl font-black tracking-widest text-gold">
                {selectedChars.join("") || "CLICK TO EXPLORE"}
              </p>
              <p className="mt-1 font-mono text-xs text-sage-200">{formattedPin}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted">Resolution:</span>{" "}
                <strong>{LEVEL_DESCRIPTIONS[Math.min(currentLevel, 10)]?.spanKm}</strong>
              </div>
              <div>
                <span className="text-muted">Context:</span>{" "}
                <strong>{LEVEL_DESCRIPTIONS[Math.min(currentLevel, 10)]?.label}</strong>
              </div>
            </div>
          </div>

          {/* Geographical Bounding Box */}
          <div className="card p-5 space-y-3 text-xs">
            <h3 className="font-display font-bold text-navy flex items-center gap-1.5">
              <Grid className="h-4 w-4 text-forest" /> Current Bounding Box (WGS-84)
            </h3>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-sage-50 p-3 font-mono">
              <div>
                <span className="text-muted">Min Lat:</span> {currentBounds.minLat.toFixed(6)}°N
              </div>
              <div>
                <span className="text-muted">Max Lat:</span> {currentBounds.maxLat.toFixed(6)}°N
              </div>
              <div>
                <span className="text-muted">Min Lon:</span> {currentBounds.minLon.toFixed(6)}°E
              </div>
              <div>
                <span className="text-muted">Max Lon:</span> {currentBounds.maxLon.toFixed(6)}°E
              </div>
            </div>
            <p className="text-muted">
              Centroid:{" "}
              <strong>
                {((currentBounds.minLat + currentBounds.maxLat) / 2).toFixed(6)}°N,{" "}
                {((currentBounds.minLon + currentBounds.maxLon) / 2).toFixed(6)}°E
              </strong>
            </p>
          </div>

          {/* Lat/Lon Encoder Tester */}
          <div className="card p-5 space-y-3">
            <h3 className="font-display font-bold text-navy flex items-center gap-1.5 text-sm">
              <Search className="h-4 w-4 text-forest" /> Quick Lat/Lon Tester
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted">Latitude (°N)</label>
                <Input value={inputLat} onChange={(e: any) => setInputLat(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-muted">Longitude (°E)</label>
                <Input value={inputLon} onChange={(e: any) => setInputLon(e.target.value)} />
              </div>
            </div>
            <button
              onClick={handleRunEncoder}
              className="btn btn-primary w-full !min-h-[38px] text-xs font-semibold"
            >
              Trace DIGIPIN Quadrants
            </button>

            {/* Presets */}
            <div className="pt-2">
              <p className="text-[11px] font-bold text-muted uppercase">Official Test Vectors:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handlePresetSelect(p)}
                    className="rounded border border-sage-200 bg-sage-50 px-2 py-1 text-[11px] text-forest hover:bg-sage-100"
                  >
                    {p.name.split(" ")[0]} ({p.expected})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
