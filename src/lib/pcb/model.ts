// Client-safe PCB rules. The server re-checks everything; these drive UI and tests.

export const PCB_STATUSES = ["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "SUPERSEDED", "CANCELLED"] as const;
export type PcbStatus = (typeof PCB_STATUSES)[number];
export const PCB_STATUS_LABEL: Record<PcbStatus, string> = {
  DRAFT: "Draft", IN_REVIEW: "In Review", CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved", SUPERSEDED: "Superseded", CANCELLED: "Cancelled",
};
export const pcbStatusLabel = (s: string) => PCB_STATUS_LABEL[s as PcbStatus] ?? s;

/** Statuses where content may be edited. */
export const EDITABLE_STATUSES: readonly string[] = ["DRAFT", "CHANGES_REQUESTED"];
export const isEditable = (s: string) => EDITABLE_STATUSES.includes(s);

export const pcbCode = (candidateCode: string) => `PCB-${candidateCode}`;
export const pcbDisplayId = (code: string, version: number) => `${code}-V${version}`;

export type PcbAction = "submit" | "request_changes" | "approve" | "cancel" | "reopen";
/** Allowed status transitions. */
export const TRANSITIONS: Record<PcbAction, { from: string[]; to: PcbStatus; permission: string }> = {
  submit: { from: ["DRAFT", "CHANGES_REQUESTED"], to: "IN_REVIEW", permission: "pcb.submit_review" },
  request_changes: { from: ["IN_REVIEW"], to: "CHANGES_REQUESTED", permission: "pcb.request_changes" },
  approve: { from: ["IN_REVIEW"], to: "APPROVED", permission: "pcb.approve" },
  cancel: { from: ["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED"], to: "CANCELLED", permission: "pcb.cancel" },
  reopen: { from: ["CHANGES_REQUESTED"], to: "DRAFT", permission: "pcb.edit" },
};
export function canTransition(action: PcbAction, from: string) {
  return TRANSITIONS[action].from.includes(from);
}

export const SOURCE_TYPES = ["MASTER_TRACK", "OTHER_MASTER_TRACK", "ASSESSMENT", "CONSULTANT", "GLOBAL", "TRACK", "CANDIDATE", "CUSTOM"] as const;
export function sourceLabel(row: { source_type?: string | null; source_track_code?: string | null }) {
  switch (row.source_type) {
    case "MASTER_TRACK": return "Base Track";
    case "OTHER_MASTER_TRACK": return `Added from ${row.source_track_code ?? "track"}`;
    case "ASSESSMENT": return "Assessment";
    case "CONSULTANT": return "Consultant";
    case "GLOBAL": return "Global Content";
    case "TRACK": return "Track Content";
    case "CANDIDATE": return "Candidate";
    default: return "Consultant Custom";
  }
}

export interface DayItemLike { id: string; module_id: string; sort_order: number; day_number: number | null }
export interface ModuleLike { id: string; phase_id: string; sort_order: number }
export interface PhaseLike { id: string; sort_order: number }

/** Items in curriculum order: phase → module → item by sort_order. */
export function orderedItems<T extends DayItemLike>(phases: PhaseLike[], modules: ModuleLike[], items: T[]): T[] {
  const by = <X extends { sort_order: number }>(a: X, b: X) => a.sort_order - b.sort_order;
  const out: T[] = [];
  for (const p of [...phases].sort(by))
    for (const m of modules.filter((x) => x.phase_id === p.id).sort(by))
      out.push(...items.filter((i) => i.module_id === m.id).sort(by));
  return out;
}

/** Sequential day numbers 1..n in curriculum order. Returns id → day. */
export function recalculateDays(phases: PhaseLike[], modules: ModuleLike[], items: DayItemLike[]): Record<string, number> {
  return Object.fromEntries(orderedItems(phases, modules, items).map((it, i) => [it.id, i + 1]));
}

/** Planned days = highest distinct day number, or item count if unnumbered. */
export function plannedDays(items: { day_number: number | null }[]) {
  const nums = items.map((i) => i.day_number).filter((n): n is number => typeof n === "number" && n > 0);
  return nums.length ? new Set(nums).size : items.length;
}
export function durationMismatch(target: number, planned: number) {
  if (!planned || planned === target) return null;
  return `PCB target duration is ${target} days, but the current curriculum contains ${planned} planned days.`;
}

export interface ApprovalInput {
  candidateExists: boolean;
  hasAssessment: boolean;
  override: boolean;
  primaryCareerPath: string | null;
  primaryTargetRole: string | null;
  dayItems: number;
  skillGaps: number;
  capabilities: number;
  projects: number;
  targetDays: number;
  plannedDays: number;
  durationAck: boolean;
  missingControlled: string[];
}
export interface CheckItem { key: string; label: string; ok: boolean }
export function approvalChecklist(i: ApprovalInput): CheckItem[] {
  const mismatch = !!durationMismatch(i.targetDays, i.plannedDays);
  return [
    { key: "candidate", label: "Candidate exists", ok: i.candidateExists },
    { key: "assessment", label: "Finalized assessment or approved override", ok: i.hasAssessment || i.override },
    { key: "path", label: "Primary career direction", ok: !!i.primaryCareerPath?.trim() },
    { key: "role", label: "Primary target role", ok: !!i.primaryTargetRole?.trim() },
    { key: "curriculum", label: "Curriculum has day items", ok: i.dayItems > 0 },
    { key: "gaps", label: "Skill gap section", ok: i.skillGaps > 0 },
    { key: "caps", label: "Target capabilities", ok: i.capabilities > 0 },
    { key: "projects", label: "At least one project", ok: i.projects > 0 },
    { key: "duration", label: "Duration matches or mismatch acknowledged", ok: !mismatch || i.durationAck },
    { key: "controlled", label: i.missingControlled.length ? `Controlled content missing: ${i.missingControlled.join(", ")}` : "Required controlled content", ok: i.missingControlled.length === 0 },
  ];
}

/** Controlled sections that must be included with content before approval. */
export const REQUIRED_CONTROLLED = ["NO_GUARANTEE_STATEMENT", "CANDIDATE_COMMITMENT"];
export const CONTROLLED_CODES = [...REQUIRED_CONTROLLED, "LEGAL_DISCLAIMER"];

/** Data blocks render structured PCB data; narrative blocks render text. */
export const DATA_BLOCKS: Record<string, string> = {
  DATA_COVER: "Cover Page",
  DATA_CANDIDATE: "Candidate Profile",
  DATA_ASSESSMENT: "Career Assessment Summary",
  DATA_DIRECTION: "Recommended Career Direction",
  DATA_SKILL_GAPS: "Skill Gap Analysis",
  DATA_CAPABILITIES: "Target Capabilities",
  DATA_RESOURCES: "Curated Learning Resources",
  DATA_CURRICULUM: "Personalized Curriculum",
  DATA_MILESTONES: "Milestones",
  DATA_PROJECTS: "Projects & Portfolio Strategy",
  DATA_WEEKLY: "Weekly Review Model",
};

/** Default document structure. `global` = Global PCB Content code to copy from. */
export const DEFAULT_STRUCTURE: { code: string; title: string; type: "DATA" | "NARRATIVE"; global?: string }[] = [
  { code: "DATA_COVER", title: "Cover Page", type: "DATA" },
  { code: "WELCOME", title: "Welcome / Coding361 Introduction", type: "NARRATIVE", global: "CODING361_INTRODUCTION" },
  { code: "DIRECTOR_MESSAGE", title: "Director Message", type: "NARRATIVE", global: "DIRECTOR_MESSAGE" },
  { code: "DATA_CANDIDATE", title: "Candidate Profile", type: "DATA" },
  { code: "DATA_ASSESSMENT", title: "Career Assessment Summary", type: "DATA" },
  { code: "EMPLOYABILITY", title: "Current Employability Position", type: "NARRATIVE" },
  { code: "DATA_DIRECTION", title: "Recommended Career Direction", type: "DATA" },
  { code: "WHY_PATH", title: "Why This Career Path", type: "NARRATIVE" },
  { code: "DATA_SKILL_GAPS", title: "Skill Gap Analysis", type: "DATA" },
  { code: "DATA_CAPABILITIES", title: "Target Capabilities", type: "DATA" },
  { code: "JOURNEY", title: "Career Transition Journey", type: "NARRATIVE", global: "HOW_TO_USE_YOUR_BLUEPRINT" },
  { code: "LEARNING_STRATEGY", title: "Learning Strategy", type: "NARRATIVE", global: "60_DAY_PHILOSOPHY" },
  { code: "DATA_RESOURCES", title: "Curated Learning Resources", type: "DATA" },
  { code: "DATA_CURRICULUM", title: "Personalized Curriculum", type: "DATA" },
  { code: "DAILY_MODEL", title: "Daily Working Model", type: "NARRATIVE", global: "DAILY_WORKING_MODEL" },
  { code: "DATA_PROJECTS", title: "Projects & Portfolio Strategy", type: "DATA" },
  { code: "DATA_MILESTONES", title: "Milestones", type: "DATA" },
  { code: "DATA_WEEKLY", title: "Weekly Review Model", type: "DATA", global: "WEEKLY_REVIEW_EXPLANATION" },
  { code: "PROGRESS_MODEL", title: "CareerOS Progress Model", type: "NARRATIVE", global: "CAREEROS_EXPLANATION" },
  { code: "READINESS", title: "Readiness Expectations", type: "NARRATIVE" },
  { code: "RESUME_GUIDANCE", title: "Resume / Profile Positioning Guidance", type: "NARRATIVE" },
  { code: "OPPORTUNITY", title: "Opportunity Process", type: "NARRATIVE", global: "OPPORTUNITY_PROCESS" },
  { code: "SUPPORT", title: "Support Model", type: "NARRATIVE" },
  { code: "NO_GUARANTEE_STATEMENT", title: "No-Guarantee Statement", type: "NARRATIVE", global: "NO_GUARANTEE_STATEMENT" },
  { code: "CANDIDATE_COMMITMENT", title: "Candidate Commitment", type: "NARRATIVE", global: "CANDIDATE_COMMITMENT" },
  { code: "CLOSING", title: "Closing Message", type: "NARRATIVE", global: "CLOSING_MESSAGE" },
];

/** Journey statuses that may be moved forward by PCB events. */
export const CAN_MOVE_TO_PREPARATION = ["ASSESSMENT_COMPLETED"];
export const CAN_MOVE_TO_APPROVED = ["ASSESSMENT_COMPLETED", "PCB_PREPARATION"];

export const PRIORITIES = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
export const LEVELS = { NONE: "None", BASIC: "Basic", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };

/** Data sections with no rows are skipped in preview/PDF. */
export function dataSectionEmpty(code: string, v: { pcb_skill_gaps: unknown[]; pcb_target_capabilities: unknown[]; pcb_resources: unknown[]; pcb_day_items: unknown[]; pcb_milestones: unknown[]; pcb_projects: unknown[]; pcb_weekly_reviews: unknown[] }) {
  const map: Record<string, unknown[]> = { DATA_SKILL_GAPS: v.pcb_skill_gaps, DATA_CAPABILITIES: v.pcb_target_capabilities, DATA_RESOURCES: v.pcb_resources, DATA_CURRICULUM: v.pcb_day_items, DATA_MILESTONES: v.pcb_milestones, DATA_PROJECTS: v.pcb_projects, DATA_WEEKLY: v.pcb_weekly_reviews };
  return code in map && map[code]!.length === 0;
}
