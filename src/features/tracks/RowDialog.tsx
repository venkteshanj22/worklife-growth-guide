import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "checkbox";
  options?: Record<string, string>;
  required?: boolean;
  wide?: boolean;
};
export type Row = Record<string, unknown>;

export function FieldInput({ f, value, onChange, disabled }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  const id = `f-${f.key}`;
  const v = value == null ? "" : String(value);
  let control;
  if (f.type === "textarea") control = <Textarea id={id} rows={3} value={v} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  else if (f.type === "select")
    control = (
      <select id={id} disabled={disabled} value={v} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
        {!f.required && <option value="">—</option>}
        {Object.entries(f.options ?? {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    );
  else if (f.type === "checkbox") control = <div className="pt-1"><Switch id={id} checked={value === true} disabled={disabled} onCheckedChange={(c) => onChange(c)} /></div>;
  else control = <Input id={id} type={f.type === "number" ? "number" : "text"} value={v} disabled={disabled} onChange={(e) => onChange(f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />;
  return (
    <div className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">{f.label}{f.required && " *"}</Label>
      {control}
    </div>
  );
}

export function RowDialog({ open, title, fields, initial, onClose, onSave }: {
  open: boolean; title: string; fields: FieldDef[]; initial: Row; onClose: () => void; onSave: (row: Row) => Promise<unknown>;
}) {
  const [row, setRow] = useState<Row>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setRow(initial); }, [open, initial]);
  const missing = fields.some((f) => f.required && (row[f.key] == null || String(row[f.key]).trim() === ""));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try { await onSave(row); onClose(); } catch { /* toast handled by caller */ } finally { setBusy(false); }
          }}
        >
          {fields.map((f) => <FieldInput key={f.key} f={f} value={row[f.key]} onChange={(v) => setRow((r) => ({ ...r, [f.key]: v }))} />)}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || missing}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
