import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdmin, requirePermission, type Actor } from "@/lib/admin/authz.server";
import {
  CONTROLLED_CODES, DEFAULT_STRUCTURE, REQUIRED_CONTROLLED, TRANSITIONS, approvalChecklist, canTransition, isEditable, pcbCode, pcbDisplayId, plannedDays,
  recalculateDays, type PcbAction,
} from "./model";
import {
  CONTENT_TABLES, assessmentSnapshot, candidateSnapshot, importTrack, loadFull, loadVersionMeta, logPcb,
  type Admin, type ContentTable, type FullVersion, type Selection, type VersionMeta,
} from "./pcb.server";

const uuid = z.string().uuid();
const opt = z.string().trim().max(20000).nullish().transform((v) => (v ? v : null));
type Ctx = { supabase: Admin; userId: string };

/** Permission + candidate scope check with the caller's session, then admin client. */
async function access(ctx: Ctx, perm: string, versionId: string) {
  const actor = await requirePermission(ctx.supabase, ctx.userId, perm);
  const { data: ok } = await ctx.supabase.rpc("can_read_pcb_version" as never, { _vid: versionId } as never);
  if (!ok) throw new Error("You do not have access to this PCB.");
  const admin = await getAdmin();
  return { actor, admin, meta: await loadVersionMeta(admin, versionId) };
}
async function candidateAccess(ctx: Ctx, perm: string, candidateId: string) {
  const actor = await requirePermission(ctx.supabase, ctx.userId, perm);
  const { data: ok } = await ctx.supabase.rpc("can_read_pcb_candidate" as never, { _cid: candidateId } as never);
  if (!ok) throw new Error("You do not have access to this candidate.");
  return { actor, admin: await getAdmin() };
}
const STALE = "This PCB was modified by another user. Refresh before saving your changes.";
/** Optimistic lock: atomically bump lock_version only if it still matches. Returns new lock. */
async function bump(admin: Admin, meta: VersionMeta, lock: number, actor: Actor) {
  if (!isEditable(meta.v.status)) throw new Error("This PCB version is read-only. Create a new version to make changes.");
  const { data } = await admin.from("pcb_versions").update({ lock_version: lock + 1, updated_by: actor.id, updated_at: new Date().toISOString() })
    .eq("id", meta.v.id).eq("lock_version", lock).select("lock_version");
  if (!data?.length) throw new Error(STALE);
  return lock + 1;
}
const errMsg = (e: { message: string } | null, fallback: string) => {
  if (!e) return;
  throw new Error(e.message.length < 200 ? e.message : fallback);
};

// ---------- Lists ----------

export const listPcbs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "pcb.view");
    const s = context.supabase;
    const { data: pcbs } = await s.from("candidate_pcbs").select("id, pcb_code, candidate_id, current_approved_version_id, candidates(candidate_code, full_name)");
    const { data: versions } = await s.from("pcb_versions").select("id, pcb_id, version, status, primary_career_path, primary_target_role, base_track_code, base_track_version, target_duration_days, created_by, created_at, approved_at, submitted_at, updated_at");
    const ids = [...new Set((versions ?? []).map((v) => v.created_by).filter((x): x is string => !!x))];
    const { data: people } = ids.length ? await s.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
    return (versions ?? []).map((v) => {
      const p = (pcbs ?? []).find((x) => x.id === v.pcb_id);
      const c = p?.candidates as { candidate_code: string; full_name: string } | null;
      return {
        ...v, pcb_code: p?.pcb_code ?? "", candidate_id: p?.candidate_id ?? "", candidate_code: c?.candidate_code ?? "", candidate_name: c?.full_name ?? "",
        created_by_name: v.created_by ? names.get(v.created_by) ?? "" : "", is_current: p?.current_approved_version_id === v.id,
        is_latest: !(versions ?? []).some((o) => o.pcb_id === v.pcb_id && o.version > v.version),
      };
    }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  });
export type PcbListRow = Awaited<ReturnType<typeof listPcbs>>[number];

export const candidatePcb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "pcb.view");
    const s = context.supabase;
    const { data: p } = await s.from("candidate_pcbs").select("id, pcb_code, current_approved_version_id").eq("candidate_id", data.candidateId).maybeSingle();
    if (!p) return null;
    const { data: versions } = await s.from("pcb_versions").select("id, version, status, primary_career_path, primary_target_role, target_duration_days, base_track_code, base_track_version, created_at, approved_at, change_reason, pcb_documents(id)").eq("pcb_id", p.id).order("version", { ascending: false });
    return { ...p, versions: (versions ?? []).map((v) => ({ ...v, has_pdf: (v.pcb_documents ?? []).length > 0 })) };
  });

export const searchPcbCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "pcb.create");
    const q = data.q.replace(/[%,()]/g, " ").trim();
    let query = context.supabase.from("candidates").select("id, candidate_code, full_name, primary_mobile, personal_email, journey_status").order("created_at", { ascending: false }).limit(20);
    if (q) query = query.or(`candidate_code.ilike.%${q}%,full_name.ilike.%${q}%,primary_mobile.ilike.%${q}%,personal_email.ilike.%${q}%`);
    const { data: rows } = await query;
    return rows ?? [];
  });

// ---------- Wizard ----------

export const pcbWizardContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin } = await candidateAccess(context, "pcb.create", data.candidateId);
    const candidate = await candidateSnapshot(admin, data.candidateId);
    const assessment = await assessmentSnapshot(admin, data.candidateId);
    const { data: existing } = await admin.from("candidate_pcbs").select("id, pcb_code").eq("candidate_id", data.candidateId).maybeSingle();
    return { candidate, assessment, existing, tracks: await activeTracks(admin) };
  });

async function activeTracks(admin: Admin) {
  const { data } = await admin.from("master_track_versions")
    .select("id, track_id, version, status, name, primary_role, duration_days, description, daily_hours, weekly_days, master_tracks!master_track_versions_track_id_fkey(code)")
    .in("status", ["ACTIVE", "DRAFT", "INACTIVE"]);
  return (data ?? []).map((v) => ({ ...v, code: (v.master_tracks as { code: string } | null)?.code ?? "" })).sort((a, b) => a.code.localeCompare(b.code));
}

export const pcbTrackOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "pcb.edit");
    return activeTracks(await getAdmin());
  });

export const pcbTrackContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ trackVersionId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const ok = await context.supabase.rpc("has_permission", { _uid: context.userId, _key: "pcb.edit" });
    const ok2 = await context.supabase.rpc("has_permission", { _uid: context.userId, _key: "pcb.create" });
    if (!ok.data && !ok2.data) throw new Error("You do not have permission to perform this action.");
    const admin = await getAdmin();
    const { data: v } = await admin.from("master_track_versions")
      .select("id, version, name, track_phases(id, name, sort_order, is_active), track_modules(id, phase_id, name, sort_order, is_active), track_roadmap_items(id, module_id, day_number, title, sort_order, is_active), track_resources(id, name, provider, sort_order, is_active), track_milestones(id, name, target_day, sort_order, is_active), track_project_templates(id, name, project_type, sort_order, is_active), track_weekly_reviews(id, title, week_number, sort_order, is_active), track_content_blocks(id, title, sort_order, is_active), track_outcomes(id, title, sort_order, is_active)")
      .eq("id", data.trackVersionId).maybeSingle();
    if (!v) throw new Error("Track version not found.");
    const s = <T extends { sort_order: number; is_active: boolean }>(l: T[]) => l.filter((x) => x.is_active).sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: v.id, version: v.version, name: v.name, phases: s(v.track_phases), modules: s(v.track_modules), items: s(v.track_roadmap_items),
      resources: s(v.track_resources), milestones: s(v.track_milestones), projects: s(v.track_project_templates), weekly: s(v.track_weekly_reviews),
      blocks: s(v.track_content_blocks), outcomes: s(v.track_outcomes),
    };
  });
export type TrackContent = Awaited<ReturnType<typeof pcbTrackContent>>;

const includeSchema = z.object({ curriculum: z.boolean(), resources: z.boolean(), milestones: z.boolean(), projects: z.boolean(), weekly: z.boolean(), content: z.boolean() });
const selectionSchema = z.object({
  phases: z.array(uuid).max(500).default([]), modules: z.array(uuid).max(500).default([]), items: z.array(uuid).max(2000).default([]),
  resources: z.array(uuid).max(500).default([]), milestones: z.array(uuid).max(200).default([]), projects: z.array(uuid).max(200).default([]),
  weekly: z.array(uuid).max(200).default([]), blocks: z.array(uuid).max(200).default([]), outcomes: z.array(uuid).max(200).default([]),
});

export const createPcb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    candidateId: uuid, trackVersionId: uuid, include: includeSchema,
    extra: z.array(z.object({ trackVersionId: uuid, selection: selectionSchema })).max(10).default([]),
    target_duration_days: z.coerce.number().int().min(1).max(730), daily_hours: z.coerce.number().min(0).max(24).nullish(),
    weekly_days: z.coerce.number().int().min(1).max(7).nullish(), target_completion_window: opt, overrideReason: opt,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin } = await candidateAccess(context, "pcb.create", data.candidateId);
    const snap = await assessmentSnapshot(admin, data.candidateId);
    if (!snap) {
      await requirePermission(context.supabase, context.userId, "pcb.override_assessment");
      if (!data.overrideReason || data.overrideReason.length < 5) throw new Error("A reason is required to create a PCB without a finalized assessment.");
    }
    const cand = await candidateSnapshot(admin, data.candidateId);
    const { data: tv } = await admin.from("master_track_versions").select("id, track_id, version, name, status, master_tracks!master_track_versions_track_id_fkey(code)").eq("id", data.trackVersionId).maybeSingle();
    if (!tv) throw new Error("Master Track version not found.");
    if (tv.status !== "ACTIVE") throw new Error("Choose an Active Master Track version as the base track.");
    const trackCode = (tv.master_tracks as { code: string } | null)?.code ?? "";

    let { data: pcb } = await admin.from("candidate_pcbs").select("*").eq("candidate_id", data.candidateId).maybeSingle();
    if (pcb) {
      const { data: open } = await admin.from("pcb_versions").select("id").eq("pcb_id", pcb.id).in("status", ["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED"]).limit(1);
      if (open?.length) throw new Error("This candidate already has a PCB. Open it, or create a new version from the approved one.");
    } else {
      const { data: created, error } = await admin.from("candidate_pcbs").insert({ pcb_code: pcbCode(cand.candidate_code), candidate_id: cand.id, created_by: actor.id }).select("*").single();
      errMsg(error, "Could not create PCB");
      pcb = created!;
    }
    const { data: last } = await admin.from("pcb_versions").select("version").eq("pcb_id", pcb.id).order("version", { ascending: false }).limit(1);
    const version = (last?.[0]?.version ?? 0) + 1;
    const { data: v, error: ve } = await admin.from("pcb_versions").insert({
      pcb_id: pcb.id, version, status: "DRAFT",
      assessment_id: snap?.assessment_id ?? null, assessment_code: snap?.assessment_code ?? null, assessment_snapshot: (snap ?? {}) as never, assessment_override: !snap,
      base_track_id: tv.track_id, base_track_version_id: tv.id, base_track_code: trackCode, base_track_version: tv.version, base_track_name: tv.name,
      target_duration_days: data.target_duration_days, daily_hours: data.daily_hours ?? null, weekly_days: data.weekly_days ?? null, target_completion_window: data.target_completion_window,
      current_profile_summary: cand.current_career_situation, transition_goal: snap?.career_objective ?? null,
      primary_career_path: snap?.primary.career_path ?? null, primary_target_role: snap?.primary.target_role ?? null,
      alt_career_path: snap?.alternative.career_path ?? null, alt_target_role: snap?.alternative.target_role ?? null,
      preferred_location: snap?.preferred_location ?? cand.preferred_locations, rationale: snap?.primary.rationale ?? null,
      created_by: actor.id, updated_by: actor.id,
    }).select("*").single();
    errMsg(ve, "Could not create PCB version");
    const vid = v!.id;
    if (!snap) await admin.from("pcb_version_internal").insert({ version_id: vid, override_reason: data.overrideReason });

    if (snap?.skill_gaps.length)
      await admin.from("pcb_skill_gaps").insert(snap.skill_gaps.map((g, i) => ({
        version_id: vid, skill: g.skill, current_level: g.current_level, target_level: g.required_level, priority: ["CRITICAL", "HIGH"].includes(g.priority) ? "HIGH" : g.priority,
        description: g.remarks, action: snap.development_plan.find((d) => d.area.toLowerCase() === g.skill.toLowerCase())?.recommendation ?? null,
        source_type: "ASSESSMENT", copied_at: new Date().toISOString(), sort_order: i + 1,
      })));

    await importTrack(admin, vid, tv.id, { all: true, include: { ...data.include, outcomes: true, content: false } }, true);
    // Document structure: default sections, global content copied, then track content blocks.
    const { data: globals } = await admin.from("global_pcb_content").select("id, code, title, content, version, status").neq("status", "ARCHIVED");
    const gmap = new Map((globals ?? []).map((g) => [g.code, g]));
    const now = new Date().toISOString();
    await admin.from("pcb_content_blocks").insert(DEFAULT_STRUCTURE.map((s, i) => {
      const g = s.global ? gmap.get(s.global) : undefined;
      const controlled = CONTROLLED_CODES.includes(s.code);
      return {
        version_id: vid, code: s.code, title: s.title, block_type: s.type, content: g?.content ?? null, is_included: true, is_controlled: controlled, is_locked: controlled,
        source_type: g ? "GLOBAL" : s.type === "DATA" ? "CANDIDATE" : "CUSTOM", source_track_code: g ? g.code : null, source_track_version: g ? String(g.version) : null,
        source_entity_id: g?.id ?? null, copied_at: g ? now : null, sort_order: (i + 1) * 10,
      };
    }));
    if (data.include.content) await importTrack(admin, vid, tv.id, { all: true, include: { content: true, curriculum: false, resources: false, milestones: false, projects: false, weekly: false, outcomes: false } }, true);
    for (const x of data.extra) await importTrack(admin, vid, x.trackVersionId, x.selection, x.trackVersionId === tv.id);

    const meta = await loadVersionMeta(admin, vid);
    await logPcb(admin, actor, meta, "pcb.created", "PCB Created", { base_track: `${trackCode} v${tv.version}` });
    if (!snap) await logPcb(admin, actor, meta, "pcb.assessment_override", "PCB Assessment Override Used");
    return { versionId: vid, pcbCode: pcb.pcb_code, version, journey: cand.journey_status };
  });

// ---------- Read ----------

export const getPcb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "pcb.view");
    const s = context.supabase;
    const v = await loadFull(s, data.versionId);
    const { data: pcb } = await s.from("candidate_pcbs").select("*").eq("id", v.pcb_id).single();
    const { data: versions } = await s.from("pcb_versions")
      .select("id, version, status, created_at, created_by, submitted_at, reviewed_by, reviewed_at, approved_at, approved_by, change_reason, created_from_version, pcb_documents(id, generated_at)")
      .eq("pcb_id", v.pcb_id).order("version", { ascending: false });
    const { data: internal } = await s.from("pcb_version_internal").select("*").eq("version_id", v.id).maybeSingle();
    const admin = await getAdmin();
    const candidate = await candidateSnapshot(admin, pcb!.candidate_id);
    const ids = new Set<string>();
    for (const x of [v, ...(versions ?? [])]) for (const k of ["created_by", "approved_by", "reviewed_by", "submitted_by"] as const) { const id = (x as Record<string, unknown>)[k]; if (typeof id === "string") ids.add(id); }
    const { data: people } = ids.size ? await s.from("profiles").select("id, full_name").in("id", [...ids]) : { data: [] };
    return {
      version: v, pcb: pcb!, candidate, internal, versions: versions ?? [],
      names: Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name])) as Record<string, string>,
      checklist: checklistFor(v, true),
    };
  });
export type PcbDetail = Awaited<ReturnType<typeof getPcb>>;

function checklistFor(v: FullVersion, candidateExists: boolean) {
  const included = v.pcb_content_blocks.filter((b) => b.is_included);
  return approvalChecklist({
    candidateExists, hasAssessment: !!v.assessment_id, override: v.assessment_override,
    primaryCareerPath: v.primary_career_path, primaryTargetRole: v.primary_target_role, dayItems: v.pcb_day_items.length,
    skillGaps: v.pcb_skill_gaps.length, capabilities: v.pcb_target_capabilities.length, projects: v.pcb_projects.length,
    targetDays: v.target_duration_days, plannedDays: plannedDays(v.pcb_day_items), durationAck: v.duration_ack,
    missingControlled: REQUIRED_CONTROLLED.filter((c) => !included.some((b) => b.code === c && (b.content ?? "").trim())).map((c) => c.replace(/_/g, " ").toLowerCase()),
  });
}

// ---------- Edit ----------

const headerSchema = z.object({
  versionId: uuid, lock: z.number().int(),
  fields: z.object({
    target_duration_days: z.coerce.number().int().min(1).max(730).optional(), daily_hours: z.coerce.number().min(0).max(24).nullish(),
    weekly_days: z.coerce.number().int().min(1).max(7).nullish(), target_completion_window: opt, current_profile_summary: opt, transition_goal: opt,
    primary_career_path: opt, primary_target_role: opt, alt_career_path: opt, alt_target_role: opt, target_industry: opt, preferred_location: opt,
    expected_outcome: opt, rationale: opt, duration_ack: z.boolean().optional(),
  }).partial(),
  internal_notes: opt.optional(),
});
export const savePcbHeader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => headerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.edit", data.versionId);
    const lock = await bump(admin, meta, data.lock, actor);
    const fields = Object.fromEntries(Object.entries(data.fields).filter(([, v]) => v !== undefined));
    if ("target_duration_days" in fields && fields["target_duration_days"] !== meta.v.target_duration_days) fields["duration_ack"] = false;
    const { error } = await admin.from("pcb_versions").update(fields as never).eq("id", meta.v.id);
    errMsg(error, "Could not save");
    if (data.internal_notes !== undefined) {
      const { data: ok } = await context.supabase.rpc("has_permission", { _uid: context.userId, _key: "pcb.view_internal" });
      if (ok) await admin.from("pcb_version_internal").upsert({ version_id: meta.v.id, internal_notes: data.internal_notes, updated_at: new Date().toISOString() });
    }
    await logPcb(admin, actor, meta, "pcb.updated", null, { section: "header" });
    return { lock };
  });

const PARENTS: Partial<Record<ContentTable, { col: string; table: ContentTable }>> = {
  pcb_modules: { col: "phase_id", table: "pcb_phases" }, pcb_day_items: { col: "module_id", table: "pcb_modules" },
  pcb_weekly_review_items: { col: "weekly_review_id", table: "pcb_weekly_reviews" }, pcb_resource_mappings: { col: "resource_id", table: "pcb_resources" },
};
const PROTECTED = ["version_id", "source_type", "source_track_code", "source_track_version", "source_entity_id", "copied_at", "is_controlled", "code", "block_type"];

async function blockGuard(ctx: Ctx, admin: Admin, versionId: string, id: string, row: Record<string, unknown> | null) {
  const { data: b } = await admin.from("pcb_content_blocks").select("is_controlled, is_locked, block_type").eq("id", id).eq("version_id", versionId).maybeSingle();
  if (!b) throw new Error("Content block not found.");
  const touchesText = row ? "content" in row || "title" in row : true;
  const touchesLock = row ? "is_locked" in row : false;
  if (b.is_controlled && (touchesText || touchesLock)) {
    const { data: ok } = await ctx.supabase.rpc("has_permission", { _uid: ctx.userId, _key: "pcb.controlled_content" });
    if (!ok) throw new Error("This is controlled content. Only authorized users can change it.");
  }
  if (b.is_locked && touchesText && !(row && "is_locked" in row && row["is_locked"] === false)) throw new Error("This content is locked. Unlock it before editing.");
  if (!row && b.block_type === "DATA") throw new Error("Data sections can be excluded but not deleted.");
}

const rowSchema = z.object({ table: z.enum(CONTENT_TABLES), versionId: uuid, lock: z.number().int(), row: z.record(z.string(), z.unknown()) });
export const upsertPcbRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rowSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.edit", data.versionId);
    const row: Record<string, unknown> = Object.fromEntries(Object.entries(data.row).filter(([k]) => !PROTECTED.includes(k)));
    if (data.table !== "pcb_content_blocks") delete row["is_locked"];
    for (const [k, v] of Object.entries(row)) if (v === "") row[k] = null;
    const id = typeof row["id"] === "string" ? (row["id"] as string) : null;
    delete row["id"];
    if (data.table === "pcb_content_blocks" && id) await blockGuard(context, admin, meta.v.id, id, row);
    const parent = PARENTS[data.table];
    if (parent && row[parent.col]) {
      const { data: p } = await admin.from(parent.table as "pcb_phases").select("id").eq("id", String(row[parent.col])).eq("version_id", meta.v.id).maybeSingle();
      if (!p) throw new Error("Parent item not found in this PCB version.");
    }
    if (data.table === "pcb_resource_mappings") {
      for (const k of ["phase_id", "module_id", "day_item_id"]) if (!row[k]) row[k] = null;
    }
    const lock = await bump(admin, meta, data.lock, actor);
    const tbl = admin.from(data.table as "pcb_phases");
    if (id) {
      const { error } = await tbl.update(row as never).eq("id", id).eq("version_id", meta.v.id);
      errMsg(error, "Could not save");
    } else {
      const { data: last } = await admin.from(data.table as "pcb_phases").select("sort_order").eq("version_id", meta.v.id).order("sort_order", { ascending: false }).limit(1);
      const source = data.table === "pcb_skill_gaps" ? "CONSULTANT" : "CUSTOM";
      const extra = data.table === "pcb_weekly_review_items" || data.table === "pcb_resource_mappings" ? {} : { source_type: source };
      const { error } = await tbl.insert({ ...row, ...extra, version_id: meta.v.id, sort_order: (last?.[0]?.sort_order ?? 0) + 1 } as never);
      errMsg(error, "Could not save");
    }
    await logPcb(admin, actor, meta, id ? "pcb.updated" : "pcb.custom_content_added", null, { section: data.table });
    return { lock };
  });

const idSchema = z.object({ table: z.enum(CONTENT_TABLES), versionId: uuid, lock: z.number().int(), id: uuid });
export const deletePcbRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.edit", data.versionId);
    if (data.table === "pcb_content_blocks") await blockGuard(context, admin, meta.v.id, data.id, null);
    const lock = await bump(admin, meta, data.lock, actor);
    const { error } = await admin.from(data.table as "pcb_phases").delete().eq("id", data.id).eq("version_id", meta.v.id);
    errMsg(error, "Could not remove");
    await logPcb(admin, actor, meta, "pcb.updated", null, { section: data.table, removed: true });
    return { lock };
  });

export const duplicatePcbRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.edit", data.versionId);
    const { data: src } = await admin.from(data.table as "pcb_phases").select("*").eq("id", data.id).eq("version_id", meta.v.id).maybeSingle();
    if (!src) throw new Error("Item not found.");
    if (data.table === "pcb_content_blocks" && (src as unknown as { block_type: string }).block_type === "DATA") throw new Error("Data sections cannot be duplicated.");
    const lock = await bump(admin, meta, data.lock, actor);
    const { id: _id, ...rest } = src as Record<string, unknown>;
    for (const k of ["title", "name"]) if (typeof rest[k] === "string") rest[k] = `${rest[k]} (copy)`;
    if ("is_controlled" in rest) { rest["is_controlled"] = false; rest["is_locked"] = false; rest["code"] = null; }
    const { data: created, error } = await admin.from(data.table as "pcb_phases").insert({ ...rest, sort_order: Number(rest["sort_order"] ?? 0) } as never).select("id").single();
    errMsg(error, "Could not duplicate");
    const copyItems = async (from: string, to: string) => {
      const { data: items } = await admin.from("pcb_day_items").select("*").eq("module_id", from);
      if (items?.length) await admin.from("pcb_day_items").insert(items.map(({ id: _i, ...r }) => ({ ...r, module_id: to })));
    };
    if (data.table === "pcb_phases") {
      const { data: mods } = await admin.from("pcb_modules").select("*").eq("phase_id", data.id);
      for (const m of mods ?? []) {
        const { id: mid, ...mr } = m;
        const { data: nm } = await admin.from("pcb_modules").insert({ ...mr, phase_id: created!.id }).select("id").single();
        await copyItems(mid, nm!.id);
      }
    } else if (data.table === "pcb_modules") await copyItems(data.id, created!.id);
    else if (data.table === "pcb_weekly_reviews") {
      const { data: items } = await admin.from("pcb_weekly_review_items").select("*").eq("weekly_review_id", data.id);
      if (items?.length) await admin.from("pcb_weekly_review_items").insert(items.map(({ id: _i, ...r }) => ({ ...r, weekly_review_id: created!.id })));
    }
    await logPcb(admin, actor, meta, "pcb.updated", null, { section: data.table, duplicated: true });
    return { lock };
  });

export const reorderPcbRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ table: z.enum(CONTENT_TABLES), versionId: uuid, lock: z.number().int(), ids: z.array(uuid).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.edit", data.versionId);
    const lock = await bump(admin, meta, data.lock, actor);
    await Promise.all(data.ids.map((id, i) => admin.from(data.table as "pcb_phases").update({ sort_order: (i + 1) * 10 }).eq("id", id).eq("version_id", meta.v.id)));
    return { lock };
  });

export const recalculatePcbDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, lock: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.edit", data.versionId);
    const lock = await bump(admin, meta, data.lock, actor);
    const [{ data: phases }, { data: modules }, { data: items }] = await Promise.all([
      admin.from("pcb_phases").select("id, sort_order").eq("version_id", meta.v.id),
      admin.from("pcb_modules").select("id, phase_id, sort_order").eq("version_id", meta.v.id),
      admin.from("pcb_day_items").select("id, module_id, sort_order, day_number").eq("version_id", meta.v.id),
    ]);
    const days = recalculateDays(phases ?? [], modules ?? [], items ?? []);
    await Promise.all(Object.entries(days).map(([id, d]) => admin.from("pcb_day_items").update({ day_number: d }).eq("id", id)));
    await admin.from("pcb_versions").update({ duration_ack: false }).eq("id", meta.v.id);
    await logPcb(admin, actor, meta, "pcb.updated", null, { section: "day_numbers" });
    return { lock };
  });

export const importIntoPcb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, lock: z.number().int(), trackVersionId: uuid, selection: selectionSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.edit", data.versionId);
    const lock = await bump(admin, meta, data.lock, actor);
    const r = await importTrack(admin, meta.v.id, data.trackVersionId, data.selection as Selection, data.trackVersionId === meta.v.base_track_version_id);
    await logPcb(admin, actor, meta, "pcb.track_content_added", null, { source_track: `${r.code} v${r.version}`, items: r.copied });
    return { lock, copied: r.copied };
  });

// ---------- Review ----------

export const addReviewNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, section: z.string().trim().min(1).max(60), comment: z.string().trim().min(1).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.review", data.versionId);
    if (["APPROVED", "SUPERSEDED", "CANCELLED"].includes(meta.v.status)) throw new Error("Review notes cannot be added to a closed version.");
    await admin.from("pcb_review_notes").insert({ version_id: meta.v.id, section: data.section, comment: data.comment, author_id: actor.id, author_name: actor.name });
    await logPcb(admin, actor, meta, "pcb.review_note_added", null, { section: data.section });
  });

export const resolveReviewNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "pcb.view");
    const [e, r] = await Promise.all(["pcb.edit", "pcb.review"].map((k) => context.supabase.rpc("has_permission", { _uid: context.userId, _key: k })));
    if (!e!.data && !r!.data) throw new Error("You do not have permission to perform this action.");
    const { admin, meta } = await access(context, "pcb.view", data.versionId);
    await admin.from("pcb_review_notes").update({ status: "RESOLVED", resolved_by: actor.id, resolved_at: new Date().toISOString() }).eq("id", data.id).eq("version_id", meta.v.id).eq("status", "OPEN");
    await logPcb(admin, actor, meta, "pcb.review_resolved", null);
  });

export const transitionPcb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, action: z.enum(["submit", "request_changes", "approve", "cancel", "reopen"]), remarks: opt }).parse(d))
  .handler(async ({ data, context }) => {
    const t = TRANSITIONS[data.action as PcbAction];
    const { actor, admin, meta } = await access(context, t.permission, data.versionId);
    if (!canTransition(data.action as PcbAction, meta.v.status)) throw new Error(`A ${meta.v.status.toLowerCase().replace("_", " ")} PCB cannot be ${data.action.replace("_", " ")}d.`);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: t.to, updated_by: actor.id, updated_at: now, lock_version: meta.v.lock_version + 1 };
    if (data.action === "submit") Object.assign(patch, { submitted_by: actor.id, submitted_at: now });
    if (data.action === "request_changes") {
      if (!data.remarks) throw new Error("Describe the changes you are requesting.");
      Object.assign(patch, { reviewed_by: actor.id, reviewed_at: now });
      await admin.from("pcb_review_notes").insert({ version_id: meta.v.id, section: "GENERAL", comment: data.remarks, author_id: actor.id, author_name: actor.name });
    }
    if (data.action === "cancel") Object.assign(patch, { cancelled_by: actor.id, cancelled_at: now });
    if (data.action === "approve") {
      const full = await loadFull(admin, meta.v.id);
      const failed = checklistFor(full, true).filter((c) => !c.ok);
      if (failed.length) throw new Error(`Cannot approve yet: ${failed.map((f) => f.label).join("; ")}.`);
      Object.assign(patch, { approved_by: actor.id, approved_at: now, approval_remarks: data.remarks, reviewed_by: meta.v.reviewed_by ?? actor.id, reviewed_at: meta.v.reviewed_at ?? now });
      await admin.from("pcb_versions").update({ status: "SUPERSEDED" }).eq("pcb_id", meta.pcb.id).eq("status", "APPROVED");
    }
    const { error } = await admin.from("pcb_versions").update(patch as never).eq("id", meta.v.id).eq("status", meta.v.status);
    errMsg(error, "Could not update status");
    const labels = { submit: ["pcb.submitted", "PCB Submitted for Review"], request_changes: ["pcb.changes_requested", "PCB Changes Requested"], approve: ["pcb.approved", "PCB Approved"], cancel: ["pcb.cancelled", "PCB Cancelled"], reopen: ["pcb.reopened", null] } as const;
    const [action, activity] = labels[data.action as PcbAction];
    await logPcb(admin, actor, meta, action, activity);
    if (data.action === "approve") {
      await admin.from("candidate_pcbs").update({ current_approved_version_id: meta.v.id, updated_at: now }).eq("id", meta.pcb.id);
      await storeApprovedPdf(admin, actor, meta.v.id);
    }
    return { status: t.to, journey: meta.cand.journey_status };
  });

async function storeApprovedPdf(admin: Admin, actor: Actor, versionId: string) {
  const { buildPcbPdf } = await import("./pdf.server");
  const meta = await loadVersionMeta(admin, versionId);
  const full = await loadFull(admin, versionId);
  const candidate = await candidateSnapshot(admin, meta.pcb.candidate_id);
  const bytes = await buildPcbPdf({ version: full, pcbCode: meta.pcb.pcb_code, candidate, draft: false });
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const name = `${pcbDisplayId(meta.pcb.pcb_code, full.version)}.pdf`;
  const path = `${meta.pcb.candidate_id}/${versionId}/${Date.now()}-${name}`;
  const { error } = await admin.storage.from("pcb-documents").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error("PCB approved, but the PDF could not be stored. Use Generate PDF to retry.");
  await admin.from("pcb_documents").insert({ version_id: versionId, storage_path: path, file_name: name, checksum: hash, size_bytes: bytes.byteLength, generated_by: actor.id });
  await logPcb(admin, actor, meta, "pcb.pdf_generated", "PCB PDF Generated");
}

export const regenerateApprovedPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.pdf", data.versionId);
    if (meta.v.status !== "APPROVED") throw new Error("Only approved versions get a stored PDF.");
    const { data: docs } = await admin.from("pcb_documents").select("id").eq("version_id", meta.v.id).limit(1);
    if (docs?.length) throw new Error("This version already has a stored PDF.");
    await storeApprovedPdf(admin, actor, meta.v.id);
  });

export const newPcbVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, reason: z.string().trim().min(3).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, meta } = await access(context, "pcb.version", data.versionId);
    if (!["APPROVED", "SUPERSEDED"].includes(meta.v.status)) throw new Error("New versions are created from an approved version.");
    const { data: open } = await admin.from("pcb_versions").select("version").eq("pcb_id", meta.pcb.id).in("status", ["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED"]).limit(1);
    if (open?.length) throw new Error(`V${open[0]!.version} is still open. Finish or cancel it first.`);
    const { data: last } = await admin.from("pcb_versions").select("version").eq("pcb_id", meta.pcb.id).order("version", { ascending: false }).limit(1);
    const version = (last?.[0]?.version ?? 0) + 1;
    const { id: _id, ...rest } = meta.v;
    const { data: nv, error } = await admin.from("pcb_versions").insert({
      ...rest, version, status: "DRAFT", created_from_version: meta.v.version, change_reason: data.reason, duration_ack: false,
      created_by: actor.id, created_at: new Date().toISOString(), submitted_by: null, submitted_at: null, reviewed_by: null, reviewed_at: null,
      approved_by: null, approved_at: null, approval_remarks: null, cancelled_by: null, cancelled_at: null, lock_version: 1, updated_by: actor.id, updated_at: new Date().toISOString(),
    }).select("id").single();
    errMsg(error, "Could not create the new version");
    const { error: ce } = await admin.rpc("pcb_copy_children" as never, { _src: meta.v.id, _dst: nv!.id } as never);
    if (ce) { await admin.from("pcb_versions").delete().eq("id", nv!.id); throw new Error("Could not copy PCB content"); }
    const { data: internal } = await admin.from("pcb_version_internal").select("*").eq("version_id", meta.v.id).maybeSingle();
    if (internal) await admin.from("pcb_version_internal").insert({ ...internal, version_id: nv!.id });
    await logPcb(admin, actor, { ...meta, v: { version } }, "pcb.version_created", "New PCB Version Created", { created_from: meta.v.version });
    return { versionId: nv!.id };
  });

// ---------- PDF ----------

export const pcbPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, meta } = await access(context, "pcb.pdf", data.versionId);
    const { data: doc } = await admin.from("pcb_documents").select("storage_path, file_name").eq("version_id", meta.v.id).order("generated_at", { ascending: false }).limit(1).maybeSingle();
    if (!doc) throw new Error("No stored PDF for this version.");
    const { data: url } = await admin.storage.from("pcb-documents").createSignedUrl(doc.storage_path, 300, { download: doc.file_name });
    if (!url) throw new Error("Could not open the PDF.");
    return { url: url.signedUrl };
  });

export const pcbDraftPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, meta } = await access(context, "pcb.pdf", data.versionId);
    const { buildPcbPdf } = await import("./pdf.server");
    const full = await loadFull(admin, meta.v.id);
    const candidate = await candidateSnapshot(admin, meta.pcb.candidate_id);
    const bytes = await buildPcbPdf({ version: full, pcbCode: meta.pcb.pcb_code, candidate, draft: meta.v.status !== "APPROVED" && meta.v.status !== "SUPERSEDED" });
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { base64: btoa(bin), fileName: `${pcbDisplayId(meta.pcb.pcb_code, full.version)}-preview.pdf` };
  });

// ---------- Candidate portal ----------

export const myPcb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("pcb_portal_summary" as never);
    return (data ?? null) as null | { pcb_code: string; version: number; approved_at: string; career_path: string | null; target_role: string | null; duration_days: number; has_pdf: boolean };
  });

export const myPcbPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: summary } = await context.supabase.rpc("pcb_portal_summary" as never);
    if (!summary) throw new Error("No approved PCB is available.");
    const admin = await getAdmin();
    const { data: link } = await admin.from("candidate_portal_links").select("candidate_id").eq("user_id", context.userId).is("disabled_at", null).maybeSingle();
    if (!link) throw new Error("No approved PCB is available.");
    const { data: pcb } = await admin.from("candidate_pcbs").select("current_approved_version_id").eq("candidate_id", link.candidate_id).maybeSingle();
    if (!pcb?.current_approved_version_id) throw new Error("No approved PCB is available.");
    const { data: doc } = await admin.from("pcb_documents").select("storage_path, file_name").eq("version_id", pcb.current_approved_version_id).order("generated_at", { ascending: false }).limit(1).maybeSingle();
    if (!doc) throw new Error("Your PCB document is being prepared.");
    const { data: url } = await admin.storage.from("pcb-documents").createSignedUrl(doc.storage_path, 300, { download: doc.file_name });
    if (!url) throw new Error("Could not open the PDF.");
    return { url: url.signedUrl };
  });
