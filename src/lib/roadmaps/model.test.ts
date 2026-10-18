import { describe, expect, it } from "vitest";
import {
  canRoadmapAction, candidateMayMove, currentDay, learningDates, plannedDatesByDay, progress, roadmapCode, scheduleHealth, staffMovePermission, targetEndDate, todayIST,
} from "./model";

// 2026-10-19 is a Monday.
describe("roadmap scheduling", () => {
  it("6 learning days/week skips Sundays", () => {
    expect(learningDates("2026-10-19", 7, 6)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-26"]);
  });
  it("5 learning days/week skips weekends", () => {
    expect(learningDates("2026-10-23", 2, 5)).toEqual(["2026-10-23", "2026-10-26"]);
  });
  it("7 days/week uses every day", () => {
    expect(learningDates("2026-10-24", 2, 7)).toEqual(["2026-10-24", "2026-10-25"]);
  });
  it("a Sunday start moves to Monday with 6 days/week", () => {
    expect(learningDates("2026-10-25", 1, 6)).toEqual(["2026-10-26"]);
  });
  it("target end date for 60 learning days at 6/week", () => {
    expect(targetEndDate("2026-10-19", 60, 6)).toBe("2026-12-26");
  });
  it("items sharing a day number share a date", () => {
    const m = plannedDatesByDay("2026-10-19", [1, 1, 2], 6);
    expect(m.get(1)).toBe("2026-10-19");
    expect(m.get(2)).toBe("2026-10-20");
  });
  it("today uses India time", () => {
    expect(todayIST(new Date("2026-10-18T19:00:00Z"))).toBe("2026-10-19");
  });
});

describe("roadmap progress and health", () => {
  const d = (day_number: number, status: string, planned_date: string) => ({ day_number, status, planned_date });
  it("progress never exceeds 100%", () => {
    expect(progress([d(1, "COMPLETED", "2026-10-19"), d(2, "COMPLETED", "2026-10-20")]).pct).toBe(100);
    expect(progress([d(1, "COMPLETED", "x"), d(2, "IN_PROGRESS", "x"), d(3, "PENDING", "x")])).toMatchObject({ completed: 1, inProgress: 1, pending: 1, pct: 33 });
  });
  it("current day is the first not completed", () => {
    expect(currentDay([d(2, "COMPLETED", "x"), d(1, "COMPLETED", "x"), d(3, "PENDING", "x")])?.day_number).toBe(3);
  });
  it("on track with nothing overdue", () => {
    expect(scheduleHealth([d(1, "PENDING", "2026-10-20")], "2026-10-20", 6).status).toBe("ON_TRACK");
  });
  it("attention when one item is overdue", () => {
    expect(scheduleHealth([d(1, "PENDING", "2026-10-19")], "2026-10-20", 6).status).toBe("ATTENTION");
  });
  it("behind with 3 overdue items", () => {
    expect(scheduleHealth([d(1, "PENDING", "2026-10-19"), d(2, "IN_PROGRESS", "2026-10-20"), d(3, "PENDING", "2026-10-21")], "2026-10-22", 6).status).toBe("BEHIND");
  });
  it("behind when oldest overdue is more than 3 learning days late", () => {
    expect(scheduleHealth([d(1, "PENDING", "2026-10-19")], "2026-10-23", 6).status).toBe("BEHIND");
  });
  it("lateness counts learning days after the planned day, skipping non-learning days", () => {
    // Planned Wed 14 Oct; today Sun 18 Oct; Mon–Sat schedule → Thu, Fri, Sat = 3 days late → Attention.
    const h = scheduleHealth([d(1, "PENDING", "2026-10-14")], "2026-10-18", 6);
    expect(h.status).toBe("ATTENTION");
    expect(h.reason).toContain("3 learning days late");
  });
});

describe("roadmap rules", () => {
  it("candidate may start or complete but never reopen", () => {
    expect(candidateMayMove("PENDING", "IN_PROGRESS")).toBe(true);
    expect(candidateMayMove("PENDING", "COMPLETED")).toBe(true);
    expect(candidateMayMove("COMPLETED", "IN_PROGRESS")).toBe(false);
  });
  it("reopening a completed day needs roadmap.reopen", () => {
    expect(staffMovePermission("COMPLETED", "PENDING")).toBe("roadmap.reopen");
    expect(staffMovePermission("PENDING", "COMPLETED")).toBe("roadmap.status");
  });
  it("complete is only offered when every day is done", () => {
    expect(canRoadmapAction("complete", "ACTIVE", false)).toBe(false);
    expect(canRoadmapAction("complete", "ACTIVE", true)).toBe(true);
    expect(canRoadmapAction("start", "ACTIVE", true)).toBe(false);
  });
  it("roadmap ids", () => {
    expect(roadmapCode("C361-2026-0001", 0)).toBe("RM-C361-2026-0001");
    expect(roadmapCode("C361-2026-0001", 1)).toBe("RM-C361-2026-0001-V2");
  });
});
