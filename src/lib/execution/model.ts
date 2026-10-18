// Phase 7 execution rules (weekly reviews, projects, premium tasks). Browser-safe, no I/O.
export type Kind = "REVIEW" | "PROJECT" | "TASK";

export const REVIEW_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"] as const;
export const PROJECT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "CHANGES_REQUESTED", "RESUBMITTED", "COMPLETED", "CANCELLED"] as const;
export const TASK_STATUSES = ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "CHANGES_REQUESTED", "RESUBMITTED", "COMPLETED", "CANCELLED"] as const;
export const REVIEW_RESULTS = ["ON_TRACK", "ATTENTION", "BEHIND"] as const;
export const RATINGS = ["EXCELLENT", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT"] as const;
export const RATING_AREAS = [
  ["technical_quality", "Technical Quality"], ["requirement_completion", "Requirement Completion"], ["implementation_quality", "Code / Implementation Quality"],
  ["documentation", "Documentation"], ["practical_understanding", "Practical Understanding"],
] as const;
export const DEFAULT_CHECKLIST = ["Days Completed", "Topics Completed", "Practice Completed", "Project Updated", "GitHub Updated", "Understood Topics", "Needs Help", "Roadmap On Schedule"];

export const STALE_MESSAGE = "This record was changed by someone else. Refresh and review the latest version.";
export const NOT_ENTITLED = "Premium Tasks are not included in this candidate's current plan.";
export const NOT_ENTITLED_SELF = "Premium Tasks are not included in your current plan.";
export const DATE_ORDER_WARNING = "This planned date causes the Roadmap day sequence to be out of order.";

const pad = (n: number, w: number) => String(n).padStart(w, "0");
export function executionCode(kind: Kind, candidateCode: string, seq: number) {
  if (kind === "REVIEW") return `WR-${candidateCode}-${pad(seq, 2)}`;
  if (kind === "PROJECT") return `PRJ-${candidateCode}-${pad(seq, 2)}`;
  return `PT-${candidateCode}-${pad(seq, 3)}`;
}

export const isPremium = (plan: string | null | undefined) => plan === "PREMIUM";

/** Overdue flags: reviews only while SCHEDULED; projects/tasks until COMPLETED/CANCELLED. */
export function isOverdue(kind: Kind, status: string, due: string | null | undefined, today: string) {
  if (!due || due >= today) return false;
  if (kind === "REVIEW") return status === "SCHEDULED";
  return status !== "COMPLETED" && status !== "CANCELLED";
}

export type ReviewAction = "start" | "complete" | "missed" | "cancel";
export const REVIEW_ACTIONS: Record<ReviewAction, { from: string[]; to: string; permission: string; reason: boolean; label: string }> = {
  start: { from: ["SCHEDULED"], to: "IN_PROGRESS", permission: "weekly_review.edit", reason: false, label: "Start Review" },
  complete: { from: ["IN_PROGRESS"], to: "COMPLETED", permission: "weekly_review.complete", reason: false, label: "Complete Review" },
  missed: { from: ["SCHEDULED", "IN_PROGRESS"], to: "MISSED", permission: "weekly_review.missed", reason: true, label: "Mark Missed" },
  cancel: { from: ["SCHEDULED", "IN_PROGRESS"], to: "CANCELLED", permission: "weekly_review.missed", reason: true, label: "Cancel Review" },
};
export const reviewEditable = (s: string) => s === "SCHEDULED" || s === "IN_PROGRESS";

/** Shared project/task workflow. `initial` is NOT_STARTED (project) or ASSIGNED (task). */
export type WorkAction = "start" | "submit" | "resubmit" | "request_changes" | "complete" | "cancel";
export function workTransition(kind: "PROJECT" | "TASK", action: WorkAction, from: string): string | null {
  const initial = kind === "PROJECT" ? "NOT_STARTED" : "ASSIGNED";
  switch (action) {
    case "start": return from === initial ? "IN_PROGRESS" : null;
    case "submit": return from === "IN_PROGRESS" ? "SUBMITTED" : null;
    case "resubmit": return from === "CHANGES_REQUESTED" ? "RESUBMITTED" : null;
    case "request_changes": return from === "SUBMITTED" || from === "RESUBMITTED" ? "CHANGES_REQUESTED" : null;
    case "complete": return from === "SUBMITTED" || from === "RESUBMITTED" ? "COMPLETED" : null;
    case "cancel": return from === "COMPLETED" || from === "CANCELLED" ? null : "CANCELLED";
  }
}
export const CANDIDATE_WORK_ACTIONS: WorkAction[] = ["start", "submit", "resubmit"];
export function workPermission(kind: "PROJECT" | "TASK", action: WorkAction) {
  const m = kind === "PROJECT" ? "project" : "premium_task";
  return action === "request_changes" ? `${m}.request_changes` : action === "complete" ? `${m}.complete` : action === "cancel" ? `${m}.cancel` : `${m}.edit`;
}

export function isHttpUrl(v: string) {
  try { const u = new URL(v); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; }
}

/** True when giving day `dayNumber` the date `date` breaks ascending day order against the other days. */
export function breaksDayOrder(days: { id: string; day_number: number; planned_date: string | null }[], id: string, date: string) {
  const me = days.find((d) => d.id === id);
  if (!me) return false;
  return days.some((d) => d.id !== id && d.planned_date && (
    (d.day_number < me.day_number && d.planned_date > date) || (d.day_number > me.day_number && d.planned_date < date)));
}

const LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled", IN_PROGRESS: "In Progress", COMPLETED: "Completed", MISSED: "Missed", CANCELLED: "Cancelled",
  NOT_STARTED: "Not Started", SUBMITTED: "Submitted", CHANGES_REQUESTED: "Changes Requested", RESUBMITTED: "Resubmitted", ASSIGNED: "Assigned",
  ON_TRACK: "On Track", ATTENTION: "Attention", BEHIND: "Behind", EXCELLENT: "Excellent", GOOD: "Good", SATISFACTORY: "Satisfactory", NEEDS_IMPROVEMENT: "Needs Improvement",
};
export const label = (s: string | null | undefined) => (s ? LABELS[s] ?? s : "—");
