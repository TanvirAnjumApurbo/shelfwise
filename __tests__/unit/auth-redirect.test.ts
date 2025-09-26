import { describe, it, expect } from "@jest/globals";
import { getRedirectForRole } from "@/lib/actions/auth-redirect";

describe("getRedirectForRole", () => {
  it("returns admin dashboard for admin role", () => {
    expect(getRedirectForRole("ADMIN")).toBe("/admin");
  });

  it("returns default home route for user role", () => {
    expect(getRedirectForRole("USER")).toBe("/");
  });

  it("returns default home route when role is missing", () => {
    expect(getRedirectForRole(undefined)).toBe("/");
    expect(getRedirectForRole(null)).toBe("/");
  });
});
