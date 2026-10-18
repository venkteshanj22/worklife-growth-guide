import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CircleAlert, Download, FileText, Lock, Plus, RefreshCw, Unlock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Panel, formatDate } from "@/components/app/shared";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/rbac/permissions";
import {
  CAN_MOVE_TO_APPROVED, LEVELS, PRIORITIES, canTransition, durationMismatch, isEditable, pcbDisplayId, plannedDays, type PcbAction,
} from "@/lib/pcb/model";
import {
  addReviewNote, newPcbVersion, pcbDraftPdf, pcbPdfUrl, recalculatePcbDays, regenerateApprovedPdf, resolveReviewNote, savePcbHeader, transitionPcb, type PcbDetail,
} from "@/lib/pcb/pcb.functions";
import type { FieldDef } from "@/features/tracks/RowDialog";
import { PcbOpsContext, pcbQuery, usePcbOps, usePcbOpsState } from "./queries";
import { Field, PcbList, PcbStatusBadge, SourceBadge } from "./parts";
import { ImportDialog } from "./ImportDialog";
import { JourneyOffer } from "./JourneyOffer";
import { PcbPreview } from "./PcbPreview";

const TABS = ["Overview", "Career Direction", "Skill Gap", "Target Capabilities", "Curriculum", "Resources", "Milestones", "Projects", "Weekly Plan", "PCB Content", "Document Preview", "Review", "Version History"];
const lbl = (s?: string | null) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");

export function PcbEditor({ versionId }: { versionId: string }) {
  const { data } = useSuspenseQuery(pcbQuery(versionId));
  const ops = usePcbOpsState(versionId, data.version.lock_version);
  return <PcbOpsContext.Provider value={ops}><EditorBody d={data} /></PcbOpsContext.Provider>;
}

function EditorBody({ d }: { d: PcbDetail }) {
  const { user } = useCurrentUser();
  const ops = usePcbOps();
  const v = d.version;
  const editable = isEditable(v.status) && can(user, "pcb.edit");
  const id = pcbDisplayId(d.pcb.pcb_code, v.version);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const anyDirty = Object.values(dirty).some(Boolean);
  useBlocker({ shouldBlockFn: () => anyDirty && !confirm("You have unsaved changes. Leave without saving?"), enableBeforeUnload: () => anyDirty });
  const markDirty = (k: string) => (b: boolean) => setDirty((x) => (x[k] === b ? x : { ...x, [k]: b }));
  const planned = plannedDays(v.pcb_day_items);
  const mismatch = durationMismatch(v.target_duration_days, planned);

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground"><Link to="/app/pcb" className="hover:underline">PCB Studio</Link> / {d.candidate.candidate_code}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{d.candidate.full_name}</h1>
              <span className="font-mono text-xs text-muted-foreground">{id}</span>
              <PcbStatusBadge status={v.status} />
              {d.pcb.current_approved_version_id === v.id && <span className="rounded bg-success-soft px-1.5 py-px text-[10px] font-semibold uppercase text-success">Current official</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveIndicator dirty={anyDirty} />
            <WorkflowActions d={d} />
          </div>
        </div>
        {!isEditable(v.status) && <p className="mt-2 text-xs text-muted-foreground"><Lock className="mr-1 inline size-3" />This version is read-only{["APPROVED", "SUPERSEDED"].includes(v.status) ? ". Create a new version to make changes." : "."}</p>}
      </div>
      {mismatch && <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/40 bg-accent px-3 py-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {mismatch}{v.duration_ack && " (acknowledged)"}</div>}
      <Tabs defaultValue="Overview">
        <div className="overflow-x-auto border-b">
          <TabsList className="h-auto w-max justify-start rounded-none bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {t}{t === "Review" && v.pcb_review_notes.some((n) => n.status === "OPEN") ? ` (${v.pcb_review_notes.filter((n) => n.status === "OPEN").length})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="Overview" className="mt-6"><Overview d={d} editable={editable} onDirty={markDirty("overview")} /></TabsContent>
        <TabsContent value="Career Direction" className="mt-6"><Direction d={d} editable={editable} onDirty={markDirty("direction")} /></TabsContent>
        <TabsContent value="Skill Gap" className="mt-6">
          <PcbList table="pcb_skill_gaps" noun="skill gap" title="Skill gaps" rows={v.pcb_skill_gaps} editable={editable} fields={GAP_FIELDS} defaults={{ priority: "MEDIUM" }}
            summary={(g) => <><span className="font-medium">{g.skill}</span> <span className="ml-2 text-xs text-muted-foreground">{lbl(g.current_level)} → {lbl(g.target_level)} · {lbl(g.priority)}</span>{g.action && <p className="text-xs text-muted-foreground">{g.action}</p>}</>} />
          <p className="mt-3 text-xs text-muted-foreground">Editing PCB skill gaps never changes the assessment.</p>
        </TabsContent>
        <TabsContent value="Target Capabilities" className="mt-6">
          <PcbList table="pcb_target_capabilities" noun="capability" title="Target capabilities" rows={v.pcb_target_capabilities} editable={editable}
            fields={[{ key: "title", label: "Capability", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "evidence", label: "Evidence", type: "textarea" }]}
            summary={(c) => <><span className="font-medium">{c.title}</span>{c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}</>} />
        </TabsContent>
        <TabsContent value="Curriculum" className="mt-6"><Curriculum d={d} editable={editable} planned={planned} /></TabsContent>
        <TabsContent value="Resources" className="mt-6"><Resources d={d} editable={editable} /></TabsContent>
        <TabsContent value="Milestones" className="mt-6">
          <PcbList table="pcb_milestones" noun="milestone" title="Milestones" rows={v.pcb_milestones} editable={editable}
            fields={[{ key: "name", label: "Milestone", required: true }, { key: "target_day", label: "Target day", type: "number" }, { key: "description", label: "Description", type: "textarea" }, { key: "evidence", label: "Expected evidence", type: "textarea" }]}
            summary={(m) => <><span className="mr-2 text-xs text-muted-foreground">{m.target_day ? `Day ${m.target_day}` : "—"}</span><span className="font-medium">{m.name}</span></>} />
        </TabsContent>
        <TabsContent value="Projects" className="mt-6">
          <PcbList table="pcb_projects" noun="project" title="Projects" rows={v.pcb_projects} editable={editable} fields={PROJECT_FIELDS} defaults={{ project_type: "MINI_PROJECT" }}
            summary={(p) => <><span className="font-medium">{p.name}</span> <span className="ml-2 text-xs text-muted-foreground">{lbl(p.project_type)}{p.start_day ? ` · Day ${p.start_day}–${p.end_day ?? "?"}` : ""}</span>{p.scenario && <p className="text-xs text-muted-foreground">{p.scenario}</p>}</>} />
        </TabsContent>
        <TabsContent value="Weekly Plan" className="mt-6">
          <PcbList table="pcb_weekly_reviews" noun="week" title="Weekly plan" rows={v.pcb_weekly_reviews} editable={editable} collapsible
            fields={[{ key: "week_number", label: "Week number", type: "number" }, { key: "title", label: "Week title", required: true }, { key: "expected_progress", label: "Expected progress", type: "textarea" }, { key: "guidance", label: "Reviewer guidance", type: "textarea" }]}
            summary={(w) => <><span className="mr-2 text-xs text-muted-foreground">{w.week_number ? `Week ${w.week_number}` : ""}</span><span className="font-medium">{w.title}</span></>}
            nested={(w) => <PcbList table="pcb_weekly_review_items" noun="checklist item" depth={1} title="Checklist" editable={editable} defaults={{ weekly_review_id: w.id }} noDuplicate
              rows={v.pcb_weekly_review_items.filter((i) => i.weekly_review_id === w.id)} fields={[{ key: "item", label: "Item", required: true }]} summary={(i) => i.item} />} />
          <p className="mt-3 text-xs text-muted-foreground">These are blueprint expectations. Actual weekly reviews come in a later phase.</p>
        </TabsContent>
        <TabsContent value="PCB Content" className="mt-6"><ContentTab d={d} editable={editable} /></TabsContent>
        <TabsContent value="Document Preview" className="mt-6"><PcbPreview d={d} /></TabsContent>
        <TabsContent value="Review" className="mt-6"><ReviewTab d={d} /></TabsContent>
        <TabsContent value="Version History" className="mt-6"><HistoryTab d={d} /></TabsContent>
      </Tabs>
      {ops.error?.includes("modified by another user") && (
        <div className="fixed bottom-4 right-4 z-30 flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-lg">
          <CircleAlert className="size-4 text-destructive" /> {ops.error}
          <Button size="sm" onClick={() => location.reload()}><RefreshCw className="size-3.5" /> Refresh</Button>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ dirty }: { dirty: boolean }) {
  const { state } = usePcbOps();
  const t = state === "saving" ? "Saving…" : state === "error" ? "Save failed" : dirty ? "Unsaved changes" : state === "saved" ? "All changes saved" : "";
  return t ? <span className={`text-xs ${state === "error" || dirty ? "text-destructive" : "text-muted-foreground"}`}>{t}</span> : null;
}

const GAP_FIELDS: FieldDef[] = [
  { key: "skill", label: "Skill / capability", required: true }, { key: "priority", label: "Priority", type: "select", options: PRIORITIES, required: true },
  { key: "current_level", label: "Current level", type: "select", options: LEVELS }, { key: "target_level", label: "Target level", type: "select", options: LEVELS },
  { key: "description", label: "Gap description", type: "textarea" }, { key: "action", label: "Recommended action", type: "textarea" },
];
const PROJECT_FIELDS: FieldDef[] = [
  { key: "name", label: "Project name", required: true }, { key: "project_type", label: "Type", type: "select", required: true, options: { PRACTICE_PROJECT: "Practice Project", MINI_PROJECT: "Mini Project", INTEGRATED: "Integrated Project", CAPSTONE: "Capstone", PORTFOLIO: "Portfolio" } },
  { key: "scenario", label: "Business scenario", type: "textarea" }, { key: "description", label: "Description", type: "textarea" },
  { key: "technologies", label: "Technologies", wide: true }, { key: "features", label: "Expected features", type: "textarea" }, { key: "deliverables", label: "Expected deliverables", type: "textarea" },
  { key: "start_day", label: "Suggested start day", type: "number" }, { key: "end_day", label: "Suggested completion day", type: "number" },
  { key: "difficulty", label: "Difficulty", type: "select", options: { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" } },
  { key: "selection_reason", label: "Reason for selection", type: "textarea" },
];

// ---------- Header forms ----------

type HField = { key: string; label: string; type?: "text" | "textarea" | "number" };
function HeaderForm({ d, editable, fields, onDirty, internal }: { d: PcbDetail; editable: boolean; fields: HField[]; onDirty: (b: boolean) => void; internal?: boolean }) {
  const ops = usePcbOps();
  const v = d.version as unknown as Record<string, unknown>;
  const init = () => ({ ...Object.fromEntries(fields.map((f) => [f.key, v[f.key] ?? ""])), ...(internal ? { internal_notes: d.internal?.internal_notes ?? "" } : {}) });
  const [form, setForm] = useState<Record<string, unknown>>(init);
  const [base, setBase] = useState(init);
  useEffect(() => { const n = init(); setForm(n); setBase(n); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [d.version.lock_version]);
  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const save = () => {
    const { internal_notes, ...rest } = form;
    const fieldsOut = Object.fromEntries(Object.entries(rest).map(([k, val]) => [k, val === "" ? null : val]));
    ops.run((lock) => savePcbHeader({ data: { versionId: ops.versionId, lock, fields: fieldsOut as never, ...(internal ? { internal_notes: (internal_notes as string) || null } : {}) } }), "Saved").catch(() => {});
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
          <Label htmlFor={`h-${f.key}`} className="mb-1.5 block text-xs text-muted-foreground">{f.label}</Label>
          {f.type === "textarea"
            ? <Textarea id={`h-${f.key}`} rows={3} disabled={!editable} value={String(form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            : <Input id={`h-${f.key}`} type={f.type === "number" ? "number" : "text"} disabled={!editable} value={String(form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: f.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value })} />}
        </div>
      ))}
      {internal && (
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Internal notes (staff only, never shown to candidate)</Label>
          <Textarea rows={3} disabled={!editable} value={String(form["internal_notes"] ?? "")} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
        </div>
      )}
      {editable && (
        <div className="flex gap-2 sm:col-span-2">
          <Button disabled={!dirty || ops.state === "saving"} onClick={save}>{ops.state === "saving" ? "Saving…" : "Save changes"}</Button>
          {dirty && <Button variant="ghost" onClick={() => setForm(base)}>Discard</Button>}
        </div>
      )}
    </div>
  );
}

function Overview({ d, editable, onDirty }: { d: PcbDetail; editable: boolean; onDirty: (b: boolean) => void }) {
  const { user } = useCurrentUser();
  const v = d.version;
  const n = (id: string | null) => (id ? d.names[id] ?? "—" : "—");
  const extra = v.pcb_source_tracks.filter((s) => s.role !== "BASE");
  return (
    <div className="space-y-6">
      <Panel className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="PCB ID">{d.pcb.pcb_code}</Field>
        <Field label="Version">V{v.version}</Field>
        <Field label="Status"><PcbStatusBadge status={v.status} /></Field>
        <Field label="Candidate"><Link to="/app/candidates/$id" params={{ id: d.pcb.candidate_id }} className="text-primary hover:underline">{d.candidate.full_name}</Link></Field>
        <Field label="Candidate ID">{d.candidate.candidate_code}</Field>
        <Field label="Assessment used">{v.assessment_code ?? (v.assessment_override ? "None (override)" : "—")}</Field>
        <Field label="Base Master Track">{v.base_track_name} ({v.base_track_code})</Field>
        <Field label="Base track version">v{v.base_track_version}</Field>
        <Field label="Additional source tracks">{extra.map((s) => `${s.track_code} v${s.track_version}`).join(", ")}</Field>
        <Field label="Created">{n(v.created_by)} · {formatDate(v.created_at)}</Field>
        <Field label="Reviewed by">{v.reviewed_by ? `${n(v.reviewed_by)} · ${formatDate(v.reviewed_at)}` : ""}</Field>
        <Field label="Approved by">{v.approved_by ? `${n(v.approved_by)} · ${formatDate(v.approved_at)}` : ""}</Field>
        {can(user, "pcb.view_internal") && d.internal?.override_reason && <Field label="Override reason">{d.internal.override_reason}</Field>}
      </Panel>
      <div>
        <h2 className="mb-3 font-semibold">Plan setup</h2>
        <HeaderForm d={d} editable={editable} onDirty={onDirty} internal={can(user, "pcb.view_internal")} fields={[
          { key: "target_duration_days", label: "Target duration (days)", type: "number" }, { key: "daily_hours", label: "Recommended daily hours", type: "number" },
          { key: "weekly_days", label: "Recommended weekly days", type: "number" }, { key: "target_completion_window", label: "Target completion window" },
        ]} />
      </div>
    </div>
  );
}

function Direction({ d, editable, onDirty }: { d: PcbDetail; editable: boolean; onDirty: (b: boolean) => void }) {
  const snap = d.version.assessment_snapshot as { primary?: { career_path?: string; target_role?: string } } | null;
  return (
    <div className="space-y-4">
      {snap?.primary?.career_path && <p className="text-xs text-muted-foreground">Assessment recommended: {snap.primary.career_path}{snap.primary.target_role ? ` → ${snap.primary.target_role}` : ""}. Changes here never alter the assessment.</p>}
      <HeaderForm d={d} editable={editable} onDirty={onDirty} fields={[
        { key: "current_profile_summary", label: "Current profile summary", type: "textarea" }, { key: "transition_goal", label: "Career transition goal", type: "textarea" },
        { key: "primary_career_path", label: "Primary career path" }, { key: "primary_target_role", label: "Primary target role" },
        { key: "alt_career_path", label: "Alternative career path" }, { key: "alt_target_role", label: "Alternative target role" },
        { key: "target_industry", label: "Target industry" }, { key: "preferred_location", label: "Preferred location" },
        { key: "expected_outcome", label: "Expected career outcome", type: "textarea" }, { key: "rationale", label: "Recommendation rationale", type: "textarea" },
      ]} />
    </div>
  );
}

// ---------- Curriculum ----------

function Curriculum({ d, editable, planned }: { d: PcbDetail; editable: boolean; planned: number }) {
  const ops = usePcbOps();
  const v = d.version;
  const [importOpen, setImportOpen] = useState(false);
  const phaseOptions = Object.fromEntries(v.pcb_phases.map((p) => [p.id, p.name]));
  const mismatch = durationMismatch(v.target_duration_days, planned);
  const { user } = useCurrentUser();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-4 py-2.5 text-sm">
        <span>Configured duration: <b>{v.target_duration_days} days</b></span>
        <span>Planned curriculum: <b>{planned} days</b></span>
        {mismatch && editable && (can(user, "pcb.approve") || can(user, "pcb.edit")) && (
          <label className="flex items-center gap-2 text-xs"><Switch checked={v.duration_ack} disabled={ops.state === "saving"} onCheckedChange={(c) => ops.run((lock) => savePcbHeader({ data: { versionId: ops.versionId, lock, fields: { duration_ack: c } } })).catch(() => {})} /> Acknowledge mismatch</label>
        )}
        {editable && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={ops.state === "saving"} onClick={() => confirm("Renumber all day items 1, 2, 3… in curriculum order?") && ops.run((lock) => recalculatePcbDays({ data: { versionId: ops.versionId, lock } }), "Day numbers recalculated").catch(() => {})}><RefreshCw className="size-3.5" /> Recalculate Day Numbers</Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Plus className="size-3.5" /> Add From Master Track</Button>
          </div>
        )}
      </div>
      <PcbList table="pcb_phases" noun="phase" title="Phases" rows={v.pcb_phases} editable={editable} collapsible
        fields={[{ key: "phase_number", label: "Phase number", type: "number" }, { key: "name", label: "Phase name", required: true }, { key: "short_description", label: "Short description", wide: true }, { key: "objective", label: "Objective", type: "textarea" }, { key: "start_day", label: "Start day", type: "number" }, { key: "end_day", label: "End day", type: "number" }]}
        summary={(p) => <><span className="font-medium">{p.name}</span> <span className="ml-2 text-xs text-muted-foreground">{p.start_day ? `Day ${p.start_day}–${p.end_day ?? "?"}` : ""} · {v.pcb_modules.filter((m) => m.phase_id === p.id).length} modules</span></>}
        nested={(p) => (
          <PcbList table="pcb_modules" noun="module" title="Modules" depth={1} editable={editable} collapsible defaults={{ phase_id: p.id }} rows={v.pcb_modules.filter((m) => m.phase_id === p.id)}
            fields={[{ key: "phase_id", label: "Phase", type: "select", options: phaseOptions, required: true }, { key: "name", label: "Module name", required: true }, { key: "suggested_duration", label: "Suggested duration" }, { key: "description", label: "Description", type: "textarea" }, { key: "objective", label: "Objective", type: "textarea" }]}
            summary={(m) => <><span className="font-medium">{m.name}</span> <span className="ml-2 text-xs text-muted-foreground">{v.pcb_day_items.filter((i) => i.module_id === m.id).length} items</span></>}
            nested={(m) => (
              <PcbList table="pcb_day_items" noun="day item" title="Day items" depth={1} editable={editable} defaults={{ module_id: m.id }} rows={v.pcb_day_items.filter((i) => i.module_id === m.id)}
                fields={[{ key: "day_number", label: "Day number", type: "number" }, { key: "title", label: "Title", required: true }, { key: "topic", label: "Topic" }, { key: "objective", label: "Objective" }, { key: "description", label: "Description", type: "textarea" }, { key: "learning_minutes", label: "Learning minutes", type: "number" }, { key: "practice_minutes", label: "Practice minutes", type: "number" }, { key: "activity", label: "Activity", type: "textarea" }, { key: "expected_output", label: "Expected output", type: "textarea" }, { key: "notes", label: "Notes", type: "textarea" }]}
                summary={(i) => <><span className="mr-2 inline-block w-14 text-xs text-muted-foreground">{i.day_number ? `Day ${i.day_number}` : "—"}</span>{i.title}</>} />
            )} />
        )} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function Resources({ d, editable }: { d: PcbDetail; editable: boolean }) {
  const v = d.version;
  const [importOpen, setImportOpen] = useState(false);
  const opts = (rows: { id: string; name?: string; title?: string }[]) => Object.fromEntries(rows.map((r) => [r.id, r.name ?? r.title ?? ""]));
  const target = (m: (typeof v.pcb_resource_mappings)[number]) =>
    m.day_item_id ? `Day item: ${v.pcb_day_items.find((x) => x.id === m.day_item_id)?.title ?? "?"}` : m.module_id ? `Module: ${v.pcb_modules.find((x) => x.id === m.module_id)?.name ?? "?"}` : m.phase_id ? `Phase: ${v.pcb_phases.find((x) => x.id === m.phase_id)?.name ?? "?"}` : "Whole PCB";
  return (
    <>
      <PcbList table="pcb_resources" noun="resource" title="Resource library" rows={v.pcb_resources} editable={editable} collapsible defaults={{ resource_type: "COURSE", is_paid: false }}
        extraActions={editable ? <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Plus className="size-3.5" /> Add From Track</Button> : null}
        fields={[{ key: "name", label: "Resource name", required: true }, { key: "provider", label: "Provider" }, { key: "resource_type", label: "Type", type: "select", required: true, options: { COURSE: "Course", VIDEO: "Video", DOCUMENT: "Document", BOOK: "Book", ARTICLE: "Article", PRACTICE: "Practice", TOOL: "Tool", OTHER: "Other" } }, { key: "url", label: "URL", wide: true }, { key: "course_name", label: "Course / document" }, { key: "section", label: "Section" }, { key: "start_ref", label: "Start reference" }, { key: "end_ref", label: "End reference" }, { key: "is_paid", label: "Paid", type: "checkbox" }, { key: "estimated_cost", label: "Estimated cost", type: "number" }, { key: "notes", label: "Notes", type: "textarea" }]}
        summary={(r) => <><span className="font-medium">{r.name}</span> <span className="ml-2 text-xs text-muted-foreground">{[r.provider, lbl(r.resource_type), r.is_paid ? "Paid" : "Free"].filter(Boolean).join(" · ")}</span></>}
        nested={(r) => (
          <PcbList table="pcb_resource_mappings" noun="mapping" title="Mapped to" depth={1} editable={editable} noDuplicate defaults={{ resource_id: r.id }} rows={v.pcb_resource_mappings.filter((m) => m.resource_id === r.id)}
            emptyText="Not mapped — applies to the whole PCB."
            fields={[{ key: "phase_id", label: "Phase", type: "select", options: opts(v.pcb_phases) }, { key: "module_id", label: "Module", type: "select", options: opts(v.pcb_modules) }, { key: "day_item_id", label: "Day item", type: "select", options: opts(v.pcb_day_items) }]}
            summary={(m) => target(m)} />
        )} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

// ---------- Content composer ----------

function ContentTab({ d, editable }: { d: PcbDetail; editable: boolean }) {
  const { user } = useCurrentUser();
  const ops = usePcbOps();
  const controlledOk = can(user, "pcb.controlled_content");
  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">Sections appear in the document in this order. Edits change only this PCB's copy — Global and Track content are never modified. Data sections are filled from the PCB tabs; their text appears as an introduction.</p>
      <PcbList table="pcb_content_blocks" noun="section" title="Document sections" rows={d.version.pcb_content_blocks} editable={editable}
        fields={[{ key: "title", label: "Section title", required: true }, { key: "content", label: "Content", type: "textarea" }]}
        summary={(b) => (
          <div className="flex flex-wrap items-center gap-2">
            {editable && <Switch aria-label="Include section" checked={b.is_included} disabled={ops.state === "saving"} onCheckedChange={(c) => ops.save("pcb_content_blocks", { id: b.id, is_included: c }).catch(() => {})} />}
            <span className={b.is_included ? "font-medium" : "text-muted-foreground line-through"}>{b.title}</span>
            {b.block_type === "DATA" && <span className="rounded bg-muted px-1.5 text-[10px] uppercase">Data</span>}
            {b.is_controlled && <span className="rounded bg-danger-soft px-1.5 text-[10px] uppercase text-destructive">Controlled</span>}
            {b.is_locked && <Lock className="size-3 text-muted-foreground" aria-label="Locked" />}
            {b.block_type !== "DATA" && !(b.content ?? "").trim() && <span className="text-[11px] text-muted-foreground">(empty — skipped in document)</span>}
            {editable && b.is_controlled && controlledOk && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => ops.save("pcb_content_blocks", { id: b.id, is_locked: !b.is_locked }).catch(() => {})}>
                {b.is_locked ? <><Unlock className="size-3" /> Unlock</> : <><Lock className="size-3" /> Lock</>}
              </Button>
            )}
          </div>
        )} />
    </>
  );
}

// ---------- Workflow ----------

function WorkflowActions({ d }: { d: PcbDetail }) {
  const { user } = useCurrentUser();
  const ops = usePcbOps();
  const navigate = useNavigate();
  const v = d.version;
  const [dlg, setDlg] = useState<PcbAction | "version" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<{ candidateId: string; status: "PCB_APPROVED" } | null>(null);
  const failed = d.checklist.filter((c) => !c.ok);
  const show = (a: PcbAction) => canTransition(a, v.status) && can(user, { submit: "pcb.submit_review", request_changes: "pcb.request_changes", approve: "pcb.approve", cancel: "pcb.cancel", reopen: "pcb.edit" }[a]);
  const go = async () => {
    if (!dlg) return;
    setBusy(true);
    try {
      if (dlg === "version") {
        const r = await newPcbVersion({ data: { versionId: v.id, reason: remarks } });
        toast.success("New draft version created");
        navigate({ to: "/app/pcb/$versionId", params: { versionId: r.versionId } });
      } else {
        const r = await transitionPcb({ data: { versionId: v.id, action: dlg, remarks: remarks || null } });
        toast.success({ submit: "Submitted for review", request_changes: "Changes requested", approve: "PCB approved and PDF stored", cancel: "PCB cancelled", reopen: "Moved back to draft" }[dlg]);
        if (dlg === "approve" && CAN_MOVE_TO_APPROVED.includes(r.journey) && can(user, "candidates.status")) setOffer({ candidateId: d.pcb.candidate_id, status: "PCB_APPROVED" });
      }
      await ops.refresh();
      setDlg(null); setRemarks("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(false); }
  };
  const openPdf = async () => {
    try {
      if (v.pcb_documents.length) { const { url } = await pcbPdfUrl({ data: { versionId: v.id } }); window.open(url, "_blank"); return; }
      const { base64, fileName } = await pcbDraftPdf({ data: { versionId: v.id } });
      const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: "application/pdf" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not open PDF"); }
  };
  const titles: Record<string, string> = { submit: "Submit for review", request_changes: "Request changes", approve: "Approve PCB", cancel: "Cancel PCB", reopen: "Move back to draft", version: "Create new PCB version" };
  return (
    <>
      {can(user, "pcb.pdf") && <Button size="sm" variant="outline" onClick={openPdf}><Download className="size-3.5" /> {v.pcb_documents.length ? "PDF" : "Preview PDF"}</Button>}
      {show("reopen") && <Button size="sm" variant="outline" onClick={() => setDlg("reopen")}>Reopen draft</Button>}
      {show("cancel") && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDlg("cancel")}>Cancel</Button>}
      {show("request_changes") && <Button size="sm" variant="outline" onClick={() => setDlg("request_changes")}>Request Changes</Button>}
      {show("submit") && <Button size="sm" onClick={() => setDlg("submit")}>Submit for Review</Button>}
      {show("approve") && <Button size="sm" onClick={() => setDlg("approve")}>Approve PCB</Button>}
      {["APPROVED", "SUPERSEDED"].includes(v.status) && can(user, "pcb.version") && <Button size="sm" variant="outline" onClick={() => setDlg("version")}>Create New Version</Button>}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dlg ? titles[dlg] : ""}</DialogTitle>
            <DialogDescription>
              {dlg === "approve" ? "The version becomes read-only, replaces any earlier approved version, and its PDF is stored." : dlg === "version" ? "Creates an independent draft copy of this version. This version stays unchanged." : dlg === "cancel" ? "Cancelled versions are kept for history but cannot be edited." : ""}
            </DialogDescription>
          </DialogHeader>
          {(dlg === "approve" || dlg === "submit") && <Checklist items={d.checklist} />}
          {dlg !== "reopen" && (
            <div>
              <Label className="text-xs">{dlg === "request_changes" ? "What needs to change? (required)" : dlg === "version" ? "Reason for new version (required)" : "Remarks (optional)"}</Label>
              <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Close</Button>
            <Button disabled={busy || (dlg === "approve" && failed.length > 0) || ((dlg === "request_changes" || dlg === "version") && remarks.trim().length < 3)} onClick={go}>{busy ? "Working…" : dlg ? titles[dlg] : ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <JourneyOffer offer={offer} onClose={() => setOffer(null)} />
    </>
  );
}

function Checklist({ items }: { items: PcbDetail["checklist"] }) {
  return (
    <ul className="space-y-1.5 rounded-md border p-3 text-sm">
      {items.map((c) => (
        <li key={c.key} className="flex items-center gap-2">
          {c.ok ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
          <span className={c.ok ? "" : "text-destructive"}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewTab({ d }: { d: PcbDetail }) {
  const { user } = useCurrentUser();
  const ops = usePcbOps();
  const v = d.version;
  const [section, setSection] = useState("GENERAL");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const canNote = can(user, "pcb.review") && !["APPROVED", "SUPERSEDED", "CANCELLED"].includes(v.status);
  const canResolve = can(user, "pcb.edit") || can(user, "pcb.review");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="mb-3 font-semibold">Review notes</h2>
        {canNote && (
          <div className="mb-4 space-y-2 rounded-md border p-3">
            <select aria-label="Section" value={section} onChange={(e) => setSection(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {["GENERAL", ...TABS.slice(0, 10).map((t) => t.toUpperCase())].map((s) => <option key={s} value={s}>{lbl(s)}</option>)}
            </select>
            <Textarea rows={3} placeholder="Add a review comment" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="sm" disabled={busy || !comment.trim()} onClick={async () => {
              setBusy(true);
              try { await addReviewNote({ data: { versionId: v.id, section, comment } }); setComment(""); await ops.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add note"); } finally { setBusy(false); }
            }}>Add note</Button>
          </div>
        )}
        {!v.pcb_review_notes.length && <p className="text-sm text-muted-foreground">No review notes yet.</p>}
        <ul className="space-y-2">
          {v.pcb_review_notes.map((n) => (
            <li key={n.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{n.author_name}</span> · {formatDate(n.created_at, true)} · {lbl(n.section)}
                <span className={`ml-auto rounded px-1.5 font-medium ${n.status === "OPEN" ? "bg-danger-soft text-destructive" : "bg-success-soft text-success"}`}>{n.status === "OPEN" ? "Open" : "Resolved"}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap">{n.comment}</p>
              {n.status === "OPEN" && canResolve && (
                <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={async () => {
                  try { await resolveReviewNote({ data: { versionId: v.id, id: n.id } }); await ops.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not resolve"); }
                }}>Mark resolved</Button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-3 font-semibold">Approval checklist</h2>
        <Checklist items={d.checklist} />
      </div>
    </div>
  );
}

function HistoryTab({ d }: { d: PcbDetail }) {
  const { user } = useCurrentUser();
  const ops = usePcbOps();
  const n = (id: string | null) => (id ? d.names[id] ?? "—" : "—");
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>{["Version", "Status", "Created", "Submitted", "Reviewed", "Approved", "Reason / change summary", "PDF"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {d.versions.map((x) => (
            <tr key={x.id} className={x.id === d.version.id ? "bg-accent/40" : ""}>
              <td className="px-3 py-2"><Link to="/app/pcb/$versionId" params={{ versionId: x.id }} className="font-medium text-primary hover:underline">V{x.version}</Link></td>
              <td className="px-3 py-2"><PcbStatusBadge status={x.status} /></td>
              <td className="px-3 py-2 text-xs">{formatDate(x.created_at)}<br /><span className="text-muted-foreground">{n(x.created_by)}</span></td>
              <td className="px-3 py-2 text-xs">{formatDate(x.submitted_at)}</td>
              <td className="px-3 py-2 text-xs">{x.reviewed_by ? n(x.reviewed_by) : "—"}</td>
              <td className="px-3 py-2 text-xs">{formatDate(x.approved_at)}<br /><span className="text-muted-foreground">{x.approved_by ? n(x.approved_by) : ""}</span></td>
              <td className="px-3 py-2 text-xs">{x.change_reason ?? (x.created_from_version ? `From V${x.created_from_version}` : "Initial Career Blueprint")}</td>
              <td className="px-3 py-2">
                {x.pcb_documents.length && can(user, "pcb.pdf") ? (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => { try { const { url } = await pcbPdfUrl({ data: { versionId: x.id } }); window.open(url, "_blank"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not open PDF"); } }}><FileText className="size-3.5" /> PDF</Button>
                ) : x.status === "APPROVED" && can(user, "pcb.pdf") ? (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={async () => { try { await regenerateApprovedPdf({ data: { versionId: x.id } }); await ops.refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not generate"); } }}>Generate</Button>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { SourceBadge };
