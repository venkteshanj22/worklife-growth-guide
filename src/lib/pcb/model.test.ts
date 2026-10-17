import { describe, expect, it } from "vitest";
import { approvalChecklist, canTransition, durationMismatch, pcbCode, pcbDisplayId, plannedDays, recalculateDays } from "./model";

describe("PCB identity", () => {
  it("uses the candidate ID and a version suffix", () => {
    expect(pcbCode("C361-2026-0001")).toBe("PCB-C361-2026-0001");
    expect(pcbDisplayId("PCB-C361-2026-0001", 2)).toBe("PCB-C361-2026-0001-V2");
  });
});

describe("status workflow", () => {
  it("approves only from In Review", () => {
    expect(canTransition("approve", "IN_REVIEW")).toBe(true);
    expect(canTransition("approve", "DRAFT")).toBe(false);
  });
  it("never lets approved versions be submitted or cancelled", () => {
    expect(canTransition("submit", "APPROVED")).toBe(false);
    expect(canTransition("cancel", "APPROVED")).toBe(false);
  });
  it("resubmits after changes are requested", () => {
    expect(canTransition("submit", "CHANGES_REQUESTED")).toBe(true);
  });
});

describe("curriculum days", () => {
  it("renumbers in phase → module → item order", () => {
    const phases = [{ id: "p2", sort_order: 2 }, { id: "p1", sort_order: 1 }];
    const modules = [{ id: "m2", phase_id: "p2", sort_order: 1 }, { id: "m1", phase_id: "p1", sort_order: 1 }];
    const items = [
      { id: "c", module_id: "m2", sort_order: 1, day_number: 9 },
      { id: "b", module_id: "m1", sort_order: 2, day_number: null },
      { id: "a", module_id: "m1", sort_order: 1, day_number: 5 },
    ];
    expect(recalculateDays(phases, modules, items)).toEqual({ a: 1, b: 2, c: 3 });
  });
  it("warns when planned days differ from target", () => {
    expect(plannedDays([{ day_number: 1 }, { day_number: 1 }, { day_number: 2 }])).toBe(2);
    expect(durationMismatch(60, 67)).toBe("PCB target duration is 60 days, but the current curriculum contains 67 planned days.");
    expect(durationMismatch(60, 60)).toBeNull();
  });
});

describe("approval checklist", () => {
  const ok = { candidateExists: true, hasAssessment: true, override: false, primaryCareerPath: "Dev", primaryTargetRole: "Dev", dayItems: 3, skillGaps: 1, capabilities: 1, projects: 1, targetDays: 60, plannedDays: 60, durationAck: false, missingControlled: [] };
  it("passes when everything is present", () => {
    expect(approvalChecklist(ok).every((c) => c.ok)).toBe(true);
  });
  it("blocks on missing project and unacknowledged mismatch", () => {
    const r = approvalChecklist({ ...ok, projects: 0, plannedDays: 67 });
    expect(r.filter((c) => !c.ok).map((c) => c.key)).toEqual(["projects", "duration"]);
  });
  it("accepts an override instead of an assessment", () => {
    expect(approvalChecklist({ ...ok, hasAssessment: false, override: true }).find((c) => c.key === "assessment")!.ok).toBe(true);
  });
});
