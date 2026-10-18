import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { reviewWork, updateWork } from "@/lib/execution/execution.functions";
import { isOverdue, label, RATING_AREAS, RATINGS, workTransition } from "@/lib/execution/model";
import { execQuery, useRefreshExec } from "./queries";
import { ExBadge, Field, HistoryList, Info, Overdue, ReasonDialog, useAction } from "./parts";

const NONE = "__none";
const A = ({ href }: { href: string | null | undefined }) => (href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">{href}<ExternalLink className="size-3 shrink-0" /></a> : <>—</>);

export function WorkDetailPage({ kind, id }: { kind: "PROJECT" | "TASK"; id: string }) {
  const { data: d } = useSuspenseQuery(execQuery(kind, id));
  const { can } = useCurrentUser();
  const refresh = useRefreshExec();
  const r = d.record as Record<string, string | null> & { id: string; code: string; status: string; lock_version: number; candidate_id: string };
  const m = kind === "PROJECT" ? "project" : "premium_task";
  const open = r.status !== "COMPLETED" && r.status !== "CANCELLED";
  const due = kind === "PROJECT" ? r.planned_due_date : r.due_date;
  const over = isOverdue(kind, r.status, due, d.today);
  const reviewable = !!workTransition(kind, "complete", r.status) && can(`${m}.review`);
  const { busy, run } = useAction();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [edit, setEdit] = useState({ reviewer_id: r.reviewer_id ?? "", date: due ?? "", internal: d.internal ?? "" });
  const [rv, setRv] = useState({ ratings: {} as Record<string, string>, strengths: "", improvement_areas: "", reviewer_remarks: "", candidate_feedback: "", internal: "" });

  const saveEdit = () => run("edit", () => updateWork({ data: {
    kind, id, lock: r.lock_version, internal: d.canInternal ? edit.internal : undefined,
    fields: { reviewer_id: edit.reviewer_id || null, ...(kind === "PROJECT" ? { planned_due_date: edit.date || null } : { due_date: edit.date || null }) },
  } }).then(refresh), "Saved");
  const doReview = (action: "request_changes" | "complete") => run(action, () => reviewWork({ data: {
    kind, id, lock: r.lock_version, action, ratings: rv.ratings as never, strengths: rv.strengths || null, improvement_areas: rv.improvement_areas || null,
    reviewer_remarks: rv.reviewer_remarks || null, candidate_feedback: rv.candidate_feedback || null, internal: d.canInternal && rv.internal ? rv.internal : undefined,
  } }).then(refresh), action === "complete" ? "Marked complete" : "Changes requested");

  return (
    <div className="space-y-6">
      <PageHeader crumbs={["Delivery", kind === "PROJECT" ? "Projects" : "Premium Tasks", r.code]} title={`${r.code} · ${r.name}`}
        description={`${d.candidate.full_name} (${d.candidate.candidate_code})${d.roadmapCode ? ` · ${d.roadmapCode}` : ""}`}
        actions={open && can(`${m}.cancel`) ? <Button variant="outline" onClick={() => setCancelOpen(true)}>Cancel {kind === "PROJECT" ? "Project" : "Task"}</Button> : undefined} />
      <Panel className="grid gap-4 p-5 sm:grid-cols-4">
        <Info label="Status" value={<div className="flex gap-2"><ExBadge status={r.status} />{over && <Overdue />}</div>} />
        <Info label="Candidate" value={<Link to="/app/candidates/$id" params={{ id: r.candidate_id }} className="text-primary hover:underline">{d.candidate.candidate_code}</Link>} />
        <Info label="Reviewer" value={r.reviewer_id ? d.names[r.reviewer_id] : "—"} />
        <Info label="Due date" value={formatDate(due)} />
        {kind === "PROJECT" ? <>
          <Info label="Type" value={r.project_type} /><Info label="Planned start" value={formatDate(r.planned_start_date)} />
          <Info label="Actual start" value={formatDate(r.actual_start_date)} /><Info label="Source" value={r.source_pcb_code ? `${r.source_pcb_code} V${r.source_pcb_version}` : "—"} />
        </> : <>
          <Info label="Assigned" value={`${formatDate(r.assigned_date)} by ${r.assigned_by_name ?? "—"}`} /><Info label="Plan" value={label(d.candidate.program_plan)} />
          <Info label="Resource" value={<A href={r.resource_link} />} />
        </>}
        <Info label="Submitted" value={formatDate(r.submitted_at, true)} /><Info label="Completed" value={formatDate(r.completed_at, true)} />
        {r.status === "CANCELLED" && <Info label="Cancel reason" value={r.cancel_reason} />}
      </Panel>
      <Panel className="grid gap-4 p-5 sm:grid-cols-2">
        {kind === "PROJECT"
          ? ([["Business Scenario", r.scenario], ["Description", r.description], ["Objectives", r.objectives], ["Technology / Skills", r.technologies], ["Expected Deliverables", r.deliverables]] as const).map(([l, v]) => <Info key={l} label={l} value={v} />)
          : <Info label="Task Details" value={r.details} />}
      </Panel>
      <Panel className="space-y-4 p-5">
        <h2 className="font-semibold">Current submission</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {kind === "PROJECT" ? <><Info label="GitHub URL" value={<A href={r.github_url} />} /><Info label="Live URL" value={<A href={r.live_url} />} /><Info label="Submission Notes" value={r.submission_notes} /></>
            : <><Info label="Submission" value={r.submission} /><Info label="Submission Link" value={<A href={r.submission_link} />} /></>}
        </div>
        {d.submissions.length > 1 && (
          <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">All submissions ({d.submissions.length})</summary>
            <ul className="mt-2 space-y-2">{d.submissions.map((s) => (
              <li key={s.id} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Attempt {s.attempt} · {formatDate(s.submitted_at, true)}</p>
                {s.github_url && <p>GitHub: <A href={s.github_url} /></p>}{s.live_url && <p>Live: <A href={s.live_url} /></p>}{s.link && <p>Link: <A href={s.link} /></p>}{s.notes && <p className="whitespace-pre-wrap">{s.notes}</p>}</li>))}</ul>
          </details>
        )}
      </Panel>
      {reviewable && (
        <Panel className="space-y-4 p-5">
          <h2 className="font-semibold">Review submission</h2>
          {kind === "PROJECT" && (
            <div className="grid gap-3 sm:grid-cols-5">
              {RATING_AREAS.map(([k, l]) => (
                <Field key={k} label={l}><Select value={rv.ratings[k] ?? NONE} onValueChange={(v) => { const n = { ...rv.ratings }; if (v === NONE) delete n[k]; else n[k] = v; setRv({ ...rv, ratings: n }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{RATINGS.map((x) => <SelectItem key={x} value={x}>{label(x)}</SelectItem>)}</SelectContent></Select></Field>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {kind === "PROJECT" && <><Field label="Strengths"><Textarea rows={2} value={rv.strengths} onChange={(e) => setRv({ ...rv, strengths: e.target.value })} /></Field>
              <Field label="Improvement Areas"><Textarea rows={2} value={rv.improvement_areas} onChange={(e) => setRv({ ...rv, improvement_areas: e.target.value })} /></Field></>}
            <Field label="Reviewer Remarks (staff)"><Textarea rows={2} value={rv.reviewer_remarks} onChange={(e) => setRv({ ...rv, reviewer_remarks: e.target.value })} /></Field>
            <Field label="Candidate-visible Feedback (required for changes)"><Textarea rows={2} value={rv.candidate_feedback} onChange={(e) => setRv({ ...rv, candidate_feedback: e.target.value })} /></Field>
            {d.canInternal && <Field label="Internal Notes (staff only)"><Textarea rows={2} value={rv.internal} onChange={(e) => setRv({ ...rv, internal: e.target.value })} /></Field>}
          </div>
          <div className="flex justify-end gap-2">
            {can(`${m}.request_changes`) && <Button variant="outline" disabled={!!busy || !rv.candidate_feedback.trim()} onClick={() => doReview("request_changes")}>{busy === "request_changes" ? "Saving…" : "Request Changes"}</Button>}
            {can(`${m}.complete`) && <Button disabled={!!busy} onClick={() => confirm("Complete this record? It becomes historical evidence.") && doReview("complete")}>{busy === "complete" ? "Saving…" : "Complete"}</Button>}
          </div>
        </Panel>
      )}
      {open && can(`${m}.edit`) && (
        <Panel className="space-y-4 p-5">
          <h2 className="font-semibold">Manage</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Reviewer"><Select value={edit.reviewer_id || NONE} onValueChange={(v) => setEdit({ ...edit, reviewer_id: v === NONE ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NONE}>Unassigned</SelectItem>{d.staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Due date"><Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
          </div>
          {d.canInternal && <Field label="Internal Notes (staff only)"><Textarea rows={3} value={edit.internal} onChange={(e) => setEdit({ ...edit, internal: e.target.value })} /></Field>}
          <div className="flex justify-end"><Button disabled={!!busy} onClick={saveEdit}>{busy === "edit" ? "Saving…" : "Save"}</Button></div>
        </Panel>
      )}
      {d.canInternal && !(open && can(`${m}.edit`)) && d.internal && <Panel className="border-dashed p-5"><Info label="Internal Notes (staff only)" value={d.internal} /></Panel>}
      {d.reviews.length > 0 && (
        <Panel className="space-y-3 p-5">
          <h2 className="font-semibold">Review history</h2>
          {d.reviews.map((x) => (
            <div key={x.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2"><ExBadge status={x.outcome} /><span className="text-xs text-muted-foreground">{x.reviewer_name} · {formatDate(x.created_at, true)}{x.attempt ? ` · after attempt ${x.attempt}` : ""}</span></div>
              {Object.keys(x.ratings as object).length > 0 && <p className="mt-2 text-xs">{Object.entries(x.ratings as Record<string, string>).map(([k, v]) => `${RATING_AREAS.find((a) => a[0] === k)?.[1] ?? k}: ${label(v)}`).join(" · ")}</p>}
              {x.strengths && <p className="mt-1"><span className="text-muted-foreground">Strengths:</span> {x.strengths}</p>}
              {x.improvement_areas && <p><span className="text-muted-foreground">Improve:</span> {x.improvement_areas}</p>}
              {x.candidate_feedback && <p><span className="text-muted-foreground">Feedback to candidate:</span> {x.candidate_feedback}</p>}
              {x.reviewer_remarks && <p><span className="text-muted-foreground">Remarks:</span> {x.reviewer_remarks}</p>}
            </div>
          ))}
        </Panel>
      )}
      <Panel className="p-5"><h2 className="mb-4 font-semibold">History</h2><HistoryList items={d.history} /></Panel>
      <ReasonDialog open={cancelOpen} title="Cancellation reason" cta="Cancel record" onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => run("cancel", () => reviewWork({ data: { kind, id, lock: r.lock_version, action: "cancel", reason, ratings: {} } }).then(refresh), "Cancelled")} />
    </div>
  );
}
