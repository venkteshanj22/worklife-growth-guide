import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { reviewAction, saveReview } from "@/lib/execution/execution.functions";
import { isOverdue, label, REVIEW_ACTIONS, REVIEW_RESULTS, reviewEditable, type ReviewAction } from "@/lib/execution/model";
import { execQuery, useRefreshExec } from "./queries";
import { ExBadge, Field, HistoryList, Info, Overdue, ReasonDialog, useAction } from "./parts";

const TEXTS = [
  ["key_progress", "Key Progress"], ["strengths", "Strengths Observed"], ["improvement_areas", "Areas Needing Improvement"], ["clarification_topics", "Topics Needing Clarification"],
  ["roadblocks", "Roadblocks"], ["consultant_remarks", "Consultant Remarks"], ["candidate_feedback", "Candidate-visible Feedback"], ["next_week_plan", "Next Week Plan"],
] as const;
const NONE = "__none";

export function ReviewDetailPage({ id }: { id: string }) {
  const { data: d } = useSuspenseQuery(execQuery("REVIEW", id));
  const { can } = useCurrentUser();
  const refresh = useRefreshExec();
  const r = d.record as Record<string, string | number | null> & { id: string; code: string; status: string; lock_version: number };
  const editable = reviewEditable(r.status) && can("weekly_review.edit");
  const correctable = r.status === "COMPLETED" && can("weekly_review.correct");
  const [correcting, setCorrecting] = useState(false);
  const [form, setForm] = useState(() => Object.fromEntries([...TEXTS.map(([k]) => [k, (r[k] as string) ?? ""]), ["result", r.result ?? ""], ["reviewer_id", r.reviewer_id ?? ""], ["scheduled_date", r.scheduled_date ?? ""], ["actual_date", r.actual_date ?? ""]]) as Record<string, string>);
  const [check, setCheck] = useState(() => Object.fromEntries(d.items.map((i) => [i.id, i.answer])) as Record<string, boolean | null>);
  const [internal, setInternal] = useState(d.internal ?? "");
  const [reasonFor, setReasonFor] = useState<ReviewAction | "correct" | null>(null);
  const { busy, run } = useAction();
  const canEdit = editable || (correctable && correcting);
  const over = isOverdue("REVIEW", r.status, r.scheduled_date as string, d.today);

  const payload = (correctionReason?: string) => ({
    id, lock: r.lock_version, correctionReason,
    fields: { ...Object.fromEntries(TEXTS.map(([k]) => [k, form[k] || null])), result: (form.result || null) as never, reviewer_id: form.reviewer_id || null, scheduled_date: form.scheduled_date || undefined, actual_date: form.actual_date || null },
    checklist: d.items.map((i) => ({ id: i.id, answer: check[i.id] ?? null })),
    internal: d.canInternal ? internal : undefined,
  });
  const save = (reason?: string) => run("save", () => saveReview({ data: payload(reason) }).then(refresh), reason ? "Correction saved" : "Review saved").then((ok) => { if (ok) setCorrecting(false); return ok; });
  const act = (a: ReviewAction, reason?: string) => run(a, async () => {
    if (a === "complete" && editable) await saveReview({ data: payload() });
    const fresh = a === "complete" && editable ? r.lock_version + 1 : r.lock_version;
    await reviewAction({ data: { id, lock: fresh, action: a, reason } });
    await refresh();
  }, REVIEW_ACTIONS[a].label + " done");

  const actions = (Object.keys(REVIEW_ACTIONS) as ReviewAction[]).filter((a) => REVIEW_ACTIONS[a].from.includes(r.status) && can(REVIEW_ACTIONS[a].permission));
  return (
    <div className="space-y-6">
      <PageHeader crumbs={["Delivery", "Weekly Reviews", r.code]} title={`${r.code} · Week ${r.week_number}`}
        description={`${d.candidate.full_name} (${d.candidate.candidate_code})${d.roadmapCode ? ` · ${d.roadmapCode}` : ""}`}
        actions={<div className="flex flex-wrap gap-2">
          {actions.map((a) => <Button key={a} variant={a === "complete" ? "default" : "outline"} disabled={!!busy}
            onClick={() => REVIEW_ACTIONS[a].reason ? setReasonFor(a) : (a !== "complete" || confirm("Complete this review? It becomes read-only and the roadmap progress is frozen.")) && act(a)}>
            {busy === a ? "Saving…" : REVIEW_ACTIONS[a].label}</Button>)}
          {correctable && !correcting && <Button variant="outline" onClick={() => setCorrecting(true)}>Correct Review</Button>}
        </div>} />
      <Panel className="grid gap-4 p-5 sm:grid-cols-4">
        <Info label="Status" value={<div className="flex gap-2"><ExBadge status={r.status} />{over && <Overdue />}</div>} />
        <Info label="Result" value={<ExBadge status={r.result as string | null} />} />
        <Info label="Candidate" value={<Link to="/app/candidates/$id" params={{ id: String(r.candidate_id) }} className="text-primary hover:underline">{d.candidate.candidate_code}</Link>} />
        <Info label="Reviewer" value={r.reviewer_id ? d.names[String(r.reviewer_id)] : "—"} />
        <Info label="Review period" value={`${formatDate(r.period_start as string | null)} – ${formatDate(r.period_end as string | null)}`} />
        <Info label="Scheduled" value={formatDate(r.scheduled_date as string)} />
        <Info label="Actual" value={formatDate(r.actual_date as string | null)} />
        <Info label="Source" value={r.source_pcb_code ? `${r.source_pcb_code} V${r.source_pcb_version}${r.source_review_template_id ? " · template" : ""}` : "—"} />
        {r.status === "MISSED" && <Info label="Missed reason" value={`${r.missed_reason} (${d.names[String(r.missed_by)] ?? ""}, ${formatDate(r.missed_at as string, true)})`} />}
        {r.status === "CANCELLED" && <Info label="Cancel reason" value={r.cancel_reason} />}
        {r.corrected_at && <Info label="Last correction" value={`${r.correction_reason} (${d.names[String(r.corrected_by)] ?? ""}, ${formatDate(r.corrected_at as string, true)})`} />}
      </Panel>
      {r.snap_progress != null && (
        <Panel className="p-5">
          <h2 className="mb-3 font-semibold">Roadmap at review (historical snapshot)</h2>
          <div className="grid gap-4 sm:grid-cols-6">
            <Info label="Progress" value={`${r.snap_progress}%`} /><Info label="Completed" value={String(r.snap_completed)} /><Info label="In progress" value={String(r.snap_in_progress)} />
            <Info label="Pending" value={String(r.snap_pending)} /><Info label="Overdue" value={String(r.snap_overdue)} /><Info label="Health" value={label(r.snap_health as string | null)} />
          </div>
        </Panel>
      )}
      <Panel className="space-y-5 p-5">
        <h2 className="font-semibold">Review</h2>
        {canEdit && (
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Review Result"><Select value={form.result || NONE} onValueChange={(v) => setForm({ ...form, result: v === NONE ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NONE}>Not chosen</SelectItem>{REVIEW_RESULTS.map((x) => <SelectItem key={x} value={x}>{label(x)}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Reviewer"><Select value={form.reviewer_id || NONE} onValueChange={(v) => setForm({ ...form, reviewer_id: v === NONE ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NONE}>Unassigned</SelectItem>{d.staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Scheduled date"><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></Field>
            <Field label="Actual review date"><Input type="date" value={form.actual_date} onChange={(e) => setForm({ ...form, actual_date: e.target.value })} /></Field>
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Checklist</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.items.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{i.label}</span>
                <div className="flex gap-1">{([true, false] as const).map((v) => (
                  <Button key={String(v)} size="sm" variant={check[i.id] === v ? "default" : "outline"} disabled={!canEdit} className="h-7 px-3"
                    onClick={() => setCheck({ ...check, [i.id]: check[i.id] === v ? null : v })}>{v ? "Yes" : "No"}</Button>))}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXTS.map(([k, l]) => canEdit
            ? <Field key={k} label={l}><Textarea rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>
            : <Info key={k} label={l} value={r[k] as string | null} />)}
        </div>
        {d.canInternal && (
          <div className="rounded-md border border-dashed bg-muted/30 p-3">
            {canEdit ? <Field label="Internal Notes (staff only)"><Textarea rows={3} value={internal} onChange={(e) => setInternal(e.target.value)} /></Field>
              : <Info label="Internal Notes (staff only)" value={d.internal} />}
          </div>
        )}
        {canEdit && (
          <div className="flex justify-end gap-2">
            {correcting && <Button variant="outline" onClick={() => setCorrecting(false)}>Discard</Button>}
            <Button disabled={!!busy} onClick={() => correcting ? setReasonFor("correct") : save()}>{busy === "save" ? "Saving…" : correcting ? "Save Correction" : "Save"}</Button>
          </div>
        )}
      </Panel>
      <Panel className="p-5"><h2 className="mb-4 font-semibold">History</h2><HistoryList items={d.history} /></Panel>
      <ReasonDialog open={!!reasonFor} title={reasonFor === "correct" ? "Correction reason" : reasonFor ? REVIEW_ACTIONS[reasonFor].label : ""} onClose={() => setReasonFor(null)}
        onConfirm={(reason) => (reasonFor === "correct" ? save(reason) : act(reasonFor as ReviewAction, reason))} />
    </div>
  );
}
