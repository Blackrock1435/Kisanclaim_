import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polygon, Polyline, TileLayer, LayersControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Crosshair, Eraser, Search, Undo2 } from "lucide-react";
import { approxAreaHa } from "../lib/utils";

export type Pt = [number, number]; // [lat, lon]
const dot = L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid #14532D;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });

function Clicks({ onAdd }: { onAdd: (p: Pt) => void }) {
  useMapEvents({ click: (e) => onAdd([e.latlng.lat, e.latlng.lng]) });
  return null;
}
function Fly({ to, bounds }: { to?: Pt; bounds?: Pt[] }) {
  const map = useMap();
  useEffect(() => { if (bounds && bounds.length > 2) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] }); else if (to) map.setView(to, 16); }, [to?.[0], to?.[1], bounds?.length]); // eslint-disable-line
  return null;
}

/** Interactive polygon editor (click to add corners, drag corners to adjust) or read-only viewer. */
export default function FieldMap({ points, onChange, readOnly, height = 380, extra }: { points: Pt[]; onChange?: (p: Pt[]) => void; readOnly?: boolean; height?: number;
  extra?: { lat: number; lon: number; label: string }[] }) {
  const [focus, setFocus] = useState<Pt>();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const set = (p: Pt[]) => onChange?.(p);
  const ha = useMemo(() => approxAreaHa(points), [points]);

  const locate = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition((p) => setFocus([p.coords.latitude, p.coords.longitude]), () => setMsg("Location permission was denied. You can search for your village instead."))
    : setMsg("Your browser does not support location.");
  const search = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      j[0] ? setFocus([+j[0].lat, +j[0].lon]) : setMsg("Place not found. Try a nearby town.");
    } catch { setMsg("Search is unavailable right now. Zoom the map manually."); }
  };
  const center: Pt = points[0] || [20.5937, 78.9629];

  return (
    <div className="overflow-hidden rounded-xl border border-sage-200 bg-white">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-b border-sage-100 p-2">
          <form onSubmit={search} className="flex min-w-[200px] flex-1 gap-1">
            <input aria-label="Search for a village or town" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search village or town" className="input !min-h-[40px]" />
            <button className="btn btn-ghost !min-h-[40px] !px-3" aria-label="Search"><Search className="h-4 w-4" /></button>
          </form>
          <button type="button" onClick={locate} className="btn btn-ghost !min-h-[40px] !px-3"><Crosshair className="h-4 w-4" /> My location</button>
          <button type="button" onClick={() => set(points.slice(0, -1))} disabled={!points.length} className="btn btn-ghost !min-h-[40px] !px-3"><Undo2 className="h-4 w-4" /> Undo</button>
          <button type="button" onClick={() => set([])} disabled={!points.length} className="btn btn-ghost !min-h-[40px] !px-3"><Eraser className="h-4 w-4" /> Clear</button>
        </div>
      )}
      <div style={{ height }}>
        <MapContainer center={center} zoom={points.length ? 16 : 5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satellite">
              <TileLayer attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Street map">
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            </LayersControl.BaseLayer>
          </LayersControl>
          {!readOnly && <Clicks onAdd={(p) => set([...points, p])} />}
          <Fly to={focus} bounds={readOnly ? points : undefined} />
          {points.length >= 3 ? <Polygon positions={points} pathOptions={{ color: "#D6A84F", weight: 3, fillColor: "#14532D", fillOpacity: 0.3 }} />
            : points.length === 2 ? <Polyline positions={points} pathOptions={{ color: "#D6A84F", weight: 3 }} /> : null}
          {!readOnly && points.map((p, i) => (
            <Marker key={i} position={p} icon={dot} draggable eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); set(points.map((x, j) => (j === i ? [ll.lat, ll.lng] : x))); } }} />
          ))}
          {extra?.map((x, i) => <Marker key={`e${i}`} position={[x.lat, x.lon]} icon={L.divIcon({ className: "", html: '<div style="width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid #fff"></div>', iconSize: [12, 12] })} />)}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-muted">
        <span>{readOnly ? "Field boundary" : points.length < 3 ? "Tap the map to place field corners (at least 3)." : `${points.length} corners, about ${ha.toFixed(2)} ha (confirmed on save)`}</span>
        {msg && <span className="font-medium text-amber-800" role="status">{msg}</span>}
      </div>
    </div>
  );
}
