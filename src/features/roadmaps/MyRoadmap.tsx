import { useSuspenseQuery } from "@tanstack/react-query";
import { Route as RouteIcon } from "lucide-react";
import { Panel, formatDate } from "@/components/app/shared";
import { currentDay, isExecutable, nextAfter, progress, scheduleHealth, statusLabel } from "@/lib/roadmaps/model";
import { mySaveNotes, mySetItemStatus } from "@/lib/roadmaps/roadmaps.functions";
import { myRoadmapQuery } from "./queries";
import { DayCard, ProgressBar, RmBadge, resourceIndex, useRefreshRoadmaps, type DayItem } from "./parts";

export function MyRoadmapPage() {
  const { data: r } = useSuspenseQuery(myRoadmapQuery);
  const refresh = useRefreshRoadmaps();
  if (!r)
    return (
      <Panel className="p-8 text-center">
        <RouteIcon className="mx-auto mb-3 size-7 text-muted-foreground" />
        <p className="font-medium">Your roadmap is not ready yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Your career consultant will set it up after your Personal Career Blueprint is approved.</p>
      </Panel>
    );
  const p = progress(r.items);
  const cur = currentDay(r.items);
  const next = nextAfter(r.items, cur);
  const exec = isExecutable(r.status);
  const health = r.status === "ACTIVE" ? scheduleHealth(r.items, r.today, r.weekly_days) : null;
  const resFor = resourceIndex(r.resources, r.mappings);
  const card = (it: DayItem, open = false) => (
    <DayCard key={`${it.id}-${it.lock_version}`} item={it} today={r.today} mode="candidate" canExecute={exec} defaultOpen={open} resources={resFor(it)} remarks={r.remarks.filter((x) => x.item_id === it.id)}
      onStatus={(to) => mySetItemStatus({ data: { itemId: it.id, to, lock: it.lock_version } }).then(refresh)}
      onNotes={(notes) => mySaveNotes({ data: { itemId: it.id, notes, lock: it.lock_version } }).then(refresh)} />
  );
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">My Roadmap</p>
        <h1 className="mt-1 text-2xl font-semibold">{r.career_path ?? "Your learning roadmap"}</h1>
        {r.target_role && <p className="text-sm text-muted-foreground">Target role: {r.target_role}</p>}
      </div>
      <Panel className="p-5">
        <div className="flex items-baseline justify-between"><span className="text-sm text-muted-foreground">Overall progress</span><span className="text-2xl font-semibold">{p.pct}%</span></div>
        <ProgressBar pct={p.pct} className="mt-2" />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{p.completed} of {p.total} days done</span>
          {r.status !== "ACTIVE" && <RmBadge status={r.status} />}
          {health && <RmBadge status={health.status} title={health.reason} />}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {[["Duration", `${r.duration_days} days`], ["Current day", cur ? `Day ${cur.day_number}` : "All done"], ["Start date", formatDate(r.start_date)], ["Target end", formatDate(r.target_end_date)]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
        {r.status === "NOT_STARTED" && <p className="mt-4 rounded-md bg-muted p-3 text-sm">Your roadmap will open once your consultant starts it.</p>}
        {r.status === "PAUSED" && <p className="mt-4 rounded-md bg-muted p-3 text-sm">Your roadmap is paused. Please contact your consultant.</p>}
        {r.status === "COMPLETED" && <p className="mt-4 rounded-md bg-success-soft p-3 text-sm text-success">Congratulations — your roadmap is complete.</p>}
      </Panel>
      {cur && (
        <section>
          <h2 className="mb-2 font-semibold">Today / Current activity</h2>
          {card(cur, true)}
          {next && <p className="mt-2 text-xs text-muted-foreground">Next: Day {next.day_number} — {next.title} ({formatDate(next.planned_date)})</p>}
        </section>
      )}
      <section>
        <h2 className="mb-2 font-semibold">Daily roadmap</h2>
        <div className="space-y-5">
          {r.phases.map((ph) => {
            const its = r.items.filter((i) => i.phase_id === ph.id);
            if (!its.length) return null;
            return (
              <div key={ph.id}>
                <p className="mb-2 text-sm font-medium text-muted-foreground">{ph.name} · {progress(its).pct}%</p>
                <div className="space-y-2">{its.map((it) => card(it))}</div>
              </div>
            );
          })}
        </div>
      </section>
      <p className="text-center text-xs text-muted-foreground">Status: {statusLabel(r.status)} · Weekly reviews are coming soon.</p>
    </div>
  );
}
