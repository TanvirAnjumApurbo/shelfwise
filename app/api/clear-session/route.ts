import { NextResponse } from "next/server";
import { auth, signOut } from "@/auth";

export async function POST() {
  try {
    // Sign out to clear the session
    await signOut({ redirect: false });

    return NextResponse.json({
      success: true,
      message: "Session cleared. Please log in again to get updated role.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        error: "Failed to clear session",
      },
      { status: 500 }
    );
  }
}
