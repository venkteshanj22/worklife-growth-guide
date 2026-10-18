import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { label } from "@/lib/execution/model";

const TONE: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground", NOT_STARTED: "bg-muted text-muted-foreground", ASSIGNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-accent text-accent-foreground", SUBMITTED: "bg-accent text-accent-foreground", RESUBMITTED: "bg-accent text-accent-foreground",
  CHANGES_REQUESTED: "bg-danger-soft text-destructive", MISSED: "bg-danger-soft text-destructive", BEHIND: "bg-danger-soft text-destructive",
  COMPLETED: "bg-success-soft text-success", ON_TRACK: "bg-success-soft text-success", ATTENTION: "bg-accent text-accent-foreground",
  CANCELLED: "bg-muted text-muted-foreground line-through decoration-1",
};
export function ExBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONE[status] ?? TONE.SCHEDULED)}>
      <span className="size-1.5 rounded-full bg-current" />{label(status)}
    </span>
  );
}
export function Overdue() {
  return <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-destructive">Overdue</span>;
}
export function Field({ label: l, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{l}</Label>{children}</div>;
}
export function Info({ label: l, value }: { label: string; value: ReactNode }) {
  return <div><p className="text-xs font-medium text-muted-foreground">{l}</p><div className="mt-0.5 whitespace-pre-wrap text-sm">{value || "—"}</div></div>;
}
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/** Runs one async action at a time; buttons read `busy` to show a pending state and block repeats. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    if (busy) return false;
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); return true; } catch (e) { toast.error(errMsg(e)); return false; } finally { setBusy(null); }
  };
  return { busy, run };
}

export function ReasonDialog({ open, title, onClose, onConfirm, required = true, cta = "Confirm" }: { open: boolean; title: string; onClose: () => void; onConfirm: (reason: string) => Promise<boolean>; required?: boolean; cta?: string }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Field label={required ? "Reason (required)" : "Reason"}><Textarea value={v} onChange={(e) => setV(e.target.value)} rows={3} /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button disabled={busy || (required && !v.trim())} onClick={async () => { setBusy(true); const ok = await onConfirm(v.trim()); setBusy(false); if (ok) { setV(""); onClose(); } }}>{busy ? "Saving…" : cta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HistoryList({ items }: { items: { id: string; event: string; from_status: string | null; to_status: string | null; reason: string | null; actor_name: string | null; created_at: string }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ol className="ml-2 border-l">
      {items.map((h) => (
        <li key={h.id} className="relative ml-5 pb-5">
          <span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-primary" />
          <p className="text-sm font-medium">{h.event}{h.from_status && h.to_status && <span className="font-normal text-muted-foreground"> · {label(h.from_status)} → {label(h.to_status)}</span>}</p>
          {h.reason && <p className="text-sm text-muted-foreground">Reason: {h.reason}</p>}
          <p className="text-xs text-muted-foreground">{h.actor_name} · {new Date(h.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
        </li>
      ))}
    </ol>
  );
}
