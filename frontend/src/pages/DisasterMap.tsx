import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  LayersControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Filter,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Eye,
  Search,
  ExternalLink,
  Layers,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import { disasterLabel, fmtDate } from "../lib/utils";

// Custom Leaflet DivIcons by risk level
function getMarkerIcon(riskColor: string, score: number | null) {
  const bgMap: Record<string, string> = {
    green: "#10b981",
    yellow: "#f59e0b",
    orange: "#f97316",
    red: "#ef4444",
    gray: "#64748b",
  };
  const bg = bgMap[riskColor] || "#64748b";
  const displayScore = score !== null ? Math.round(score) : "—";

  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div style="
        background: ${bg};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        font-family: monospace;
      ">
        ${displayScore}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function DisasterMap() {
  const { i18n } = useTranslation();
  const isKn = i18n.language === "kn";

  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedPeril, setSelectedPeril] = useState<string>("ALL");
  const [selectedRisk, setSelectedRisk] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.1118, 77.5946]);
  const [mapZoom, setMapZoom] = useState<number>(10);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["disaster-map-claims", selectedDistrict, selectedPeril, selectedRisk],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDistrict !== "ALL") params.append("district", selectedDistrict);
      if (selectedPeril !== "ALL") params.append("disaster_type", selectedPeril);
      if (selectedRisk !== "ALL") params.append("risk_level", selectedRisk);
      const res = await api(`/disaster-map/claims?${params.toString()}`);
      return res;
    },
  });

  const claims = useMemo(() => {
    if (!data?.claims) return [];
    if (!searchQuery.trim()) return data.claims;
    const q = searchQuery.toLowerCase();
    return data.claims.filter(
      (c: any) =>
        c.farmer_name.toLowerCase().includes(q) ||
        c.ref.toLowerCase().includes(q) ||
        c.crop_name.toLowerCase().includes(q) ||
        c.village.toLowerCase().includes(q)
    );
  }, [data?.claims, searchQuery]);

  const stats = data?.stats || {
    total_claims: 0,
    low_risk: 0,
    moderate_risk: 0,
    high_risk: 0,
    critical_risk: 0,
    unverified: 0,
    districts: [],
    perils: [],
  };

  const handleSelectClaim = (claim: any) => {
    setSelectedClaimId(claim.id);
    setMapCenter([claim.lat, claim.lon]);
    setMapZoom(14);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-700 text-white shadow-soft">
              <MapPin className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-navy">
              {isKn
                ? "ಪ್ರಾಕೃತಿಕ ವಿಕೋಪ ಪ್ರಭಾವ ನಕ್ಷೆ (Disaster Impact Map)"
                : "Interactive Disaster Impact & Peril Geospatial Map"}
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {isKn
              ? "ಇಂಡಿಯಾ ಪೋಸ್ಟ್ DIGIPIN ಕ್ಯಾಡಾಸ್ಟ್ರಲ್ ಗ್ರಿಡ್ ಮತ್ತು Sentinel-2 ಉಪಗ್ರಹ ಆಧಾರಿತ ಕ್ಲೈಮ್ ನಕ್ಷೆ."
              : "Geospatial clustering of PMFBY claims anchored to India Post DIGIPIN cells and Sentinel-2 satellite footprints."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-ghost !min-h-[36px] text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isKn ? "ನವೀಕರಿಸಿ" : "Refresh"}</span>
          </button>
          <Link
            to="/app/dashboard"
            className="btn btn-primary !min-h-[36px] text-xs font-bold"
          >
            {isKn ? "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ" : "Dashboard"}
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-sage-200 bg-white p-3 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {isKn ? "ಒಟ್ಟು ಕ್ಲೈಮ್‌ಗಳು" : "Total Claims"}
          </p>
          <p className="text-2xl font-black text-navy mt-0.5">{stats.total_claims}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              {isKn ? "ಕಡಿಮೆ ಅಪಾಯ" : "Low Risk"}
            </p>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.low_risk}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              {isKn ? "ಮಧ್ಯಮ ಅಪಾಯ" : "Moderate Risk"}
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-0.5">{stats.moderate_risk}</p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-900">
              {isKn ? "ಹೆಚ್ಚಿನ ಅಪಾಯ" : "High Risk"}
            </p>
            <AlertOctagon className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-orange-700 mt-0.5">{stats.high_risk}</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
              {isKn ? "ತೀವ್ರ ವಂಚನೆ ಅಪಾಯ" : "Critical Risk"}
            </p>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-0.5">{stats.critical_risk}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            {isKn ? "ಅಪರಿಶೀಲಿತ" : "Unverified"}
          </p>
          <p className="text-2xl font-black text-slate-700 mt-0.5">{stats.unverified}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-3 border border-sage-200 bg-white shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <Filter className="h-3.5 w-3.5" />
            <span>{isKn ? "ಫಿಲ್ಟರ್‌ಗಳು:" : "Filters:"}</span>
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="input !min-h-[34px] !py-1 text-xs"
          >
            <option value="ALL">{isKn ? "ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು (All Districts)" : "All Districts"}</option>
            <option value="Bengaluru Rural">Bengaluru Rural</option>
            <option value="Mysuru">Mysuru</option>
            <option value="Mandya">Mandya</option>
            <option value="Dharwad">Dharwad</option>
            <option value="Belagavi">Belagavi</option>
          </select>

          <select
            value={selectedPeril}
            onChange={(e) => setSelectedPeril(e.target.value)}
            className="input !min-h-[34px] !py-1 text-xs"
          >
            <option value="ALL">{isKn ? "ಎಲ್ಲಾ ವಿಕೋಪಗಳು (All Perils)" : "All Perils"}</option>
            <option value="flood">{isKn ? "ಪ್ರವಾಹ (Flood)" : "Flood"}</option>
            <option value="unseasonal_rain">{isKn ? "ಅಕಾಲಿಕ ಮಳೆ (Unseasonal Rain)" : "Unseasonal Rain"}</option>
            <option value="drought">{isKn ? "ಬರಗಾಲ (Drought)" : "Drought"}</option>
            <option value="hailstorm">{isKn ? "ಆಲಿಕಲ್ಲು ಮಳೆ (Hailstorm)" : "Hailstorm"}</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="input !min-h-[34px] !py-1 text-xs"
          >
            <option value="ALL">{isKn ? "ಎಲ್ಲಾ ಅಪಾಯ ಮಟ್ಟಗಳು (All Risk Levels)" : "All Risk Levels"}</option>
            <option value="LOW">{isKn ? "ಕಡಿಮೆ ಅಪಾಯ (Low Risk)" : "Low Risk (Score ≥80)"}</option>
            <option value="MODERATE">{isKn ? "ಮಧ್ಯಮ ಅಪಾಯ (Moderate Risk)" : "Moderate (60-79)"}</option>
            <option value="HIGH">{isKn ? "ಹೆಚ್ಚಿನ ಅಪಾಯ (High Risk)" : "High Risk (40-59)"}</option>
            <option value="CRITICAL">{isKn ? "ತೀವ್ರ ಅಪಾಯ (Critical Risk)" : "Critical Risk (<40)"}</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder={isKn ? "ರೈತ ಅಥವಾ ಕ್ಲೈಮ್ ಹುಡುಕಿ..." : "Search farmer, ref, or crop..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input !min-h-[34px] !pl-8 !py-1 text-xs w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Map & Inspection Grid */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Left Side: Leaflet Interactive Map (3 cols) */}
        <div className="lg:col-span-3 card p-0 overflow-hidden border border-sage-200 bg-white shadow-soft relative">
          <div style={{ height: "620px", width: "100%" }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <MapController center={mapCenter} zoom={mapZoom} />

              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Satellite (Esri World Imagery)">
                  <TileLayer
                    attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Street Map (OpenStreetMap)">
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {/* Claims Markers */}
              {claims.map((c: any) => {
                const markerIcon = getMarkerIcon(c.risk_color, c.fusion_score);

                return (
                  <Marker
                    key={c.id}
                    position={[c.lat, c.lon]}
                    icon={markerIcon}
                    eventHandlers={{
                      click: () => setSelectedClaimId(c.id),
                    }}
                  >
                    <Popup minWidth={260} maxWidth={320}>
                      <div className="p-1 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="font-mono font-bold text-forest-deep">{c.ref}</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              c.risk_color === "green"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.risk_color === "yellow"
                                ? "bg-amber-100 text-amber-800"
                                : c.risk_color === "orange"
                                ? "bg-orange-100 text-orange-800"
                                : c.risk_color === "red"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {c.risk_level} RISK
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="font-bold text-sm text-navy">{c.farmer_name}</p>
                          <p className="text-muted">
                            <b>Crop:</b> {c.crop_name} • <b>Peril:</b> {disasterLabel(c.disaster_type)}
                          </p>
                          <p className="text-muted">
                            <b>Location:</b> {c.village}, {c.district}
                          </p>
                          <p className="font-mono text-emerald-700 font-bold">
                            <b>DIGIPIN:</b> {c.digipin}
                          </p>
                          {c.fusion_score !== null && (
                            <p className="text-navy font-bold">
                              AI Verification Score: {c.fusion_score}/100
                            </p>
                          )}
                          <p className="text-[11px] text-slate-600 italic">
                            {c.recommendation}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <Link
                            to={`/app/evidence-graph?claimId=${c.id}`}
                            className="font-bold text-forest hover:underline flex items-center gap-1"
                          >
                            <span>Evidence Graph</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <Link
                            to={`/app/insurance`}
                            className="btn btn-primary !min-h-[26px] !py-0.5 !px-2 text-[10px] font-bold"
                          >
                            Underwrite
                          </Link>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Render field polygons if available */}
              {claims.map((c: any) => {
                if (!c.boundary || !Array.isArray(c.boundary) || c.boundary.length < 3) return null;
                const isSelected = selectedClaimId === c.id;
                return (
                  <Polygon
                    key={`poly-${c.id}`}
                    positions={c.boundary}
                    pathOptions={{
                      color: isSelected ? "#D6A84F" : c.risk_color === "green" ? "#10b981" : "#ef4444",
                      weight: isSelected ? 3 : 1.5,
                      fillColor: c.risk_color === "green" ? "#10b981" : "#f97316",
                      fillOpacity: isSelected ? 0.45 : 0.2,
                    }}
                  />
                );
              })}
            </MapContainer>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm p-2.5 rounded-lg border border-sage-200 shadow-md text-xs space-y-1.5">
            <p className="font-bold text-navy text-[11px] uppercase tracking-wider">
              {isKn ? "ಅಪಾಯ ಸೂಚಕಗಳು" : "Risk Legend"}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                <span>Low Risk (≥80)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                <span>Moderate (60-79)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-orange-500 inline-block" />
                <span>High (40-59)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
                <span>Critical (&lt;40)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Claims Stream & Quick Inspector (1 col) */}
        <div className="card p-4 border border-sage-200 bg-white shadow-soft flex flex-col h-[620px]">
          <div className="flex items-center justify-between border-b border-sage-100 pb-2 mb-2">
            <h3 className="font-extrabold text-sm text-navy">
              {isKn ? "ಕ್ಲೈಮ್‌ಗಳ ಪಟ್ಟಿ" : "Mapped Claims"} ({claims.length})
            </h3>
            <span className="text-[11px] text-muted">
              {isKn ? "ನಕ್ಷೆಯಲ್ಲಿ ವೀಕ್ಷಿಸಲು ಕ್ಲಿಕ್ ಮಾಡಿ" : "Click to fly map"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <p className="text-xs text-muted p-4 text-center">Loading geospatial points...</p>
            ) : claims.length === 0 ? (
              <p className="text-xs text-muted p-4 text-center">No claims match the active filters.</p>
            ) : (
              claims.map((c: any) => {
                const isSelected = selectedClaimId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectClaim(c)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "border-forest bg-forest-light/10 shadow-xs"
                        : "border-sage-100 hover:border-sage-300 hover:bg-sage-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-forest">{c.ref}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.risk_color === "green"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.risk_color === "yellow"
                            ? "bg-amber-100 text-amber-800"
                            : c.risk_color === "orange"
                            ? "bg-orange-100 text-orange-800"
                            : c.risk_color === "red"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {c.risk_level}
                      </span>
                    </div>

                    <p className="font-bold text-navy truncate">{c.farmer_name}</p>
                    <p className="text-muted text-[11px] truncate">
                      {c.crop_name} • {disasterLabel(c.disaster_type)} • {c.village}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-emerald-800 font-semibold">{c.digipin}</span>
                      <Link
                        to={`/app/evidence-graph?claimId=${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-forest hover:underline font-bold flex items-center gap-0.5"
                      >
                        <span>Graph</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
