"use server";

import { eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { hash } from "bcryptjs";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { workflowClient } from "@/lib/workflow";
import config from "@/lib/config";
import { getRedirectForRole } from "./auth-redirect";

type AuthActionResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
  role?: string;
};

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
