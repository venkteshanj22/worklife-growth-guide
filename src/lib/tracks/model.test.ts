import { describe, expect, it } from "vitest";
import { durationWarning, plannedDays, suggestNextVersion, validateNextVersion } from "./model";

describe("track versions", () => {
  it("accepts a higher version", () => expect(validateNextVersion("1.1", ["1.0"])).toBeNull());
  it("rejects duplicates", () => expect(validateNextVersion("1.0", ["1.0"])).not.toBeNull());
  it("rejects lower versions", () => expect(validateNextVersion("1.0", ["1.1"])).not.toBeNull());
  it("rejects bad format", () => expect(validateNextVersion("v2", [])).not.toBeNull());
  it("suggests next minor", () => expect(suggestNextVersion(["1.0", "1.2"])).toBe("1.3"));
});

describe("duration mismatch", () => {
  it("warns when planned days exceed duration", () =>
    expect(durationWarning(60, 65)).toBe("Track duration is configured as 60 days, but curriculum currently contains 65 planned days."));
  it("no warning when equal", () => expect(durationWarning(60, 60)).toBeNull());
  it("counts distinct active days", () =>
    expect(plannedDays([{ day_number: 1, is_active: true }, { day_number: 1, is_active: true }, { day_number: 2, is_active: false }])).toBe(1));
});
