import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdmin, requirePermission, writeAudit, type Actor } from "@/lib/admin/authz.server";
import { TRACK_CODE_RE, validateNextVersion } from "./model";

const uuid = z.string().uuid();
const opt = z.string().trim().max(10000).nullish().transform((v) => (v ? v : null));
const num = z.coerce.number().nullish().transform((v) => (v == null || Number.isNaN(v) ? null : v));

/** Child tables editable from the track editor. Content blocks use their own permission. */
export const ROW_TABLES = [
  "track_outcomes", "track_phases", "track_modules", "track_roadmap_items", "track_resources",
  "track_resource_mappings", "track_milestones", "track_project_templates", "track_weekly_reviews",
  "track_weekly_review_items", "track_content_blocks",
] as const;
export type RowTable = (typeof ROW_TABLES)[number];
const PARENT: Partial<Record<RowTable, string>> = {
  track_modules: "phase_id", track_roadmap_items: "module_id", track_weekly_review_items: "weekly_review_id",
};

type Admin = Awaited<ReturnType<typeof getAdmin>>;
async function loadVersion(admin: Admin, versionId: string) {
  const { data } = await admin
    .from("master_track_versions")
    .select("id, track_id, version, status, name, master_tracks!master_track_versions_track_id_fkey(code)")
    .eq("id", versionId)
    .maybeSingle();
  if (!data) throw new Error("Track version not found.");
  return { ...data, code: (data.master_tracks as { code: string } | null)?.code ?? "" };
}
async function draftVersion(admin: Admin, versionId: string) {
  const v = await loadVersion(admin, versionId);
  if (v.status !== "DRAFT") throw new Error("Only draft versions can be edited. Create a new version to make changes.");
  return v;
}
const audit = (admin: Admin, actor: Actor, action: string, v: { track_id: string; code: string; version: string }, extra?: Record<string, unknown>) =>
  writeAudit(admin, actor, { action, target_type: "master_track", target_id: v.track_id, target_label: `${v.code} v${v.version}`, metadata: { track_code: v.code, track_version: v.version, ...extra } });
const touch = (admin: Admin, v: { id: string; track_id: string }, actor: Actor) =>
  Promise.all([
    admin.from("master_track_versions").update({ updated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", v.id),
    admin.from("master_tracks").update({ updated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", v.track_id),
  ]);

export const listTracks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "tracks.view");
    const s = context.supabase;
    const { data: tracks, error } = await s.from("master_tracks").select("id, code, current_version_id, updated_at, updated_by").order("code");
    if (error) throw new Error("Could not load tracks");
    const { data: versions } = await s
      .from("master_track_versions")
      .select("id, track_id, version, status, name, category, primary_role, alt_roles, duration_days");
    const ids = [...new Set((tracks ?? []).map((t) => t.updated_by).filter((v): v is string => !!v))];
    const { data: people } = ids.length ? await s.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
    return (tracks ?? []).map((t) => {
      const all = (versions ?? []).filter((v) => v.track_id === t.id);
      const cur = all.find((v) => v.id === t.current_version_id) ?? all[0];
      return {
        id: t.id, code: t.code, updated_at: t.updated_at, updated_by: t.updated_by ? names.get(t.updated_by) ?? null : null,
        version_id: cur?.id ?? null, version: cur?.version ?? "", status: cur?.status ?? "DRAFT", name: cur?.name ?? t.code,
        category: cur?.category ?? "", primary_role: cur?.primary_role ?? "", alt_roles: cur?.alt_roles ?? "",
        duration_days: cur?.duration_days ?? 0, versions: all.map((v) => v.version),
        has_active: all.some((v) => v.status === "ACTIVE"),
      };
    });
  });
export type TrackListRow = Awaited<ReturnType<typeof listTracks>>[number];

export const getTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, versionId: uuid.nullish() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "tracks.view");
    const s = context.supabase;
    const { data: track } = await s.from("master_tracks").select("id, code, current_version_id").eq("id", data.id).maybeSingle();
    if (!track) throw new Error("Track not found or access denied.");
    const { data: versions } = await s
      .from("master_track_versions")
      .select("id, version, status, created_from_version, change_summary, created_by, created_at, effective_date")
      .eq("track_id", data.id)
      .order("created_at", { ascending: false });
    const vid = data.versionId ?? track.current_version_id ?? versions?.[0]?.id;
    if (!vid) throw new Error("Track has no versions.");
    const { data: v } = await s
      .from("master_track_versions")
      .select("*, track_outcomes(*), track_phases(*), track_modules(*), track_roadmap_items(*), track_resources(*), track_resource_mappings(*), track_milestones(*), track_project_templates(*), track_weekly_reviews(*), track_weekly_review_items(*), track_content_blocks(*)")
      .eq("id", vid)
      .eq("track_id", data.id)
      .maybeSingle();
    if (!v) throw new Error("Track version not found.");
    const ids = [...new Set((versions ?? []).map((x) => x.created_by).filter((x): x is string => !!x))];
    const { data: people } = ids.length ? await s.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    const sort = <T extends { sort_order: number }>(l: T[]) => [...l].sort((a, b) => a.sort_order - b.sort_order);
    return {
      track,
      versions: versions ?? [],
      names: Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name])) as Record<string, string>,
      hasLockedCode: (versions ?? []).some((x) => x.status !== "DRAFT"),
      version: {
        ...v,
        track_outcomes: sort(v.track_outcomes), track_phases: sort(v.track_phases), track_modules: sort(v.track_modules),
        track_roadmap_items: sort(v.track_roadmap_items), track_resources: sort(v.track_resources),
        track_resource_mappings: v.track_resource_mappings, track_milestones: sort(v.track_milestones),
        track_project_templates: sort(v.track_project_templates), track_weekly_reviews: sort(v.track_weekly_reviews),
        track_weekly_review_items: sort(v.track_weekly_review_items), track_content_blocks: sort(v.track_content_blocks),
      },
    };
  });
export type TrackDetail = Awaited<ReturnType<typeof getTrack>>;

const createSchema = z.object({
  code: z.string().trim().toUpperCase().regex(TRACK_CODE_RE, "Use 2–24 capital letters, digits or hyphens."),
  name: z.string().trim().min(2).max(200),
  category: z.string().min(1),
  duration_days: z.coerce.number().int().min(1).max(730),
});
async function assertCodeFree(admin: Admin, code: string) {
  const { data } = await admin.from("master_tracks").select("id").ilike("code", code).maybeSingle();
  if (data) throw new Error(`Track code ${code} is already in use.`);
}

export const createTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "tracks.create");
    const admin = await getAdmin();
    await assertCodeFree(admin, data.code);
    const { data: t, error } = await admin.from("master_tracks").insert({ code: data.code, created_by: actor.id, updated_by: actor.id }).select("id").single();
    if (error) throw new Error("Could not create the track");
    const { data: v } = await admin
      .from("master_track_versions")
      .insert({ track_id: t.id, version: "1.0", name: data.name, category: data.category, duration_days: data.duration_days, created_by: actor.id, updated_by: actor.id })
      .select("id").single();
    await admin.from("master_tracks").update({ current_version_id: v!.id }).eq("id", t.id);
    await audit(admin, actor, "track.created", { track_id: t.id, code: data.code, version: "1.0" });
    return { id: t.id };
  });

const headerSchema = z.object({
  versionId: uuid,
  code: z.string().trim().toUpperCase().regex(TRACK_CODE_RE).optional(),
  name: z.string().trim().min(2).max(200), short_name: opt, category: z.string().min(1), description: opt,
  primary_role: opt, alt_roles: opt, duration_days: z.coerce.number().int().min(1).max(730),
  daily_hours: num, weekly_days: num, experience_level: opt, effective_date: opt,
  prereq_education: opt, prereq_knowledge: opt, prereq_communication: opt, prereq_logical: opt,
  prereq_daily_time: opt, prereq_infrastructure: opt, prereq_other: opt,
});
export const saveTrackHeader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => headerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "tracks.edit");
    const admin = await getAdmin();
    const v = await draftVersion(admin, data.versionId);
    const { versionId, code, ...fields } = data;
    if (code && code !== v.code) {
      const { data: locked } = await admin.from("master_track_versions").select("id").eq("track_id", v.track_id).neq("status", "DRAFT").limit(1);
      if (locked?.length) throw new Error("Track code is locked once a version has been published.");
      await assertCodeFree(admin, code);
      await admin.from("master_tracks").update({ code }).eq("id", v.track_id);
    }
    const { error } = await admin.from("master_track_versions").update({ ...fields, updated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", versionId);
    if (error) throw new Error("Could not save the track");
    await touch(admin, v, actor);
    await audit(admin, actor, "track.updated", { ...v, code: code ?? v.code }, { section: "overview" });
  });

const rowSchema = z.object({ table: z.enum(ROW_TABLES), versionId: uuid, row: z.record(z.string(), z.unknown()) });
function permFor(table: RowTable) {
  return table === "track_content_blocks" ? "track_content.edit" : "tracks.edit";
}
function cleanRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(row)) {
    if (!/^[a-z_]+$/.test(k) || k === "version_id") continue;
    out[k] = typeof val === "string" ? (val.trim() === "" ? null : val.trim().slice(0, 10000)) : val;
  }
  return out;
}

export const upsertTrackRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rowSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, permFor(data.table));
    const admin = await getAdmin();
    const v = await draftVersion(admin, data.versionId);
    const row = cleanRow(data.row);
    const tbl = admin.from(data.table as "track_outcomes");
    // Parent rows must belong to the same version.
    for (const col of ["phase_id", "module_id", "roadmap_item_id", "resource_id", "weekly_review_id"]) {
      const pid = row[col];
      if (!pid) continue;
      const parentTable = { phase_id: "track_phases", module_id: "track_modules", roadmap_item_id: "track_roadmap_items", resource_id: "track_resources", weekly_review_id: "track_weekly_reviews" }[col]!;
      const { data: p } = await admin.from(parentTable as "track_phases").select("id").eq("id", String(pid)).eq("version_id", v.id).maybeSingle();
      if (!p) throw new Error("Parent item not found in this version.");
    }
    if (row.id) {
      const id = String(row.id);
      delete row.id;
      const { error } = await tbl.update(row as never).eq("id", id).eq("version_id", v.id);
      if (error) throw new Error(error.message.length < 200 ? error.message : "Could not save");
    } else {
      const parent = PARENT[data.table];
      let q = admin.from(data.table as "track_outcomes").select("sort_order").eq("version_id", v.id);
      if (parent && row[parent]) q = q.eq(parent as "id", String(row[parent]));
      const { data: last } = await q.order("sort_order", { ascending: false }).limit(1);
      const { error } = await tbl.insert({ ...row, version_id: v.id, sort_order: (last?.[0]?.sort_order ?? 0) + 1 } as never);
      if (error) throw new Error(error.message.length < 200 ? error.message : "Could not save");
    }
    await touch(admin, v, actor);
    await audit(admin, actor, "track.updated", v, { section: data.table });
  });

const idSchema = z.object({ table: z.enum(ROW_TABLES), versionId: uuid, id: uuid });
export const deleteTrackRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, permFor(data.table));
    const admin = await getAdmin();
    const v = await draftVersion(admin, data.versionId);
    await admin.from(data.table as "track_outcomes").delete().eq("id", data.id).eq("version_id", v.id);
    await touch(admin, v, actor);
    await audit(admin, actor, "track.updated", v, { section: data.table, removed: true });
  });

export const duplicateTrackRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, permFor(data.table));
    const admin = await getAdmin();
    const v = await draftVersion(admin, data.versionId);
    const { data: src } = await admin.from(data.table as "track_outcomes").select("*").eq("id", data.id).eq("version_id", v.id).maybeSingle();
    if (!src) throw new Error("Item not found.");
    const { id: _id, ...rest } = src as Record<string, unknown>;
    const copy = { ...rest, sort_order: Number(rest.sort_order ?? 0) + 0.5 };
    for (const k of ["title", "name"]) if (typeof copy[k as keyof typeof copy] === "string") (copy as Record<string, unknown>)[k] = `${copy[k as keyof typeof copy]} (copy)`;
    const { data: created, error } = await admin.from(data.table as "track_outcomes").insert({ ...copy, sort_order: Number(rest.sort_order ?? 0) + 1 } as never).select("id").single();
    if (error) throw new Error("Could not duplicate");
    // Copy direct children for phases (modules + their items) and weekly reviews.
    if (data.table === "track_phases") {
      const { data: mods } = await admin.from("track_modules").select("*").eq("phase_id", data.id);
      for (const m of mods ?? []) {
        const { id: mid, ...mr } = m;
        const { data: nm } = await admin.from("track_modules").insert({ ...mr, phase_id: created.id }).select("id").single();
        const { data: items } = await admin.from("track_roadmap_items").select("*").eq("module_id", mid);
        if (items?.length) await admin.from("track_roadmap_items").insert(items.map(({ id: _i, ...ir }) => ({ ...ir, module_id: nm!.id })));
      }
    } else if (data.table === "track_modules") {
      const { data: items } = await admin.from("track_roadmap_items").select("*").eq("module_id", data.id);
      if (items?.length) await admin.from("track_roadmap_items").insert(items.map(({ id: _i, ...ir }) => ({ ...ir, module_id: created.id })));
    } else if (data.table === "track_weekly_reviews") {
      const { data: items } = await admin.from("track_weekly_review_items").select("*").eq("weekly_review_id", data.id);
      if (items?.length) await admin.from("track_weekly_review_items").insert(items.map(({ id: _i, ...ir }) => ({ ...ir, weekly_review_id: created.id })));
    }
    await touch(admin, v, actor);
    await audit(admin, actor, "track.updated", v, { section: data.table, duplicated: true });
  });

export const reorderTrackRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ table: z.enum(ROW_TABLES), versionId: uuid, ids: z.array(uuid).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, permFor(data.table));
    const admin = await getAdmin();
    const v = await draftVersion(admin, data.versionId);
    await Promise.all(data.ids.map((id, i) => admin.from(data.table as "track_outcomes").update({ sort_order: i + 1 }).eq("id", id).eq("version_id", v.id)));
    await touch(admin, v, actor);
  });

export const createTrackVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, version: z.string().trim(), summary: opt }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "tracks.version");
    const admin = await getAdmin();
    const src = await loadVersion(admin, data.versionId);
    const { data: all } = await admin.from("master_track_versions").select("version").eq("track_id", src.track_id);
    const err = validateNextVersion(data.version, (all ?? []).map((x) => x.version));
    if (err) throw new Error(err);
    const { data: nv, error } = await admin.rpc("track_copy_version", { _src: src.id, _track: src.track_id, _version: data.version, _from: src.version, _summary: data.summary ?? "", _actor: actor.id });
    if (error || !nv) throw new Error("Could not create the new version");
    await admin.from("master_tracks").update({ current_version_id: nv, updated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", src.track_id);
    await audit(admin, actor, "track.version_created", { ...src, version: data.version }, { created_from_version: src.version });
    return { versionId: nv as string };
  });

export const duplicateTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, code: createSchema.shape.code, name: createSchema.shape.name }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "tracks.create");
    const admin = await getAdmin();
    const src = await loadVersion(admin, data.versionId);
    await assertCodeFree(admin, data.code);
    const { data: t, error } = await admin.from("master_tracks").insert({ code: data.code, created_by: actor.id, updated_by: actor.id }).select("id").single();
    if (error) throw new Error("Could not duplicate the track");
    const { data: nv, error: e2 } = await admin.rpc("track_copy_version", { _src: src.id, _track: t.id, _version: "1.0", _from: null as never, _summary: `Duplicated from ${src.code} v${src.version}`, _actor: actor.id });
    if (e2 || !nv) throw new Error("Could not copy the track content");
    await admin.from("master_track_versions").update({ name: data.name }).eq("id", nv as string);
    await admin.from("master_tracks").update({ current_version_id: nv as string }).eq("id", t.id);
    await audit(admin, actor, "track.duplicated", { track_id: t.id, code: data.code, version: "1.0" }, { source_code: src.code, source_version: src.version });
    return { id: t.id };
  });

export const setTrackVersionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: uuid, status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, data.status === "ARCHIVED" ? "tracks.archive" : "tracks.activate");
    const admin = await getAdmin();
    const v = await loadVersion(admin, data.versionId);
    if (v.status === data.status) return;
    if (v.status === "ARCHIVED") throw new Error("Archived versions cannot be changed.");
    if (data.status === "ACTIVE") {
      await admin.from("master_track_versions").update({ status: "INACTIVE" }).eq("track_id", v.track_id).eq("status", "ACTIVE");
    }
    await admin.from("master_track_versions").update({ status: data.status, updated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", v.id);
    await touch(admin, v, actor);
    const action = { ACTIVE: "track.activated", INACTIVE: "track.deactivated", ARCHIVED: "track.archived" }[data.status];
    await audit(admin, actor, action, v, { previous_status: v.status });
  });

/** Lightweight list for pickers (e.g. assessment mapping). */
export const trackOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_permission", { _uid: context.userId, _key: "tracks.view" });
    if (!ok) return [];
    const { data: tracks } = await context.supabase.from("master_tracks").select("id, code, current_version_id").order("code");
    const { data: versions } = await context.supabase.from("master_track_versions").select("id, track_id, name, status");
    return (tracks ?? []).map((t) => {
      const vs = (versions ?? []).filter((v) => v.track_id === t.id);
      const cur = vs.find((v) => v.id === t.current_version_id);
      return { id: t.id, code: t.code, name: cur?.name ?? t.code, available: vs.some((v) => v.status === "ACTIVE") };
    });
  });

export const mapAssessmentTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recommendationId: uuid, trackId: uuid.nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "assessment.edit");
    await requirePermission(context.supabase, context.userId, "tracks.view");
    // Row visibility through the caller's session enforces candidate assignment scope.
    const { data: rec } = await context.supabase.from("assessment_recommendations").select("id, kind, assessment_id").eq("id", data.recommendationId).maybeSingle();
    if (!rec) throw new Error("Recommendation not found or access denied.");
    const admin = await getAdmin();
    if (data.trackId) {
      const { data: t } = await admin.from("master_tracks").select("id").eq("id", data.trackId).maybeSingle();
      if (!t) throw new Error("Track not found.");
    }
    await admin.from("assessment_recommendations").update({ master_track_id: data.trackId }).eq("id", rec.id);
    await writeAudit(admin, actor, { action: "assessment.track_mapped", target_type: "assessment", target_id: rec.assessment_id, target_label: rec.kind, metadata: { master_track_id: data.trackId } });
  });

// ---------- Global PCB content ----------
export const listGlobalContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "global_pcb_content.view");
    const { data, error } = await context.supabase.from("global_pcb_content").select("*, global_pcb_content_versions(id, version, title, created_at, created_by)").order("sort_order");
    if (error) throw new Error("Could not load content");
    return data ?? [];
  });
export type GlobalContentRow = Awaited<ReturnType<typeof listGlobalContent>>[number];

export const saveGlobalContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: uuid.nullish(),
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,60}$/, "Use capital letters, digits or underscores."),
      title: z.string().trim().min(2).max(200),
      content_type: z.string().trim().min(1).max(60),
      content: opt,
      status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await requirePermission(context.supabase, context.userId, "global_pcb_content.edit");
    const admin = await getAdmin();
    const { id, ...fields } = data;
    let rowId = id ?? null;
    let version = 1;
    if (rowId) {
      const { data: cur } = await admin.from("global_pcb_content").select("version").eq("id", rowId).maybeSingle();
      if (!cur) throw new Error("Content not found.");
      version = cur.version + 1;
      const { error } = await admin.from("global_pcb_content").update({ ...fields, version, updated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", rowId);
      if (error) throw new Error(error.code === "23505" ? "Content code already exists." : "Could not save");
    } else {
      const { data: last } = await admin.from("global_pcb_content").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      const { data: ins, error } = await admin.from("global_pcb_content").insert({ ...fields, updated_by: actor.id, sort_order: (last?.[0]?.sort_order ?? 0) + 1 }).select("id").single();
      if (error) throw new Error(error.code === "23505" ? "Content code already exists." : "Could not save");
      rowId = ins.id;
    }
    await admin.from("global_pcb_content_versions").insert({ content_id: rowId, version, title: fields.title, content_type: fields.content_type, content: fields.content, status: fields.status, created_by: actor.id });
    await writeAudit(admin, actor, { action: id ? "global_pcb_content.updated" : "global_pcb_content.created", target_type: "global_pcb_content", target_id: rowId, target_label: fields.code, metadata: { version } });
  });
