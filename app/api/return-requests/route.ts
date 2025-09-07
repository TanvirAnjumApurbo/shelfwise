import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { borrowRequests, books, users } from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import ratelimit from "@/lib/ratelimit";

const returnRequestSchema = z.object({
  borrowRequestId: z.string().uuid(),
  confirmationCode: z.string().min(5).max(8),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";
    const { success: rateLimitSuccess } = await ratelimit.limit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const validation = returnRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { borrowRequestId, confirmationCode, idempotencyKey } =
      validation.data;

    // Check for existing request with same idempotency key
    const existingIdempotentRequest = await db
      .select()
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.userId, userId),
          sql`meta LIKE ${`%${idempotencyKey}%`}`
        )
      )
      .limit(1);

    if (
      existingIdempotentRequest.length > 0 &&
      existingIdempotentRequest[0].status === "RETURN_PENDING"
    ) {
      return NextResponse.json({
        success: true,
        data: existingIdempotentRequest[0],
        message: "Return request already processed",
      });
    }

    // Get the borrow request and validate it belongs to user
    const borrowRequest = await db
      .select({
        id: borrowRequests.id,
        userId: borrowRequests.userId,
        bookId: borrowRequests.bookId,
        status: borrowRequests.status,
      })
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.id, borrowRequestId),
          eq(borrowRequests.userId, userId),
          eq(borrowRequests.status, "APPROVED")
        )
      )
      .limit(1);

    if (!borrowRequest.length) {
      return NextResponse.json(
        { error: "No active borrow record found or you don't have permission" },
        { status: 404 }
      );
    }

    // Get book details for validation
    const book = await db
      .select({ title: books.title })
      .from(books)
      .where(eq(books.id, borrowRequest[0].bookId))
      .limit(1);

    if (!book.length) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Validate confirmation code
    const bookTitle = book[0].title.toLowerCase();
    const confirmLower = confirmationCode.toLowerCase();

    if (confirmLower !== "return" && !bookTitle.includes(confirmLower)) {
      return NextResponse.json(
        { error: "Invalid confirmation code" },
        { status: 400 }
      );
    }

    // Update the request status to RETURN_PENDING
    const [updatedRequest] = await db
      .update(borrowRequests)
      .set({
        status: "RETURN_PENDING",
        meta: sql`COALESCE(meta, '') || ${JSON.stringify({
          returnIdempotencyKey: idempotencyKey,
          returnConfirmationCode: confirmationCode,
        })}`,
      })
      .where(eq(borrowRequests.id, borrowRequestId))
      .returning();

    // Send notification to admins (optional)
    try {
      const adminUsers = await db
        .select({ email: users.email, fullName: users.fullName })
        .from(users)
        .where(eq(users.role, "ADMIN"))
        .limit(5);

      if (adminUsers.length > 0) {
        const userDetails = await db
          .select({ fullName: users.fullName, email: users.email })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userDetails.length > 0) {
          // Send notification about return request
          // Implementation depends on your email service
        }
      }
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating return request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
