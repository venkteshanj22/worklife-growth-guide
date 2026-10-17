import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { TRACK_STATUSES, statusLabel } from "@/lib/tracks/model";
import { saveGlobalContent, type GlobalContentRow } from "@/lib/tracks/tracks.functions";
import { globalContentQuery } from "./queries";
import { RowDialog, type Row } from "./RowDialog";
import { TrackStatusBadge } from "./TrackStatusBadge";

const STATUS_OPTS = Object.fromEntries(TRACK_STATUSES.map((s) => [s, statusLabel(s)]));

export function GlobalContentPage() {
  const { data } = useSuspenseQuery(globalContentQuery);
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const editable = can(user, "global_pcb_content.edit");
  const [edit, setEdit] = useState<Row | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHeader crumbs={["CareerOS", "PCB Studio", "Global PCB Content"]} title="Global PCB Content"
        description="Reusable content shared by all future PCBs. Every save keeps a version."
        actions={editable ? <Button onClick={() => setEdit({ content_type: "GENERAL", status: "DRAFT" })}><Plus className="size-4" /> New content</Button> : undefined} />
      <Panel className="divide-y">
        {data.map((c: GlobalContentRow) => (
          <div key={c.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
              <span className="flex-1 font-medium">{c.title}</span>
              <TrackStatusBadge status={c.status} />
              <span className="text-xs text-muted-foreground">v{c.version} · {formatDate(c.updated_at)}</span>
              <Button size="sm" variant="ghost" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide" : "View"}</Button>
              {editable && <Button size="sm" variant="outline" onClick={() => setEdit(c as unknown as Row)}>Edit</Button>}
            </div>
            {open === c.id && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="whitespace-pre-line rounded-md bg-muted/40 p-3">{c.content || <span className="text-muted-foreground">No content written yet.</span>}</p>
                <p className="text-xs text-muted-foreground">History: {[...c.global_pcb_content_versions].sort((a, b) => b.version - a.version).map((h) => `v${h.version} (${formatDate(h.created_at)})`).join(", ")}</p>
              </div>
            )}
          </div>
        ))}
      </Panel>
      <RowDialog open={!!edit} title={edit?.id ? "Edit content" : "New content"} initial={edit ?? {}} onClose={() => setEdit(null)}
        fields={[
          { key: "code", label: "Content code", required: true }, { key: "title", label: "Title", required: true },
          { key: "content_type", label: "Content type", required: true }, { key: "status", label: "Status", type: "select", options: STATUS_OPTS, required: true },
          { key: "content", label: "Content", type: "textarea" },
        ]}
        onSave={async (r) => {
          try {
            await saveGlobalContent({ data: { id: (edit?.id as string) ?? null, code: String(r.code), title: String(r.title), content_type: String(r.content_type), content: (r.content as string) ?? null, status: r.status as "DRAFT" } });
            toast.success("Content saved");
            await qc.invalidateQueries({ queryKey: ["global-pcb-content"] });
          } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); throw e; }
        }} />
    </>
  );
}
