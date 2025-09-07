import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBorrowRequest } from "@/lib/actions/borrow-request";
import { z } from "zod";
import ratelimit from "@/lib/ratelimit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { LibraryMetrics } from "@/lib/metrics";

const borrowRequestSchema = z.object({
  bookId: z.string().uuid(),
  confirmationCode: z.string().min(5).max(50),
  idempotencyKey: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  console.log("🔄 [BORROW REQUEST] Starting POST request");

  try {
    // Rate limiting - use a fallback IP
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";

    console.log("🌐 [BORROW REQUEST] IP address:", ip);

    const { success: rateLimitSuccess } = await ratelimit.limit(ip);
    console.log("🚦 [BORROW REQUEST] Rate limit check:", rateLimitSuccess);

    if (!rateLimitSuccess) {
      console.log("⛔ [BORROW REQUEST] Rate limit exceeded");
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Authentication
    console.log("🔐 [BORROW REQUEST] Checking authentication");
    const session = await auth();
    console.log(
      "👤 [BORROW REQUEST] Session:",
      session ? "found" : "not found"
    );

    if (!session?.user?.id) {
      console.log("❌ [BORROW REQUEST] Authentication failed - no user ID");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log("✅ [BORROW REQUEST] User authenticated:", userId);

    // Parse request body
    console.log("📝 [BORROW REQUEST] Parsing request body");
    const body = await request.json();
    console.log(
      "📄 [BORROW REQUEST] Request body:",
      JSON.stringify(body, null, 2)
    );

    const validation = borrowRequestSchema.safeParse(body);
    console.log("✅ [BORROW REQUEST] Validation result:", validation.success);

    if (!validation.success) {
      console.log(
        "❌ [BORROW REQUEST] Validation failed:",
        validation.error.issues
      );
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { bookId, confirmationCode, idempotencyKey } = validation.data;
    console.log("📚 [BORROW REQUEST] Request details:", {
      userId,
      bookId,
      confirmationCode,
      idempotencyKey,
    });

    // Use the enhanced borrow request action
    console.log("🔄 [BORROW REQUEST] Calling createBorrowRequest action");
    const result = await createBorrowRequest({
      userId,
      bookId,
      confirmationText: confirmationCode,
      idempotencyKey,
    });

    console.log("📋 [BORROW REQUEST] Action result:", {
      success: result.success,
      error: result.success ? undefined : result.error,
      hasData: result.success ? !!(result as any).data : false,
    });

    if (!result.success) {
      console.log("❌ [BORROW REQUEST] Action failed:", result.error);

      // Check if it's a duplicate request error
      if (result.error?.includes("already have")) {
        console.log("⚠️ [BORROW REQUEST] Duplicate request detected");
        return NextResponse.json(
          { error: result.error, currentStatus: "PENDING" },
          { status: 409 }
        );
      }

      // Check if it's availability error
      if (result.error?.includes("not available")) {
        console.log("⚠️ [BORROW REQUEST] Availability error");
        return NextResponse.json({ error: result.error }, { status: 409 });
      }

      console.log("⚠️ [BORROW REQUEST] General error");
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Record metrics
    console.log("📊 [BORROW REQUEST] Recording metrics");
    await LibraryMetrics.recordBorrowRequestCreated();

    console.log("✅ [BORROW REQUEST] Request completed successfully");
    return NextResponse.json({
      success: true,
      data: (result as { success: true; data: any }).data,
      message: "Borrow request submitted successfully",
    });
  } catch (error) {
    console.error("💥 [BORROW REQUEST] Unexpected error:", error);
    console.error(
      "💥 [BORROW REQUEST] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    await LibraryMetrics.recordEmailFailure();
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
