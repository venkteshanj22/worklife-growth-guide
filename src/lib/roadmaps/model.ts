// Pure, browser-safe roadmap rules: scheduling, progress, health, transitions.

export const ROADMAP_STATUSES = ["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];
export const DAY_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

const LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started", ACTIVE: "Active", PAUSED: "Paused", COMPLETED: "Completed", CANCELLED: "Cancelled",
  PENDING: "Pending", IN_PROGRESS: "In Progress", ON_TRACK: "On Track", ATTENTION: "Attention", BEHIND: "Behind",
};
export const statusLabel = (s: string) => LABELS[s] ?? s;

export function roadmapCode(candidateCode: string, existing: number) {
  return existing === 0 ? `RM-${candidateCode}` : `RM-${candidateCode}-V${existing + 1}`;
}

// ---------- Dates (business timezone: Asia/Kolkata) ----------

/** Today's date (YYYY-MM-DD) in India business time. */
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
}
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

/** Weekdays (0=Sun) used for learning. 7 → every day; n<7 → Monday onward (6 = Mon–Sat, 5 = Mon–Fri). */
export function learningWeekdays(weeklyDays: number) {
  const n = Math.min(7, Math.max(1, Math.round(weeklyDays || 6)));
  if (n === 7) return new Set([0, 1, 2, 3, 4, 5, 6]);
  return new Set(Array.from({ length: n }, (_, i) => i + 1));
}

/** The first `count` learning dates on or after `start`. */
export function learningDates(start: string, count: number, weeklyDays: number) {
  const days = learningWeekdays(weeklyDays);
  const out: string[] = [];
  const d = toDate(start);
  while (out.length < count) {
    if (days.has(d.getUTCDay())) out.push(fmt(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Planned date per day number: the n-th distinct day number gets the n-th learning date. */
export function plannedDatesByDay(start: string, dayNumbers: number[], weeklyDays: number) {
  const distinct = [...new Set(dayNumbers)].sort((a, b) => a - b);
  const dates = learningDates(start, distinct.length, weeklyDays);
  return new Map(distinct.map((n, i) => [n, dates[i]!]));
}

/** Target end date = planned date of the final learning day. */
export function targetEndDate(start: string, learningDayCount: number, weeklyDays: number) {
  if (learningDayCount <= 0) return start;
  return learningDates(start, learningDayCount, weeklyDays).at(-1)!;
}

/** Learning days d with from ≤ d < to. */
export function learningDaysBetween(from: string, to: string, weeklyDays: number) {
  const days = learningWeekdays(weeklyDays);
  let n = 0;
  for (const d = toDate(from), end = toDate(to); d < end; d.setUTCDate(d.getUTCDate() + 1)) if (days.has(d.getUTCDay())) n++;
  return n;
}

// ---------- Progress ----------

export interface DayLike { day_number: number; sort_order?: number; status: string; planned_date: string | null; phase_id?: string; module_id?: string }

export function isOverdue(i: Pick<DayLike, "status" | "planned_date">, today: string) {
  return !!i.planned_date && i.planned_date < today && i.status !== "COMPLETED";
}

export function progress(items: Pick<DayLike, "status">[]) {
  const total = items.length;
  const completed = Math.min(total, items.filter((i) => i.status === "COMPLETED").length);
  const inProgress = items.filter((i) => i.status === "IN_PROGRESS").length;
  return { total, completed, inProgress, pending: Math.max(0, total - completed - inProgress), pct: total ? Math.min(100, Math.round((completed / total) * 100)) : 0 };
}

const ordered = <T extends DayLike>(items: T[]) => [...items].sort((a, b) => a.day_number - b.day_number || (a.sort_order ?? 0) - (b.sort_order ?? 0));

/** First day item (in sequence) that is not completed. */
export function currentDay<T extends DayLike>(items: T[]) {
  return ordered(items).find((i) => i.status !== "COMPLETED") ?? null;
}
export function nextAfter<T extends DayLike>(items: T[], cur: T | null) {
  if (!cur) return null;
  const o = ordered(items);
  return o.slice(o.indexOf(cur) + 1).find((i) => i.status !== "COMPLETED") ?? null;
}

export function groupProgress<T extends DayLike>(items: T[], key: "phase_id" | "module_id") {
  const m = new Map<string, ReturnType<typeof progress>>();
  const groups = new Map<string, T[]>();
  for (const i of items) { const k = i[key] ?? ""; groups.set(k, [...(groups.get(k) ?? []), i]); }
  for (const [k, l] of groups) m.set(k, progress(l));
  return m;
}

// ---------- Schedule health ----------

export const BEHIND_OVERDUE_COUNT = 3;
export const BEHIND_LATE_DAYS = 3;
export type Health = "ON_TRACK" | "ATTENTION" | "BEHIND";

/** Transparent, deterministic schedule health. */
export function scheduleHealth(items: Pick<DayLike, "status" | "planned_date">[], today: string, weeklyDays: number): { status: Health; overdue: number; reason: string } {
  const over = items.filter((i) => isOverdue(i, today));
  if (!over.length) return { status: "ON_TRACK", overdue: 0, reason: "No planned activity is overdue." };
  const oldest = over.map((i) => i.planned_date!).sort()[0]!;
  const late = learningDaysBetween(oldest, today, weeklyDays);
  const base = `${over.length} planned ${over.length === 1 ? "activity is" : "activities are"} overdue; the oldest is ${late} learning day${late === 1 ? "" : "s"} late.`;
  if (over.length >= BEHIND_OVERDUE_COUNT || late > BEHIND_LATE_DAYS)
    return { status: "BEHIND", overdue: over.length, reason: `${base} Behind = ${BEHIND_OVERDUE_COUNT}+ overdue or more than ${BEHIND_LATE_DAYS} learning days late.` };
  return { status: "ATTENTION", overdue: over.length, reason: base };
}

// ---------- Transitions ----------

/** Moves a candidate may make on their own day items. */
export function candidateMayMove(from: string, to: string) {
  return (from === "PENDING" && (to === "IN_PROGRESS" || to === "COMPLETED")) || (from === "IN_PROGRESS" && to === "COMPLETED");
}
/** Permission needed for a staff day-status change. */
export function staffMovePermission(from: string, to: string) {
  return from === "COMPLETED" && to !== "COMPLETED" ? "roadmap.reopen" : "roadmap.status";
}

export type RoadmapAction = "start" | "pause" | "resume" | "cancel" | "complete";
export const ROADMAP_ACTIONS: Record<RoadmapAction, { from: RoadmapStatus[]; to: RoadmapStatus; permission: string; reason: boolean; label: string }> = {
  start: { from: ["NOT_STARTED"], to: "ACTIVE", permission: "roadmap.start", reason: false, label: "Start Roadmap" },
  pause: { from: ["ACTIVE"], to: "PAUSED", permission: "roadmap.pause", reason: true, label: "Pause Roadmap" },
  resume: { from: ["PAUSED"], to: "ACTIVE", permission: "roadmap.pause", reason: false, label: "Resume Roadmap" },
  cancel: { from: ["NOT_STARTED", "ACTIVE", "PAUSED"], to: "CANCELLED", permission: "roadmap.cancel", reason: true, label: "Cancel Roadmap" },
  complete: { from: ["ACTIVE"], to: "COMPLETED", permission: "roadmap.complete", reason: false, label: "Complete Roadmap" },
};
export function canRoadmapAction(action: RoadmapAction, status: string, allDone: boolean) {
  const a = ROADMAP_ACTIONS[action];
  if (!a.from.includes(status as RoadmapStatus)) return false;
  return action !== "complete" || allDone;
}
export const isExecutable = (status: string) => status === "ACTIVE";
export const isReadOnly = (status: string) => status === "COMPLETED" || status === "CANCELLED";
