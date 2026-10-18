// Server-only roadmap helpers: logging and snapshot creation from an approved PCB.
import { writeAudit, type Actor } from "@/lib/admin/authz.server";
import type { Admin } from "@/lib/pcb/pcb.server";
import { loadFull } from "@/lib/pcb/pcb.server";
import { plannedDatesByDay, roadmapCode, targetEndDate } from "./model";

type Any = Record<string, unknown>;
export interface RoadmapRef { id: string; code: string; candidate_id: string }

/** Roadmap timeline entry; optional candidate activity and global audit (never note text). */
export async function logRoadmap(admin: Admin, actor: Actor, r: RoadmapRef, event: string, opts: { audit?: string; candidate?: boolean; meta?: Any } = {}) {
  const meta = { roadmap_id: r.code, ...opts.meta };
  await admin.from("candidate_roadmap_activity").insert({ roadmap_id: r.id, event, actor_id: actor.id, actor_name: actor.name, metadata: meta as never });
  await admin.from("candidate_roadmaps").update({ last_activity_at: new Date().toISOString() }).eq("id", r.id);
  if (opts.candidate)
    await admin.from("candidate_activity").insert({ candidate_id: r.candidate_id, event, actor_id: actor.id, actor_name: actor.name, metadata: meta as never });
  if (opts.audit) await writeAudit(admin, actor, { action: opts.audit, target_type: "roadmap", target_id: r.id, target_label: r.code, metadata: meta });
}

/** Preview numbers for a PCB version: what the roadmap would contain. */
export function previewFrom(v: Awaited<ReturnType<typeof loadFull>>, startDate: string) {
  const weekly = v.weekly_days ?? 6;
  const dayNumbers = v.pcb_day_items.map((d, i) => d.day_number ?? i + 1);
  const learningDays = new Set(dayNumbers).size;
  return {
    career_path: v.primary_career_path, target_role: v.primary_target_role, duration_days: v.target_duration_days, daily_hours: v.daily_hours, weekly_days: weekly,
    phases: v.pcb_phases.length, modules: v.pcb_modules.length, day_items: v.pcb_day_items.length, learning_days: learningDays, resources: v.pcb_resources.length,
    start_date: startDate, target_end_date: targetEndDate(startDate, learningDays || v.target_duration_days, weekly),
  };
}

/** Deep-copy an approved PCB version into new roadmap-owned rows. Rolls back (deletes) on failure. */
export async function createFromPcb(admin: Admin, actor: Actor, versionId: string, startDate: string) {
  const v = await loadFull(admin, versionId);
  if (v.status !== "APPROVED") throw new Error("A roadmap can only be created from an Approved PCB.");
  const { data: pcb } = await admin.from("candidate_pcbs").select("id, pcb_code, candidate_id").eq("id", v.pcb_id).single();
  const { data: cand } = await admin.from("candidates").select("id, candidate_code").eq("id", pcb!.candidate_id).single();
  const { count } = await admin.from("candidate_roadmaps").select("id", { count: "exact", head: true }).eq("candidate_id", cand!.id);
  const pv = previewFrom(v, startDate);
  if (!v.pcb_day_items.length) throw new Error("This PCB has no day items to execute.");

  const { data: rm, error } = await admin.from("candidate_roadmaps").insert({
    code: roadmapCode(cand!.candidate_code, count ?? 0), candidate_id: cand!.id, pcb_id: pcb!.id, pcb_version_id: v.id, pcb_code: pcb!.pcb_code, pcb_version: v.version,
    career_path: pv.career_path, target_role: pv.target_role, duration_days: pv.duration_days, daily_hours: pv.daily_hours, weekly_days: pv.weekly_days,
    start_date: startDate, target_end_date: pv.target_end_date, created_by: actor.id,
  }).select("id, code, candidate_id").single();
  if (error) {
    if (error.code === "23505") throw new Error("This candidate already has an open roadmap.");
    throw new Error("Could not create roadmap.");
  }
  try {
    const map = new Map<string, string>();
    const id = (old: string) => { const n = crypto.randomUUID(); map.set(old, n); return n; };
    const ins = async (table: string, rows: Any[]) => {
      if (!rows.length) return;
      const { error: e } = await admin.from(table as "candidate_roadmap_phases").insert(rows as never);
      if (e) throw new Error(e.message);
    };
    const usedPhases = new Set(v.pcb_modules.map((m) => m.phase_id));
    await ins("candidate_roadmap_phases", v.pcb_phases.filter((p) => usedPhases.has(p.id)).map((p, i) => ({ id: id(p.id), roadmap_id: rm.id, phase_number: p.phase_number, name: p.name, objective: p.objective, source_pcb_phase_id: p.id, sort_order: i + 1 })));
    await ins("candidate_roadmap_modules", v.pcb_modules.filter((m) => map.has(m.phase_id)).map((m, i) => ({ id: id(m.id), roadmap_id: rm.id, phase_id: map.get(m.phase_id), name: m.name, objective: m.objective, source_pcb_module_id: m.id, sort_order: i + 1 })));
    const items = v.pcb_day_items.filter((d) => map.has(d.module_id));
    const dates = plannedDatesByDay(startDate, items.map((d, i) => d.day_number ?? i + 1), pv.weekly_days);
    const phaseOf = new Map(v.pcb_modules.map((m) => [m.id, m.phase_id]));
    await ins("candidate_roadmap_items", items.map((d, i) => {
      const day = d.day_number ?? i + 1;
      return {
        id: id(d.id), roadmap_id: rm.id, phase_id: map.get(phaseOf.get(d.module_id)!), module_id: map.get(d.module_id), day_number: day, title: d.title, topic: d.topic,
        description: d.description, objective: d.objective, learning_minutes: d.learning_minutes, practice_minutes: d.practice_minutes, activity: d.activity, expected_output: d.expected_output,
        planned_date: dates.get(day), source_pcb_day_item_id: d.id, sort_order: i + 1,
      };
    }));
    await ins("candidate_roadmap_resources", v.pcb_resources.map((r, i) => ({ id: id(r.id), roadmap_id: rm.id, name: r.name, provider: r.provider, resource_type: r.resource_type, url: r.url, course_name: r.course_name, section: r.section, notes: r.notes, is_paid: r.is_paid, source_pcb_resource_id: r.id, sort_order: i + 1 })));
    await ins("candidate_roadmap_resource_mappings", v.pcb_resource_mappings.filter((m) => map.has(m.resource_id)).map((m) => ({
      roadmap_id: rm.id, resource_id: map.get(m.resource_id), phase_id: m.phase_id ? map.get(m.phase_id) ?? null : null, module_id: m.module_id ? map.get(m.module_id) ?? null : null, item_id: m.day_item_id ? map.get(m.day_item_id) ?? null : null,
    })));
    await ins("candidate_roadmap_projects", v.pcb_projects.map((p, i) => ({ roadmap_id: rm.id, name: p.name, project_type: p.project_type, description: p.description, start_day: p.start_day, end_day: p.end_day, source_pcb_project_id: p.id, sort_order: i + 1 })));
    await admin.from("candidate_roadmap_status_history").insert({ roadmap_id: rm.id, from_status: null, to_status: "NOT_STARTED", actor_id: actor.id, actor_name: actor.name });
  } catch (e) {
    await admin.from("candidate_roadmaps").delete().eq("id", rm.id);
    throw new Error(e instanceof Error && e.message.length < 200 ? e.message : "Could not copy PCB content into the roadmap.");
  }
  await logRoadmap(admin, actor, rm, "Roadmap Created", { audit: "roadmap.created", candidate: true, meta: { pcb_id: pcb!.pcb_code, pcb_version: v.version } });
  return rm;
}
