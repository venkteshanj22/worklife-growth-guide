import { describe, expect, it } from "vitest";
import { breaksDayOrder, executionCode, isOverdue, isPremium, workTransition, REVIEW_ACTIONS } from "./model";

describe("execution IDs", () => {
  it("formats review, project and task codes", () => {
    expect(executionCode("REVIEW", "C361-2026-0001", 1)).toBe("WR-C361-2026-0001-01");
    expect(executionCode("PROJECT", "C361-2026-0001", 2)).toBe("PRJ-C361-2026-0001-02");
    expect(executionCode("TASK", "C361-2026-0001", 1)).toBe("PT-C361-2026-0001-001");
  });
});

describe("premium entitlement", () => {
  it("only PREMIUM plan is entitled", () => {
    expect(isPremium("PREMIUM")).toBe(true);
    expect(isPremium("STANDARD")).toBe(false);
    expect(isPremium(null)).toBe(false);
  });
});

describe("overdue", () => {
  it("review overdue only while scheduled", () => {
    expect(isOverdue("REVIEW", "SCHEDULED", "2026-10-10", "2026-10-18")).toBe(true);
    expect(isOverdue("REVIEW", "IN_PROGRESS", "2026-10-10", "2026-10-18")).toBe(false);
    expect(isOverdue("REVIEW", "SCHEDULED", "2026-10-18", "2026-10-18")).toBe(false);
  });
  it("project/task overdue until completed or cancelled", () => {
    expect(isOverdue("PROJECT", "SUBMITTED", "2026-10-10", "2026-10-18")).toBe(true);
    expect(isOverdue("PROJECT", "COMPLETED", "2026-10-10", "2026-10-18")).toBe(false);
    expect(isOverdue("TASK", "CANCELLED", "2026-10-10", "2026-10-18")).toBe(false);
  });
});

describe("workflow", () => {
  it("project flow with changes and resubmission", () => {
    expect(workTransition("PROJECT", "start", "NOT_STARTED")).toBe("IN_PROGRESS");
    expect(workTransition("PROJECT", "submit", "IN_PROGRESS")).toBe("SUBMITTED");
    expect(workTransition("PROJECT", "request_changes", "SUBMITTED")).toBe("CHANGES_REQUESTED");
    expect(workTransition("PROJECT", "resubmit", "CHANGES_REQUESTED")).toBe("RESUBMITTED");
    expect(workTransition("PROJECT", "complete", "RESUBMITTED")).toBe("COMPLETED");
  });
  it("blocks invalid moves", () => {
    expect(workTransition("PROJECT", "complete", "IN_PROGRESS")).toBeNull();
    expect(workTransition("TASK", "start", "NOT_STARTED")).toBeNull();
    expect(workTransition("TASK", "cancel", "COMPLETED")).toBeNull();
  });
  it("missed review requires a reason", () => {
    expect(REVIEW_ACTIONS.missed.reason).toBe(true);
    expect(REVIEW_ACTIONS.complete.from).toEqual(["IN_PROGRESS"]);
  });
});

describe("planned date order", () => {
  const days = [
    { id: "a", day_number: 4, planned_date: "2026-10-14" },
    { id: "b", day_number: 5, planned_date: "2026-10-15" },
    { id: "c", day_number: 6, planned_date: "2026-10-16" },
  ];
  it("warns when day 4 moves after day 6", () => expect(breaksDayOrder(days, "a", "2026-10-17")).toBe(true));
  it("no warning when order kept", () => expect(breaksDayOrder(days, "a", "2026-10-13")).toBe(false));
});
