import { describe, it, expect } from "@jest/globals";
import { getRedirectForRole } from "@/lib/actions/auth-redirect";

describe("auth role redirect helper", () => {
  it("sends admins to the admin dashboard", () => {
    expect(getRedirectForRole("ADMIN")).toBe("/admin");
  });

  it("sends users to the main app", () => {
    expect(getRedirectForRole("USER")).toBe("/");
  });

  it("defaults to main app when role missing", () => {
    expect(getRedirectForRole()).toBe("/");
  });
});
