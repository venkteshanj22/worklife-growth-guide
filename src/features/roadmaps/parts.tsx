import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Circle, ExternalLink, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/components/app/shared";
import { cn } from "@/lib/utils";
import { isOverdue, statusLabel } from "@/lib/roadmaps/model";
import { ROADMAP_KEYS } from "./queries";
import { DATE_ORDER_WARNING } from "@/lib/execution/model";

const TONE: Record<string, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground", PENDING: "bg-muted text-muted-foreground",
  ACTIVE: "bg-accent text-accent-foreground", IN_PROGRESS: "bg-accent text-accent-foreground",
  PAUSED: "bg-danger-soft text-destructive", CANCELLED: "bg-muted text-muted-foreground line-through decoration-1",
  COMPLETED: "bg-success-soft text-success", ON_TRACK: "bg-success-soft text-success", ATTENTION: "bg-accent text-accent-foreground", BEHIND: "bg-danger-soft text-destructive",
};
export function RmBadge({ status, title }: { status: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONE[status] ?? TONE["PENDING"])}>
      <span className="size-1.5 rounded-full bg-current" />{statusLabel(status)}
    </span>
  );
}
export function OverdueBadge() {
  return <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-destructive">Overdue</span>;
}
export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
export const minutes = (a?: number | null, b?: number | null) => {
  const t = (a ?? 0) + (b ?? 0);
  if (!t) return "—";
  return t >= 60 ? `${Math.floor(t / 60)}h${t % 60 ? ` ${t % 60}m` : ""}` : `${t}m`;
};
export function useRefreshRoadmaps() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => ROADMAP_KEYS.includes(String(q.queryKey[0])) });
}

export interface DayItem {
  id: string; day_number: number; title: string; topic: string | null; description: string | null; objective: string | null; activity: string | null; expected_output: string | null;
  learning_minutes: number | null; practice_minutes: number | null; planned_date: string | null; status: string; started_at: string | null; completed_at: string | null;
  candidate_notes: string | null; lock_version: number; phase_id: string; module_id: string;
}
export interface Res { id: string; name: string; provider: string | null; resource_type: string; url: string | null }
export interface Remark { id: string; item_id: string; body: string; author_name: string | null; created_at: string; is_internal?: boolean }

/** Expandable day item used by both staff and candidate screens. */
export function DayCard({ item, today, resources, remarks, canExecute, mode, onStatus, onNotes, staffSlot, defaultOpen }: {
  item: DayItem; today: string; resources: Res[]; remarks: Remark[]; canExecute: boolean; mode: "staff" | "candidate";
  onStatus?: (to: "IN_PROGRESS" | "COMPLETED") => Promise<unknown>; onNotes?: (notes: string) => Promise<unknown>; staffSlot?: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [notes, setNotes] = useState(item.candidate_notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const over = isOverdue(item, today);
  const act = async (fn: () => Promise<unknown>, ok: string, key: string) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update"); } finally { setBusy(null); }
  };
  const Icon = item.status === "COMPLETED" ? CheckCircle2 : item.status === "IN_PROGRESS" ? PlayCircle : Circle;
  return (
    <div className={cn("rounded-lg border bg-card", over && "border-destructive/40")}>
      <button type="button" className="flex w-full items-start gap-3 p-3 text-left sm:items-center" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon className={cn("mt-0.5 size-5 shrink-0 sm:mt-0", item.status === "COMPLETED" ? "text-success" : item.status === "IN_PROGRESS" ? "text-primary" : "text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-medium text-muted-foreground">Day {item.day_number}</span>
            <span className="text-xs text-muted-foreground">· {formatDate(item.planned_date)}</span>
            {over && <OverdueBadge />}
          </div>
          <p className="mt-0.5 font-medium leading-snug">{item.title}</p>
          {item.topic && <p className="text-sm text-muted-foreground">{item.topic}</p>}
        </div>
        <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
          <span>{minutes(item.learning_minutes, item.practice_minutes)}</span>
          {resources.length > 0 && <span>{resources.length} resource{resources.length > 1 ? "s" : ""}</span>}
          <RmBadge status={item.status} />
        </div>
        <ChevronDown className={cn("mt-0.5 size-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-4 border-t p-4 text-sm">
          <div className="flex flex-wrap gap-2 sm:hidden"><RmBadge status={item.status} /><span className="text-xs text-muted-foreground">Estimated {minutes(item.learning_minutes, item.practice_minutes)}</span></div>
          {([["Description", item.description], ["Objective", item.objective], ["Activity", item.activity], ["Expected output", item.expected_output]] as const).filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><p className="text-xs font-medium text-muted-foreground">{k}</p><p className="mt-0.5 whitespace-pre-wrap">{v}</p></div>
          ))}
          {resources.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Resources</p>
              <ul className="mt-1 space-y-1">
                {resources.map((r) => (
                  <li key={r.id}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{r.name}<ExternalLink className="size-3" /></a> : r.name}
                    <span className="ml-1 text-xs text-muted-foreground">{[r.provider, r.resource_type].filter(Boolean).join(" · ")}</span></li>
                ))}
              </ul>
            </div>
          )}
          {(item.started_at || item.completed_at) && <p className="text-xs text-muted-foreground">{item.started_at && `Started ${formatDate(item.started_at, true)}`}{item.completed_at && ` · Completed ${formatDate(item.completed_at, true)}`}</p>}
          <div>
            <p className="text-xs font-medium text-muted-foreground">{mode === "candidate" ? "My notes" : "Candidate notes"}</p>
            {mode === "candidate" && canExecute ? (
              <div className="mt-1 space-y-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What did you do? Anything you need help with?" aria-label="My notes" />
                {notes !== (item.candidate_notes ?? "") && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(() => onNotes!(notes), "Notes saved", "notes")}>{busy === "notes" ? "Saving…" : "Save notes"}</Button>}
              </div>
            ) : <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{item.candidate_notes || "—"}</p>}
          </div>
          {remarks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Consultant remarks</p>
              <ul className="mt-1 space-y-2">
                {remarks.map((r) => (
                  <li key={r.id} className={cn("rounded-md border p-2", r.is_internal && "border-dashed bg-muted/40")}>
                    <p className="whitespace-pre-wrap">{r.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.author_name} · {formatDate(r.created_at, true)}{r.is_internal && " · Internal"}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mode === "candidate" && canExecute && item.status !== "COMPLETED" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {item.status === "PENDING" && <Button size="lg" variant="outline" className="w-full sm:w-auto" disabled={!!busy} onClick={() => act(() => onStatus!("IN_PROGRESS"), "Marked as started", "start")}>{busy === "start" ? "Starting…" : "Start"}</Button>}
              <Button size="lg" className="w-full sm:w-auto" disabled={!!busy} onClick={() => confirm(`Mark Day ${item.day_number} as complete?`) && act(() => onStatus!("COMPLETED"), "Marked complete", "complete")}>{busy === "complete" ? "Saving…" : "Mark Complete"}</Button>
            </div>
          )}
          {staffSlot}
        </div>
      )}
    </div>
  );
}

export function RemarkForm({ canInternal, onAdd }: { canInternal: boolean; onAdd: (body: string, internal: boolean) => Promise<unknown> }) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Add a remark" aria-label="Remark" />
      <div className="flex items-center gap-3">
        {canInternal && <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal (hidden from candidate)</label>}
        <Button size="sm" disabled={busy || !body.trim()} onClick={async () => {
          setBusy(true);
          try { await onAdd(body.trim(), internal); setBody(""); toast.success("Remark added"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add remark"); } finally { setBusy(false); }
        }}>Add remark</Button>
      </div>
    </div>
  );
}

export function DateEditor({ value, onSave, outOfOrder }: { value: string | null; onSave: (d: string) => Promise<unknown>; outOfOrder?: (d: string) => boolean }) {
  const [v, setV] = useState(value ?? "");
  const warn = !!v && v !== value && !!outOfOrder?.(v);
  const save = () => {
    if (warn && !confirm(`${DATE_ORDER_WARNING}\n\nDay numbers will not change. Save this date anyway?`)) return;
    onSave(v).then(() => toast.success("Date updated")).catch((e) => toast.error(e instanceof Error ? e.message : "Could not update"));
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input type="date" value={v} onChange={(e) => setV(e.target.value)} className="h-8 w-40" aria-label="Planned date" />
        {v && v !== value && <Button size="sm" variant="outline" onClick={save}>Save date</Button>}
      </div>
      {warn && <p className="text-xs text-destructive" role="alert">{DATE_ORDER_WARNING}</p>}
    </div>
  );
}

/** Index resources by phase/module/item for quick lookup (no per-item queries). */
export function resourceIndex(resources: Res[], mappings: { resource_id: string; phase_id: string | null; module_id: string | null; item_id: string | null }[]) {
  const byId = new Map(resources.map((r) => [r.id, r]));
  return (item: Pick<DayItem, "id" | "module_id" | "phase_id">) => {
    const ids = new Set(mappings.filter((m) => m.item_id === item.id || (!m.item_id && m.module_id === item.module_id) || (!m.item_id && !m.module_id && m.phase_id === item.phase_id)).map((m) => m.resource_id));
    return [...ids].map((i) => byId.get(i)).filter((x): x is Res => !!x);
  };
}
