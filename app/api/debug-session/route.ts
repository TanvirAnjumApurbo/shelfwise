import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        error: "No session found",
        session: null,
      });
    }

    // Get user from database
    const dbUser = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json({
      session: session,
      dbUser: dbUser[0] || null,
      isAdmin: session.user.role === "ADMIN",
      dbIsAdmin: dbUser[0]?.role === "ADMIN",
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
