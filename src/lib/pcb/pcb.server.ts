// Server-only helpers shared by PCB server functions and PDF generation.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { writeAudit, type Actor } from "@/lib/admin/authz.server";
import { pcbDisplayId } from "./model";

export type Admin = SupabaseClient<Database>;
type Any = Record<string, unknown>;

export const CONTENT_TABLES = [
  "pcb_skill_gaps", "pcb_target_capabilities", "pcb_phases", "pcb_modules", "pcb_day_items", "pcb_resources",
  "pcb_resource_mappings", "pcb_milestones", "pcb_projects", "pcb_weekly_reviews", "pcb_weekly_review_items", "pcb_content_blocks",
] as const;
export type ContentTable = (typeof CONTENT_TABLES)[number];

export async function loadVersionMeta(admin: Admin, versionId: string) {
  const { data: v } = await admin.from("pcb_versions").select("*").eq("id", versionId).maybeSingle();
  if (!v) throw new Error("PCB version not found.");
  const { data: p } = await admin.from("candidate_pcbs").select("*").eq("id", v.pcb_id).single();
  const { data: c } = await admin.from("candidates").select("id, candidate_code, full_name, journey_status").eq("id", p!.candidate_id).single();
  return { v, pcb: p!, cand: c! };
}
export type VersionMeta = Awaited<ReturnType<typeof loadVersionMeta>>;

export async function logPcb(admin: Admin, actor: Actor, m: { pcb: { id: string; pcb_code: string; candidate_id: string }; cand: { candidate_code: string }; v: { version: number } }, action: string, activity: string | null, extra?: Any) {
  const meta = { candidate_id: m.cand.candidate_code, pcb_id: m.pcb.pcb_code, pcb_version: m.v.version, action, ...extra };
  if (activity)
    await admin.from("candidate_activity").insert({ candidate_id: m.pcb.candidate_id, event: activity, actor_id: actor.id, actor_name: actor.name, metadata: meta as never });
  await writeAudit(admin, actor, { action, target_type: "pcb", target_id: m.pcb.id, target_label: pcbDisplayId(m.pcb.pcb_code, m.v.version), metadata: meta });
}

const sort = <T extends { sort_order: number }>(l: T[] | null) => [...(l ?? [])].sort((a, b) => a.sort_order - b.sort_order);

/** Everything needed to render, validate or print one version. */
export async function loadFull(client: Admin, versionId: string) {
  const { data: v } = await client
    .from("pcb_versions")
    .select("*, pcb_source_tracks(*), pcb_skill_gaps(*), pcb_target_capabilities(*), pcb_phases(*), pcb_modules(*), pcb_day_items(*), pcb_resources(*), pcb_resource_mappings(*), pcb_milestones(*), pcb_projects(*), pcb_weekly_reviews(*), pcb_weekly_review_items(*), pcb_content_blocks(*), pcb_review_notes(*), pcb_documents(*)")
    .eq("id", versionId)
    .maybeSingle();
  if (!v) throw new Error("PCB not found or access denied.");
  return {
    ...v,
    pcb_source_tracks: sort(v.pcb_source_tracks), pcb_skill_gaps: sort(v.pcb_skill_gaps), pcb_target_capabilities: sort(v.pcb_target_capabilities),
    pcb_phases: sort(v.pcb_phases), pcb_modules: sort(v.pcb_modules), pcb_day_items: sort(v.pcb_day_items), pcb_resources: sort(v.pcb_resources),
    pcb_milestones: sort(v.pcb_milestones), pcb_projects: sort(v.pcb_projects), pcb_weekly_reviews: sort(v.pcb_weekly_reviews),
    pcb_weekly_review_items: sort(v.pcb_weekly_review_items), pcb_content_blocks: sort(v.pcb_content_blocks),
    pcb_review_notes: [...(v.pcb_review_notes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    pcb_documents: [...(v.pcb_documents ?? [])].sort((a, b) => b.generated_at.localeCompare(a.generated_at)),
  };
}
export type FullVersion = Awaited<ReturnType<typeof loadFull>>;

/** Read-only candidate snapshot, always live from Candidate Master. */
export async function candidateSnapshot(client: Admin, candidateId: string) {
  const { data: c } = await client
    .from("candidates")
    .select("id, candidate_code, full_name, employment_status, total_experience, relevant_it_experience, last_designation, has_career_gap, gap_duration, gap_reason, existing_skills, candidate_preferred_role, preferred_locations, expected_ctc, program_plan, enrollment_date, journey_status, current_career_situation")
    .eq("id", candidateId)
    .maybeSingle();
  if (!c) throw new Error("Candidate not found.");
  const { data: edu } = await client.from("candidate_education").select("degree, specialization, institution, completion_year").eq("candidate_id", candidateId).order("completion_year", { ascending: false });
  return { ...c, education: (edu ?? []).map((e) => [e.degree, e.specialization, e.institution, e.completion_year].filter(Boolean).join(", ")) };
}
export type CandidateSnapshot = Awaited<ReturnType<typeof candidateSnapshot>>;

/** Latest finalized assessment, as a frozen snapshot. */
export async function assessmentSnapshot(admin: Admin, candidateId: string) {
  const { data: a } = await admin
    .from("candidate_assessments")
    .select("id, assessment_code, assessment_date, overall_score, overall_outcome, career_objective, assessor_summary, preferred_location, finalized_at, assessment_recommendations(*), assessment_strengths(item, sort_order), assessment_development_areas(item, sort_order), assessment_skill_gaps(*), assessment_development_plan(*)")
    .eq("candidate_id", candidateId)
    .eq("status", "FINALIZED")
    .order("finalized_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!a) return null;
  const rec = (k: string) => a.assessment_recommendations.find((r) => r.kind === k);
  const pr = rec("PRIMARY"), al = rec("ALTERNATIVE");
  const s = <T extends { sort_order: number }>(l: T[]) => [...l].sort((x, y) => x.sort_order - y.sort_order);
  return {
    assessment_id: a.id, assessment_code: a.assessment_code, assessment_date: a.assessment_date, finalized_at: a.finalized_at,
    overall_score: a.overall_score, outcome: a.overall_outcome, career_objective: a.career_objective, summary: a.assessor_summary,
    preferred_location: a.preferred_location,
    primary: { career_path: pr?.career_path ?? null, target_role: pr?.target_role ?? null, rationale: pr?.rationale ?? null, master_track_id: pr?.master_track_id ?? null },
    alternative: { career_path: al?.career_path ?? null, target_role: al?.target_role ?? null, rationale: al?.rationale ?? null },
    strengths: s(a.assessment_strengths).map((x) => x.item),
    development_areas: s(a.assessment_development_areas).map((x) => x.item),
    skill_gaps: s(a.assessment_skill_gaps).map((g) => ({ skill: g.skill, current_level: g.current_level, required_level: g.required_level, priority: g.priority, remarks: g.remarks })),
    development_plan: s(a.assessment_development_plan).map((d) => ({ area: d.area, recommendation: d.recommendation, priority: d.priority })),
  };
}
export type AssessmentSnap = NonNullable<Awaited<ReturnType<typeof assessmentSnapshot>>>;

export interface Selection {
  all?: boolean;
  include?: { curriculum?: boolean; resources?: boolean; milestones?: boolean; projects?: boolean; weekly?: boolean; content?: boolean; outcomes?: boolean };
  phases?: string[]; modules?: string[]; items?: string[]; resources?: string[]; milestones?: string[];
  projects?: string[]; weekly?: string[]; blocks?: string[]; outcomes?: string[];
}

/** Copy track content into a PCB version. Never writes to track tables. */
export async function importTrack(admin: Admin, versionId: string, trackVersionId: string, sel: Selection, isBase: boolean) {
  const { data: tv } = await admin
    .from("master_track_versions")
    .select("*, master_tracks!master_track_versions_track_id_fkey(code), track_phases(*), track_modules(*), track_roadmap_items(*), track_resources(*), track_resource_mappings(*), track_milestones(*), track_project_templates(*), track_weekly_reviews(*), track_weekly_review_items(*), track_content_blocks(*), track_outcomes(*)")
    .eq("id", trackVersionId)
    .maybeSingle();
  if (!tv) throw new Error("Master Track version not found.");
  const code = (tv.master_tracks as { code: string } | null)?.code ?? "";
  const now = new Date().toISOString();
  const src = (id: string) => ({ source_type: isBase ? "MASTER_TRACK" : "OTHER_MASTER_TRACK", source_track_code: code, source_track_version: tv.version, source_entity_id: id, copied_at: now });
  const inc = sel.include ?? {};
  const pick = <T extends { id: string; is_active: boolean; sort_order: number }>(rows: T[], ids: string[] | undefined, flag: boolean | undefined) =>
    sort(rows.filter((r) => r.is_active && ((sel.all && flag !== false) || ids?.includes(r.id))));

  const counts: Record<string, number> = {};
  const nextSort = async (table: ContentTable) => {
    if (counts[table] == null) {
      const { data } = await admin.from(table as "pcb_phases").select("sort_order").eq("version_id", versionId).order("sort_order", { ascending: false }).limit(1);
      counts[table] = data?.[0]?.sort_order ?? 0;
    }
    return ++counts[table]!;
  };
  const insert = async (table: ContentTable, row: Any) => {
    const { data, error } = await admin.from(table as "pcb_phases").insert({ ...row, version_id: versionId, sort_order: await nextSort(table) } as never).select("id").single();
    if (error) throw new Error(error.message.length < 200 ? error.message : "Could not copy track content");
    return data.id as string;
  };

  const map = new Map<string, string>(); // track id → pcb id
  const phases = sort(tv.track_phases), modules = sort(tv.track_modules), items = sort(tv.track_roadmap_items);
  const copyPhase = async (p: (typeof phases)[number]) => {
    if (map.has(p.id)) return map.get(p.id)!;
    const id = await insert("pcb_phases", { phase_number: p.phase_number, name: p.name, short_description: p.short_description, objective: p.objective, start_day: p.start_day, end_day: p.end_day, ...src(p.id) });
    map.set(p.id, id); return id;
  };
  const copyModule = async (m: (typeof modules)[number]) => {
    if (map.has(m.id)) return map.get(m.id)!;
    const ph = phases.find((p) => p.id === m.phase_id)!;
    const phaseId = await copyPhase(ph);
    const id = await insert("pcb_modules", { phase_id: phaseId, name: m.name, description: m.description, objective: m.objective, suggested_duration: m.suggested_duration, ...src(m.id) });
    map.set(m.id, id); return id;
  };
  const copyItem = async (i: (typeof items)[number]) => {
    if (map.has(i.id)) return;
    const mod = modules.find((m) => m.id === i.module_id)!;
    const moduleId = await copyModule(mod);
    const id = await insert("pcb_day_items", { module_id: moduleId, day_number: i.day_number, title: i.title, topic: i.topic, description: i.description, objective: i.objective, learning_minutes: i.learning_minutes, practice_minutes: i.practice_minutes, activity: i.activity, expected_output: i.expected_output, notes: i.notes, ...src(i.id) });
    map.set(i.id, id);
  };

  const wantPhase = new Set(pick(phases, sel.phases, inc.curriculum).map((p) => p.id));
  const wantModule = new Set(pick(modules, sel.modules, inc.curriculum).map((m) => m.id));
  for (const p of phases.filter((p) => wantPhase.has(p.id))) {
    await copyPhase(p);
    for (const m of modules.filter((m) => m.phase_id === p.id && m.is_active)) wantModule.add(m.id);
  }
  for (const m of modules.filter((m) => wantModule.has(m.id))) {
    await copyModule(m);
    for (const i of items.filter((i) => i.module_id === m.id && i.is_active)) await copyItem(i);
  }
  for (const i of items.filter((i) => i.is_active && sel.items?.includes(i.id))) await copyItem(i);

  for (const r of pick(sort(tv.track_resources), sel.resources, inc.resources)) {
    map.set(r.id, await insert("pcb_resources", { name: r.name, provider: r.provider, resource_type: r.resource_type, url: r.url, course_name: r.course_name, section: r.section, start_ref: r.start_ref, end_ref: r.end_ref, is_paid: r.is_paid, estimated_cost: r.estimated_cost, notes: r.notes, ...src(r.id) }));
  }
  for (const mp of tv.track_resource_mappings.filter((x) => x.is_active && map.has(x.resource_id))) {
    await insert("pcb_resource_mappings", {
      resource_id: map.get(mp.resource_id), phase_id: mp.phase_id ? map.get(mp.phase_id) ?? null : null,
      module_id: mp.module_id ? map.get(mp.module_id) ?? null : null, day_item_id: mp.roadmap_item_id ? map.get(mp.roadmap_item_id) ?? null : null,
    });
  }
  for (const m of pick(sort(tv.track_milestones), sel.milestones, inc.milestones))
    await insert("pcb_milestones", { name: m.name, target_day: m.target_day, description: m.description, evidence: m.evidence, ...src(m.id) });
  for (const p of pick(sort(tv.track_project_templates), sel.projects, inc.projects))
    await insert("pcb_projects", { name: p.name, project_type: p.project_type, scenario: p.scenario, description: p.description, technologies: p.technologies, features: p.features, deliverables: p.deliverables, start_day: p.start_day, end_day: p.end_day, difficulty: p.difficulty, ...src(p.id) });
  for (const w of pick(sort(tv.track_weekly_reviews), sel.weekly, inc.weekly)) {
    const wid = await insert("pcb_weekly_reviews", { week_number: w.week_number, title: w.title, expected_progress: w.expected_progress, guidance: w.guidance, ...src(w.id) });
    for (const it of sort(tv.track_weekly_review_items).filter((x) => x.weekly_review_id === w.id && x.is_active))
      await insert("pcb_weekly_review_items", { weekly_review_id: wid, item: it.item });
  }
  for (const o of pick(sort(tv.track_outcomes), sel.outcomes, inc.outcomes))
    await insert("pcb_target_capabilities", { title: o.title, description: o.description, ...src(o.id) });
  const blocks = pick(sort(tv.track_content_blocks), sel.blocks, inc.content);
  for (const b of blocks)
    await insert("pcb_content_blocks", { title: b.title, content: b.content, block_type: "NARRATIVE", ...src(b.id), source_type: "TRACK" });

  // Source track record (one per track version).
  const { data: existing } = await admin.from("pcb_source_tracks").select("id").eq("version_id", versionId).eq("track_version_id", tv.id).maybeSingle();
  if (!existing)
    await admin.from("pcb_source_tracks").insert({ version_id: versionId, track_id: tv.track_id, track_version_id: tv.id, track_code: code, track_version: tv.version, track_name: tv.name, role: isBase ? "BASE" : "ADDITIONAL" });
  return { code, version: tv.version, copied: map.size + blocks.length };
}
