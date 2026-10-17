import { z } from "zod";

export const ASSESSMENT_STATUSES = ["DRAFT", "COMPLETED", "FINALIZED"] as const;
export const RATINGS = ["EXCELLENT", "GOOD", "MODERATE", "NEEDS_IMPROVEMENT", "WEAK"] as const;
export const SKILL_LEVELS = ["NONE", "AWARENESS", "BEGINNER", "BASIC", "INTERMEDIATE", "ADVANCED"] as const;
export const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const GAP_IMPACTS = ["LOW", "MODERATE", "HIGH"] as const;
export const OUTCOMES = [
  "READY",
  "CONDITIONALLY_READY",
  "DEVELOPMENT_REQUIRED",
  "NOT_RECOMMENDED_FOR_SELECTED_PATH",
] as const;
export const DOCUMENT_TYPES = [
  "Manual assessment sheet",
  "Aptitude result",
  "Communication evaluation",
  "Technical evaluation",
  "Career counselling notes",
  "Other",
];
export const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const LABELS: Record<string, string> = {
  NOT_RECOMMENDED_FOR_SELECTED_PATH: "Not Recommended for Selected Path",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  CONDITIONALLY_READY: "Conditionally Ready",
  DEVELOPMENT_REQUIRED: "Development Required",
};
export const alabel = (v: string | null | undefined) =>
  !v ? "—" : (LABELS[v] ?? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " "));
export const opts = (list: readonly string[]) => list.map((v) => ({ value: v, label: alabel(v) }));

export type DimensionScore = {
  dimension_key: string;
  label: string;
  max_score: number;
  score: number | null;
  rating: string | null;
  remarks: string | null;
};

/** Returns an error message when a score is outside 0..max, else null. */
export function scoreError(score: number | null, max: number): string | null {
  if (score === null) return null;
  if (!Number.isFinite(score) || score < 0) return "Score cannot be negative";
  if (score > max) return `Score cannot exceed ${max}`;
  return null;
}
export function totalScore(scores: Pick<DimensionScore, "score">[]): number | null {
  const entered = scores.filter((s) => s.score !== null);
  return entered.length ? entered.reduce((t, s) => t + (s.score ?? 0), 0) : null;
}
export const maxTotal = (scores: Pick<DimensionScore, "max_score">[]) =>
  scores.reduce((t, s) => t + s.max_score, 0);

/** Which status actions are available from the current status. */
export function nextActions(status: string, isSuperAdmin: boolean) {
  return {
    canEdit: status !== "FINALIZED" || isSuperAdmin,
    canComplete: status === "DRAFT",
    canFinalize: status === "DRAFT" || status === "COMPLETED",
  };
}
export function readyToClose(scores: Pick<DimensionScore, "score">[], outcome: string | null) {
  return scores.every((s) => s.score !== null) && !!outcome;
}
/** The official assessment is the latest finalized; otherwise the latest record. */
export function currentAssessment<T extends { status: string; sequence: number }>(list: T[]) {
  const sorted = [...list].sort((a, b) => b.sequence - a.sequence);
  return sorted.find((a) => a.status === "FINALIZED") ?? sorted[0] ?? null;
}
export function fileError(name: string, size: number): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return "Allowed: PDF, DOC/DOCX, XLS/XLSX, JPG, PNG";
  if (size > MAX_FILE_BYTES) return "File must be 10 MB or smaller";
  return null;
}

const t = z.string().max(4000).nullable().optional();
export const saveAssessmentSchema = z.object({
  id: z.string().uuid(),
  header: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  children: z.object({
    scores: z.array(
      z.object({
        dimension_key: z.string(),
        score: z.number().min(0).nullable(),
        rating: t,
        remarks: t,
      }),
    ),
    strengths: z.array(z.object({ item: z.string().max(500) })),
    development_areas: z.array(z.object({ item: z.string().max(500) })),
    technical_skills: z.array(z.object({ skill: z.string().max(200), level: z.string(), remarks: t })),
    skill_gaps: z.array(
      z.object({
        skill: z.string().max(200),
        current_level: t,
        required_level: t,
        priority: z.string(),
        remarks: t,
      }),
    ),
    recommendations: z.array(
      z.object({
        kind: z.enum(["PRIMARY", "ALTERNATIVE"]),
        career_path: t,
        target_role: t,
        technology_direction: t,
        rationale: t,
      }),
    ),
    not_recommended: z.array(z.object({ path: z.string().max(300), reason: t })),
    development_plan: z.array(
      z.object({ area: z.string().max(200), recommendation: t, priority: z.string(), estimated_focus: t }),
    ),
  }),
  internal: z.string().max(8000).nullable(),
});
export type SaveAssessment = z.infer<typeof saveAssessmentSchema>;
