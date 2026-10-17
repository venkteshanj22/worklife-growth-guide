import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { mapAssessmentTrack } from "@/lib/tracks/tracks.functions";
import { trackOptionsQuery } from "./queries";

type Rec = { id: string; kind: string; master_track_id: string | null };

/** Optional link from assessment recommendations to Master Tracks. Never automatic. */
export function TrackMapping({ recs, assessmentId }: { recs: Rec[]; assessmentId: string }) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const visible = can(user, "tracks.view");
  const { data: tracks } = useQuery({ ...trackOptionsQuery, enabled: visible });
  if (!visible || !tracks) return null;
  const editable = can(user, "assessment.edit");
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Master Track mapping (optional)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {recs.map((r) => (
          <label key={r.id} className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{r.kind === "PRIMARY" ? "Primary recommendation" : "Alternative recommendation"}</span>
            <select disabled={!editable} value={r.master_track_id ?? ""} className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              onChange={async (e) => {
                try {
                  await mapAssessmentTrack({ data: { recommendationId: r.id, trackId: e.target.value || null } });
                  toast.success("Mapping saved");
                  qc.invalidateQueries({ queryKey: ["assessment", assessmentId] });
                } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
              }}>
              <option value="">Not mapped</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}{t.available ? "" : " (not active)"}</option>)}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
