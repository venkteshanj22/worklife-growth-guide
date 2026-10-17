import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { importIntoPcb, pcbTrackContent, pcbTrackOptions, type TrackContent } from "@/lib/pcb/pcb.functions";
import { usePcbOps } from "./queries";

export type Sel = { phases: string[]; modules: string[]; items: string[]; resources: string[]; milestones: string[]; projects: string[]; weekly: string[]; blocks: string[]; outcomes: string[] };
export const emptySel = (): Sel => ({ phases: [], modules: [], items: [], resources: [], milestones: [], projects: [], weekly: [], blocks: [], outcomes: [] });
export const selCount = (s: Sel) => Object.values(s).reduce((n, l) => n + l.length, 0);

/** Browse a Master Track version and tick items to copy. */
export function TrackPicker({ content, sel, setSel }: { content: TrackContent; sel: Sel; setSel: (s: Sel) => void }) {
  const toggle = (k: keyof Sel, id: string) => setSel({ ...sel, [k]: sel[k].includes(id) ? sel[k].filter((x) => x !== id) : [...sel[k], id] });
  const Box = ({ k, id, label, sub, indent = 0 }: { k: keyof Sel; id: string; label: string; sub?: string | undefined; indent?: number }) => (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-sm" style={{ paddingLeft: indent * 18 }}>
      <Checkbox checked={sel[k].includes(id)} onCheckedChange={() => toggle(k, id)} className="mt-0.5" />
      <span>{label}{sub && <span className="ml-1.5 text-xs text-muted-foreground">{sub}</span>}</span>
    </label>
  );
  const group = (title: string, k: keyof Sel, rows: { id: string; label: string; sub?: string | undefined }[]) =>
    rows.length ? (
      <div>
        <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {rows.map((r) => <Box key={r.id} k={k} id={r.id} label={r.label} sub={r.sub} />)}
      </div>
    ) : null;
  return (
    <div className="max-h-[50vh] overflow-y-auto rounded-md border p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Curriculum</p>
      {!content.phases.length && <p className="text-xs text-muted-foreground">No curriculum in this version.</p>}
      {content.phases.map((p) => (
        <div key={p.id}>
          <Box k="phases" id={p.id} label={p.name} sub="whole phase" />
          {content.modules.filter((m) => m.phase_id === p.id).map((m) => (
            <div key={m.id}>
              <Box k="modules" id={m.id} label={m.name} sub="module" indent={1} />
              {content.items.filter((i) => i.module_id === m.id).map((i) => <Box key={i.id} k="items" id={i.id} label={i.title} sub={i.day_number ? `Day ${i.day_number}` : undefined} indent={2} />)}
            </div>
          ))}
        </div>
      ))}
      {group("Resources", "resources", content.resources.map((r) => ({ id: r.id, label: r.name, sub: r.provider ?? undefined })))}
      {group("Milestones", "milestones", content.milestones.map((r) => ({ id: r.id, label: r.name, sub: r.target_day ? `Day ${r.target_day}` : undefined })))}
      {group("Project templates", "projects", content.projects.map((r) => ({ id: r.id, label: r.name })))}
      {group("Weekly review templates", "weekly", content.weekly.map((r) => ({ id: r.id, label: r.title, sub: r.week_number ? `Week ${r.week_number}` : undefined })))}
      {group("Track outcomes (as capabilities)", "outcomes", content.outcomes.map((r) => ({ id: r.id, label: r.title })))}
      {group("PCB content blocks", "blocks", content.blocks.map((r) => ({ id: r.id, label: r.title })))}
    </div>
  );
}

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ops = usePcbOps();
  const [tv, setTv] = useState("");
  const [sel, setSel] = useState<Sel>(emptySel());
  const tracks = useQuery({ queryKey: ["pcb-track-options"], queryFn: () => pcbTrackOptions(), enabled: open });
  const content = useQuery({ queryKey: ["pcb-track-content", tv], queryFn: () => pcbTrackContent({ data: { trackVersionId: tv } }), enabled: open && !!tv });
  const n = selCount(sel);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add from Master Track</DialogTitle>
          <DialogDescription>Selected items are copied into this PCB. The Master Track itself is never changed.</DialogDescription>
        </DialogHeader>
        <select aria-label="Master Track version" value={tv} onChange={(e) => { setTv(e.target.value); setSel(emptySel()); }} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
          <option value="">Choose a track and version…</option>
          {(tracks.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name} v{t.version} ({t.status.toLowerCase()})</option>)}
        </select>
        {content.isLoading && <p className="text-sm text-muted-foreground">Loading track content…</p>}
        {content.data && <TrackPicker content={content.data} sel={sel} setSel={setSel} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!n || ops.state === "saving"} onClick={() =>
            ops.run((lock) => importIntoPcb({ data: { versionId: ops.versionId, lock, trackVersionId: tv, selection: sel } }), "Track content added")
              .then(() => { setSel(emptySel()); onClose(); }).catch(() => {})
          }>{ops.state === "saving" ? "Copying…" : `Copy ${n || ""} item${n === 1 ? "" : "s"}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
