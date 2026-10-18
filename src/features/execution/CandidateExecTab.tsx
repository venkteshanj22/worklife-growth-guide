import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { assignTask, initProjects, scheduleReview, type CandidateExec } from "@/lib/execution/execution.functions";
import { isOverdue, NOT_ENTITLED, type Kind } from "@/lib/execution/model";
import { candidateExecQuery, useRefreshExec } from "./queries";
import { ExBadge, Field, Overdue, useAction } from "./parts";

const PERM = { REVIEW: "weekly_review", PROJECT: "project", TASK: "premium_task" } as const;
const NONE = "__none";

export function CandidateExecTab({ kind, candidateId }: { kind: Kind; candidateId: string }) {
  const { can } = useCurrentUser();
  const allowed = can(`${PERM[kind]}.view`);
  const q = useQuery({ ...candidateExecQuery(kind, candidateId), enabled: allowed });
  const [dlg, setDlg] = useState(false);
  if (!allowed) return <p className="py-12 text-center text-sm text-muted-foreground">You do not have access to this module.</p>;
  if (q.isLoading) return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;
  if (q.error || !q.data) return <p className="py-12 text-center text-sm text-destructive">Could not load records.</p>;
  const d = q.data;
  const to = kind === "REVIEW" ? "/app/reviews/$id" : kind === "PROJECT" ? "/app/projects/$id" : "/app/tasks/$id";
  const pending = d.sources.filter((s) => !s.initialized);
  const createBtn = kind === "REVIEW" ? (can("weekly_review.create") && <Button onClick={() => setDlg(true)}><Plus className="size-4" /> Schedule Review</Button>)
    : kind === "PROJECT" ? (can("project.initialize") && pending.length > 0 && <Button onClick={() => setDlg(true)}><Plus className="size-4" /> Initialize Projects</Button>)
    : (can("premium_task.create") && (d.entitled ? <Button onClick={() => setDlg(true)}><Plus className="size-4" /> Assign Task</Button> : null));
  const due = (r: Record<string, unknown>) => (kind === "REVIEW" ? r.scheduled_date : kind === "PROJECT" ? r.planned_due_date : r.due_date) as string | null;
  return (
    <div className="space-y-4">
      {kind === "TASK" && !d.entitled && <Panel className="p-4 text-sm text-muted-foreground">{NOT_ENTITLED} {d.rows.length > 0 && "Earlier tasks remain visible below."}</Panel>}
      {kind === "PROJECT" && !d.roadmap && <Panel className="p-4 text-sm text-muted-foreground">Projects can be initialized once the candidate has a roadmap.</Panel>}
      {createBtn && <div className="flex justify-end">{createBtn}</div>}
      {!d.rows.length ? <p className="py-10 text-center text-sm text-muted-foreground">No records yet.</p> : (
        <Panel className="divide-y">
          {d.rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <Link to={to} params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.code}</Link>
              <span className="text-sm">{kind === "REVIEW" ? `Week ${String(r.week_number)}` : String(r.name)}</span>
              <ExBadge status={r.status} />{kind === "REVIEW" && r.result ? <ExBadge status={r.result as string} /> : null}
              {isOverdue(kind, r.status, due(r), d.today) && <Overdue />}
              <span className="ml-auto text-xs text-muted-foreground">{kind === "REVIEW" ? "Scheduled" : "Due"} {formatDate(due(r))}{r.reviewer ? ` · ${r.reviewer}` : ""}</span>
            </div>
          ))}
        </Panel>
      )}
      {dlg && <CreateDialog kind={kind} candidateId={candidateId} data={d} onClose={() => setDlg(false)} />}
    </div>
  );
}

function CreateDialog({ kind, candidateId, data, onClose }: { kind: Kind; candidateId: string; data: CandidateExec; onClose: () => void }) {
  const refresh = useRefreshExec();
  const { busy, run } = useAction();
  const nextWeek = data.rows.reduce((m, r) => Math.max(m, Number(r.week_number ?? 0)), 0) + 1;
  const [f, setF] = useState({ week: String(nextWeek), start: "", end: "", date: data.today, reviewer: "", name: "", details: "", link: "" });
  const [sel, setSel] = useState<string[]>([]);
  const submit = () => run("create", async () => {
    if (kind === "REVIEW") await scheduleReview({ data: { candidateId, weekNumber: Number(f.week), periodStart: f.start || null, periodEnd: f.end || null, scheduledDate: f.date, reviewerId: f.reviewer || null } });
    else if (kind === "PROJECT") await initProjects({ data: { candidateId, sourceIds: sel } });
    else await assignTask({ data: { candidateId, name: f.name, details: f.details || null, resource_link: f.link || null, due_date: f.date || null, reviewer_id: f.reviewer || null } });
    await refresh();
  }, kind === "REVIEW" ? "Review scheduled" : kind === "PROJECT" ? "Projects initialized" : "Task assigned").then((ok) => ok && onClose());
  const reviewer = (
    <Field label="Reviewer"><Select value={f.reviewer || NONE} onValueChange={(v) => setF({ ...f, reviewer: v === NONE ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value={NONE}>Unassigned</SelectItem>{data.staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent></Select></Field>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{kind === "REVIEW" ? "Schedule Weekly Review" : kind === "PROJECT" ? "Initialize Projects from PCB" : "Assign Premium Task"}</DialogTitle></DialogHeader>
        {kind === "REVIEW" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Week number"><Input type="number" min={1} value={f.week} onChange={(e) => setF({ ...f, week: e.target.value })} /></Field>
            <Field label="Scheduled date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Period start"><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
            <Field label="Period end"><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
            {reviewer}
            <p className="text-xs text-muted-foreground sm:col-span-2">{data.roadmap ? `Linked to ${data.roadmap.code}. The checklist comes from the PCB weekly review template when one exists for this week.` : "No roadmap yet — the standard checklist will be used."}</p>
          </div>
        )}
        {kind === "PROJECT" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Projects from {data.roadmap?.code}'s approved PCB. Each is copied and then stays independent.</p>
            {data.sources.map((s) => (
              <label key={s.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                <Checkbox disabled={s.initialized} checked={s.initialized || sel.includes(s.id)} onCheckedChange={(c) => setSel(c ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />
                <span className="flex-1">{s.name} <span className="text-xs text-muted-foreground">· {s.project_type}</span></span>
                {s.initialized && <span className="text-xs text-muted-foreground">Already initialized</span>}
              </label>
            ))}
          </div>
        )}
        {kind === "TASK" && (
          <div className="grid gap-3">
            <Field label="Task name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Details"><Textarea rows={3} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
            <Field label="Resource link (optional)"><Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Due date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>{reviewer}</div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!!busy || (kind === "PROJECT" && !sel.length) || (kind === "TASK" && f.name.trim().length < 2) || (kind === "REVIEW" && !f.date)} onClick={submit}>{busy ? "Saving…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
