import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader, Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { CATEGORIES, TRACK_STATUSES, statusLabel } from "@/lib/tracks/model";
import { setTrackVersionStatus } from "@/lib/tracks/tracks.functions";
import { tracksQuery } from "./queries";
import { TrackStatusBadge } from "./TrackStatusBadge";
import { useTrackDialogs } from "./TrackDialogs";

const sel = "h-9 rounded-md border bg-background px-2 text-sm";

export function TrackList() {
  const { data } = useSuspenseQuery(tracksQuery);
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const d = useTrackDialogs();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [dur, setDur] = useState("");
  const [ver, setVer] = useState("");
  const durations = [...new Set(data.map((t) => t.duration_days))].sort((a, b) => a - b);
  const versions = [...new Set(data.map((t) => t.version))].sort();

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((t) =>
      (!s || [t.code, t.name, t.primary_role, t.alt_roles].some((x) => x?.toLowerCase().includes(s))) &&
      (!cat || t.category === cat) && (!status || t.status === status) &&
      (!dur || String(t.duration_days) === dur) && (!ver || t.version === ver));
  }, [data, q, cat, status, dur, ver]);

  const archive = async (versionId: string) => {
    try {
      await setTrackVersionStatus({ data: { versionId, status: "ARCHIVED" } });
      toast.success("Track version archived");
      qc.invalidateQueries({ queryKey: ["tracks"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not archive"); }
  };

  return (
    <>
      <PageHeader crumbs={["CareerOS", "PCB Studio", "Master Tracks"]} title="Master Tracks"
        description="Reusable career-transition templates. Only Active tracks are available for future PCB selection."
        actions={can(user, "tracks.create") ? <Button onClick={d.openCreate}><Plus className="size-4" /> New track</Button> : undefined} />
      <Panel className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input aria-label="Search tracks" placeholder="Search code, name, role or technology" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Category" className={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select aria-label="Status" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{TRACK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
        <select aria-label="Duration" className={sel} value={dur} onChange={(e) => setDur(e.target.value)}><option value="">Any duration</option>{durations.map((x) => <option key={x} value={x}>{x} days</option>)}</select>
        <select aria-label="Version" className={sel} value={ver} onChange={(e) => setVer(e.target.value)}><option value="">Any version</option>{versions.map((x) => <option key={x} value={x}>v{x}</option>)}</select>
      </Panel>
      <Panel className="overflow-x-auto">
        {rows.length === 0 ? <EmptyState title="No tracks match" description="Adjust the search or filters." /> : (
          <table className="w-full min-w-[1000px] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              {["Track Code", "Track Name", "Category", "Primary Target Role", "Duration", "Version", "Status", "Last Updated", "Updated By", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{t.code}</td>
                  <td className="px-4 py-3"><Link to="/app/tracks/$id" params={{ id: t.id }} className="font-medium hover:underline">{t.name}</Link>{t.has_active && <span className="ml-2 text-[11px] text-success">Available for PCB</span>}</td>
                  <td className="px-4 py-3">{CATEGORIES[t.category] ?? t.category}</td>
                  <td className="px-4 py-3">{t.primary_role || "—"}</td>
                  <td className="px-4 py-3">{t.duration_days} days</td>
                  <td className="px-4 py-3">v{t.version}</td>
                  <td className="px-4 py-3"><TrackStatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(t.updated_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.updated_by ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${t.code}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to="/app/tracks/$id" params={{ id: t.id }}>View / Edit</Link></DropdownMenuItem>
                        {can(user, "tracks.create") && t.version_id && <DropdownMenuItem onClick={() => d.openDuplicate(t.version_id!, t.name)}>Duplicate</DropdownMenuItem>}
                        {can(user, "tracks.version") && t.version_id && <DropdownMenuItem onClick={() => d.openVersion(t.id, t.version_id!, t.versions)}>Create new version</DropdownMenuItem>}
                        {can(user, "tracks.archive") && t.version_id && t.status !== "ARCHIVED" && <DropdownMenuItem className="text-destructive" onClick={() => confirm(`Archive ${t.code} v${t.version}? Archived versions stay as history and cannot be changed.`) && archive(t.version_id!)}>Archive</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {d.dialog}
    </>
  );
}
