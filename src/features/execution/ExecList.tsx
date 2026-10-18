import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/app/shared";
import { isOverdue, label, PROJECT_STATUSES, REVIEW_RESULTS, REVIEW_STATUSES, TASK_STATUSES, type Kind } from "@/lib/execution/model";
import { execListQuery } from "./queries";
import { ExBadge, Overdue } from "./parts";

const META = {
  REVIEW: { title: "Weekly Reviews", desc: "Consultant-led weekly progress reviews. Schedule new reviews from a candidate's Weekly Reviews tab.", statuses: REVIEW_STATUSES },
  PROJECT: { title: "Projects", desc: "Candidate project execution and reviewer feedback. Initialize projects from a candidate's Projects tab.", statuses: PROJECT_STATUSES },
  TASK: { title: "Premium Tasks", desc: "Additional tasks for Premium candidates. Assign tasks from a candidate's Tasks tab.", statuses: TASK_STATUSES },
} as const;
const ALL = "__all";

export function ExecListPage({ kind }: { kind: Kind }) {
  const [page, setPage] = useState(0);
  const { data } = useSuspenseQuery(execListQuery(kind, page));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [result, setResult] = useState(ALL);
  const [reviewer, setReviewer] = useState(ALL);
  const [consultant, setConsultant] = useState(ALL);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const m = META[kind];
  const due = (r: Record<string, unknown>) => (kind === "REVIEW" ? r["scheduled_date"] : kind === "PROJECT" ? r["planned_due_date"] : r["due_date"]) as string | null;
  const reviewers = [...new Set(data.rows.map((r) => r.reviewer).filter(Boolean))];
  const consultants = [...new Set(data.rows.map((r) => r.consultant).filter(Boolean))];
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.rows.filter((r) =>
      (!s || [r.code, r.candidate_code, r.candidate_name, r.name as string | undefined].some((v) => v?.toLowerCase().includes(s))) &&
      (status === ALL || r.status === status) && (result === ALL || r.result === result) && (reviewer === ALL || r.reviewer === reviewer) &&
      (consultant === ALL || r.consultant === consultant) && (!overdueOnly || isOverdue(kind, r.status, due(r), data.today)));
  }, [data, q, status, result, reviewer, consultant, overdueOnly, kind]);
  const sel = (v: string, set: (v: string) => void, opts: string[], ph: string, fmt = (x: string) => x) => (
    <Select value={v} onValueChange={set}><SelectTrigger className="w-44" aria-label={ph}><SelectValue placeholder={ph} /></SelectTrigger>
      <SelectContent><SelectItem value={ALL}>{ph}: All</SelectItem>{opts.map((o) => <SelectItem key={o} value={o}>{fmt(o)}</SelectItem>)}</SelectContent></Select>
  );
  return (
    <div className="space-y-6">
      <PageHeader crumbs={["Delivery", m.title]} title={m.title} description={m.desc} />
      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidate ID, name or record ID" className="pl-9" aria-label="Search" /></div>
        {sel(status, setStatus, [...m.statuses], "Status", label)}
        {kind === "REVIEW" && sel(result, setResult, [...REVIEW_RESULTS], "Result", label)}
        {sel(reviewer, setReviewer, reviewers, "Reviewer")}
        {sel(consultant, setConsultant, consultants, "Consultant")}
        <Button variant={overdueOnly ? "default" : "outline"} size="sm" onClick={() => setOverdueOnly(!overdueOnly)}>Overdue only</Button>
      </Panel>
      {!rows.length ? <EmptyState title="No records" description="Nothing matches these filters yet." /> : (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">ID</th><th className="p-3">Candidate</th>
                {kind === "REVIEW" ? <><th className="p-3">Week</th><th className="p-3">Roadmap</th><th className="p-3">Scheduled</th><th className="p-3">Actual</th><th className="p-3">Progress</th><th className="p-3">Result</th></>
                  : kind === "PROJECT" ? <><th className="p-3">Project</th><th className="p-3">Type</th><th className="p-3">Roadmap</th><th className="p-3">Due</th><th className="p-3">Submitted</th></>
                  : <><th className="p-3">Task</th><th className="p-3">Assigned</th><th className="p-3">Due</th><th className="p-3">Assigned by</th><th className="p-3">Submitted</th></>}
                <th className="p-3">Reviewer</th><th className="p-3">Status</th><th className="p-3">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const over = isOverdue(kind, r.status, due(r), data.today);
                const to = kind === "REVIEW" ? "/app/reviews/$id" : kind === "PROJECT" ? "/app/projects/$id" : "/app/tasks/$id";
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3"><Link to={to} params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.code}</Link></td>
                    <td className="p-3"><div className="font-medium">{r.candidate_name}</div><div className="text-xs text-muted-foreground">{r.candidate_code}</div></td>
                    {kind === "REVIEW" ? <>
                      <td className="p-3">Week {String(r.week_number)}</td><td className="p-3">{r.roadmap_code ?? "—"}</td>
                      <td className="p-3"><div className="flex items-center gap-2">{formatDate(r.scheduled_date as string)}{over && <Overdue />}</div></td>
                      <td className="p-3">{formatDate(r.actual_date as string | null)}</td><td className="p-3">{r.snap_progress != null ? `${String(r.snap_progress)}%` : "—"}</td><td className="p-3"><ExBadge status={r.result as string | null} /></td>
                    </> : kind === "PROJECT" ? <>
                      <td className="p-3">{String(r.name)}</td><td className="p-3">{String(r.project_type ?? "—")}</td><td className="p-3">{r.roadmap_code ?? "—"}</td>
                      <td className="p-3"><div className="flex items-center gap-2">{formatDate(r.planned_due_date as string | null)}{over && <Overdue />}</div></td><td className="p-3">{formatDate(r.submitted_at as string | null)}</td>
                    </> : <>
                      <td className="p-3">{String(r.name)}</td><td className="p-3">{formatDate(r.assigned_date as string)}</td>
                      <td className="p-3"><div className="flex items-center gap-2">{formatDate(r.due_date as string | null)}{over && <Overdue />}</div></td><td className="p-3">{String(r.assigned_by_name ?? "—")}</td><td className="p-3">{formatDate(r.submitted_at as string | null)}</td>
                    </>}
                    <td className="p-3">{r.reviewer || "—"}</td><td className="p-3"><ExBadge status={r.status} /></td><td className="p-3 text-muted-foreground">{formatDate(r.last_activity_at as string, true)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
      {(page > 0 || data.hasMore) && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
