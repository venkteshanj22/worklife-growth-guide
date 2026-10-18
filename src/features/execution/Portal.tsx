import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarCheck, ExternalLink, FolderKanban, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Panel, formatDate } from "@/components/app/shared";
import { myWorkAction } from "@/lib/execution/execution.functions";
import { isOverdue, label, NOT_ENTITLED_SELF } from "@/lib/execution/model";
import { myWeeklyQuery, myWorkQuery, useRefreshExec } from "./queries";
import { ExBadge, Field, Info, Overdue, useAction } from "./parts";

function Empty({ icon: Icon, title, text }: { icon: typeof CalendarCheck; title: string; text: string }) {
  return <div className="flex flex-col items-center py-16 text-center"><Icon className="mb-3 size-7 text-muted-foreground" /><p className="font-medium">{title}</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p></div>;
}

export function MyWeeklyPage() {
  const { data } = useSuspenseQuery(myWeeklyQuery);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Weekly Progress</h1>
      {!data?.reviews.length ? <Empty icon={CalendarCheck} title="No weekly reviews yet" text="Your consultant's weekly reviews will appear here." /> : data.reviews.map((r) => (
        <Panel key={r.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">Week {r["week_number"]}</span><ExBadge status={r.status} />{r["result"] && <ExBadge status={r["result"]} />}
            <span className="ml-auto text-xs text-muted-foreground">{formatDate(r["actual_date"] ?? r["scheduled_date"])}</span></div>
          {r.status === "COMPLETED" && <>
            {r["snap_progress"] != null && <p className="text-sm text-muted-foreground">Roadmap progress at review: <span className="font-medium text-foreground">{r["snap_progress"]}%</span></p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Key Progress" value={r["key_progress"]} /><Info label="Areas to Improve" value={r["improvement_areas"]} />
              <Info label="Feedback" value={r.candidate_feedback} /><Info label="Next Week Plan" value={r["next_week_plan"]} />
            </div>
          </>}
        </Panel>
      ))}
    </div>
  );
}

export function MyWorkPage({ kind }: { kind: "PROJECT" | "TASK" }) {
  const { data } = useSuspenseQuery(myWorkQuery(kind));
  const title = kind === "PROJECT" ? "Projects" : "My Tasks";
  if (kind === "TASK" && data && !data.entitled && !data.rows.length) return <div><h1 className="text-2xl font-semibold">{title}</h1><Empty icon={ListChecks} title="Not included" text={NOT_ENTITLED_SELF} /></div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {kind === "TASK" && data && !data.entitled && <p className="text-sm text-muted-foreground">{NOT_ENTITLED_SELF} Your earlier tasks remain below.</p>}
      {!data?.rows.length ? <Empty icon={kind === "PROJECT" ? FolderKanban : ListChecks} title="Nothing here yet" text={kind === "PROJECT" ? "Your projects will appear once your consultant sets them up." : "Tasks assigned to you will appear here."} />
        : data.rows.map((r) => <WorkCard key={r.id} kind={kind} r={r as never} today={data.today} />)}
    </div>
  );
}

type Row = Record<string, string | null> & { id: string; code: string; name: string; status: string; lock_version: number; feedback: { outcome: string; candidate_feedback: string | null; created_at: string }[] };
function WorkCard({ kind, r, today }: { kind: "PROJECT" | "TASK"; r: Row; today: string }) {
  const refresh = useRefreshExec();
  const { busy, run } = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ github: r["github_url"] ?? "", live: r["live_url"] ?? "", notes: (kind === "PROJECT" ? r["submission_notes"] : r["submission"]) ?? "", link: r["submission_link"] ?? "" });
  const due = kind === "PROJECT" ? r["planned_due_date"] : r["due_date"];
  const canStart = r.status === (kind === "PROJECT" ? "NOT_STARTED" : "ASSIGNED");
  const submitAction = r.status === "IN_PROGRESS" ? "submit" : r.status === "CHANGES_REQUESTED" ? "resubmit" : null;
  const act = (action: "start" | "submit" | "resubmit") => run(action, () => myWorkAction({ data: {
    kind, id: r.id, lock: r.lock_version, action, github_url: f.github || null, live_url: f.live || null, link: f.link || null, notes: f.notes || null,
  } }).then(refresh), action === "start" ? "Started" : "Submitted");
  return (
    <Panel className="space-y-3 p-4">
      <button type="button" className="w-full text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.name}</span><ExBadge status={r.status} />{isOverdue(kind, r.status, due, today) && <Overdue />}</div>
        <p className="mt-1 text-xs text-muted-foreground">{kind === "PROJECT" && r["project_type"] ? `${r["project_type"]} · ` : ""}Due {formatDate(due)}</p>
      </button>
      {open && (
        <div className="space-y-3 border-t pt-3">
          {kind === "PROJECT"
            ? ([["Business Scenario", r["scenario"]], ["Description", r["description"]], ["Objectives", r["objectives"]], ["Technology", r["technologies"]], ["Expected Deliverables", r["deliverables"]]] as const).filter(([, v]) => v).map(([l, v]) => <Info key={l} label={l} value={v} />)
            : <>{r["details"] && <Info label="Details" value={r["details"]} />}{r["resource_link"] && <Info label="Resource" value={<a href={r["resource_link"]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">Open<ExternalLink className="size-3" /></a>} />}</>}
          {r.feedback.length > 0 && (
            <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Reviewer feedback</p>
              {r.feedback.map((x, i) => <div key={i} className="rounded-md border p-2 text-sm"><p className="whitespace-pre-wrap">{x.candidate_feedback}</p><p className="mt-1 text-xs text-muted-foreground">{label(x.outcome)} · {formatDate(x.created_at, true)}</p></div>)}</div>
          )}
          {submitAction ? (
            <div className="space-y-3">
              {kind === "PROJECT" ? <>
                <Field label="GitHub URL (required)"><Input value={f.github} onChange={(e) => setF({ ...f, github: e.target.value })} placeholder="https://github.com/…" inputMode="url" /></Field>
                <Field label="Live URL (optional)"><Input value={f.live} onChange={(e) => setF({ ...f, live: e.target.value })} placeholder="https://" inputMode="url" /></Field>
              </> : <Field label="Submission link (optional)"><Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" inputMode="url" /></Field>}
              <Field label={kind === "PROJECT" ? "Submission notes" : "Your submission"}><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
              <Button size="lg" className="w-full sm:w-auto" disabled={!!busy} onClick={() => act(submitAction)}>{busy ? "Submitting…" : submitAction === "submit" ? `Submit ${kind === "PROJECT" ? "Project" : "Task"}` : "Resubmit"}</Button>
            </div>
          ) : (kind === "PROJECT" ? r["github_url"] : r["submission"] || r["submission_link"]) && (
            <div className="grid gap-2 text-sm">
              {kind === "PROJECT" ? <><Info label="GitHub" value={r["github_url"]} />{r["live_url"] && <Info label="Live" value={r["live_url"]} />}{r["submission_notes"] && <Info label="Notes" value={r["submission_notes"]} />}</>
                : <><Info label="Submission" value={r["submission"]} />{r["submission_link"] && <Info label="Link" value={r["submission_link"]} />}</>}
            </div>
          )}
          {canStart && <Button size="lg" className="w-full sm:w-auto" disabled={!!busy} onClick={() => act("start")}>{busy ? "Starting…" : kind === "PROJECT" ? "Start Project" : "Start Task"}</Button>}
        </div>
      )}
    </Panel>
  );
}
