import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { candidateRoadmapsQuery } from "./queries";
import { ProgressBar, RmBadge } from "./parts";

export function RoadmapTab({ candidateId }: { candidateId: string }) {
  const { user } = useCurrentUser();
  const allowed = can(user, "roadmap.view");
  const q = useQuery({ ...candidateRoadmapsQuery(candidateId), enabled: allowed });
  if (!allowed) return <p className="py-12 text-center text-sm text-muted-foreground">You do not have access to roadmaps.</p>;
  if (q.isLoading) return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;
  if (q.error || !q.data) return <p className="py-12 text-center text-sm text-destructive">Could not load roadmap.</p>;
  const { roadmaps, approvedVersionId } = q.data;
  const hasOpen = roadmaps.some((r) => ["NOT_STARTED", "ACTIVE", "PAUSED"].includes(r.status));
  const create = can(user, "roadmap.create") && approvedVersionId && !hasOpen
    ? <Button asChild><Link to="/app/roadmaps/new" search={{ candidate: candidateId }}><Plus className="size-4" /> Create Roadmap</Link></Button> : null;
  if (!roadmaps.length)
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <RouteIcon className="mb-3 size-7 text-muted-foreground" />
        <p className="font-medium">No roadmap yet</p>
        <p className="mt-1 text-sm text-muted-foreground">{approvedVersionId ? "Create a roadmap from the approved PCB to start execution." : "A roadmap can be created once the PCB is approved."}</p>
        {create && <div className="mt-4">{create}</div>}
      </div>
    );
  return (
    <div className="space-y-4">
      {create && <div className="flex justify-end">{create}</div>}
      {roadmaps.map((r) => (
        <Panel key={r.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/app/roadmaps/$id" params={{ id: r.id }} className="font-semibold text-primary hover:underline">{r.code}</Link>
            <RmBadge status={r.status} />{r.health && <RmBadge status={r.health.status} title={r.health.reason} />}
            <span className="text-xs text-muted-foreground">from {r.pcb_code} V{r.pcb_version}</span>
          </div>
          <div className="mt-3 flex items-center gap-3"><ProgressBar pct={r.progress.pct} className="max-w-xs" /><span className="text-sm">{r.progress.pct}% · {r.progress.completed}/{r.progress.total} days</span></div>
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(r.start_date)} → {formatDate(r.target_end_date)}</p>
        </Panel>
      ))}
    </div>
  );
}
