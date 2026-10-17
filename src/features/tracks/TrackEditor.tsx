import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import { BLOCK_TYPES, CATEGORIES, PROJECT_TYPES, RESOURCE_TYPES, durationWarning, plannedDays } from "@/lib/tracks/model";
import { saveTrackHeader, setTrackVersionStatus, type TrackDetail } from "@/lib/tracks/tracks.functions";
import { trackQuery } from "./queries";
import { FieldInput, type FieldDef, type Row } from "./RowDialog";
import { SectionList, useRowOps } from "./SectionList";
import { TrackStatusBadge } from "./TrackStatusBadge";
import { useTrackDialogs } from "./TrackDialogs";

type V = TrackDetail["version"];

const OVERVIEW: FieldDef[] = [
  { key: "code", label: "Track code", required: true },
  { key: "name", label: "Track name", required: true },
  { key: "short_name", label: "Short name" },
  { key: "category", label: "Category", type: "select", options: CATEGORIES, required: true },
  { key: "primary_role", label: "Primary target role" },
  { key: "alt_roles", label: "Alternative target roles (comma separated)" },
  { key: "duration_days", label: "Track duration (days)", type: "number", required: true },
  { key: "daily_hours", label: "Recommended daily hours", type: "number" },
  { key: "weekly_days", label: "Recommended weekly days", type: "number" },
  { key: "experience_level", label: "Experience level" },
  { key: "effective_date", label: "Effective date (YYYY-MM-DD)" },
  { key: "description", label: "Description", type: "textarea" },
];
const PREREQS: FieldDef[] = [
  { key: "prereq_education", label: "Minimum education guidance", type: "textarea" },
  { key: "prereq_knowledge", label: "Recommended existing knowledge", type: "textarea" },
  { key: "prereq_communication", label: "Recommended communication level", type: "textarea" },
  { key: "prereq_logical", label: "Recommended logical ability", type: "textarea" },
  { key: "prereq_daily_time", label: "Daily time requirement", type: "textarea" },
  { key: "prereq_infrastructure", label: "Laptop / infrastructure requirement", type: "textarea" },
  { key: "prereq_other", label: "Other prerequisites", type: "textarea" },
];
const HEADER_KEYS = [...OVERVIEW, ...PREREQS].map((f) => f.key).filter((k) => k !== "code");

function HeaderForm({ d, fields, editable, note }: { d: TrackDetail; fields: FieldDef[]; editable: boolean; note?: string }) {
  const qc = useQueryClient();
  const init = { ...d.version, code: d.track.code } as Row;
  const [row, setRow] = useState<Row>(init);
  const [busy, setBusy] = useState(false);
  useEffect(() => setRow({ ...d.version, code: d.track.code } as Row), [d]);
  const save = async () => {
    setBusy(true);
    try {
      await saveTrackHeader({ data: { versionId: d.version.id, ...(d.hasLockedCode ? {} : { code: String(row.code ?? "") }), ...Object.fromEntries(HEADER_KEYS.map((k) => [k, row[k] ?? null])) } as never });
      toast.success("Track saved");
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "track" || q.queryKey[0] === "tracks" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  };
  return (
    <Panel className="p-5">
      {note && <p className="mb-4 text-xs text-muted-foreground">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => <FieldInput key={f.key} f={f} value={row[f.key]} disabled={!editable || (f.key === "code" && d.hasLockedCode)} onChange={(v) => setRow((r) => ({ ...r, [f.key]: v }))} />)}
      </div>
      {editable && <div className="mt-5 flex justify-end"><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>}
    </Panel>
  );
}

const days = (a: unknown, b: unknown) => (a || b ? `Days ${a ?? "?"}–${b ?? "?"}` : "");
const meta = (...parts: unknown[]) => parts.filter(Boolean).join(" · ");

function Curriculum({ v, editable }: { v: V; editable: boolean }) {
  const planned = plannedDays(v.track_roadmap_items);
  const warn = durationWarning(v.duration_days, planned);
  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-center gap-4 p-4 text-sm">
        <span><strong>{planned}</strong> planned days</span>
        <span className="text-muted-foreground">Configured duration: {v.duration_days} days</span>
        {warn && <span className="flex items-center gap-1.5 text-warning"><AlertTriangle className="size-4" />{warn}</span>}
      </Panel>
      <SectionList table="track_phases" title="Phases" noun="phase" rows={v.track_phases} versionId={v.id} editable={editable} collapsible
        fields={[
          { key: "phase_number", label: "Phase number", type: "number" }, { key: "name", label: "Phase name", required: true },
          { key: "start_day", label: "Suggested start day", type: "number" }, { key: "end_day", label: "Suggested end day", type: "number" },
          { key: "short_description", label: "Short description", type: "textarea" }, { key: "objective", label: "Objective", type: "textarea" },
        ]}
        summary={(p) => <><span className="font-medium">Phase {p.phase_number ?? "–"} · {p.name}</span> <span className="text-xs text-muted-foreground">{days(p.start_day, p.end_day)}</span></>}
        nested={(p) => (
          <SectionList table="track_modules" title="Modules" noun="module" depth={1} versionId={v.id} editable={editable} defaults={{ phase_id: p.id }} collapsible
            rows={v.track_modules.filter((m) => m.phase_id === p.id)}
            fields={[{ key: "name", label: "Module name", required: true }, { key: "suggested_duration", label: "Suggested duration" }, { key: "description", label: "Description", type: "textarea" }, { key: "objective", label: "Learning objective", type: "textarea" }]}
            summary={(m) => <><span className="font-medium">{m.name}</span> <span className="text-xs text-muted-foreground">{m.suggested_duration}</span></>}
            nested={(m) => (
              <SectionList table="track_roadmap_items" title="Day items" noun="day item" depth={2} versionId={v.id} editable={editable} defaults={{ module_id: m.id }}
                rows={v.track_roadmap_items.filter((it) => it.module_id === m.id)}
                fields={[
                  { key: "day_number", label: "Day number", type: "number" }, { key: "title", label: "Item title", required: true },
                  { key: "topic", label: "Topic / concept", wide: true }, { key: "description", label: "Description", type: "textarea" },
                  { key: "objective", label: "Learning objective", type: "textarea" },
                  { key: "learning_minutes", label: "Estimated learning time (min)", type: "number" }, { key: "practice_minutes", label: "Estimated practice time (min)", type: "number" },
                  { key: "activity", label: "Activity / practice", type: "textarea" }, { key: "expected_output", label: "Expected output", type: "textarea" },
                  { key: "resource_refs", label: "Resource references", type: "textarea" }, { key: "notes", label: "Notes", type: "textarea" },
                ]}
                summary={(it) => <><span className="font-mono text-xs text-muted-foreground">Day {String(it.day_number ?? "–").padStart(2, "0")}</span> <span className="font-medium">{it.title}</span> <span className="text-xs text-muted-foreground">{meta(it.topic, it.learning_minutes && `${it.learning_minutes}m learn`, it.practice_minutes && `${it.practice_minutes}m practice`)}</span></>}
              />
            )}
          />
        )}
      />
    </div>
  );
}

function Resources({ v, editable }: { v: V; editable: boolean }) {
  const ops = useRowOps(v.id);
  const targets: Record<string, string> = { "": "Whole track" };
  v.track_phases.forEach((p) => (targets[`phase_id:${p.id}`] = `Phase · ${p.name}`));
  v.track_modules.forEach((m) => (targets[`module_id:${m.id}`] = `Module · ${m.name}`));
  v.track_roadmap_items.forEach((i) => (targets[`roadmap_item_id:${i.id}`] = `Day ${i.day_number ?? "–"} · ${i.title}`));
  const label = (mp: V["track_resource_mappings"][number]) =>
    mp.phase_id ? targets[`phase_id:${mp.phase_id}`] : mp.module_id ? targets[`module_id:${mp.module_id}`] : mp.roadmap_item_id ? targets[`roadmap_item_id:${mp.roadmap_item_id}`] : "Whole track";
  return (
    <SectionList table="track_resources" title="Resource library" noun="resource" rows={v.track_resources} versionId={v.id} editable={editable}
      fields={[
        { key: "name", label: "Resource name", required: true }, { key: "provider", label: "Provider" },
        { key: "resource_type", label: "Resource type", type: "select", options: RESOURCE_TYPES, required: true }, { key: "url", label: "URL" },
        { key: "course_name", label: "Course / document name" }, { key: "section", label: "Section / module" },
        { key: "start_ref", label: "Start reference" }, { key: "end_ref", label: "End reference" },
        { key: "is_paid", label: "Paid", type: "checkbox" }, { key: "estimated_cost", label: "Estimated cost (₹)", type: "number" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      defaults={{ resource_type: "OTHER", is_paid: false }}
      summary={(r) => <><span className="font-medium">{r.name}</span> <span className="text-xs text-muted-foreground">{meta(RESOURCE_TYPES[r.resource_type] ?? r.resource_type, r.provider, r.is_paid ? `Paid${r.estimated_cost ? ` ₹${r.estimated_cost}` : ""}` : "Free")}</span>{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="ml-2 text-xs text-primary hover:underline">Open</a>}</>}
      nested={(r) => {
        const maps = v.track_resource_mappings.filter((m) => m.resource_id === r.id);
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Linked to:</span>
            {maps.length === 0 && <span className="text-muted-foreground">nothing yet</span>}
            {maps.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                {label(m)}
                {editable && <button type="button" aria-label="Remove link" className="text-muted-foreground hover:text-destructive" onClick={() => ops.remove("track_resource_mappings", m.id).catch(() => {})}>×</button>}
              </span>
            ))}
            {editable && (
              <select aria-label={`Link ${r.name}`} className="h-7 rounded-md border bg-background px-1.5 text-xs" value="__"
                onChange={(e) => {
                  const val = e.target.value;
                  const [col, id] = val ? val.split(":") : [];
                  ops.save("track_resource_mappings", { resource_id: r.id, ...(col && id ? { [col]: id } : {}) }).catch(() => {});
                }}>
                <option value="__" disabled>+ Link to…</option>
                {Object.entries(targets).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}
          </div>
        );
      }}
    />
  );
}

export function TrackEditor({ id, v: versionId }: { id: string; v?: string }) {
  const { data: d } = useSuspenseQuery(trackQuery(id, versionId));
  const { user } = useCurrentUser();
  const nav = useNavigate();
  const qc = useQueryClient();
  const dialogs = useTrackDialogs();
  const v = d.version;
  const draft = v.status === "DRAFT";
  const canEdit = draft && can(user, "tracks.edit");
  const canContent = draft && can(user, "track_content.edit");
  const setStatus = async (status: "ACTIVE" | "INACTIVE" | "ARCHIVED", msg: string) => {
    if (!confirm(msg)) return;
    try {
      await setTrackVersionStatus({ data: { versionId: v.id, status } });
      toast.success("Status updated");
      await qc.invalidateQueries({ predicate: (q) => ["track", "tracks", "track-options"].includes(String(q.queryKey[0])) });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update status"); }
  };

  return (
    <>
      <PageHeader crumbs={["CareerOS", "PCB Studio", "Master Tracks", d.track.code]} title={v.name}
        description={meta(d.track.code, CATEGORIES[v.category] ?? v.category, `${v.duration_days} days`)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Version" className="h-9 rounded-md border bg-background px-2 text-sm" value={v.id} onChange={(e) => nav({ to: "/app/tracks/$id", params: { id }, search: { v: e.target.value } })}>
              {d.versions.map((x) => <option key={x.id} value={x.id}>v{x.version} · {x.status.toLowerCase()}</option>)}
            </select>
            {can(user, "tracks.activate") && v.status !== "ACTIVE" && v.status !== "ARCHIVED" && <Button size="sm" onClick={() => setStatus("ACTIVE", `Activate v${v.version}? Any other active version of this track becomes Inactive, and this version becomes read-only.`)}>Activate</Button>}
            {can(user, "tracks.activate") && v.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => setStatus("INACTIVE", `Deactivate v${v.version}? It will not be available for new PCBs.`)}>Deactivate</Button>}
            {can(user, "tracks.archive") && v.status !== "ARCHIVED" && <Button size="sm" variant="outline" onClick={() => setStatus("ARCHIVED", `Archive v${v.version}? Archived versions are kept as history and cannot be changed.`)}>Archive</Button>}
            {can(user, "tracks.version") && <Button size="sm" variant="outline" onClick={() => dialogs.openVersion(id, v.id, d.versions.map((x) => x.version))}>New version</Button>}
            {can(user, "tracks.create") && <Button size="sm" variant="outline" onClick={() => dialogs.openDuplicate(v.id, v.name)}>Duplicate</Button>}
          </div>
        } />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <TrackStatusBadge status={v.status} />
        <span className="text-muted-foreground">Version {v.version}{v.created_from_version ? ` · from v${v.created_from_version}` : ""}</span>
        {v.status === "ACTIVE" && <span className="text-success">Available for future PCB selection</span>}
        {!draft && <span className="flex items-center gap-1 text-muted-foreground"><Lock className="size-3.5" />Read-only. Create a new version to make changes.</span>}
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 h-auto flex-wrap justify-start">
          {["Overview", "Outcomes", "Prerequisites", "Curriculum", "Resources", "Milestones", "Projects", "Weekly Reviews", ...(can(user, "track_content.view") ? ["PCB Content"] : []), "Version History"].map((t) => (
            <TabsTrigger key={t} value={t.toLowerCase().replace(/ /g, "-")}>{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview"><HeaderForm d={d} fields={OVERVIEW} editable={canEdit} note={d.hasLockedCode ? "The track code is locked because a version has been published." : undefined} /></TabsContent>
        <TabsContent value="prerequisites"><HeaderForm d={d} fields={PREREQS} editable={canEdit} note="Guidance only. Candidates are never rejected automatically; the Career Consultant makes the recommendation." /></TabsContent>
        <TabsContent value="outcomes">
          <SectionList table="track_outcomes" noun="outcome" rows={v.track_outcomes} versionId={v.id} editable={canEdit}
            fields={[{ key: "title", label: "Outcome title", required: true }, { key: "description", label: "Description", type: "textarea" }]}
            summary={(o) => <><div className="font-medium">{o.title}</div>{o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}</>} />
        </TabsContent>
        <TabsContent value="curriculum"><Curriculum v={v} editable={canEdit} /></TabsContent>
        <TabsContent value="resources"><Resources v={v} editable={canEdit} /></TabsContent>
        <TabsContent value="milestones">
          <SectionList table="track_milestones" noun="milestone" rows={v.track_milestones} versionId={v.id} editable={canEdit}
            fields={[{ key: "name", label: "Milestone name", required: true }, { key: "target_day", label: "Target day", type: "number" }, { key: "description", label: "Description", type: "textarea" }, { key: "evidence", label: "Expected evidence", type: "textarea" }]}
            summary={(m) => <><span className="font-mono text-xs text-muted-foreground">Day {m.target_day ?? "–"}</span> <span className="font-medium">{m.name}</span>{m.evidence && <div className="text-xs text-muted-foreground">Evidence: {m.evidence}</div>}</>} />
        </TabsContent>
        <TabsContent value="projects">
          <SectionList table="track_project_templates" noun="project template" rows={v.track_project_templates} versionId={v.id} editable={canEdit} defaults={{ project_type: "PRACTICE_PROJECT" }}
            fields={[
              { key: "name", label: "Project name", required: true }, { key: "project_type", label: "Project type", type: "select", options: PROJECT_TYPES, required: true },
              { key: "difficulty", label: "Difficulty" }, { key: "technologies", label: "Suggested technologies" },
              { key: "start_day", label: "Suggested start day", type: "number" }, { key: "end_day", label: "Suggested completion day", type: "number" },
              { key: "description", label: "Description", type: "textarea" }, { key: "scenario", label: "Business scenario", type: "textarea" },
              { key: "features", label: "Expected features", type: "textarea" }, { key: "deliverables", label: "Expected deliverables", type: "textarea" },
            ]}
            summary={(p) => <><span className="font-medium">{p.name}</span> <span className="text-xs text-muted-foreground">{meta(PROJECT_TYPES[p.project_type], p.difficulty, days(p.start_day, p.end_day), p.technologies)}</span></>} />
        </TabsContent>
        <TabsContent value="weekly-reviews">
          <SectionList table="track_weekly_reviews" noun="weekly review" rows={v.track_weekly_reviews} versionId={v.id} editable={canEdit}
            fields={[{ key: "week_number", label: "Week number", type: "number" }, { key: "title", label: "Review title", required: true }, { key: "expected_progress", label: "Expected progress", type: "textarea" }, { key: "guidance", label: "Reviewer guidance", type: "textarea" }]}
            summary={(w) => <><span className="font-mono text-xs text-muted-foreground">Week {w.week_number ?? "–"}</span> <span className="font-medium">{w.title}</span>{w.expected_progress && <div className="text-xs text-muted-foreground">{w.expected_progress}</div>}</>}
            nested={(w) => (
              <SectionList table="track_weekly_review_items" title="Checklist" noun="checklist item" depth={1} versionId={v.id} editable={canEdit} defaults={{ weekly_review_id: w.id }}
                rows={v.track_weekly_review_items.filter((i) => i.weekly_review_id === w.id)}
                fields={[{ key: "item", label: "Checklist item", required: true, wide: true }]}
                summary={(i) => <span>{i.item}</span>} />
            )} />
        </TabsContent>
        {can(user, "track_content.view") && (
          <TabsContent value="pcb-content">
            <SectionList table="track_content_blocks" noun="content block" rows={v.track_content_blocks} versionId={v.id} editable={canContent} defaults={{ block_type: "CUSTOM" }}
              fields={[{ key: "block_type", label: "Block type", type: "select", options: BLOCK_TYPES, required: true }, { key: "title", label: "Block title", required: true }, { key: "content", label: "Content", type: "textarea" }]}
              summary={(b) => <><span className="text-xs text-muted-foreground">{BLOCK_TYPES[b.block_type] ?? b.block_type}</span> <span className="font-medium">{b.title}</span>{b.content && <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{b.content}</p>}</>} />
          </TabsContent>
        )}
        <TabsContent value="version-history">
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground">{["Version", "Status", "Created from", "Created by", "Created", "Effective", "Change summary"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {d.versions.map((x) => (
                  <tr key={x.id} className="border-b last:border-0">
                    <td className="px-4 py-3"><Link to="/app/tracks/$id" params={{ id }} search={{ v: x.id }} className="font-medium hover:underline">v{x.version}</Link>{x.id === v.id && <span className="ml-1 text-xs text-muted-foreground">(viewing)</span>}</td>
                    <td className="px-4 py-3"><TrackStatusBadge status={x.status} /></td>
                    <td className="px-4 py-3">{x.created_from_version ? `v${x.created_from_version}` : "—"}</td>
                    <td className="px-4 py-3">{(x.created_by && d.names[x.created_by]) || "System"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(x.created_at, true)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(x.effective_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{x.change_summary || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </TabsContent>
      </Tabs>
      {dialogs.dialog}
    </>
  );
}
