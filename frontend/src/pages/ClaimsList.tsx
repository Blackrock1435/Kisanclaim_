import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Empty, Input, Select, Skeleton, StatusBadge } from "../components/ui";
import { DISASTERS, STATUS_META, disasterLabel, fmtDate } from "../lib/utils";

export default function ClaimsList() {
  const { user } = useAuth();
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [disaster, setDisaster] = useState(""); const [district, setDistrict] = useState(""); const [crop, setCrop] = useState(""); const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), size: "15", ...(q && { q }), ...(status && { status }), ...(disaster && { disaster }), ...(district && { district }), ...(crop && { crop }) });
  const r = useQuery({ queryKey: ["claims", qs.toString()], queryFn: () => api(`/claims?${qs}`), placeholderData: (p) => p });
  const pages = Math.max(1, Math.ceil((r.data?.total || 0) / 15));
  const staff = user!.role !== "farmer";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-extrabold text-forest-deep">{staff ? (user!.role === "admin" ? "All claims" : "Assigned claims") : "My claims"}</h1>
        {!staff && <Link to="/app/claims/new" className="btn btn-primary">New claim</Link>}</div>
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-1"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input aria-label="Search by reference or crop" className="pl-9" placeholder="Reference or crop" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        <Select aria-label="Disaster" value={disaster} onChange={(e) => { setDisaster(e.target.value); setPage(1); }}><option value="">All disasters</option>{DISASTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        {staff && <><Input aria-label="District" placeholder="District" value={district} onChange={(e) => { setDistrict(e.target.value); setPage(1); }} /><Input aria-label="Crop" placeholder="Crop" value={crop} onChange={(e) => { setCrop(e.target.value); setPage(1); }} /></>}
      </div>
      {r.isLoading ? <Skeleton className="h-48" /> : !r.data?.items.length ? <Empty title="No claims found" text="Try clearing the filters." /> : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-sage-100 font-display"><tr><th className="p-3">Reference</th>{staff && <th className="p-3">Farmer</th>}<th className="p-3">Crop</th><th className="p-3">Disaster</th><th className="p-3">District</th><th className="p-3">Date</th><th className="p-3">Status</th>{user!.role === "admin" && <th className="p-3">Officer</th>}</tr></thead>
            <tbody>{r.data.items.map((c: any) => (
              <tr key={c.id} className="border-t border-sage-100 hover:bg-sage-50">
                <td className="p-3 font-semibold"><Link to={c.status === "draft" ? `/app/claims/${c.id}/edit` : `/app/claims/${c.id}`} className="text-forest underline">{c.ref || "Draft"}</Link></td>
                {staff && <td className="p-3">{c.farmer_name}</td>}<td className="p-3">{c.crop_name}</td><td className="p-3">{disasterLabel(c.disaster_type)}</td><td className="p-3">{c.district}</td><td className="p-3">{fmtDate(c.incident_date)}</td>
                <td className="p-3"><StatusBadge status={c.status} /></td>{user!.role === "admin" && <td className="p-3">{c.officer_name || <span className="text-muted">Unassigned</span>}</td>}</tr>))}</tbody>
          </table>
        </div>)}
      <div className="flex items-center justify-between text-sm"><span className="text-muted">{r.data?.total ?? 0} claims</span>
        <div className="flex items-center gap-2"><button className="btn btn-ghost !min-h-[40px]" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button className="btn btn-ghost !min-h-[40px]" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
    </div>
  );
}
