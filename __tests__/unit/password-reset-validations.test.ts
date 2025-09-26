import { describe, expect, it } from "@jest/globals";
import {
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
} from "@/lib/validations";

describe("password reset validations", () => {
  it("accepts a valid password reset request", () => {
    expect(() =>
      passwordResetRequestSchema.parse({ email: "reader@shelfwise.site" })
    ).not.toThrow();
  });

  it("rejects an invalid email", () => {
    expect(() =>
      passwordResetRequestSchema.parse({ email: "not-an-email" })
    ).toThrow();
  });

  it("requires a 6 digit numeric code", () => {
    expect(() =>
      passwordResetVerifySchema.parse({ code: "123456" })
    ).not.toThrow();
    expect(() => passwordResetVerifySchema.parse({ code: "12-456" })).toThrow();
    expect(() => passwordResetVerifySchema.parse({ code: "12345" })).toThrow();
  });

  it("ensures passwords match on completion", () => {
    expect(() =>
      passwordResetCompleteSchema.parse({
        password: "password123",
        confirmPassword: "password123",
      })
    ).not.toThrow();

    expect(() =>
      passwordResetCompleteSchema.parse({
        password: "password123",
        confirmPassword: "different",
      })
    ).toThrow();
  });
});
