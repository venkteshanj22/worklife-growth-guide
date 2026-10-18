import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdmin, requirePermission, writeAudit, type Actor } from "@/lib/admin/authz.server";
import type { Admin } from "@/lib/pcb/pcb.server";
import { progress, scheduleHealth, todayIST, isOverdue as dayOverdue } from "@/lib/roadmaps/model";
import {
  DEFAULT_CHECKLIST, NOT_ENTITLED, NOT_ENTITLED_SELF, REVIEW_ACTIONS, STALE_MESSAGE, CANDIDATE_WORK_ACTIONS,
  executionCode, isPremium, reviewEditable, workPermission, workTransition, type Kind, type ReviewAction, type WorkAction,
} from "./model";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const txt = (n = 4000) => z.string().max(n).nullable().optional();
const url = z.string().trim().max(500).refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Enter a full link starting with http:// or https://").nullable().optional();
type Ctx = { supabase: Admin; userId: string };
type Any = Record<string, unknown>;
type Cell = string | number | boolean | null;
type Rec = { [k: string]: Cell };

const TABLE = { REVIEW: "candidate_weekly_reviews", PROJECT: "candidate_projects", TASK: "candidate_premium_tasks" } as const;
const PERM = { REVIEW: "weekly_review", PROJECT: "project", TASK: "premium_task" } as const;
const NAME = { REVIEW: "Weekly Review", PROJECT: "Project", TASK: "Premium Task" } as const;
const kindZ = z.enum(["REVIEW", "PROJECT", "TASK"]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (c: Admin, k: Kind) => c.from(TABLE[k] as "candidate_projects") as any;

async function scope(ctx: Ctx, kind: Kind, perm: string, candidateId: string) {
  const actor = await requirePermission(ctx.supabase, ctx.userId, perm);
  const { data: ok } = await ctx.supabase.rpc("can_read_execution" as never, { _kind: kind, _cid: candidateId } as never);
  if (!ok) throw new Error("You do not have access to this candidate's records.");
  return { actor, admin: await getAdmin() };
}
async function recordScope(ctx: Ctx, kind: Kind, perm: string, id: string) {
  const admin = await getAdmin();
  const { data: rec } = await tbl(admin, kind).select("*").eq("id", id).maybeSingle();
  if (!rec) throw new Error(`${NAME[kind]} not found.`);
  const { actor } = await scope(ctx, kind, perm, rec.candidate_id);
  return { actor, admin, rec: rec as Any & { id: string; code: string; candidate_id: string; status: string; lock_version: number } };
}
async function lockedUpdate(admin: Admin, kind: Kind, id: string, lock: number, patch: Any) {
  const { data, error } = await tbl(admin, kind).update({ ...patch, lock_version: lock + 1, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq("id", id).eq("lock_version", lock).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(STALE_MESSAGE);
  return data as Any;
}
async function log(admin: Admin, actor: Actor, kind: Kind, rec: { id: string; code: string; candidate_id: string }, event: string,
  o: { from?: string | null; to?: string | null; reason?: string | null; audit?: string; activity?: boolean } = {}) {
  await admin.from("candidate_execution_history").insert({ kind, record_id: rec.id, candidate_id: rec.candidate_id, event, from_status: o.from ?? null, to_status: o.to ?? null, reason: o.reason ?? null, actor_id: actor.id, actor_name: actor.name });
  if (o.activity !== false) await admin.from("candidate_activity").insert({ candidate_id: rec.candidate_id, event, actor_id: actor.id, actor_name: actor.name, metadata: { code: rec.code } as never });
  if (o.audit) await writeAudit(admin, actor, { action: o.audit, target_type: kind.toLowerCase(), target_id: rec.id, target_label: rec.code, metadata: { candidate_id: rec.candidate_id, from: o.from ?? null, to: o.to ?? null } });
}
async function saveInternal(admin: Admin, actor: Actor, kind: Kind, rec: { id: string; candidate_id: string }, notes: string | null | undefined) {
  if (notes === undefined) return;
  await admin.from("candidate_execution_internal").upsert({ kind, record_id: rec.id, candidate_id: rec.candidate_id, notes, updated_by: actor.id, updated_at: new Date().toISOString() });
}
async function canInternal(ctx: Ctx, kind: Kind) {
  const { data } = await ctx.supabase.rpc("has_permission", { _uid: ctx.userId, _key: `${PERM[kind]}.view_internal` });
  return !!data;
}
async function nextCode(admin: Admin, kind: Kind, candidateId: string) {
  const { data: c } = await admin.from("candidates").select("candidate_code").eq("id", candidateId).single();
  const { data: seq, error } = await admin.rpc("execution_next_seq" as never, { _cid: candidateId, _kind: kind } as never);
  if (error) throw new Error("Could not generate an ID.");
  return { code: executionCode(kind, c!.candidate_code, seq as unknown as number), seq: seq as unknown as number };
}
async function names(client: Admin, ids: (string | null | undefined)[]) {
  const u = [...new Set(ids.filter((x): x is string => !!x))];
  if (!u.length) return new Map<string, string>();
  const { data } = await client.from("profiles").select("id, full_name").in("id", u);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}
async function consultants(client: Admin, candidateIds: string[]) {
  if (!candidateIds.length) return new Map<string, string>();
  const { data } = await client.from("candidate_assignments").select("candidate_id, profiles!candidate_assignments_user_id_fkey(full_name)").eq("assignment_type", "career_consultant").in("candidate_id", candidateIds);
  return new Map((data ?? []).map((a) => [a.candidate_id, (a.profiles as { full_name: string } | null)?.full_name ?? ""]));
}

// ---------- Staff reads ----------

const LIST_COLS = {
  REVIEW: "id, code, candidate_id, roadmap_id, week_number, scheduled_date, actual_date, reviewer_id, snap_progress, result, status, last_activity_at",
  PROJECT: "id, code, candidate_id, roadmap_id, name, project_type, planned_due_date, status, reviewer_id, submitted_at, last_activity_at",
  TASK: "id, code, candidate_id, name, assigned_date, due_date, status, assigned_by_name, reviewer_id, submitted_at, last_activity_at",
} as const;

export const listExecution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: kindZ, page: z.number().int().min(0).max(1000).default(0) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, `${PERM[data.kind]}.view`);
    const size = 200;
    const { data: rows } = await tbl(context.supabase, data.kind).select(`${LIST_COLS[data.kind]}, candidates(candidate_code, full_name), candidate_roadmaps(code)`)
      .order("last_activity_at", { ascending: false }).range(data.page * size, data.page * size + size - 1);
    const list = (rows ?? []) as (Any & { candidate_id: string; reviewer_id: string | null; candidates: { candidate_code: string; full_name: string } | null; candidate_roadmaps?: { code: string } | null })[];
    const [cons, rev] = await Promise.all([consultants(context.supabase, [...new Set(list.map((r) => r.candidate_id))]), names(context.supabase, list.map((r) => r.reviewer_id))]);
    return {
      today: todayIST(), hasMore: list.length === size,
      rows: list.map(({ candidates, candidate_roadmaps, ...r }) => ({
        ...r, candidate_code: candidates?.candidate_code ?? "", candidate_name: candidates?.full_name ?? "", roadmap_code: candidate_roadmaps?.code ?? null,
        consultant: cons.get(r.candidate_id) ?? "", reviewer: r.reviewer_id ? rev.get(r.reviewer_id) ?? "" : "",
      })) as (Rec & { id: string; code: string; status: string; candidate_code: string; candidate_name: string; consultant: string; reviewer: string; roadmap_code: string | null })[],
    };
  });

async function reviewerOptions(client: Admin) {
  const { data } = await client.rpc("candidate_options");
  return ((data as { staff?: { id: string; full_name: string; role_key: string }[] } | null)?.staff ?? []);
}

export const getExecution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: kindZ, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, `${PERM[data.kind]}.view`);
    const s = context.supabase;
    const { data: rec } = await tbl(s, data.kind).select("*, candidates(candidate_code, full_name, program_plan), candidate_roadmaps(code)").eq("id", data.id).maybeSingle();
    if (!rec) throw new Error(`${NAME[data.kind]} not found or access denied.`);
    const [hist, subs, revs, items, internal, staff] = await Promise.all([
      s.from("candidate_execution_history").select("*").eq("record_id", data.id).order("created_at", { ascending: false }),
      s.from("candidate_execution_submissions").select("*").eq("record_id", data.id).order("attempt", { ascending: false }),
      s.from("candidate_execution_reviews").select("*").eq("record_id", data.id).order("created_at", { ascending: false }),
      data.kind === "REVIEW" ? s.from("candidate_weekly_review_items").select("*").eq("review_id", data.id).order("sort_order") : Promise.resolve({ data: [] }),
      s.from("candidate_execution_internal").select("notes, updated_at").eq("kind", data.kind).eq("record_id", data.id).maybeSingle(),
      reviewerOptions(s),
    ]);
    const n = await names(s, [rec.reviewer_id, rec.completed_by, rec.missed_by, rec.corrected_by]);
    return {
      record: rec as Rec & { id: string; code: string; candidate_id: string; status: string; lock_version: number; reviewer_id: string | null },
      candidate: rec.candidates as { candidate_code: string; full_name: string; program_plan: string | null },
      roadmapCode: (rec.candidate_roadmaps as { code: string } | null)?.code ?? null,
      names: Object.fromEntries(n), history: hist.data ?? [], submissions: subs.data ?? [], reviews: revs.data ?? [],
      items: (items.data ?? []) as { id: string; label: string; answer: boolean | null; sort_order: number }[],
      internal: internal.data?.notes ?? null, canInternal: await canInternal(context, data.kind), staff, today: todayIST(),
    };
  });
export type ExecutionDetail = Awaited<ReturnType<typeof getExecution>>;

/** Candidate 360: all three modules for one candidate (each only when permitted). */
export const candidateExecution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid, kind: kindZ }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, `${PERM[data.kind]}.view`);
    const s = context.supabase;
    const { data: cand } = await s.from("candidates").select("id, candidate_code, program_plan").eq("id", data.candidateId).maybeSingle();
    if (!cand) throw new Error("Candidate not found or access denied.");
    const { data: rows } = await tbl(s, data.kind).select(`${LIST_COLS[data.kind]}`).eq("candidate_id", data.candidateId).order("created_at", { ascending: false });
    const { data: rm } = await s.from("candidate_roadmaps").select("id, code, status, pcb_version_id, start_date").eq("candidate_id", data.candidateId).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(1).maybeSingle();
    let sources: { id: string; name: string; project_type: string; initialized: boolean }[] = [];
    if (data.kind === "PROJECT" && rm) {
      const admin = await getAdmin();
      const { data: pp } = await admin.from("pcb_projects").select("id, name, project_type").eq("version_id", rm.pcb_version_id).order("sort_order");
      const { data: ex } = await s.from("candidate_projects").select("source_pcb_project_id").eq("candidate_id", data.candidateId).neq("status", "CANCELLED");
      const used = new Set((ex ?? []).map((x) => x.source_pcb_project_id));
      sources = (pp ?? []).map((p) => ({ ...p, initialized: used.has(p.id) }));
    }
    const list = (rows ?? []) as (Any & { reviewer_id: string | null })[];
    const n = await names(s, list.map((r) => r.reviewer_id));
    return {
      candidate: cand, roadmap: rm, sources, staff: await reviewerOptions(s), today: todayIST(), entitled: isPremium(cand.program_plan),
      rows: list.map((r) => ({ ...r, reviewer: r.reviewer_id ? n.get(r.reviewer_id) ?? "" : "" })) as unknown as (Rec & { id: string; code: string; status: string; reviewer: string })[],
    };
  });

export type CandidateExec = Awaited<ReturnType<typeof candidateExecution>>;

// ---------- Weekly reviews ----------

export const scheduleReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid, weekNumber: z.number().int().min(1).max(200), periodStart: date.nullable().optional(), periodEnd: date.nullable().optional(), scheduledDate: date, reviewerId: uuid.nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin } = await scope(context, "REVIEW", "weekly_review.create", data.candidateId);
    const { data: rm } = await admin.from("candidate_roadmaps").select("id, pcb_code, pcb_version, pcb_version_id").eq("candidate_id", data.candidateId).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(1).maybeSingle();
    let template: { id: string; items: string[] } | null = null;
    if (rm) {
      const { data: wr } = await admin.from("pcb_weekly_reviews").select("id, pcb_weekly_review_items(item, sort_order)").eq("version_id", rm.pcb_version_id).eq("week_number", data.weekNumber).limit(1).maybeSingle();
      const its = [...(wr?.pcb_weekly_review_items ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.item);
      if (wr && its.length) template = { id: wr.id, items: its };
    }
    const { code, seq } = await nextCode(admin, "REVIEW", data.candidateId);
    const { data: rec, error } = await admin.from("candidate_weekly_reviews").insert({
      code, candidate_id: data.candidateId, roadmap_id: rm?.id ?? null, source_pcb_code: rm?.pcb_code ?? null, source_pcb_version: rm?.pcb_version ?? null, source_pcb_version_id: rm?.pcb_version_id ?? null,
      source_review_template_id: template?.id ?? null, review_number: seq, week_number: data.weekNumber, period_start: data.periodStart ?? null, period_end: data.periodEnd ?? null,
      scheduled_date: data.scheduledDate, reviewer_id: data.reviewerId ?? null, created_by: actor.id,
    }).select("id, code, candidate_id").single();
    if (error) throw new Error(error.message);
    await admin.from("candidate_weekly_review_items").insert((template?.items ?? DEFAULT_CHECKLIST).map((label, i) => ({ review_id: rec.id, candidate_id: data.candidateId, label, sort_order: i })));
    await log(admin, actor, "REVIEW", rec, "Weekly Review Scheduled", { to: "SCHEDULED" });
    return { id: rec.id };
  });

const reviewFields = z.object({
  reviewer_id: uuid.nullable().optional(), scheduled_date: date.optional(), period_start: date.nullable().optional(), period_end: date.nullable().optional(), actual_date: date.nullable().optional(),
  result: z.enum(["ON_TRACK", "ATTENTION", "BEHIND"]).nullable().optional(),
  key_progress: txt(), strengths: txt(), improvement_areas: txt(), clarification_topics: txt(), roadblocks: txt(), consultant_remarks: txt(), candidate_feedback: txt(), next_week_plan: txt(),
});

export const saveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, lock: z.number().int(), fields: reviewFields, checklist: z.array(z.object({ id: uuid, answer: z.boolean().nullable() })).max(50).default([]), internal: txt(8000), correctionReason: z.string().trim().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const pre = await recordScope(context, "REVIEW", "weekly_review.view", data.id);
    const correcting = pre.rec.status === "COMPLETED";
    if (correcting) {
      await requirePermission(context.supabase, context.userId, "weekly_review.correct");
      if (!data.correctionReason) throw new Error("A correction reason is required to change a completed review.");
    } else {
      await requirePermission(context.supabase, context.userId, "weekly_review.edit");
      if (!reviewEditable(pre.rec.status)) throw new Error("This review is read-only.");
    }
    if (data.internal !== undefined && !(await canInternal(context, "REVIEW"))) throw new Error("You cannot edit internal notes.");
    const patch: Any = { ...data.fields };
    if (correcting) Object.assign(patch, { corrected_at: new Date().toISOString(), corrected_by: pre.actor.id, correction_reason: data.correctionReason });
    await lockedUpdate(pre.admin, "REVIEW", data.id, data.lock, patch);
    for (const c of data.checklist) await pre.admin.from("candidate_weekly_review_items").update({ answer: c.answer }).eq("id", c.id).eq("review_id", data.id);
    await saveInternal(pre.admin, pre.actor, "REVIEW", pre.rec, data.internal);
    if (correcting) await log(pre.admin, pre.actor, "REVIEW", pre.rec, "Weekly Review Corrected", { reason: data.correctionReason, audit: "review.corrected", activity: false });
    return { ok: true };
  });

async function roadmapSnapshot(admin: Admin, roadmapId: string | null) {
  if (!roadmapId) return {};
  const { data: rm } = await admin.from("candidate_roadmaps").select("weekly_days, status, candidate_roadmap_items(status, planned_date)").eq("id", roadmapId).single();
  const items = rm?.candidate_roadmap_items ?? [];
  const today = todayIST();
  return {
    snap_progress: progress(items).pct, snap_completed: items.filter((i) => i.status === "COMPLETED").length, snap_in_progress: items.filter((i) => i.status === "IN_PROGRESS").length,
    snap_pending: items.filter((i) => i.status === "PENDING").length, snap_overdue: items.filter((i) => dayOverdue(i, today)).length,
    snap_health: rm?.status === "ACTIVE" ? scheduleHealth(items, today, rm.weekly_days).status : null,
  };
}

export const reviewAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, lock: z.number().int(), action: z.enum(["start", "complete", "missed", "cancel"]), reason: z.string().trim().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const a = REVIEW_ACTIONS[data.action as ReviewAction];
    const { actor, admin, rec } = await recordScope(context, "REVIEW", a.permission, data.id);
    if (!a.from.includes(rec.status)) throw new Error("This action is not allowed in the current status.");
    if (a.reason && !data.reason) throw new Error("A reason is required.");
    const now = new Date().toISOString();
    const patch: Any = { status: a.to };
    if (data.action === "start") patch.started_at = now;
    if (data.action === "complete") {
      if (!rec.result) throw new Error("Choose a Review Result before completing.");
      Object.assign(patch, await roadmapSnapshot(admin, rec.roadmap_id as string | null), { completed_at: now, completed_by: actor.id, actual_date: rec.actual_date ?? todayIST() });
    }
    if (data.action === "missed") Object.assign(patch, { missed_at: now, missed_by: actor.id, missed_reason: data.reason });
    if (data.action === "cancel") patch.cancel_reason = data.reason;
    await lockedUpdate(admin, "REVIEW", rec.id, data.lock, patch);
    const ev = { start: "Weekly Review Started", complete: "Weekly Review Completed", missed: "Weekly Review Missed", cancel: "Weekly Review Cancelled" }[data.action];
    await log(admin, actor, "REVIEW", rec, ev, { from: rec.status, to: a.to, reason: data.reason, audit: data.action === "complete" ? "review.completed" : data.action === "missed" ? "review.missed" : data.action === "cancel" ? "review.cancelled" : undefined });
    return { ok: true };
  });

// ---------- Projects & tasks (staff) ----------

export const initProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid, sourceIds: z.array(uuid).min(1).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin } = await scope(context, "PROJECT", "project.initialize", data.candidateId);
    const { data: rm } = await admin.from("candidate_roadmaps").select("id, pcb_code, pcb_version, pcb_version_id, candidate_roadmap_items(day_number, planned_date)").eq("candidate_id", data.candidateId).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!rm) throw new Error("This candidate has no roadmap to initialize projects from.");
    const { data: src } = await admin.from("pcb_projects").select("*").eq("version_id", rm.pcb_version_id).in("id", data.sourceIds);
    const { data: existing } = await admin.from("candidate_projects").select("source_pcb_project_id").eq("candidate_id", data.candidateId).neq("status", "CANCELLED");
    const used = new Set((existing ?? []).map((e) => e.source_pcb_project_id));
    const dayDate = (n: number | null) => (n == null ? null : [...(rm.candidate_roadmap_items ?? [])].filter((i) => i.day_number === n).map((i) => i.planned_date).sort()[0] ?? null);
    const created: string[] = [];
    for (const p of src ?? []) {
      if (used.has(p.id)) continue;
      const { code } = await nextCode(admin, "PROJECT", data.candidateId);
      const { data: rec, error } = await admin.from("candidate_projects").insert({
        code, candidate_id: data.candidateId, roadmap_id: rm.id, source_pcb_code: rm.pcb_code, source_pcb_version: rm.pcb_version, source_pcb_version_id: rm.pcb_version_id, source_pcb_project_id: p.id,
        name: p.name, project_type: p.project_type, scenario: p.scenario, description: p.description, objectives: p.features, technologies: p.technologies, deliverables: p.deliverables,
        planned_start_date: dayDate(p.start_day), planned_due_date: dayDate(p.end_day), created_by: actor.id,
      }).select("id, code, candidate_id").single();
      if (error) { if (error.code === "23505") continue; throw new Error(error.message); }
      await log(admin, actor, "PROJECT", rec, "Project Initialized", { to: "NOT_STARTED", audit: "project.initialized" });
      created.push(rec.id);
    }
    if (!created.length) throw new Error("These projects are already initialized.");
    return { created: created.length };
  });

export const assignTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid, name: z.string().trim().min(2).max(200), details: txt(), resource_link: url, due_date: date.nullable().optional(), reviewer_id: uuid.nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin } = await scope(context, "TASK", "premium_task.create", data.candidateId);
    const { data: c } = await admin.from("candidates").select("program_plan").eq("id", data.candidateId).single();
    if (!isPremium(c?.program_plan)) throw new Error(NOT_ENTITLED);
    const { data: rm } = await admin.from("candidate_roadmaps").select("id").eq("candidate_id", data.candidateId).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { code } = await nextCode(admin, "TASK", data.candidateId);
    const { data: rec, error } = await admin.from("candidate_premium_tasks").insert({
      code, candidate_id: data.candidateId, roadmap_id: rm?.id ?? null, assigned_by: actor.id, assigned_by_name: actor.name, reviewer_id: data.reviewer_id ?? null,
      name: data.name, details: data.details ?? null, resource_link: data.resource_link || null, due_date: data.due_date ?? null,
    }).select("id, code, candidate_id").single();
    if (error) throw new Error(error.message.includes("Premium") ? NOT_ENTITLED : error.message);
    await log(admin, actor, "TASK", rec, "Premium Task Assigned", { to: "ASSIGNED", audit: "premium_task.assigned" });
    return { id: rec.id };
  });

export const updateWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    kind: z.enum(["PROJECT", "TASK"]), id: uuid, lock: z.number().int(),
    fields: z.object({ reviewer_id: uuid.nullable().optional(), planned_start_date: date.nullable().optional(), planned_due_date: date.nullable().optional(), due_date: date.nullable().optional(), name: z.string().trim().min(2).max(200).optional(), details: txt(), resource_link: url }),
    internal: txt(8000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, rec } = await recordScope(context, data.kind, `${PERM[data.kind]}.edit`, data.id);
    if (rec.status === "COMPLETED" || rec.status === "CANCELLED") throw new Error("This record is historical and read-only.");
    if (data.internal !== undefined && !(await canInternal(context, data.kind))) throw new Error("You cannot edit internal notes.");
    const allowed = data.kind === "PROJECT" ? ["reviewer_id", "planned_start_date", "planned_due_date"] : ["reviewer_id", "due_date", "name", "details", "resource_link"];
    const patch = Object.fromEntries(Object.entries(data.fields).filter(([k, v]) => allowed.includes(k) && v !== undefined));
    if (Object.keys(patch).length) await lockedUpdate(admin, data.kind, rec.id, data.lock, patch);
    await saveInternal(admin, actor, data.kind, rec, data.internal);
    return { ok: true };
  });

export const reviewWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    kind: z.enum(["PROJECT", "TASK"]), id: uuid, lock: z.number().int(), action: z.enum(["request_changes", "complete", "cancel"]),
    ratings: z.record(z.string(), z.enum(["EXCELLENT", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT"])).default({}),
    strengths: txt(), improvement_areas: txt(), reviewer_remarks: txt(), candidate_feedback: txt(), internal: txt(8000), reason: z.string().trim().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, rec } = await recordScope(context, data.kind, workPermission(data.kind, data.action), data.id);
    const to = workTransition(data.kind, data.action, rec.status);
    if (!to) throw new Error("This action is not allowed in the current status.");
    const now = new Date().toISOString();
    const N = NAME[data.kind];
    if (data.action === "cancel") {
      if (!data.reason) throw new Error("A cancellation reason is required.");
      await lockedUpdate(admin, data.kind, rec.id, data.lock, { status: to, cancel_reason: data.reason });
      await log(admin, actor, data.kind, rec, `${N} Cancelled`, { from: rec.status, to, reason: data.reason, audit: `${PERM[data.kind]}.cancelled` });
      return { ok: true };
    }
    if (data.action === "request_changes" && !data.candidate_feedback?.trim()) throw new Error("Candidate-visible feedback is required when requesting changes.");
    if (data.internal !== undefined && !(await canInternal(context, data.kind))) throw new Error("You cannot add internal notes.");
    const { count } = await admin.from("candidate_execution_submissions").select("id", { count: "exact", head: true }).eq("record_id", rec.id);
    const patch: Any = { status: to, reviewer_remarks: data.reviewer_remarks ?? null, candidate_feedback: data.candidate_feedback ?? null };
    if (data.kind === "PROJECT") patch.reviewed_at = now;
    if (!rec.reviewer_id) patch.reviewer_id = actor.id;
    if (to === "COMPLETED") patch.completed_at = now;
    await lockedUpdate(admin, data.kind, rec.id, data.lock, patch);
    await admin.from("candidate_execution_reviews").insert({ kind: data.kind, record_id: rec.id, candidate_id: rec.candidate_id, attempt: count ?? null, outcome: to as "COMPLETED", ratings: data.ratings as never, strengths: data.strengths ?? null, improvement_areas: data.improvement_areas ?? null, reviewer_remarks: data.reviewer_remarks ?? null, candidate_feedback: data.candidate_feedback ?? null, reviewer_id: actor.id, reviewer_name: actor.name });
    await saveInternal(admin, actor, data.kind, rec, data.internal);
    await log(admin, actor, data.kind, rec, to === "COMPLETED" ? `${N} Completed` : `${N} Changes Requested`, { from: rec.status, to, audit: `${PERM[data.kind]}.${to === "COMPLETED" ? "completed" : "changes_requested"}` });
    return { ok: true };
  });

// ---------- Candidate portal ----------

async function me(ctx: Ctx) {
  const { data: cid } = await ctx.supabase.rpc("roadmap_my_candidate" as never);
  if (!cid) return null;
  const admin = await getAdmin();
  const { data: c } = await admin.from("candidates").select("id, program_plan").eq("id", cid as unknown as string).single();
  return { cid: cid as unknown as string, plan: c?.program_plan ?? null, admin };
}

export const myPortalPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await me(context);
    return { premium: isPremium(m?.plan) };
  });

/** Candidate-safe review projection — internal notes and staff remarks are never selected. */
export const myWeekly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await me(context);
    if (!m) return null;
    const { data } = await m.admin.from("candidate_weekly_reviews").select("id, code, week_number, scheduled_date, actual_date, status, snap_progress, result, key_progress, improvement_areas, candidate_feedback, next_week_plan")
      .eq("candidate_id", m.cid).neq("status", "CANCELLED").order("week_number", { ascending: false }).limit(60);
    return { reviews: (data ?? []).map((r) => r.status === "COMPLETED" ? r : { ...r, snap_progress: null, result: null, key_progress: null, improvement_areas: null, candidate_feedback: null, next_week_plan: null }) };
  });

const WORK_SAFE = {
  PROJECT: "id, code, name, project_type, scenario, description, objectives, technologies, deliverables, planned_due_date, status, github_url, live_url, submission_notes, candidate_feedback, submitted_at, completed_at, lock_version",
  TASK: "id, code, name, details, resource_link, due_date, status, submission, submission_link, candidate_feedback, submitted_at, completed_at, lock_version",
} as const;

export const myWorkList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["PROJECT", "TASK"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await me(context);
    if (!m) return null;
    const entitled = isPremium(m.plan);
    const { data: rows } = await tbl(m.admin, data.kind).select(WORK_SAFE[data.kind]).eq("candidate_id", m.cid).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(100);
    const list = (rows ?? []) as (Rec & { id: string; code: string; name: string; status: string; lock_version: number; candidate_feedback: string | null })[];
    const ids = list.map((r) => r.id);
    const { data: fb } = ids.length ? await m.admin.from("candidate_execution_reviews").select("record_id, outcome, candidate_feedback, created_at").in("record_id", ids).order("created_at", { ascending: false }) : { data: [] };
    return { entitled, today: todayIST(), rows: list.map((r) => ({ ...r, feedback: (fb ?? []).filter((f) => f.record_id === r.id && f.candidate_feedback) })) };
  });

export const myWorkAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["PROJECT", "TASK"]), id: uuid, lock: z.number().int(), action: z.enum(["start", "submit", "resubmit"]), github_url: url, live_url: url, link: url, notes: txt() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await me(context);
    if (!m) throw new Error("Your portal account is not linked to a candidate record.");
    const { data: rec } = await tbl(m.admin, data.kind).select("id, code, candidate_id, status").eq("id", data.id).maybeSingle();
    if (!rec || rec.candidate_id !== m.cid) throw new Error(`${NAME[data.kind]} not found.`);
    if (data.kind === "TASK" && !isPremium(m.plan) && rec.status === "ASSIGNED") throw new Error(NOT_ENTITLED_SELF);
    if (!CANDIDATE_WORK_ACTIONS.includes(data.action as WorkAction)) throw new Error("Not allowed.");
    const to = workTransition(data.kind, data.action, rec.status);
    if (!to) throw new Error("This action is not available right now. Refresh to see the latest status.");
    const { data: ctxu } = await context.supabase.rpc("current_user_context");
    const actor: Actor = { id: context.userId, name: (ctxu as { full_name?: string } | null)?.full_name ?? "Candidate", roleKey: "candidate" };
    const now = new Date().toISOString();
    const patch: Any = { status: to };
    if (data.action === "start") { if (data.kind === "PROJECT") patch.actual_start_date = todayIST(); else patch.started_at = now; }
    else {
      if (data.kind === "PROJECT") {
        if (!data.github_url) throw new Error("GitHub URL is required to submit.");
        Object.assign(patch, { github_url: data.github_url, live_url: data.live_url || null, submission_notes: data.notes ?? null, submitted_at: now });
      } else {
        if (!data.notes?.trim() && !data.link) throw new Error("Add your submission or a submission link.");
        Object.assign(patch, { submission: data.notes ?? null, submission_link: data.link || null, submitted_at: now });
      }
    }
    await lockedUpdate(m.admin, data.kind, rec.id, data.lock, patch);
    if (data.action !== "start") {
      const { count } = await m.admin.from("candidate_execution_submissions").select("id", { count: "exact", head: true }).eq("record_id", rec.id);
      await m.admin.from("candidate_execution_submissions").insert({ kind: data.kind, record_id: rec.id, candidate_id: rec.candidate_id, attempt: (count ?? 0) + 1, github_url: data.github_url || null, live_url: data.live_url || null, link: data.link || null, notes: data.notes ?? null });
    }
    const N = NAME[data.kind];
    await log(m.admin, actor, data.kind, rec, `${N} ${{ start: "Started", submit: "Submitted", resubmit: "Resubmitted" }[data.action]}`, { from: rec.status, to });
    return { ok: true };
  });
