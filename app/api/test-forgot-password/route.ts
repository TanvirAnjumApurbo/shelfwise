import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/actions/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("Testing forgot password for email:", email);

    const result = await requestPasswordReset({ email });

    console.log("Password reset result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in test-forgot-password API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
