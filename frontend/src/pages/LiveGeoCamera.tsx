import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, MapPin, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Info, ArrowLeft, Image as ImageIcon, SwitchCamera } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Alert, Spinner } from "../components/ui";
import { playChime } from "../lib/speech";

export default function LiveGeoCamera() {
  const [searchParams] = useSearchParams();
  const claimIdParam = searchParams.get("claimId") || "1";
  const claimId = parseInt(claimIdParam, 10);

  const queryClient = useQueryClient();

  // Queries
  const { data: claim, isLoading: claimLoading } = useQuery({
    queryKey: ["claim", claimId],
    queryFn: () => api(`/claims/${claimId}`),
  });

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["geocamera-history", claimId],
    queryFn: () => api(`/geocamera/history/${claimId}`),
  });

  // Camera & GPS State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [shutterFlash, setShutterFlash] = useState(false);
  const [camError, setCamError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState("");

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedHash, setCapturedHash] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any>(null);

  // Initialize camera
  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCamError("");
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (e: any) {
      setCamError(e.message || "Failed to open device camera. Please grant camera permission.");
    }
  };

  const flipCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  // Watch GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsLoading(false);
        setGpsError("");
      },
      (err) => {
        setGpsError(`GPS unavailable: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    startCamera();

    return () => {
      navigator.geolocation.clearWatch(watchId);
      stopCamera();
    };
  }, []);

  // Compute live approximate distance to parcel centroid
  const parcelCentroid = claim?.field ? { lat: claim.field.centroid_lat, lon: claim.field.centroid_lon } : null;
  let approxDistM = 0;
  if (gpsCoords && parcelCentroid) {
    const R = 6371e3;
    const φ1 = (gpsCoords.lat * Math.PI) / 180;
    const φ2 = (parcelCentroid.lat * Math.PI) / 180;
    const Δφ = ((parcelCentroid.lat - gpsCoords.lat) * Math.PI) / 180;
    const Δλ = ((parcelCentroid.lon - gpsCoords.lon) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    approxDistM = Math.round(R * c);
  }

  const geofenceStatus = !gpsCoords
    ? "gps_unavailable"
    : approxDistM <= 50
    ? "inside"
    : approxDistM <= 400
    ? "within_400m"
    : "beyond_400m";

  // Capture Photo with Professional Anti-Tamper Metadata Overlay
  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    playChime("shutter");
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 120);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw raw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Overlay Metadata Banner (Top and Bottom)
    // Top banner
    ctx.fillStyle = "rgba(20, 83, 45, 0.85)"; // Forest Green
    ctx.fillRect(0, 0, canvas.width, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px monospace";
    ctx.fillText("KisanClaim PMFBY GeoEvidence", 24, 38);

    ctx.fillStyle = "#D6A84F"; // Gold
    ctx.font = "bold 16px monospace";
    const geofenceText =
      geofenceStatus === "inside"
        ? "GEOFENCE: INSIDE PARCEL (0m)"
        : geofenceStatus === "within_400m"
        ? `GEOFENCE: WITHIN 400m (${approxDistM}m)`
        : geofenceStatus === "beyond_400m"
        ? `GEOFENCE: BREACH (${approxDistM}m > 400m)`
        : "GPS: UNAVAILABLE";
    ctx.fillText(geofenceText, canvas.width - 400, 38);

    // Bottom banner
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; // Slate/Navy
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

    ctx.fillStyle = "#ffffff";
    ctx.font = "14px monospace";
    const latStr = gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lon.toFixed(5)} (±${gpsCoords.accuracy}m)` : "No GPS";
    const digipinStr = claim?.field?.digipin || "N/A";
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    ctx.fillText(`Claim: #${claim?.ref || claimId} | Field: ${claim?.field?.name || "Main Plot"} | DIGIPIN: ${digipinStr}`, 24, canvas.height - 42);
    ctx.fillText(`GPS: ${latStr} | Captured: ${nowStr}`, 24, canvas.height - 20);

    // 3. Export image blob & compute SHA-256
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedPreview(URL.createObjectURL(blob));

      // Calculate SHA-256 in browser
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setCapturedHash(hashHex);
    }, "image/jpeg", 0.92);
  };

  // Upload to Backend GeoCamera Endpoint
  const handleUpload = async () => {
    if (!capturedBlob) return;
    setUploading(true);
    setCamError("");
    try {
      const formData = new FormData();
      formData.append("claim_id", String(claimId));
      formData.append("file", capturedBlob, `geocam_claim_${claimId}.jpg`);
      if (gpsCoords) {
        formData.append("lat", String(gpsCoords.lat));
        formData.append("lon", String(gpsCoords.lon));
        formData.append("accuracy", String(gpsCoords.accuracy));
      }
      formData.append("client_timestamp", new Date().toISOString());

      const res = await api(`/geocamera/capture?claim_id=${claimId}`, {
        method: "POST",
        body: formData,
      });

      setUploadSuccess(res);
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["claim", claimId] });
    } catch (e: any) {
      setCamError(e.message || "Failed to upload GeoCamera photograph");
    } finally {
      setUploading(false);
    }
  };

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
              <Camera className="h-7 w-7 text-forest" />
              Live GeoCamera (Anti-Fraud Evidence)
            </h1>
          </div>
          <p className="mt-1 text-sm text-navy/75">
            PMFBY-compliant tamper-evident photograph capture with live GPS, 400m geofencing & SHA-256 sealing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sage-100 px-3 py-1 font-mono text-xs font-bold text-forest">
            Claim #{claim?.ref || claimId}
          </span>
          <span className="rounded-full bg-sage-100 px-3 py-1 font-mono text-xs font-bold text-forest">
            DIGIPIN: {claim?.field?.digipin || "Registered"}
          </span>
        </div>
      </div>

      {camError && <Alert tone="error">{camError}</Alert>}
      {uploadSuccess && (
        <Alert tone="info">
          <p className="font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Evidence Cryptographically Sealed!
          </p>
          <p className="text-xs mt-1">
            SHA-256 Fingerprint: <code className="break-all font-mono font-bold">{uploadSuccess.sha256}</code>
          </p>
          <p className="text-xs">
            Geofence Classification: <strong>{uploadSuccess.geofence_status.toUpperCase()}</strong> (Distance: {uploadSuccess.distance_to_parcel_m ?? 0}m)
          </p>
        </Alert>
      )}

      {/* Main Grid: Live Camera Stream vs Captured Preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Viewfinder */}
        <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-sage-100 pb-2">
            <h2 className="font-display font-bold text-navy flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-forest" /> Live Viewfinder
            </h2>
            <div className="flex items-center gap-2">
              {streamActive && (
                <button
                  type="button"
                  onClick={flipCamera}
                  className="px-2 py-1 bg-sage-100 hover:bg-sage-200 text-forest text-xs font-bold rounded-lg flex items-center gap-1 border border-sage-300"
                  title="Switch between front and back camera"
                >
                  <SwitchCamera className="h-3.5 w-3.5" />
                  <span>Flip</span>
                </button>
              )}
              {streamActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                  <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></span> Camera Live
                </span>
              ) : (
                <button onClick={() => startCamera(facingMode)} className="text-xs text-forest underline font-bold">
                  Start Camera
                </button>
              )}
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-inner flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

            {/* Shutter flash animation overlay */}
            {shutterFlash && (
              <div className="absolute inset-0 bg-white pointer-events-none animate-ping" />
            )}

            {/* Viewfinder crosshairs */}
            <div className="pointer-events-none absolute inset-0 border border-white/20 m-6 rounded-lg flex items-center justify-center">
              <div className="h-8 w-8 border border-white/50 rounded-full flex items-center justify-center">
                <div className="h-1.5 w-1.5 bg-red-500 rounded-full"></div>
              </div>
            </div>

            {/* Live GPS Watermark in overlay */}
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded bg-black/60 p-2 text-[11px] text-white font-mono flex items-center justify-between">
              <div>
                <span>GPS: {gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lon.toFixed(5)}` : "Acquiring..."}</span>
                <span className="ml-2 text-muted">±{gpsCoords?.accuracy ?? "--"}m</span>
              </div>
              <div
                className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                  geofenceStatus === "inside"
                    ? "bg-green-600 text-white"
                    : geofenceStatus === "within_400m"
                    ? "bg-amber-500 text-black"
                    : "bg-red-600 text-white"
                }`}
              >
                {geofenceStatus.replace("_", " ")} ({approxDistM}m)
              </div>
            </div>
          </div>

          {/* Trigger capture button */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={takeSnapshot}
              className="btn btn-primary !min-h-[50px] !px-8 text-sm font-bold flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
            >
              <Camera className="h-5 w-5" />
              <span>Capture Stamped Photo (ಶೂಟ್ ಮಾಡಿ)</span>
            </button>
            <button
              type="button"
              onClick={flipCamera}
              className="btn bg-sage-100 hover:bg-sage-200 text-forest !min-h-[50px] px-4 font-bold text-xs flex items-center gap-1.5 border border-sage-300"
              title="Switch Front/Rear Camera"
            >
              <SwitchCamera className="h-4 w-4" />
              <span>Flip</span>
            </button>
          </div>
        </div>

        {/* Right: Captured Snapshot & Cryptographic Verification */}
        <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-sage-100 pb-2">
            <h2 className="font-display font-bold text-navy flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-forest" /> Captured Anti-Tamper Frame
            </h2>
            {capturedHash && (
              <span className="font-mono text-[10px] font-bold text-forest">
                SHA-256 Calculated
              </span>
            )}
          </div>

          {capturedPreview ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-sage-200 shadow-sm">
                <img src={capturedPreview} alt="Captured preview" className="w-full object-contain" />
              </div>

              <div className="rounded-xl bg-sage-50 p-3 text-xs space-y-2 border border-sage-200">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">400m Geofence Classification:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      geofenceStatus === "inside"
                        ? "bg-green-100 text-green-800"
                        : geofenceStatus === "within_400m"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {geofenceStatus.toUpperCase()} (Dist: {approxDistM}m)
                  </span>
                </div>
                <div>
                  <span className="text-muted font-medium">In-Browser SHA-256 Fingerprint:</span>
                  <p className="break-all font-mono font-bold text-navy text-[11px] mt-0.5">
                    {capturedHash}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="btn !min-h-[44px] w-full text-sm font-bold bg-gold text-navy hover:bg-amber-400 flex items-center justify-center gap-2 shadow-soft"
              >
                {uploading ? (
                  <Spinner />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Upload & Seal Evidence to Claim #{claim?.ref || claimId}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-sage-200 text-center p-6 text-muted">
              <Camera className="h-10 w-10 text-sage-300 mb-2" />
              <p className="font-semibold text-sm">No photograph captured yet</p>
              <p className="text-xs text-muted max-w-xs mt-1">
                Aim your camera at the crop damage and click "Capture Stamped Photo" to embed GPS, DIGIPIN and tamper-evident timestamps.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Uploaded Evidence Gallery */}
      <div className="rounded-2xl border border-sage-200 bg-white p-6 shadow-soft space-y-4">
        <h3 className="font-display font-bold text-navy text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-forest" />
          Submitted GeoEvidence for Claim #{claim?.ref || claimId} ({history?.length ?? 0} photos)
        </h3>

        {history && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sage-50 text-navy font-bold border-b border-sage-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Capture Date / Time</th>
                  <th className="p-3">GPS Coordinates</th>
                  <th className="p-3">DIGIPIN</th>
                  <th className="p-3">Parcel Distance</th>
                  <th className="p-3">400m Geofence</th>
                  <th className="p-3">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-100">
                {history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-sage-50/50">
                    <td className="p-3 font-mono font-bold">#{h.id}</td>
                    <td className="p-3 text-muted">{new Date(h.server_uploaded_at).toLocaleString()}</td>
                    <td className="p-3 font-mono">
                      {h.gps_lat ? `${h.gps_lat.toFixed(5)}, ${h.gps_lon.toFixed(5)}` : "No GPS"}
                    </td>
                    <td className="p-3 font-mono font-bold text-forest">{h.digipin || "N/A"}</td>
                    <td className="p-3 font-mono">{h.distance_to_parcel_m ? `${h.distance_to_parcel_m}m` : "0m"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 font-bold uppercase text-[10px] ${
                          h.geofence_status === "inside"
                            ? "bg-green-100 text-green-800"
                            : h.geofence_status === "within_400m"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {h.geofence_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted truncate max-w-[120px]" title={h.sha256_hash}>
                      {h.sha256_hash.slice(0, 12)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted">No GeoCamera evidence recorded yet for this claim.</p>
        )}
      </div>
    </div>
  );
}
