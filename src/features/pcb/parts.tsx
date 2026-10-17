import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pcbStatusLabel, sourceLabel } from "@/lib/pcb/model";
import type { ContentTable } from "@/lib/pcb/pcb.server";
import { RowDialog, type FieldDef, type Row } from "@/features/tracks/RowDialog";
import { usePcbOps } from "./queries";

const STATUS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  IN_REVIEW: "bg-accent text-accent-foreground",
  CHANGES_REQUESTED: "bg-danger-soft text-destructive",
  APPROVED: "bg-success-soft text-success",
  SUPERSEDED: "bg-muted text-muted-foreground line-through decoration-1",
  CANCELLED: "bg-muted text-muted-foreground",
};
export function PcbStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", STATUS[status] ?? STATUS["DRAFT"])}>
      <span className="size-1.5 rounded-full bg-current" />
      {pcbStatusLabel(status)}
    </span>
  );
}
export function SourceBadge({ row }: { row: { source_type?: string | null; source_track_code?: string | null } }) {
  if (!row.source_type) return null;
  return <span className="ml-2 inline-block rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{sourceLabel(row)}</span>;
}

type Item = Row & { id: string; source_type?: string | null; source_track_code?: string | null };

/** Generic list for PCB-owned rows: edit, duplicate, remove, reorder, add custom. */
export function PcbList<T extends Item>({
  table, title, noun, rows, fields, editable, summary, defaults, nested, collapsible, depth = 0, emptyText, extraActions, noDuplicate,
}: {
  table: ContentTable; title?: string; noun: string; rows: T[]; fields: FieldDef[]; editable: boolean; summary: (r: T) => ReactNode;
  defaults?: Row; nested?: (r: T) => ReactNode; collapsible?: boolean; depth?: number; emptyText?: string; extraActions?: ReactNode; noDuplicate?: boolean;
}) {
  const ops = usePcbOps();
  const [edit, setEdit] = useState<Row | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const busy = ops.state === "saving";
  const move = (i: number, dir: -1 | 1) => {
    const ids = rows.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    ops.reorder(table, ids).catch(() => {});
  };
  return (
    <div className={cn(depth > 0 && "ml-5 border-l pl-4")}>
      {(title || editable) && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {title ? <h3 className={cn("font-semibold", depth ? "text-xs uppercase tracking-wider text-muted-foreground" : "text-sm")}>{title}</h3> : <span />}
          <div className="flex gap-2">
            {extraActions}
            {editable && <Button size="sm" variant="outline" disabled={busy} onClick={() => setEdit({ ...defaults })}><Plus className="size-3.5" /> Add {noun}</Button>}
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">{emptyText ?? `No ${noun}s yet.`}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const isOpen = open[r.id] ?? depth > 0;
            return (
              <li key={r.id} className="rounded-md border bg-card">
                <div className="flex items-start gap-2 px-3 py-2">
                  {collapsible && nested ? (
                    <button type="button" aria-label={isOpen ? "Collapse" : "Expand"} className="mt-0.5 rounded p-0.5 hover:bg-muted" onClick={() => setOpen((o) => ({ ...o, [r.id]: !isOpen }))}>
                      <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1 text-sm">{summary(r)}<SourceBadge row={r} /></div>
                  {editable && (
                    <div className="flex shrink-0 items-center">
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Move down" disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label={`Edit ${noun}`} onClick={() => setEdit(r)}><Pencil className="size-3.5" /></Button>
                      {!noDuplicate && <Button size="icon" variant="ghost" className="size-7" aria-label={`Duplicate ${noun}`} disabled={busy} onClick={() => ops.duplicate(table, r.id).catch(() => {})}><Copy className="size-3.5" /></Button>}
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label={`Remove ${noun}`} disabled={busy} onClick={() => confirm(`Remove this ${noun}${nested ? " and everything inside it" : ""} from the PCB? The Master Track is not affected.`) && ops.remove(table, r.id).catch(() => {})}><Trash2 className="size-3.5" /></Button>
                    </div>
                  )}
                </div>
                {nested && (!collapsible || isOpen) && <div className="px-3 pb-3">{nested(r)}</div>}
              </li>
            );
          })}
        </ul>
      )}
      <RowDialog open={!!edit} title={edit?.id ? `Edit ${noun}` : `Add ${noun}`} fields={fields} initial={edit ?? {}} onClose={() => setEdit(null)}
        onSave={(row) => ops.save(table, { ...defaults, ...Object.fromEntries(fields.map((f) => [f.key, row[f.key] ?? null])), ...(edit?.id ? { id: edit.id } : {}) })} />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm">{children || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
