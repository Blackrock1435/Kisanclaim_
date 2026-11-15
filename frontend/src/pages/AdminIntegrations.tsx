import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  CloudSun,
  CloudRain,
  Satellite,
  Compass,
  MessageSquare,
  FileCheck2,
  HardDrive,
  MapPin,
  Mic,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldAlert,
  Info,
  Layers
} from "lucide-react";
import { api } from "../lib/api";
import { Alert, Skeleton, Spinner, toast } from "../components/ui";
import { fmtDateTime } from "../lib/utils";
import ErrorBoundary from "../components/ErrorBoundary";

const ICONS: Record<string, any> = {
  copernicus_sentinel: Satellite,
  open_meteo: CloudSun,
  imd_weather: CloudRain,
  digipin_national: Compass,
  bhoomi_karnataka: FileCheck2,
  file_storage: HardDrive,
  geolocation_services: MapPin,
  voice_assistant: Mic,
  sms_gateway: MessageSquare,
};

function StatusPill({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
          <CheckCircle2 className="h-3 w-3" /> CONNECTED
        </span>
      );
    case "config_required":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800 uppercase tracking-wider">
          <Info className="h-3 w-3" /> CONFIGURATION REQUIRED
        </span>
      );
    case "demo":
    case "degraded":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
          <AlertTriangle className="h-3 w-3" /> DEMO MODE
        </span>
      );
    case "unavailable":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          <Layers className="h-3 w-3" /> UNAVAILABLE
        </span>
      );
    case "disconnected":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 uppercase tracking-wider">
          <XCircle className="h-3 w-3" /> DISCONNECTED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800 uppercase tracking-wider">
          <XCircle className="h-3 w-3" /> ERROR
        </span>
      );
  }
}

function AdminIntegrationsContent() {
  const qc = useQueryClient();
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  const query = useQuery({
    queryKey: ["admin-integrations"],
    queryFn: () => api("/admin/integrations"),
  });

  const testMutation = useMutation({
    mutationFn: (key: string) => api(`/admin/integrations/${key}/test`, { method: "POST" }),
    onMutate: (key) => setTestingKey(key),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-integrations"] });
      if (data.status === "connected") {
        toast(`${data.name}: Connection test passed successfully!`, "ok");
      } else if (data.status === "demo" || data.status === "degraded" || data.status === "config_required") {
        toast(`${data.name}: ${data.error || data.message}`);
      } else {
        toast(`${data.name}: Connection test returned ${data.status.toUpperCase()}`, "error");
      }
    },
    onError: (err: any) => {
      toast(err.message || "Test connection failed", "error");
    },
    onSettled: () => setTestingKey(null),
  });

  const integrations = query.data?.integrations || [];

  const testAll = async () => {
    setTestingAll(true);
    for (const item of integrations) {
      setTestingKey(item.key);
      try {
        await api(`/admin/integrations/${item.key}/test`, { method: "POST" });
      } catch {}
    }
    setTestingKey(null);
    setTestingAll(false);
    qc.invalidateQueries({ queryKey: ["admin-integrations"] });
    toast(`Tested all ${integrations.length} integrations.`, "ok");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-forest-deep flex items-center gap-2">
            <Server className="h-8 w-8 text-forest" />
            National Infrastructure & External Integrations
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live telemetry, API connection tests, and credential status for all external PMFBY services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={testAll}
            disabled={testingAll || integrations.length === 0}
            className="btn btn-primary !min-h-[40px] text-xs flex items-center gap-1.5"
          >
            {testingAll ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
            {testingAll ? "Testing All..." : "Test All Integrations"}
          </button>
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching || testingAll}
            className="btn btn-ghost !min-h-[40px] text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <Alert tone="info">
        <span className="font-semibold">Statutory Transparency Standard:</span> In compliance with PMFBY operational guidelines,
        KisanClaim never fabricates satellite observations, SMS deliveries, or weather telemetry. When external services
        run without cloud credentials, they operate in explicit, auditable development fallbacks.
      </Alert>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((item: any) => {
            const Icon = ICONS[item.key] || Server;
            const isTesting = testingKey === item.key;

            return (
              <div
                key={item.key}
                className="card flex flex-col justify-between p-5 border border-sage-100 shadow-soft hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-forest/10 p-2 text-forest">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-navy text-base leading-tight">
                          {item.name}
                        </h2>
                        <p className="text-xs text-muted">{item.provider}</p>
                      </div>
                    </div>

                    <StatusPill status={item.status} />
                  </div>

                  {/* Capabilities */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-navy/70 uppercase tracking-wider">
                      Capabilities:
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-muted">
                      {(item.capabilities || []).map((c: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-forest">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Notice / Error message */}
                  {item.last_error && (
                    <div
                      className={`mt-3 rounded-lg p-2.5 text-xs ${
                        item.status === "demo" || item.status === "degraded"
                          ? "bg-amber-50 text-amber-900 border border-amber-200"
                          : item.status === "config_required"
                          ? "bg-sky-50 text-sky-900 border border-sky-200"
                          : item.status === "unavailable"
                          ? "bg-slate-100 text-slate-800 border border-slate-300"
                          : "bg-rose-50 text-rose-900 border border-rose-200"
                      }`}
                    >
                      <p className="font-semibold flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Status Notice:
                      </p>
                      <p className="mt-0.5">{item.last_error}</p>
                    </div>
                  )}

                  {/* Required credentials */}
                  {item.required_credentials && (
                    <div className="mt-3 text-[11px] text-muted">
                      <span className="font-medium">Configuration / Env: </span>
                      <code className="text-[10px] bg-sage-100 px-1 py-0.5 rounded break-words">
                        {Array.isArray(item.required_credentials)
                          ? item.required_credentials.join(", ")
                          : String(item.required_credentials)}
                      </code>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-sage-100 pt-3 flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {item.last_tested_at
                      ? `Tested: ${fmtDateTime(item.last_tested_at)}`
                      : "Never tested"}
                  </span>

                  <button
                    onClick={() => testMutation.mutate(item.key)}
                    disabled={isTesting || testMutation.isPending}
                    className="btn btn-ghost !min-h-[32px] !px-3 text-xs font-semibold flex items-center gap-1 text-forest hover:bg-forest/10"
                  >
                    {isTesting ? (
                      <>
                        <Spinner />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminIntegrations() {
  return (
    <ErrorBoundary
      fallbackTitle="Integrations Dashboard Error"
      fallbackMessage="An error occurred while loading the integration services dashboard. Tap Try Again below."
    >
      <AdminIntegrationsContent />
    </ErrorBoundary>
  );
}

