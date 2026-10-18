import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdmin, requirePermission, type Actor } from "@/lib/admin/authz.server";
import type { Admin } from "@/lib/pcb/pcb.server";
import {
  ROADMAP_ACTIONS, canRoadmapAction, candidateMayMove, isExecutable, isReadOnly, progress, scheduleHealth, staffMovePermission, todayIST, type RoadmapAction,
} from "./model";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
type Ctx = { supabase: Admin; userId: string };
const STALE = "This item was changed by someone else. Refresh to see the latest before updating.";

async function roadmapAccess(ctx: Ctx, perm: string, roadmapId: string) {
  const actor = await requirePermission(ctx.supabase, ctx.userId, perm);
  const { data: ok } = await ctx.supabase.rpc("can_read_roadmap" as never, { _rid: roadmapId } as never);
  if (!ok) throw new Error("You do not have access to this roadmap.");
  const admin = await getAdmin();
  const { data: rm } = await admin.from("candidate_roadmaps").select("*").eq("id", roadmapId).single();
  return { actor, admin, rm: rm! };
}
async function itemAccess(ctx: Ctx, perm: string, itemId: string) {
  const admin = await getAdmin();
  const { data: it } = await admin.from("candidate_roadmap_items").select("*").eq("id", itemId).maybeSingle();
  if (!it) throw new Error("Day item not found.");
  const r = await roadmapAccess(ctx, perm, it.roadmap_id);
  return { ...r, it };
}

const ITEM_COLS = "id, phase_id, module_id, day_number, title, topic, description, objective, learning_minutes, practice_minutes, activity, expected_output, planned_date, status, started_at, completed_at, actual_minutes, candidate_notes, notes_updated_at, sort_order, lock_version";

/** Load a roadmap tree with one nested query. `client` decides visibility (RLS) or admin (portal). */
async function loadTree(client: Admin, id: string, includeInternal: boolean) {
  const { data: r } = await client.from("candidate_roadmaps")
    .select(`*, candidates(candidate_code, full_name, journey_status), candidate_roadmap_phases(*), candidate_roadmap_modules(*), candidate_roadmap_items(${ITEM_COLS}), candidate_roadmap_resources(*), candidate_roadmap_resource_mappings(*), candidate_roadmap_projects(*), candidate_roadmap_remarks(*)`)
    .eq("id", id).maybeSingle();
  if (!r) throw new Error("Roadmap not found or access denied.");
  const s = <T extends { sort_order: number }>(l: T[] | null) => [...(l ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const items = [...(r.candidate_roadmap_items ?? [])].sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order);
  return {
    ...r,
    candidate: r.candidates as { candidate_code: string; full_name: string; journey_status: string } | null,
    phases: s(r.candidate_roadmap_phases), modules: s(r.candidate_roadmap_modules), items, resources: s(r.candidate_roadmap_resources),
    mappings: r.candidate_roadmap_resource_mappings ?? [], projects: s(r.candidate_roadmap_projects),
    remarks: (r.candidate_roadmap_remarks ?? []).filter((x) => includeInternal || !x.is_internal).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

async function consultants(client: Admin, candidateIds: string[]) {
  if (!candidateIds.length) return new Map<string, string>();
  const { data } = await client.from("candidate_assignments").select("candidate_id, profiles!candidate_assignments_user_id_fkey(full_name)").eq("assignment_type", "career_consultant").in("candidate_id", candidateIds);
  return new Map((data ?? []).map((a) => [a.candidate_id, (a.profiles as { full_name: string } | null)?.full_name ?? ""]));
}

// ---------- Staff reads ----------

export const listRoadmaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "roadmap.view");
    const s = context.supabase;
    const { data: rows } = await s.from("candidate_roadmaps")
      .select("id, code, candidate_id, pcb_code, pcb_version, status, career_path, target_role, duration_days, weekly_days, start_date, target_end_date, last_activity_at, candidates(candidate_code, full_name), candidate_roadmap_items(status, planned_date)")
      .order("created_at", { ascending: false });
    const cons = await consultants(s, [...new Set((rows ?? []).map((r) => r.candidate_id))]);
    const today = todayIST();
    return (rows ?? []).map(({ candidate_roadmap_items: items, candidates, ...r }) => {
      const c = candidates as { candidate_code: string; full_name: string } | null;
      return {
        ...r, candidate_code: c?.candidate_code ?? "", candidate_name: c?.full_name ?? "", consultant: cons.get(r.candidate_id) ?? "",
        progress: progress(items ?? []).pct, health: r.status === "ACTIVE" ? scheduleHealth(items ?? [], today, r.weekly_days).status : null,
      };
    });
  });
export type RoadmapListRow = Awaited<ReturnType<typeof listRoadmaps>>[number];

export const getRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "roadmap.view");
    const tree = await loadTree(context.supabase, data.id, true);
    const { data: activity } = await context.supabase.from("candidate_roadmap_activity").select("*").eq("roadmap_id", data.id).order("created_at", { ascending: false }).limit(200);
    const cons = await consultants(context.supabase, [tree.candidate_id]);
    return { ...tree, consultant: cons.get(tree.candidate_id) ?? "", activity: activity ?? [], today: todayIST() };
  });
export type RoadmapDetail = Awaited<ReturnType<typeof getRoadmap>>;

export const candidateRoadmaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "roadmap.view");
    const { data: rows } = await context.supabase.from("candidate_roadmaps")
      .select("id, code, status, pcb_code, pcb_version, start_date, target_end_date, weekly_days, created_at, candidate_roadmap_items(status, planned_date)")
      .eq("candidate_id", data.candidateId).order("created_at", { ascending: false });
    const today = todayIST();
    const { data: pcb } = await context.supabase.from("candidate_pcbs").select("current_approved_version_id").eq("candidate_id", data.candidateId).maybeSingle();
    return {
      approvedVersionId: pcb?.current_approved_version_id ?? null,
      roadmaps: (rows ?? []).map(({ candidate_roadmap_items: items, ...r }) => ({ ...r, progress: progress(items ?? []), health: r.status === "ACTIVE" ? scheduleHealth(items ?? [], today, r.weekly_days) : null })),
    };
  });

// ---------- Creation ----------

export const searchRoadmapCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "roadmap.create");
    const q = data.q.replace(/[%,()]/g, " ").trim();
    let query = context.supabase.from("candidates").select("id, candidate_code, full_name, journey_status, candidate_pcbs!inner(current_approved_version_id)").not("candidate_pcbs.current_approved_version_id", "is", null).order("created_at", { ascending: false }).limit(20);
    if (q) query = query.or(`candidate_code.ilike.%${q}%,full_name.ilike.%${q}%`);
    const { data: rows } = await query;
    return (rows ?? []).map(({ candidate_pcbs: _p, ...c }) => c);
  });

export const roadmapCreatePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid, startDate: date }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "roadmap.create");
    const { data: ok } = await context.supabase.rpc("can_read_roadmap_candidate" as never, { _cid: data.candidateId } as never);
    if (!ok) throw new Error("You do not have access to this candidate.");
    const admin = await getAdmin();
    const { data: c } = await admin.from("candidates").select("id, candidate_code, full_name").eq("id", data.candidateId).single();
    const { data: pcb } = await admin.from("candidate_pcbs").select("pcb_code, current_approved_version_id").eq("candidate_id", data.candidateId).maybeSingle();
    const { data: open } = await admin.from("candidate_roadmaps").select("id, code, status").eq("candidate_id", data.candidateId).in("status", ["NOT_STARTED", "ACTIVE", "PAUSED"]).maybeSingle();
    if (!pcb?.current_approved_version_id) return { candidate: c!, open, pcb: null, preview: null };
    const { loadFull } = await import("@/lib/pcb/pcb.server");
    const { previewFrom } = await import("./roadmaps.server");
    const v = await loadFull(admin, pcb.current_approved_version_id);
    return { candidate: c!, open, pcb: { code: pcb.pcb_code, version: v.version, version_id: v.id, approved_at: v.approved_at }, preview: previewFrom(v, data.startDate) };
  });

export const createRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: uuid, pcbVersionId: uuid, startDate: date }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "roadmap.create");
    const { data: ok } = await context.supabase.rpc("can_read_roadmap_candidate" as never, { _cid: data.candidateId } as never);
    if (!ok) throw new Error("You do not have access to this candidate.");
    const admin = await getAdmin();
    const { data: p } = await admin.from("candidate_pcbs").select("candidate_id").eq("current_approved_version_id", data.pcbVersionId).maybeSingle();
    if (p?.candidate_id !== data.candidateId) throw new Error("A roadmap can only be created from the candidate's current Approved PCB.");
    const { createFromPcb } = await import("./roadmaps.server");
    const rm = await createFromPcb(admin, actor, data.pcbVersionId, data.startDate);
    return { id: rm.id, code: rm.code };
  });

// ---------- Staff actions ----------

export const roadmapAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, action: z.enum(["start", "pause", "resume", "cancel", "complete"]), reason: z.string().trim().max(2000).optional(), lock: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const def = ROADMAP_ACTIONS[data.action as RoadmapAction];
    const { actor, admin, rm } = await roadmapAccess(context, def.permission, data.id);
    let allDone = false;
    if (data.action === "complete") {
      const { data: items } = await admin.from("candidate_roadmap_items").select("status").eq("roadmap_id", rm.id);
      allDone = !!items?.length && items.every((i) => i.status === "COMPLETED");
    }
    if (!canRoadmapAction(data.action, rm.status, allDone)) throw new Error(data.action === "complete" ? "All day items must be completed first." : `Cannot ${data.action} a ${rm.status.toLowerCase().replace("_", " ")} roadmap.`);
    if (def.reason && (data.reason ?? "").length < 3) throw new Error("Please enter a reason.");
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: def.to, updated_at: now, lock_version: data.lock + 1 };
    if (data.action === "start") Object.assign(patch, { started_at: now, started_by: actor.id });
    if (data.action === "pause") Object.assign(patch, { paused_at: now, paused_by: actor.id, pause_reason: data.reason });
    if (data.action === "resume") Object.assign(patch, { resumed_at: now, resumed_by: actor.id });
    if (data.action === "cancel") Object.assign(patch, { cancelled_at: now, cancelled_by: actor.id, cancel_reason: data.reason });
    if (data.action === "complete") Object.assign(patch, { completed_at: now, completed_by: actor.id });
    const { data: upd } = await admin.from("candidate_roadmaps").update(patch as never).eq("id", rm.id).eq("lock_version", data.lock).select("id");
    if (!upd?.length) throw new Error("This roadmap was changed by someone else. Refresh and try again.");
    await admin.from("candidate_roadmap_status_history").insert({ roadmap_id: rm.id, from_status: rm.status, to_status: def.to, reason: data.reason ?? null, actor_id: actor.id, actor_name: actor.name });
    const ev = { start: "Roadmap Started", pause: "Roadmap Paused", resume: "Roadmap Resumed", cancel: "Roadmap Cancelled", complete: "Roadmap Completed" }[data.action];
    await logRoadmap(admin, actor, rm, ev, { audit: `roadmap.${data.action === "start" ? "started" : data.action === "pause" ? "paused" : data.action === "resume" ? "resumed" : data.action === "cancel" ? "cancelled" : "completed"}`, candidate: true });
    const { data: c } = await admin.from("candidates").select("journey_status").eq("id", rm.candidate_id).single();
    return { journey: c?.journey_status ?? "", candidateId: rm.candidate_id };
  });

async function logRoadmap(admin: Admin, actor: Actor, rm: { id: string; code: string; candidate_id: string }, event: string, opts: Parameters<typeof import("./roadmaps.server").logRoadmap>[4]) {
  const m = await import("./roadmaps.server");
  return m.logRoadmap(admin, actor, rm, event, opts);
}

/** Shared item status write with optimistic lock + history. */
async function writeItemStatus(admin: Admin, actor: Actor, rm: { id: string; code: string; candidate_id: string }, it: { id: string; status: string; started_at: string | null; day_number: number }, to: string, lock: number, isCandidate: boolean) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: to, lock_version: lock + 1, updated_at: now };
  if (to === "IN_PROGRESS" && !it.started_at) patch["started_at"] = now;
  if (to === "COMPLETED") { patch["completed_at"] = now; if (!it.started_at) patch["started_at"] = now; }
  if (to !== "COMPLETED") patch["completed_at"] = null;
  const { data } = await admin.from("candidate_roadmap_items").update(patch as never).eq("id", it.id).eq("lock_version", lock).select("lock_version");
  if (!data?.length) throw new Error(STALE);
  await admin.from("candidate_roadmap_item_status_history").insert({ roadmap_id: rm.id, item_id: it.id, from_status: it.status, to_status: to, actor_id: actor.id, actor_name: actor.name, is_candidate: isCandidate });
  const reopen = it.status === "COMPLETED" && to !== "COMPLETED";
  const ev = reopen ? "Day Reopened" : to === "COMPLETED" ? "Day Completed" : to === "IN_PROGRESS" ? "Day Started" : "Day Status Corrected";
  await logRoadmap(admin, actor, rm, ev, { meta: { day: it.day_number, from: it.status, to }, audit: reopen ? "roadmap.day_reopened" : !isCandidate ? "roadmap.day_status_corrected" : undefined });
  return { lock: lock + 1 };
}

export const setItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: uuid, to: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]), lock: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin0 = await getAdmin();
    const { data: cur } = await admin0.from("candidate_roadmap_items").select("status").eq("id", data.itemId).maybeSingle();
    if (!cur) throw new Error("Day item not found.");
    if (cur.status === data.to) throw new Error("The item already has this status.");
    const { actor, admin, rm, it } = await itemAccess(context, staffMovePermission(cur.status, data.to), data.itemId);
    if (isReadOnly(rm.status)) throw new Error("This roadmap is read-only.");
    return writeItemStatus(admin, actor, rm, it, data.to, data.lock, false);
  });

export const setItemPlannedDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: uuid, date, lock: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, rm, it } = await itemAccess(context, "roadmap.edit", data.itemId);
    if (isReadOnly(rm.status)) throw new Error("This roadmap is read-only.");
    const { data: upd } = await admin.from("candidate_roadmap_items").update({ planned_date: data.date, lock_version: data.lock + 1, updated_at: new Date().toISOString() }).eq("id", it.id).eq("lock_version", data.lock).select("id");
    if (!upd?.length) throw new Error(STALE);
    await logRoadmap(admin, actor, rm, "Planned Date Adjusted", { meta: { day: it.day_number, from: it.planned_date, to: data.date }, audit: "roadmap.date_adjusted" });
    return { lock: data.lock + 1 };
  });

export const addRemark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: uuid, body: z.string().trim().min(1).max(4000), internal: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin, rm, it } = await itemAccess(context, data.internal ? "roadmap.internal_notes" : "roadmap.notes", data.itemId);
    if (data.internal) await requirePermission(context.supabase, context.userId, "roadmap.notes");
    await admin.from("candidate_roadmap_remarks").insert({ roadmap_id: rm.id, item_id: it.id, body: data.body, is_internal: data.internal, author_id: actor.id, author_name: actor.name });
    await logRoadmap(admin, actor, rm, data.internal ? "Internal Remark Added" : "Consultant Remark Added", { meta: { day: it.day_number } });
    return { ok: true };
  });

// ---------- Candidate portal ----------

async function myContext(ctx: Ctx) {
  const { data: cid } = await ctx.supabase.rpc("roadmap_my_candidate" as never);
  if (!cid) throw new Error("Your portal account is not linked to a candidate record.");
  const admin = await getAdmin();
  const { data: ctxu } = await ctx.supabase.rpc("current_user_context");
  const actor: Actor = { id: ctx.userId, name: (ctxu as { full_name?: string } | null)?.full_name ?? "Candidate", roleKey: "candidate" };
  return { cid: cid as unknown as string, admin, actor };
}
async function myItem(ctx: Ctx, itemId: string) {
  const { cid, admin, actor } = await myContext(ctx);
  const { data: it } = await admin.from("candidate_roadmap_items").select("*, candidate_roadmaps!inner(id, code, candidate_id, status)").eq("id", itemId).maybeSingle();
  const rm = it?.candidate_roadmaps as { id: string; code: string; candidate_id: string; status: string } | undefined;
  if (!it || !rm || rm.candidate_id !== cid) throw new Error("Day item not found.");
  if (!isExecutable(rm.status)) throw new Error(rm.status === "PAUSED" ? "Your roadmap is paused." : rm.status === "NOT_STARTED" ? "Your roadmap has not started yet." : "This roadmap is read-only.");
  return { admin, actor, rm, it };
}

/** Candidate's own current roadmap; internal remarks are never returned. */
export const myRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: cid } = await context.supabase.rpc("roadmap_my_candidate" as never);
    if (!cid) return null;
    const admin = await getAdmin();
    const { data: rm } = await admin.from("candidate_roadmaps").select("id").eq("candidate_id", cid as unknown as string).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!rm) return null;
    const t = await loadTree(admin, rm.id, false);
    return {
      id: t.id, code: t.code, status: t.status, career_path: t.career_path, target_role: t.target_role, duration_days: t.duration_days, weekly_days: t.weekly_days,
      start_date: t.start_date, target_end_date: t.target_end_date, phases: t.phases, modules: t.modules, items: t.items, resources: t.resources, mappings: t.mappings,
      remarks: t.remarks.map((r) => ({ id: r.id, item_id: r.item_id, body: r.body, author_name: r.author_name, created_at: r.created_at })), today: todayIST(),
    };
  });
export type MyRoadmap = NonNullable<Awaited<ReturnType<typeof myRoadmap>>>;

export const mySetItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: uuid, to: z.enum(["IN_PROGRESS", "COMPLETED"]), lock: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, actor, rm, it } = await myItem(context, data.itemId);
    if (!candidateMayMove(it.status, data.to)) throw new Error("This update is not allowed.");
    return writeItemStatus(admin, actor, rm, it, data.to, data.lock, true);
  });

export const mySaveNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: uuid, notes: z.string().max(4000), lock: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, actor, rm, it } = await myItem(context, data.itemId);
    const { data: upd } = await admin.from("candidate_roadmap_items").update({ candidate_notes: data.notes.trim() || null, notes_updated_at: new Date().toISOString(), lock_version: data.lock + 1 }).eq("id", it.id).eq("lock_version", data.lock).select("id");
    if (!upd?.length) throw new Error(STALE);
    await logRoadmap(admin, actor, rm, "Candidate Note Updated", { meta: { day: it.day_number } });
    return { lock: data.lock + 1 };
  });
