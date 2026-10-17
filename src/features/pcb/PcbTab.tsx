import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Compass, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { pcbDisplayId } from "@/lib/pcb/model";
import { pcbPdfUrl } from "@/lib/pcb/pcb.functions";
import { candidatePcbQuery } from "./queries";
import { PcbStatusBadge } from "./parts";

export function PcbTab({ candidateId }: { candidateId: string }) {
  const { user } = useCurrentUser();
  const q = useQuery({ ...candidatePcbQuery(candidateId), enabled: can(user, "pcb.view") });
  if (!can(user, "pcb.view")) return <p className="py-12 text-center text-sm text-muted-foreground">You do not have access to PCBs.</p>;
  if (q.isLoading) return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;
  if (q.error) return <p className="py-12 text-center text-sm text-destructive">Could not load PCB.</p>;
  const p = q.data;
  if (!p || !p.versions.length)
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <Compass className="mb-3 size-7 text-muted-foreground" />
        <p className="font-medium">No Personal Career Blueprint yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Create one after the career assessment is finalized.</p>
        {can(user, "pcb.create") && <Button className="mt-4" asChild><Link to="/app/pcb/new" search={{ candidate: candidateId }}><Plus className="size-4" /> Create PCB</Link></Button>}
      </div>
    );
  const cur = p.versions.find((v) => v.id === p.current_approved_version_id) ?? p.versions[0]!;
  const pdf = async (id: string) => { try { const { url } = await pcbPdfUrl({ data: { versionId: id } }); window.open(url, "_blank"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not open PDF"); } };
  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{cur.id === p.current_approved_version_id ? "Current PCB" : "Latest PCB"}</h2>
          <span className="font-mono text-xs text-muted-foreground">{pcbDisplayId(p.pcb_code, cur.version)}</span>
          <PcbStatusBadge status={cur.status} />
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-4">
          {[["Career path", cur.primary_career_path], ["Target role", cur.primary_target_role], ["Duration", `${cur.target_duration_days} days`], ["Base track", `${cur.base_track_code} v${cur.base_track_version}`], ["Created", formatDate(cur.created_at)], ["Approved", formatDate(cur.approved_at)]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v || "—"}</dd></div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" asChild><Link to="/app/pcb/$versionId" params={{ versionId: cur.id }}>{["DRAFT", "CHANGES_REQUESTED"].includes(cur.status) && can(user, "pcb.edit") ? "Edit PCB" : "View PCB"}</Link></Button>
          {cur.has_pdf && can(user, "pcb.pdf") && <Button size="sm" variant="outline" onClick={() => pdf(cur.id)}>View PDF</Button>}
          {!p.versions.some((v) => v.status !== "APPROVED" && v.status !== "SUPERSEDED" && v.status !== "CANCELLED") && p.versions.every((v) => v.status === "CANCELLED") && can(user, "pcb.create") && (
            <Button size="sm" variant="outline" asChild><Link to="/app/pcb/new" search={{ candidate: candidateId }}>Create PCB</Link></Button>
          )}
        </div>
      </Panel>
      <div>
        <h3 className="mb-2 text-sm font-semibold">PCB History</h3>
        <ul className="divide-y rounded-md border">
          {p.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <Link to="/app/pcb/$versionId" params={{ versionId: v.id }} className="font-medium text-primary hover:underline">V{v.version}</Link>
              <PcbStatusBadge status={v.status} />
              <span className="text-xs text-muted-foreground">{v.change_reason ?? "Initial Career Blueprint"}</span>
              <span className="ml-auto text-xs text-muted-foreground">{formatDate(v.approved_at ?? v.created_at)}</span>
              {v.has_pdf && can(user, "pcb.pdf") && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => pdf(v.id)}>PDF</Button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
