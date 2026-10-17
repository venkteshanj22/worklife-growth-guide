import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePermission } from "@/lib/admin/authz.server";
import { saveAssessmentSchema } from "./model";
import type { Json } from "@/integrations/supabase/types";

const uuid = z.object({ id: z.string().uuid() });
const fail = (e: { message?: string } | null, fallback: string) => {
  if (e) throw new Error(e.message && e.message.length < 200 ? e.message : fallback);
};

export const listAssessments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuid.parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "assessment.view");
    const { data: rows, error } = await context.supabase
      .from("candidate_assessments")
      .select(
        "id,assessment_code,sequence,assessment_type,status,assessment_date,assessed_by,overall_score,overall_outcome",
      )
      .eq("candidate_id", data.id)
      .order("sequence", { ascending: false });
    fail(error, "Could not load assessments");
    return rows ?? [];
  });

export const getAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuid.parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "assessment.view");
    const s = context.supabase;
    const { data: a, error } = await s
      .from("candidate_assessments")
      .select(
        "*, assessment_dimension_scores(*), assessment_strengths(*), assessment_development_areas(*), assessment_technical_skills(*), assessment_skill_gaps(*), assessment_recommendations(*), assessment_not_recommended_paths(*), assessment_development_plan(*), assessment_documents(*)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error || !a) throw new Error("Assessment not found or access denied.");
    const { data: internal } = await s
      .from("candidate_assessment_internal")
      .select("internal_notes")
      .eq("assessment_id", data.id)
      .maybeSingle();
    const ids = [
      a.assessed_by,
      ...a.assessment_documents.map((d) => d.uploaded_by),
    ].filter((v): v is string => !!v);
    const { data: people } = ids.length
      ? await s.from("profiles").select("id,full_name").in("id", ids)
      : { data: [] };
    const bySort = <T extends { sort_order: number }>(l: T[]) =>
      [...l].sort((x, y) => x.sort_order - y.sort_order);
    return {
      ...a,
      assessment_dimension_scores: bySort(a.assessment_dimension_scores),
      assessment_strengths: bySort(a.assessment_strengths),
      assessment_development_areas: bySort(a.assessment_development_areas),
      assessment_technical_skills: bySort(a.assessment_technical_skills),
      assessment_skill_gaps: bySort(a.assessment_skill_gaps),
      assessment_not_recommended_paths: bySort(a.assessment_not_recommended_paths),
      assessment_development_plan: bySort(a.assessment_development_plan),
      internal_notes: internal?.internal_notes ?? null,
      names: Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name])) as Record<
        string,
        string
      >,
    };
  });
export type AssessmentDetail = Awaited<ReturnType<typeof getAssessment>>;

export const createAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uuid.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("assessment_create", { _cid: data.id });
    fail(error, "Could not create the assessment");
    return { id: id as string };
  });

export const saveAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveAssessmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("assessment_save", {
      _id: data.id,
      _header: data.header as Json,
      _children: data.children as unknown as Json,
      _internal: data.internal ?? undefined,
    });
    fail(error, "Could not save the assessment");
    return { ok: true };
  });

export const setAssessmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["COMPLETED", "FINALIZED"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("assessment_set_status", {
      _id: data.id,
      _status: data.status,
    });
    fail(error, "Could not update the assessment status");
    return { ok: true };
  });

export const addAssessmentDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200),
        type: z.string().max(100),
        path: z.string().max(500),
        file: z.string().max(300),
        mime: z.string().max(200),
        size: z.number().int().min(0).max(10 * 1024 * 1024),
        remarks: z.string().max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("assessment_add_document", {
      _id: data.id,
      _name: data.name,
      _type: data.type,
      _path: data.path,
      _file: data.file,
      _mime: data.mime,
      _size: data.size,
      _remarks: data.remarks,
    });
    fail(error, "Could not record the document");
    return { ok: true };
  });
