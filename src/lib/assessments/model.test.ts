import { describe, it, expect } from "vitest";
import { scoreError, totalScore, nextActions, readyToClose, currentAssessment, fileError, maxTotal } from "./model";

describe("assessment rules", () => {
  it("rejects a score above the dimension maximum", () => {
    expect(scoreError(21, 20)).toBe("Score cannot exceed 20");
    expect(scoreError(20, 20)).toBeNull();
    expect(scoreError(-1, 20)).not.toBeNull();
  });
  it("totals entered scores to the example 65/100", () => {
    const s = [16, 12, 6, 9, 8, 8, 6].map((score) => ({ score }));
    expect(totalScore(s)).toBe(65);
    expect(totalScore([{ score: null }])).toBeNull();
  });
  it("default dimensions total 100", () => {
    expect(maxTotal([20, 20, 15, 15, 10, 10, 10].map((max_score) => ({ max_score })))).toBe(100);
  });
  it("finalized is editable only by super admin", () => {
    expect(nextActions("FINALIZED", false).canEdit).toBe(false);
    expect(nextActions("FINALIZED", true).canEdit).toBe(true);
    expect(nextActions("COMPLETED", false).canComplete).toBe(false);
    expect(nextActions("COMPLETED", false).canFinalize).toBe(true);
  });
  it("needs every score and an outcome to complete", () => {
    expect(readyToClose([{ score: 1 }, { score: null }], "READY")).toBe(false);
    expect(readyToClose([{ score: 1 }], null)).toBe(false);
    expect(readyToClose([{ score: 1 }], "READY")).toBe(true);
  });
  it("latest finalized assessment is the official one", () => {
    const list = [
      { sequence: 1, status: "FINALIZED" },
      { sequence: 2, status: "DRAFT" },
    ];
    expect(currentAssessment(list)?.sequence).toBe(1);
    expect(currentAssessment([{ sequence: 1, status: "DRAFT" }])?.sequence).toBe(1);
  });
  it("limits document type and size to 10 MB", () => {
    expect(fileError("a.exe", 10)).not.toBeNull();
    expect(fileError("a.pdf", 11 * 1024 * 1024)).not.toBeNull();
    expect(fileError("a.PDF", 1000)).toBeNull();
  });
});
