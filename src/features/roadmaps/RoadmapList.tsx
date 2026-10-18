import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { ROADMAP_STATUSES, statusLabel } from "@/lib/roadmaps/model";
import { roadmapListQuery } from "./queries";
import { ProgressBar, RmBadge } from "./parts";

const sel = "h-9 rounded-md border bg-background px-2 text-sm";

export function RoadmapListPage() {
  const { user } = useCurrentUser();
  const { data } = useSuspenseQuery(roadmapListQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [path, setPath] = useState("");
  const [consultant, setConsultant] = useState("");
  const [health, setHealth] = useState("");
  const [prog, setProg] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [endBy, setEndBy] = useState("");
  const paths = [...new Set(data.map((r) => r.career_path).filter((x): x is string => !!x))].sort();
  const cons = [...new Set(data.map((r) => r.consultant).filter(Boolean))].sort();
  const rows = useMemo(() => data.filter((r) => {
    const s = q.trim().toLowerCase();
    if (s && ![r.code, r.candidate_code, r.candidate_name].some((x) => x.toLowerCase().includes(s))) return false;
    if (status && r.status !== status) return false;
    if (path && r.career_path !== path) return false;
    if (consultant && r.consultant !== consultant) return false;
    if (health && r.health !== health) return false;
    if (startFrom && r.start_date < startFrom) return false;
    if (endBy && r.target_end_date > endBy) return false;
    if (prog) { const [a, b] = prog.split("-").map(Number); if (r.progress < a! || r.progress > b!) return false; }
    return true;
  }), [data, q, status, path, consultant, health, prog, startFrom, endBy]);
  const counts = { active: data.filter((r) => r.status === "ACTIVE").length, behind: data.filter((r) => r.health === "BEHIND").length, completed: data.filter((r) => r.status === "COMPLETED").length };
  return (
    <>
      <PageHeader crumbs={["Delivery", "Roadmaps"]} title="Candidate Roadmaps" description="Execution of approved Personal Career Blueprints."
        actions={can(user, "roadmap.create") ? <Button asChild><Link to="/app/roadmaps/new" search={{}}><Plus className="size-4" /> New Roadmap</Link></Button> : null} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[["Active roadmaps", counts.active], ["Behind schedule", counts.behind], ["Completed", counts.completed]].map(([k, v]) => (
          <Panel key={k} className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-2xl font-semibold">{v}</p></Panel>
        ))}
      </div>
      <Panel className="mb-4 flex flex-wrap items-end gap-2 p-3">
        <Input placeholder="Search roadmap, candidate ID or name" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64" aria-label="Search" />
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{ROADMAP_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
        <select className={sel} value={health} onChange={(e) => setHealth(e.target.value)} aria-label="Schedule"><option value="">Any schedule</option>{["ON_TRACK", "ATTENTION", "BEHIND"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
        <select className={sel} value={path} onChange={(e) => setPath(e.target.value)} aria-label="Career path"><option value="">All career paths</option>{paths.map((p) => <option key={p}>{p}</option>)}</select>
        <select className={sel} value={consultant} onChange={(e) => setConsultant(e.target.value)} aria-label="Consultant"><option value="">All consultants</option>{cons.map((p) => <option key={p}>{p}</option>)}</select>
        <select className={sel} value={prog} onChange={(e) => setProg(e.target.value)} aria-label="Progress"><option value="">Any progress</option><option value="0-25">0–25%</option><option value="26-50">26–50%</option><option value="51-75">51–75%</option><option value="76-100">76–100%</option></select>
        <label className="text-xs text-muted-foreground">Start from<Input type="date" value={startFrom} onChange={(e) => setStartFrom(e.target.value)} className="h-9 w-40" /></label>
        <label className="text-xs text-muted-foreground">Ends by<Input type="date" value={endBy} onChange={(e) => setEndBy(e.target.value)} className="h-9 w-40" /></label>
      </Panel>
      {rows.length === 0 ? (
        <EmptyState icon={<RouteIcon className="size-6" />} title={data.length ? "No roadmaps match these filters" : "No roadmaps yet"} description="Roadmaps are created from an approved PCB." />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>{["Roadmap", "Candidate", "Career path / role", "PCB", "Duration", "Start", "Target end", "Progress", "Status", "Consultant", "Last activity"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2"><Link to="/app/roadmaps/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.code}</Link></td>
                  <td className="px-3 py-2"><div>{r.candidate_name}</div><div className="text-xs text-muted-foreground">{r.candidate_code}</div></td>
                  <td className="px-3 py-2"><div>{r.career_path ?? "—"}</div><div className="text-xs text-muted-foreground">{r.target_role ?? ""}</div></td>
                  <td className="px-3 py-2 whitespace-nowrap">V{r.pcb_version}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.duration_days} days</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.start_date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.target_end_date)}</td>
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><ProgressBar pct={r.progress} className="w-16" /><span className="text-xs">{r.progress}%</span></div></td>
                  <td className="px-3 py-2"><div className="flex flex-col gap-1"><RmBadge status={r.status} />{r.health && <RmBadge status={r.health} />}</div></td>
                  <td className="px-3 py-2">{r.consultant || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.last_activity_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
