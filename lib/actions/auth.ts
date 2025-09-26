"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { passwordResetTokens, users } from "@/database/schema";
import { compare, hash } from "bcryptjs";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { sendEmail, workflowClient } from "@/lib/workflow";
import config from "@/lib/config";
import { getRedirectForRole } from "./auth-redirect";
import { randomInt, randomUUID } from "crypto";
import { getPasswordResetEmailTemplate } from "@/lib/emails/password-reset";

type AuthActionResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
  role?: string;
};

type PasswordResetRequestResult = {
  success: boolean;
  error?: string;
  message?: string;
};

type PasswordResetVerifyResult = {
  success: boolean;
  error?: string;
  resetToken?: string;
};

type PasswordResetCompleteResult = AuthActionResult;

const PASSWORD_RESET_CODE_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 30;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateResetCode = () =>
  String(randomInt(0, 1_000_000)).padStart(6, "0");

const addMinutes = (minutes: number) =>
  new Date(Date.now() + minutes * 60 * 1000);

const genericResetMessage =
  "If an account exists for this email, we'll send a verification code shortly.";

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">
): Promise<AuthActionResult> => {
  const { email, password } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: result.error };
    }

    const userRecord = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const role = userRecord[0]?.role ?? "USER";
    const redirectTo = getRedirectForRole(role);

    return {
      success: true,
      role,
      redirectTo,
    };
  } catch (error) {
    console.log(error, "Signin error");
    return { success: false, error: "Signin error" };
  }
};

export const signUp = async (
  params: AuthCredentials
): Promise<AuthActionResult> => {
  const { fullName, email, universityId, password, universityCard } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);

  try {
    await db.insert(users).values({
      fullName,
      email,
      universityId,
      password: hashedPassword,
      universityCard,
    });

    await workflowClient.trigger({
      url: `${config.env.prodApiEndpoint}/api/workflows/onboarding`,
      body: {
        email,
        fullName,
      },
    });

    const signInResult = await signInWithCredentials({ email, password });

    if (!signInResult.success) {
      return signInResult;
    }

    return {
      success: true,
      redirectTo: getRedirectForRole(signInResult.role),
      role: signInResult.role,
    };
  } catch (error) {
    console.log(error, "Signup error");
    return { success: false, error: "Signup error" };
  }
};

export const requestPasswordReset = async ({
  email,
}: {
  email: string;
}): Promise<PasswordResetRequestResult> => {
  const normalizedEmail = normalizeEmail(email);
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for") ||
    headerStore.get("x-real-ip") ||
    "127.0.0.1";

  const { success: allowed } = await ratelimit.limit(
    `${ip}:password-reset-request`
  );

  if (!allowed) {
    return {
      success: false,
      error:
        "You’ve requested too many password resets. Please wait a minute and try again.",
    };
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        success: true,
        message: genericResetMessage,
      };
    }

    const code = generateResetCode();
    const codeHash = await hash(code, 10);
    const codeExpiresAt = addMinutes(PASSWORD_RESET_CODE_EXPIRY_MINUTES);

    await db.transaction(async (tx) => {
      await tx
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id));

      await tx.insert(passwordResetTokens).values({
        userId: user.id,
        codeHash,
        codeExpiresAt,
      });
    });

    await sendEmail({
      email: user.email,
      subject: "ShelfWise password reset code",
      message: getPasswordResetEmailTemplate({
        fullName: user.fullName,
        code,
        expiresInMinutes: PASSWORD_RESET_CODE_EXPIRY_MINUTES,
      }),
    });

    return {
      success: true,
      message: genericResetMessage,
    };
  } catch (error) {
    console.error("requestPasswordReset error", error);
    return {
      success: false,
      error:
        "Unable to process your request right now. Please try again later.",
    };
  }
};

export const verifyPasswordResetCode = async ({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<PasswordResetVerifyResult> => {
  const normalizedEmail = normalizeEmail(email);
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for") ||
    headerStore.get("x-real-ip") ||
    "127.0.0.1";

  const { success: allowed } = await ratelimit.limit(
    `${ip}:password-reset-verify`
  );

  if (!allowed) {
    return {
      success: false,
      error:
        "Too many attempts. Please wait a minute and request a new verification code.",
    };
  }

  try {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return {
        success: false,
        error: "Invalid verification code.",
      };
    }

    const [tokenRecord] = await db
      .select({
        id: passwordResetTokens.id,
        codeHash: passwordResetTokens.codeHash,
        attempts: passwordResetTokens.attempts,
        codeExpiresAt: passwordResetTokens.codeExpiresAt,
        codeVerifiedAt: passwordResetTokens.codeVerifiedAt,
        resetTokenExpiresAt: passwordResetTokens.resetTokenExpiresAt,
        consumedAt: passwordResetTokens.consumedAt,
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.consumedAt)
        )
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);

    if (!tokenRecord) {
      return {
        success: false,
        error: "Invalid verification code.",
      };
    }

    if (tokenRecord.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      return {
        success: false,
        error: "Too many invalid attempts. Please request a new code.",
      };
    }

    if (tokenRecord.codeVerifiedAt) {
      return {
        success: false,
        error: "This code has already been used. Please request a new one.",
      };
    }

    if (new Date(tokenRecord.codeExpiresAt) < new Date()) {
      return {
        success: false,
        error: "This code has expired. Request a new verification code.",
      };
    }

    const isValidCode = await compare(code.trim(), tokenRecord.codeHash);

    if (!isValidCode) {
      const updatedAttempts = tokenRecord.attempts + 1;

      await db
        .update(passwordResetTokens)
        .set({ attempts: updatedAttempts })
        .where(eq(passwordResetTokens.id, tokenRecord.id));

      const remaining = PASSWORD_RESET_MAX_ATTEMPTS - updatedAttempts;
      const attemptMessage =
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt${
              remaining === 1 ? "" : "s"
            } remaining.`
          : "Too many invalid attempts. Please request a new code.";

      return {
        success: false,
        error: attemptMessage,
      };
    }

    const resetToken = randomUUID();
    const resetTokenHash = await hash(resetToken, 10);
    const now = new Date();
    const resetTokenExpiresAt = addMinutes(PASSWORD_RESET_TOKEN_EXPIRY_MINUTES);

    await db
      .update(passwordResetTokens)
      .set({
        resetTokenHash,
        resetTokenExpiresAt,
        codeVerifiedAt: now,
        attempts: 0,
      })
      .where(eq(passwordResetTokens.id, tokenRecord.id));

    return {
      success: true,
      resetToken,
    };
  } catch (error) {
    console.error("verifyPasswordResetCode error", error);
    return {
      success: false,
      error: "Unable to verify the code right now. Please try again later.",
    };
  }
};

export const resetPassword = async ({
  email,
  password,
  confirmPassword,
  resetToken,
}: {
  email: string;
  password: string;
  confirmPassword: string;
  resetToken: string;
}): Promise<PasswordResetCompleteResult> => {
  if (password !== confirmPassword) {
    return {
      success: false,
      error: "Passwords do not match.",
    };
  }

  const normalizedEmail = normalizeEmail(email);
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for") ||
    headerStore.get("x-real-ip") ||
    "127.0.0.1";

  const { success: allowed } = await ratelimit.limit(
    `${ip}:password-reset-complete`
  );

  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts. Please wait a minute and try again.",
    };
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return {
        success: false,
        error: "Invalid reset token.",
      };
    }

    const [tokenRecord] = await db
      .select({
        id: passwordResetTokens.id,
        resetTokenHash: passwordResetTokens.resetTokenHash,
        resetTokenExpiresAt: passwordResetTokens.resetTokenExpiresAt,
        consumedAt: passwordResetTokens.consumedAt,
        codeVerifiedAt: passwordResetTokens.codeVerifiedAt,
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.consumedAt)
        )
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);

    if (
      !tokenRecord ||
      !tokenRecord.resetTokenHash ||
      !tokenRecord.codeVerifiedAt
    ) {
      return {
        success: false,
        error: "Invalid reset token.",
      };
    }

    if (
      tokenRecord.resetTokenExpiresAt &&
      new Date(tokenRecord.resetTokenExpiresAt) < new Date()
    ) {
      return {
        success: false,
        error: "This reset link has expired. Request a new one.",
      };
    }

    const isTokenValid = await compare(resetToken, tokenRecord.resetTokenHash);

    if (!isTokenValid) {
      return {
        success: false,
        error: "Invalid reset token.",
      };
    }

    const hashedPassword = await hash(password, 10);
    const completionTime = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: completionTime })
        .where(eq(passwordResetTokens.id, tokenRecord.id));
    });

    try {
      const signInResult = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        console.error("resetPassword signIn error", signInResult.error);
      }
    } catch (error) {
      console.error("resetPassword signIn threw", error);
    }

    const userRole = user.role ?? "USER";
    const redirectTo = getRedirectForRole(userRole);

    return {
      success: true,
      redirectTo,
      role: userRole,
    };
  } catch (error) {
    console.error("resetPassword error", error);
    return {
      success: false,
      error: "Something went wrong while updating your password.",
    };
  }
};
