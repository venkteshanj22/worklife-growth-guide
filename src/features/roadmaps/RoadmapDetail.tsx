import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { JourneyOffer } from "@/features/pcb/JourneyOffer";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import {
  ROADMAP_ACTIONS, canRoadmapAction, currentDay, groupProgress, isOverdue, isReadOnly, nextAfter, progress, scheduleHealth, staffMovePermission, statusLabel, type RoadmapAction,
} from "@/lib/roadmaps/model";
import { addRemark, roadmapAction, setItemPlannedDate, setItemStatus } from "@/lib/roadmaps/roadmaps.functions";
import { roadmapQuery } from "./queries";
import { DateEditor, DayCard, ProgressBar, RemarkForm, RmBadge, resourceIndex, useRefreshRoadmaps } from "./parts";

const TABS = ["Overview", "Daily Roadmap", "Resources", "Progress", "Activity"];

export function RoadmapDetailPage({ id }: { id: string }) {
  const { user } = useCurrentUser();
  const { data: r } = useSuspenseQuery(roadmapQuery(id));
  const refresh = useRefreshRoadmaps();
  const [dlg, setDlg] = useState<RoadmapAction | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<{ candidateId: string; status: "ROADMAP_ACTIVE" } | null>(null);
  const [filter, setFilter] = useState("");
  const p = progress(r.items);
  const allDone = p.total > 0 && p.completed === p.total;
  const health = r.status === "ACTIVE" ? scheduleHealth(r.items, r.today, r.weekly_days) : null;
  const cur = currentDay(r.items);
  const next = nextAfter(r.items, cur);
  const last = [...r.items].filter((i) => i.completed_at).sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))[0];
  const resFor = resourceIndex(r.resources, r.mappings);
  const ro = isReadOnly(r.status);
  const phaseP = groupProgress(r.items, "phase_id");
  const moduleP = groupProgress(r.items, "module_id");
  const actions = (Object.keys(ROADMAP_ACTIONS) as RoadmapAction[]).filter((a) => canRoadmapAction(a, r.status, allDone) && can(user, ROADMAP_ACTIONS[a].permission));

  const go = async () => {
    if (!dlg) return;
    setBusy(true);
    try {
      const res = await roadmapAction({ data: { id: r.id, action: dlg, reason: reason || undefined, lock: r.lock_version } });
      toast.success(`${ROADMAP_ACTIONS[dlg].label} done`);
      if (dlg === "start" && res.journey === "PCB_APPROVED" && can(user, "candidates.status")) setOffer({ candidateId: res.candidateId, status: "ROADMAP_ACTIVE" });
      setDlg(null); setReason(""); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update roadmap"); } finally { setBusy(false); }
  };
  const items = r.items.filter((i) => !filter || (filter === "OVERDUE" ? isOverdue(i, r.today) : i.status === filter));

  return (
    <>
      <PageHeader crumbs={["Delivery", "Roadmaps", r.code]} title={`${r.candidate?.full_name ?? ""} — Roadmap`} description={`${r.code} · ${r.candidate?.candidate_code ?? ""}`}
        actions={<div className="flex flex-wrap gap-2">{actions.map((a) => <Button key={a} size="sm" variant={a === "cancel" ? "ghost" : a === "start" || a === "complete" ? "default" : "outline"} className={a === "cancel" ? "text-destructive" : ""} onClick={() => setDlg(a)}>{ROADMAP_ACTIONS[a].label}</Button>)}</div>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RmBadge status={r.status} />
        {health && <RmBadge status={health.status} title={health.reason} />}
        {allDone && r.status === "ACTIVE" && <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Roadmap execution is complete.</span>}
        {r.status === "PAUSED" && r.pause_reason && <span className="text-xs text-muted-foreground">Paused: {r.pause_reason}</span>}
        {r.status === "CANCELLED" && r.cancel_reason && <span className="text-xs text-muted-foreground">Cancelled: {r.cancel_reason}</span>}
      </div>
      <Tabs defaultValue="Overview">
        <div className="overflow-x-auto border-b">
          <TabsList className="h-auto w-max justify-start rounded-none bg-transparent p-0">
            {TABS.map((t) => <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t}</TabsTrigger>)}
          </TabsList>
        </div>
        <TabsContent value="Overview" className="mt-6 space-y-4">
          <Panel className="p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
              {([
                ["Candidate", <Link key="c" to="/app/candidates/$id" params={{ id: r.candidate_id }} className="text-primary hover:underline">{r.candidate?.full_name}</Link>], ["Candidate ID", r.candidate?.candidate_code], ["Roadmap ID", r.code],
                ["Source PCB", <Link key="p" to="/app/pcb/$versionId" params={{ versionId: r.pcb_version_id }} className="text-primary hover:underline">{r.pcb_code}</Link>], ["PCB version", `V${r.pcb_version}`],
                ["Career path", r.career_path ?? "—"], ["Target role", r.target_role ?? "—"], ["Duration", `${r.duration_days} days · ${r.weekly_days} days/week`],
                ["Start date", formatDate(r.start_date)], ["Target end date", formatDate(r.target_end_date)], ["Status", statusLabel(r.status)], ["Assigned consultant", r.consultant || "—"],
              ] as const).map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>)}
            </dl>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="p-5">
              <div className="flex items-baseline justify-between"><h3 className="font-semibold">Progress</h3><span className="text-2xl font-semibold">{p.pct}%</span></div>
              <ProgressBar pct={p.pct} className="mt-3" />
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                {[["Total", p.total], ["Completed", p.completed], ["In progress", p.inProgress], ["Pending", p.pending]].map(([k, v]) => <div key={k}><p className="text-lg font-semibold">{v}</p><p className="text-xs text-muted-foreground">{k}</p></div>)}
              </div>
              {health && <p className="mt-4 text-xs text-muted-foreground"><b>{statusLabel(health.status)}:</b> {health.reason}</p>}
            </Panel>
            <Panel className="space-y-3 p-5 text-sm">
              <div><p className="text-xs text-muted-foreground">Current day</p><p className="font-medium">{cur ? `Day ${cur.day_number} — ${cur.title} (${formatDate(cur.planned_date)})` : "All done"}</p></div>
              <div><p className="text-xs text-muted-foreground">Next planned activity</p><p className="font-medium">{next ? `Day ${next.day_number} — ${next.title} (${formatDate(next.planned_date)})` : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Last completed</p><p className="font-medium">{last ? `Day ${last.day_number} — ${last.title} (${formatDate(last.completed_at, true)})` : "—"}</p></div>
            </Panel>
          </div>
          <Panel className="p-5 text-sm text-muted-foreground">Weekly Reviews — Coming in Phase 7</Panel>
          {r.projects.length > 0 && (
            <Panel className="p-5">
              <h3 className="mb-2 font-semibold">Planned projects <span className="text-xs font-normal text-muted-foreground">(reference — submissions come in Phase 7)</span></h3>
              <ul className="space-y-1 text-sm">{r.projects.map((x) => <li key={x.id}>{x.name} <span className="text-xs text-muted-foreground">{x.project_type} · Day {x.start_day ?? "?"}–{x.end_day ?? "?"}</span></li>)}</ul>
            </Panel>
          )}
        </TabsContent>

        <TabsContent value="Daily Roadmap" className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {[["", "All"], ["PENDING", "Pending"], ["IN_PROGRESS", "In progress"], ["COMPLETED", "Completed"], ["OVERDUE", "Overdue"]].map(([v, l]) => (
              <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v!)}>{l}</Button>
            ))}
          </div>
          <div className="space-y-6">
            {r.phases.map((ph) => {
              const mods = r.modules.filter((m) => m.phase_id === ph.id);
              const pp = phaseP.get(ph.id);
              if (!items.some((i) => i.phase_id === ph.id)) return null;
              return (
                <section key={ph.id}>
                  <div className="mb-2 flex items-center gap-3"><h3 className="font-semibold">{ph.phase_number ? `Phase ${ph.phase_number} — ` : ""}{ph.name}</h3><span className="text-xs text-muted-foreground">{pp?.pct ?? 0}%</span></div>
                  {mods.map((m) => {
                    const mi = items.filter((i) => i.module_id === m.id);
                    if (!mi.length) return null;
                    return (
                      <div key={m.id} className="mb-4 ml-1 border-l pl-4">
                        <p className="mb-2 text-sm font-medium text-muted-foreground">{m.name} · {moduleP.get(m.id)?.pct ?? 0}%</p>
                        <div className="space-y-2">
                          {mi.map((it) => (
                            <DayCard key={`${it.id}-${it.lock_version}`} item={it} today={r.today} mode="staff" canExecute={false} resources={resFor(it)} remarks={r.remarks.filter((x) => x.item_id === it.id)}
                              staffSlot={ro ? null : (
                                <div className="space-y-3 rounded-md bg-muted/40 p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Set status:</span>
                                    {(["PENDING", "IN_PROGRESS", "COMPLETED"] as const).filter((s) => s !== it.status && can(user, staffMovePermission(it.status, s))).map((s) => (
                                      <Button key={s} size="sm" variant="outline" onClick={() => {
                                        if (!confirm(`${it.status === "COMPLETED" ? "Reopen" : "Change"} Day ${it.day_number} to ${statusLabel(s)}?`)) return;
                                        setItemStatus({ data: { itemId: it.id, to: s, lock: it.lock_version } }).then(() => { toast.success("Status updated"); return refresh(); }).catch((e) => toast.error(e instanceof Error ? e.message : "Could not update"));
                                      }}>{statusLabel(s)}</Button>
                                    ))}
                                  </div>
                                  {can(user, "roadmap.edit") && <DateEditor value={it.planned_date} onSave={(d) => setItemPlannedDate({ data: { itemId: it.id, date: d, lock: it.lock_version } }).then(refresh)} />}
                                  {can(user, "roadmap.notes") && <RemarkForm canInternal={can(user, "roadmap.internal_notes")} onAdd={(body, internal) => addRemark({ data: { itemId: it.id, body, internal } }).then(refresh)} />}
                                </div>
                              )} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="Resources" className="mt-6">
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Resource", "Provider", "Type", "Used in"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {r.resources.map((x) => {
                  const days = r.items.filter((i) => resFor(i).some((y) => y.id === x.id)).map((i) => i.day_number);
                  return (
                    <tr key={x.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{x.url ? <a href={x.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{x.name}</a> : x.name}</td>
                      <td className="px-3 py-2">{x.provider ?? "—"}</td><td className="px-3 py-2">{x.resource_type}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{days.length ? `Day ${[...new Set(days)].join(", ")}` : "General"}</td>
                    </tr>
                  );
                })}
                {!r.resources.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No resources in this roadmap.</td></tr>}
              </tbody>
            </table>
          </Panel>
        </TabsContent>

        <TabsContent value="Progress" className="mt-6 space-y-4">
          <Panel className="grid gap-4 p-5 text-sm sm:grid-cols-4">
            {[["Overall", `${p.pct}%`], ["Completed", p.completed], ["In progress", p.inProgress], ["Pending", p.pending], ["Current day", cur ? `Day ${cur.day_number}` : "—"],
              ["Days remaining", p.total - p.completed], ["Planned end", formatDate(r.target_end_date)], ["Schedule", health ? statusLabel(health.status) : statusLabel(r.status)]].map(([k, v]) => (
              <div key={String(k)}><p className="text-xs text-muted-foreground">{k}</p><p className="text-lg font-semibold">{v}</p></div>
            ))}
          </Panel>
          <Panel className="space-y-3 p-5">
            <h3 className="font-semibold">Phase progress</h3>
            {r.phases.map((ph) => { const pp = phaseP.get(ph.id); return (
              <div key={ph.id} className="text-sm"><div className="mb-1 flex justify-between"><span>{ph.name}</span><span className="text-muted-foreground">{pp?.completed ?? 0}/{pp?.total ?? 0} · {pp?.pct ?? 0}%</span></div><ProgressBar pct={pp?.pct ?? 0} /></div>
            ); })}
          </Panel>
        </TabsContent>

        <TabsContent value="Activity" className="mt-6">
          <Panel className="divide-y">
            {r.activity.map((a) => {
              const m = a.metadata as { day?: number; from?: string; to?: string; reason?: string };
              return (
                <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  <div><p className="font-medium">{a.event}{m.day ? ` · Day ${m.day}` : ""}</p>{m.from && m.to && <p className="text-xs text-muted-foreground">{statusLabel(m.from)} → {statusLabel(m.to)}</p>}</div>
                  <p className="shrink-0 text-right text-xs text-muted-foreground">{a.actor_name}<br />{formatDate(a.created_at, true)}</p>
                </div>
              );
            })}
            {!r.activity.length && <p className="p-8 text-center text-sm text-muted-foreground">No activity yet.</p>}
          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dlg ? ROADMAP_ACTIONS[dlg].label : ""}?</DialogTitle>
            <DialogDescription>
              {dlg === "start" && "The candidate will be able to start and complete day items."}
              {dlg === "pause" && "The candidate cannot update items while paused. Remaining dates are not rescheduled."}
              {dlg === "resume" && "The candidate can continue executing day items."}
              {dlg === "cancel" && "The roadmap becomes read-only. No data is deleted."}
              {dlg === "complete" && "Marks the roadmap as completed. It becomes read-only."}
            </DialogDescription>
          </DialogHeader>
          {dlg && ROADMAP_ACTIONS[dlg].reason && <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Close</Button>
            <Button disabled={busy || (!!dlg && ROADMAP_ACTIONS[dlg].reason && reason.trim().length < 3)} onClick={go}>{busy ? "Working…" : dlg ? ROADMAP_ACTIONS[dlg].label : ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <JourneyOffer offer={offer} onClose={() => setOffer(null)} />
    </>
  );
}
