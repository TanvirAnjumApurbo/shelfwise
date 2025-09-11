import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { borrowRequests } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const bookId = url.searchParams.get("bookId");

    // Validate parameters
    if (!userId || !bookId) {
      return NextResponse.json(
        { error: "Missing userId or bookId parameters" },
        { status: 400 }
      );
    }

    // Check if the requesting user can access this data
    if (session.user.id !== userId) {
      // For non-matching users, we could add admin check here if needed
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get the current borrow status for the user and book
    const borrowStatus = await db
      .select({
        id: borrowRequests.id,
        status: borrowRequests.status,
        dueDate: borrowRequests.dueDate,
        requestedAt: borrowRequests.requestedAt,
        approvedAt: borrowRequests.approvedAt,
      })
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.userId, userId),
          eq(borrowRequests.bookId, bookId)
        )
      )
      .orderBy(desc(borrowRequests.requestedAt))
      .limit(1);

    console.log(
      `[BORROW-STATUS] Found ${borrowStatus.length} records for user ${userId}, book ${bookId}`
    );
    if (borrowStatus.length > 0) {
      console.log(`[BORROW-STATUS] Latest record:`, borrowStatus[0]);
    }

    if (!borrowStatus.length) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No active borrow status found",
      });
    }

    const status = borrowStatus[0];

    // Only return if it's an active status
    if (!["PENDING", "APPROVED", "RETURN_PENDING"].includes(status.status)) {
      console.log(
        `[BORROW-STATUS] Status ${status.status} not in active list, returning null`
      );
      return NextResponse.json({
        success: true,
        data: null,
        message: "No active borrow status found",
      });
    }

    console.log(`[BORROW-STATUS] Returning active status:`, status.status);

    return NextResponse.json({
      success: true,
      data: {
        status: status.status,
        dueDate: status.dueDate,
        borrowRequestId: status.id,
        requestedAt: status.requestedAt,
        approvedAt: status.approvedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching borrow status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
