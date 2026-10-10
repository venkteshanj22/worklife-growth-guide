import { describe, expect, it } from "vitest";
import { can, homePathFor, isSignInAllowed } from "./permissions";

const base = { status: "ACTIVE" as const, permissions: [] as string[] };

describe("RBAC rules", () => {
  it("Super Admin has every permission", () => {
    expect(can({ ...base, role_key: "super_admin" }, "roles.permissions")).toBe(true);
    expect(can({ ...base, role_key: "super_admin" }, "users.create")).toBe(true);
  });

  it("Candidate cannot use admin permissions", () => {
    const candidate = { ...base, role_key: "candidate", permissions: ["candidate.self.view"] };
    expect(can(candidate, "users.view")).toBe(false);
    expect(can(candidate, "dashboard.view")).toBe(false);
    expect(can(candidate, "candidate.self.view")).toBe(true);
  });

  it("Director cannot manage users unless granted", () => {
    expect(can({ ...base, role_key: "director", permissions: ["dashboard.view"] }, "users.create")).toBe(false);
  });

  it("Inactive and suspended users are blocked", () => {
    expect(isSignInAllowed("INACTIVE")).toBe(false);
    expect(isSignInAllowed("SUSPENDED")).toBe(false);
    expect(isSignInAllowed("ACTIVE")).toBe(true);
    expect(can({ status: "SUSPENDED", role_key: "super_admin", permissions: [] }, "users.view")).toBe(false);
  });

  it("Candidates land in the portal, staff in the app", () => {
    expect(homePathFor({ is_staff: false })).toBe("/portal");
    expect(homePathFor({ is_staff: true })).toBe("/app/dashboard");
  });
});
