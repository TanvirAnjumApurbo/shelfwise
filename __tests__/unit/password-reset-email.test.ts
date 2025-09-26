import { describe, expect, it } from "@jest/globals";
import { getPasswordResetEmailTemplate } from "@/lib/emails/password-reset";

describe("getPasswordResetEmailTemplate", () => {
  it("embeds the recipient name, code, and expiry", () => {
    const html = getPasswordResetEmailTemplate({
      fullName: "Ada Lovelace",
      code: "123456",
      expiresInMinutes: 20,
    });

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("123456");
    expect(html).toContain("20 minutes");
    expect(html).toMatch(/ShelfWise security checkpoint/i);
  });

  it("falls back to a generic greeting when the name is empty", () => {
    const html = getPasswordResetEmailTemplate({
      fullName: "",
      code: "654321",
      expiresInMinutes: 15,
    });

    expect(html).toContain("Hi there");
  });
});
