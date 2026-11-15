import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users as UsersIcon,
  Server,
  ScrollText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus
} from "lucide-react";
import { api } from "../lib/api";
import { Alert, FieldWrap, Input, Select, Skeleton, Stat, toast } from "../components/ui";
import { fmtDateTime } from "../lib/utils";
import AdminIntegrations from "./AdminIntegrations";

const schema = z.object({
  name: z.string().min(2, "Enter a name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["officer", "admin", "farmer"]),
  district: z.string().optional()
});

export function AdminUsers() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "integrations" | "audit">("users");

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => api("/admin/users") });
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => api("/admin/stats") });
  const integrationsQuery = useQuery({ queryKey: ["admin-integrations"], queryFn: () => api("/admin/integrations") });

  const [err, setErr] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: "officer" }
  });

  const toggle = useMutation({
    mutationFn: (u: any) => api(`/admin/users/${u.id}/active?active=${!u.is_active}`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: any) => toast(e.message, "error")
  });

  const integrations = integrationsQuery.data?.integrations || [];

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-forest-deep">PMFBY Administration & Platform Control</h1>
          <p className="mt-1 text-sm text-muted">
            Manage user accounts, monitor national infrastructure integrations, and inspect statutory audit records.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="inline-flex rounded-xl bg-sage-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "users" ? "bg-white text-forest-deep shadow-soft" : "text-navy/70 hover:text-navy"
            }`}
          >
            <UsersIcon className="h-4 w-4" />
            Users & Roles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "integrations" ? "bg-white text-forest-deep shadow-soft" : "text-navy/70 hover:text-navy"
            }`}
          >
            <Server className="h-4 w-4" />
            National Integrations
            {integrations.length > 0 && (
              <span className="ml-1 rounded-full bg-forest/10 px-1.5 py-0.2 text-[10px] text-forest">
                {integrations.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "audit" ? "bg-white text-forest-deep shadow-soft" : "text-navy/70 hover:text-navy"
            }`}
          >
            <ScrollText className="h-4 w-4" />
            Platform Audit Log
          </button>
        </div>
      </div>

      {/* Tab 2: Embedded Integrations */}
      {activeTab === "integrations" && <AdminIntegrations />}

      {/* Tab 3: Embedded Audit Log */}
      {activeTab === "audit" && <AdminAudit />}

      {/* Tab 1: Users, Stats & Live Integration Snapshot */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {stats.data && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Registered Farmers" value={stats.data.users?.farmer || 0} />
              <Stat label="Underwriting Officers" value={stats.data.users?.officer || 0} />
              <Stat label="Active Claims" value={stats.data.claims || 0} />
              <Stat label="Audit Reports" value={stats.data.reports || 0} />
            </div>
          )}

          {/* Interactive Live Integrations Snapshot Box */}
          <div className="card border border-sage-200 p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-forest-deep flex items-center gap-2">
                  <Server className="h-5 w-5 text-forest" />
                  National Data Infrastructure Status
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Live connection health for Copernicus Sentinel, Open-Meteo, India Post DIGIPIN, and Bhoomi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("integrations")}
                className="btn btn-ghost !min-h-[34px] !px-3 text-xs font-bold text-forest flex items-center gap-1"
              >
                <span>Full Integrations Suite</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {integrationsQuery.isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : (
                integrations.map((item: any) => (
                  <div
                    key={item.key}
                    onClick={() => setActiveTab("integrations")}
                    className="cursor-pointer rounded-xl bg-sage-50/60 p-3 border border-sage-200/80 hover:bg-sage-100/70 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-forest-deep">{item.name}</p>
                      <p className="text-[11px] text-muted">{item.provider}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.status === "connected"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "degraded"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {item.status === "connected" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {item.status === "connected"
                        ? "Connected"
                        : item.status === "degraded"
                        ? "Dev Fallback"
                        : "Config Req"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Account Creation Form */}
          <form
            noValidate
            className="card space-y-4 p-5 shadow-soft"
            onSubmit={handleSubmit(async (v) => {
              setErr("");
              try {
                await api("/admin/users", { body: { ...v, district: v.district || null } });
                toast("User created successfully", "ok");
                reset();
                qc.invalidateQueries({ queryKey: ["admin-users"] });
                qc.invalidateQueries({ queryKey: ["admin-stats"] });
              } catch (e: any) {
                setErr(e.message);
              }
            })}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-forest-deep flex items-center gap-2">
                  <Plus className="h-5 w-5 text-forest" />
                  Create Officer or Admin Account
                </h2>
                <p className="text-xs text-muted">
                  Issue credentials for district agricultural officers, PMFBY underwriters, or administrators.
                </p>
              </div>
            </div>

            {err && <Alert tone="error">{err}</Alert>}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <FieldWrap label="Full Name" error={errors.name?.message} htmlFor="un">
                <Input id="un" placeholder="e.g. Dr. Priya Rao" {...register("name")} />
              </FieldWrap>
              <FieldWrap label="Email Address" error={errors.email?.message} htmlFor="ue">
                <Input id="ue" type="email" placeholder="priya@kisanclaim.in" {...register("email")} />
              </FieldWrap>
              <FieldWrap label="Temporary Password" error={errors.password?.message} htmlFor="up">
                <Input id="up" type="password" autoComplete="new-password" {...register("password")} />
              </FieldWrap>
              <FieldWrap label="Role" htmlFor="ur">
                <Select id="ur" {...register("role")}>
                  <option value="officer">Officer (Underwriter)</option>
                  <option value="admin">Admin</option>
                  <option value="farmer">Farmer</option>
                </Select>
              </FieldWrap>
              <FieldWrap label="District / Jurisdiction" htmlFor="ud">
                <Input id="ud" placeholder="e.g. Mandya" {...register("district")} />
              </FieldWrap>
            </div>

            <button className="btn btn-primary">Create User Account</button>
          </form>

          {/* Active Users Table */}
          {users.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white shadow-soft">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-sage-100 font-display">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email / Mobile</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.map((u: any) => (
                    <tr key={u.id} className="border-t border-sage-100">
                      <td className="p-3 font-semibold text-forest-deep">{u.name}</td>
                      <td className="p-3 text-muted">{u.email || u.phone || "—"}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-forest">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-muted">{fmtDateTime(u.created_at)}</td>
                      <td className="p-3">
                        <button
                          className={`btn !min-h-[32px] !px-3 text-xs font-semibold ${
                            u.is_active
                              ? "btn-ghost text-red-600 hover:bg-red-50"
                              : "btn-primary"
                          }`}
                          onClick={() => toggle.mutate(u)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminAudit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const r = useQuery({
    queryKey: ["audit", page, action],
    queryFn: () => api(`/admin/audit?page=${page}${action ? `&action=${action}` : ""}`)
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-forest-deep flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-forest" />
            Statutory Platform Audit Log
          </h2>
          <p className="text-xs text-muted">
            Immutable trace of all underwriter decisions, claim submissions, evidence evaluations, and logins.
          </p>
        </div>
        <div className="w-56">
          <Select
            aria-label="Filter by area"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            <option value="auth">Authentication</option>
            <option value="claim">Claims</option>
            <option value="review">Reviews</option>
            <option value="admin">Admin</option>
            <option value="report">Reports</option>
            <option value="pipeline">Analysis pipeline</option>
          </Select>
        </div>
      </div>

      {r.isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-sage-100 font-display">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.items?.map((a: any) => (
                <tr key={a.id} className="border-t border-sage-100">
                  <td className="p-3 whitespace-nowrap text-xs text-muted">{fmtDateTime(a.at)}</td>
                  <td className="p-3 font-mono text-xs">{a.actor_id ?? "system"}</td>
                  <td className="p-3 font-mono text-xs font-semibold text-forest">{a.action}</td>
                  <td className="p-3 text-xs">
                    {a.entity} {a.entity_id}
                  </td>
                  <td className="p-3 text-muted text-xs">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <button className="btn btn-ghost !min-h-[40px]" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="btn btn-ghost !min-h-[40px]"
          disabled={(r.data?.items?.length || 0) < 50}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
