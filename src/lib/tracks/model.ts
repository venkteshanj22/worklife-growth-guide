// Client-safe Master Track constants and rules. Add new values here; columns are plain text so they stay extendable.
export const TRACK_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];
export const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export const CATEGORIES: Record<string, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  DEVOPS_CLOUD: "DevOps & Cloud",
  DATA: "Data",
  AI_ML: "AI & ML",
};
export const RESOURCE_TYPES: Record<string, string> = {
  UDEMY: "Udemy",
  YOUTUBE: "YouTube",
  OFFICIAL_DOCUMENTATION: "Official documentation",
  ARTICLE: "Article",
  GITHUB: "GitHub",
  OTHER: "Other",
};
export const PROJECT_TYPES: Record<string, string> = {
  PRACTICE_PROJECT: "Practice project",
  MINI_PROJECT: "Mini project",
  CAPSTONE: "Capstone",
};
export const BLOCK_TYPES: Record<string, string> = {
  TRACK_OVERVIEW: "Track overview",
  WHY_THIS_TRACK: "Why this track",
  TARGET_ROLES: "Target roles",
  SKILL_GAP_GUIDANCE: "Skill gap guidance",
  TARGET_CAPABILITIES: "Target capabilities",
  LEARNING_STRATEGY: "Learning strategy",
  RESOURCE_GUIDANCE: "Resource guidance",
  PROJECT_GUIDANCE: "Project guidance",
  CAREER_GUIDANCE: "Career guidance",
  CUSTOM: "Custom",
};

export const TRACK_CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,23}$/;
export const VERSION_RE = /^\d{1,3}\.\d{1,3}$/;

export function parseVersion(v: string): [number, number] | null {
  if (!VERSION_RE.test(v)) return null;
  const [a, b] = v.split(".").map(Number);
  return [a!, b!];
}
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) return 0;
  return x[0] - y[0] || x[1] - y[1];
}
/** A new version must be valid and greater than every existing version of the track. */
export function validateNextVersion(next: string, existing: string[]): string | null {
  if (!parseVersion(next)) return "Use a version like 1.1 or 2.0.";
  if (existing.includes(next)) return "This version already exists.";
  if (existing.some((e) => compareVersions(next, e) <= 0)) return "The new version must be higher than existing versions.";
  return null;
}
export function suggestNextVersion(existing: string[]): string {
  const top = [...existing].sort(compareVersions).at(-1) ?? "0.9";
  const p = parseVersion(top) ?? [1, 0];
  return `${p[0]}.${p[1] + 1}`;
}

/** Number of distinct planned days across active roadmap items. */
export function plannedDays(items: { day_number: number | null; is_active: boolean }[]): number {
  return new Set(items.filter((i) => i.is_active && i.day_number != null).map((i) => i.day_number)).size;
}
export function durationWarning(duration: number, planned: number): string | null {
  if (planned === 0 || planned === duration) return null;
  return `Track duration is configured as ${duration} days, but curriculum currently contains ${planned} planned days.`;
}
