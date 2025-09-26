import NextAuth, { type Session, type User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import redis from "@/database/redis";

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 120;
const ATTEMPT_TTL_SECONDS = 600;

const formatDuration = (totalSeconds: number) => {
  const seconds = Math.max(Math.round(totalSeconds), 0);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }

  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(
      `${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`
    );
  }

  return parts.join(" ");
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const emailInput = credentials.email.trim();
        const passwordInput = credentials.password;
        const normalizedEmail = emailInput.toLowerCase();
        const cooldownKey = `auth:cooldown:${normalizedEmail}`;
        const attemptsKey = `auth:attempts:${normalizedEmail}`;

        const getCooldownTtl = async () => {
          try {
            return await redis.ttl(cooldownKey);
          } catch {
            return null;
          }
        };

        const recordFailure = async () => {
          try {
            const attemptCount = await redis.incr(attemptsKey);
            await redis.expire(attemptsKey, ATTEMPT_TTL_SECONDS);
            return attemptCount;
          } catch {
            return null;
          }
        };

        const activateCooldown = async () => {
          try {
            await redis.set(cooldownKey, "1", { ex: COOLDOWN_SECONDS });
            await redis.del(attemptsKey);
          } catch {
            /* noop */
          }
        };

        const clearFailureState = async () => {
          try {
            await Promise.all([redis.del(attemptsKey), redis.del(cooldownKey)]);
          } catch {
            /* noop */
          }
        };

        const cooldownTtl = await getCooldownTtl();

        if (cooldownTtl !== null && (cooldownTtl > 0 || cooldownTtl === -1)) {
          const waitTime = cooldownTtl > 0 ? cooldownTtl : COOLDOWN_SECONDS;
          throw new Error(
            `Too many failed attempts. Try again in ${formatDuration(
              waitTime
            )}.`
          );
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, emailInput))
          .limit(1);

        const validatePassword = async () => {
          if (user.length === 0) return false;

          return compare(passwordInput, user[0].password);
        };

        const isPasswordValid = await validatePassword();

        if (!isPasswordValid) {
          const attemptCount = await recordFailure();

          if (attemptCount !== null && attemptCount >= MAX_FAILED_ATTEMPTS) {
            await activateCooldown();
            throw new Error(
              "Too many failed attempts. Try again in 2 minutes."
            );
          }

          if (attemptCount !== null) {
            const remainingAttempts = Math.max(
              MAX_FAILED_ATTEMPTS - attemptCount,
              0
            );
            throw new Error(
              remainingAttempts > 0
                ? `Invalid credentials. ${remainingAttempts} attempt${
                    remainingAttempts === 1 ? "" : "s"
                  } remaining before temporary lock.`
                : "Invalid credentials."
            );
          }

          throw new Error("Invalid credentials.");
        }

        await clearFailureState();

        if (user.length === 0) {
          return null;
        }

        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: user[0].fullName,
          role: user[0].role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User | null }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
});
