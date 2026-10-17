import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronRight, Copy, EyeOff, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteTrackRow, duplicateTrackRow, reorderTrackRows, upsertTrackRow, type RowTable } from "@/lib/tracks/tracks.functions";
import { RowDialog, type FieldDef, type Row } from "./RowDialog";

export function useRowOps(versionId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "track" || q.queryKey[0] === "tracks" });
  const run = async (p: Promise<unknown>, ok?: string) => {
    try { await p; if (ok) toast.success(ok); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); throw e; }
  };
  return {
    save: (table: RowTable, row: Row) => run(upsertTrackRow({ data: { table, versionId, row } }), "Saved"),
    remove: (table: RowTable, id: string) => run(deleteTrackRow({ data: { table, versionId, id } }), "Removed"),
    duplicate: (table: RowTable, id: string) => run(duplicateTrackRow({ data: { table, versionId, id } }), "Duplicated"),
    reorder: (table: RowTable, ids: string[]) => run(reorderTrackRows({ data: { table, versionId, ids } })),
  };
}

type Item = Row & { id: string; is_active: boolean };

export function SectionList<T extends Item>({
  table, title, noun, rows, fields, versionId, editable, summary, defaults, nested, collapsible, depth = 0, emptyText,
}: {
  table: RowTable; title?: string; noun: string; rows: T[]; fields: FieldDef[]; versionId: string; editable: boolean;
  summary: (r: T) => ReactNode; defaults?: Row; nested?: (r: T) => ReactNode; collapsible?: boolean; depth?: number; emptyText?: string;
}) {
  const ops = useRowOps(versionId);
  const [edit, setEdit] = useState<Row | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
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
        <div className="mb-2 flex items-center justify-between gap-2">
          {title ? <h3 className={cn("font-semibold", depth ? "text-xs uppercase tracking-wider text-muted-foreground" : "text-sm")}>{title}</h3> : <span />}
          {editable && <Button size="sm" variant="outline" onClick={() => setEdit({ ...defaults })}><Plus className="size-3.5" /> Add {noun}</Button>}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">{emptyText ?? `No ${noun}s yet.`}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const isOpen = open[r.id] ?? depth > 0;
            return (
              <li key={r.id} className={cn("rounded-md border bg-card", !r.is_active && "opacity-60")}>
                <div className="flex items-start gap-2 px-3 py-2">
                  {collapsible && nested ? (
                    <button type="button" aria-label={isOpen ? "Collapse" : "Expand"} className="mt-0.5 rounded p-0.5 hover:bg-muted" onClick={() => setOpen((o) => ({ ...o, [r.id]: !isOpen }))}>
                      <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1 text-sm">{summary(r)}{!r.is_active && <span className="ml-2 text-[11px] text-muted-foreground">(inactive)</span>}</div>
                  {editable && (
                    <div className="flex shrink-0 items-center">
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label={`Edit ${noun}`} onClick={() => setEdit(r)}><Pencil className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label={`Duplicate ${noun}`} onClick={() => ops.duplicate(table, r.id).catch(() => {})}><Copy className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" aria-label={r.is_active ? `Deactivate ${noun}` : `Activate ${noun}`} onClick={() => ops.save(table, { id: r.id, is_active: !r.is_active }).catch(() => {})}>{r.is_active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label={`Delete ${noun}`} onClick={() => confirm(`Delete this ${noun}${nested ? " and everything inside it" : ""}? This only affects the draft.`) && ops.remove(table, r.id).catch(() => {})}><Trash2 className="size-3.5" /></Button>
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
