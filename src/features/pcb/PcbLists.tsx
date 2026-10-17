import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { PCB_STATUSES, pcbDisplayId, pcbStatusLabel } from "@/lib/pcb/model";
import type { PcbListRow } from "@/lib/pcb/pcb.functions";
import { pcbListQuery } from "./queries";
import { PcbStatusBadge } from "./parts";

function Row({ r }: { r: PcbListRow }) {
  return (
    <Link to="/app/pcb/$versionId" params={{ versionId: r.id }} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/60">
      <span className="min-w-0"><span className="font-medium">{r.candidate_name}</span> <span className="ml-2 font-mono text-xs text-muted-foreground">{pcbDisplayId(r.pcb_code, r.version)}</span>
        <span className="block truncate text-xs text-muted-foreground">{r.primary_career_path ?? "No career path yet"} · {r.base_track_code}</span></span>
      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(r.updated_at)}</span>
    </Link>
  );
}

export function PcbBuilderPage() {
  const { user } = useCurrentUser();
  const { data } = useSuspenseQuery(pcbListQuery);
  const queues: [string, PcbListRow[]][] = [
    ["Draft PCBs", data.filter((r) => r.status === "DRAFT")],
    ["In Review", data.filter((r) => r.status === "IN_REVIEW")],
    ["Changes Requested", data.filter((r) => r.status === "CHANGES_REQUESTED")],
    ["Recently Approved", data.filter((r) => r.status === "APPROVED").sort((a, b) => (b.approved_at ?? "").localeCompare(a.approved_at ?? "")).slice(0, 8)],
  ];
  return (
    <>
      <PageHeader crumbs={["PCB Studio", "PCB Builder"]} title="PCB Builder" description="Your working queue of Personal Career Blueprints."
        actions={can(user, "pcb.create") ? <Button asChild><Link to="/app/pcb/new"><Plus className="size-4" /> New PCB</Link></Button> : null} />
      <div className="grid gap-5 lg:grid-cols-2">
        {queues.map(([title, rows]) => (
          <Panel key={title}>
            <div className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-sm font-semibold">{title}</h2><span className="text-xs text-muted-foreground">{rows.length}</span></div>
            {rows.length ? <div className="divide-y">{rows.slice(0, 10).map((r) => <Row key={r.id} r={r} />)}</div> : <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nothing here.</p>}
          </Panel>
        ))}
      </div>
    </>
  );
}

export function PcbLibraryPage() {
  const { user } = useCurrentUser();
  const { data } = useSuspenseQuery(pcbListQuery);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ status: "", path: "", track: "", by: "", created: "", approved: "" });
  const latest = data.filter((r) => r.is_latest || r.is_current);
  const uniq = (k: keyof PcbListRow) => [...new Set(latest.map((r) => String(r[k] ?? "")).filter(Boolean))].sort();
  const rows = useMemo(() => latest.filter((r) => {
    const t = q.toLowerCase();
    if (t && ![r.pcb_code, r.candidate_code, r.candidate_name].some((x) => x.toLowerCase().includes(t))) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.path && r.primary_career_path !== f.path) return false;
    if (f.track && r.base_track_code !== f.track) return false;
    if (f.by && r.created_by_name !== f.by) return false;
    if (f.created && r.created_at.slice(0, 10) < f.created) return false;
    if (f.approved && (r.approved_at ?? "").slice(0, 10) < f.approved) return false;
    return true;
  }), [latest, q, f]);
  const sel = (k: keyof typeof f, label: string, opts: [string, string][]) => (
    <select aria-label={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
      <option value="">{label}</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  return (
    <>
      <PageHeader crumbs={["PCB Studio", "PCB Library"]} title="PCB Library" description="Every candidate blueprint you can access. Shows the latest and current approved version of each." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="PCB ID, candidate ID or name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {sel("status", "All statuses", PCB_STATUSES.map((s) => [s, pcbStatusLabel(s)]))}
        {sel("path", "Career path", uniq("primary_career_path").map((x) => [x, x]))}
        {sel("track", "Base track", uniq("base_track_code").map((x) => [x, x]))}
        {sel("by", "Created by", uniq("created_by_name").map((x) => [x, x]))}
        <label className="flex items-center gap-1 text-xs text-muted-foreground">Created from <Input type="date" className="h-9 w-36" value={f.created} onChange={(e) => setF({ ...f, created: e.target.value })} /></label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">Approved from <Input type="date" className="h-9 w-36" value={f.approved} onChange={(e) => setF({ ...f, approved: e.target.value })} /></label>
      </div>
      {!rows.length ? <EmptyState title="No PCBs found" description={data.length ? "Try different filters." : "Create the first PCB from PCB Builder."} /> : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>{["PCB ID", "Candidate ID", "Candidate", "Career path", "Base track", "Version", "Status", "Created by", "Created", "Approved", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-xs">{r.pcb_code}</td>
                  <td className="px-3 py-2 text-xs">{r.candidate_code}</td>
                  <td className="px-3 py-2 font-medium">{r.candidate_name}</td>
                  <td className="px-3 py-2 text-xs">{r.primary_career_path ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.base_track_code} v{r.base_track_version}</td>
                  <td className="px-3 py-2">V{r.version}{r.is_current && <span className="ml-1 text-[10px] text-success">current</span>}</td>
                  <td className="px-3 py-2"><PcbStatusBadge status={r.status} /></td>
                  <td className="px-3 py-2 text-xs">{r.created_by_name}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(r.approved_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link to="/app/pcb/$versionId" params={{ versionId: r.id }} className="text-xs font-medium text-primary hover:underline">
                      {["DRAFT", "CHANGES_REQUESTED"].includes(r.status) && can(user, "pcb.edit") ? "Edit Draft" : r.status === "IN_REVIEW" && can(user, "pcb.review") ? "Review" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
