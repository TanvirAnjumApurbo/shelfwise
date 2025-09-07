import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { notificationPreferences, books } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { NotificationIdempotency } from "@/lib/idempotency";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { LibraryMetrics } from "@/lib/metrics";
import { createAuditLog } from "@/lib/audit";

const notificationSchema = z.object({
  bookId: z.string().uuid(),
  enable: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
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
    const validation = notificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { bookId, enable } = validation.data;

    if (!isFeatureEnabled("ENABLE_NOTIFY")) {
      return NextResponse.json(
        { error: "Notification feature is disabled" },
        { status: 503 }
      );
    }

    // Use idempotency to prevent duplicate operations
    const result = await NotificationIdempotency.subscribe(
      userId,
      bookId,
      async () => {
        return db.transaction(async (tx) => {
          // Verify book exists
          const book = await tx
            .select({ title: books.title })
            .from(books)
            .where(eq(books.id, bookId))
            .limit(1);

          if (!book.length) {
            throw new Error("Book not found");
          }

          // Check if preference already exists
          const existingPref = await tx
            .select()
            .from(notificationPreferences)
            .where(
              and(
                eq(notificationPreferences.userId, userId),
                eq(notificationPreferences.bookId, bookId)
              )
            )
            .limit(1);

          if (enable) {
            if (existingPref.length > 0) {
              // Update existing preference
              await tx
                .update(notificationPreferences)
                .set({
                  notifyOnAvailable: true,
                  notifiedAt: null,
                })
                .where(
                  and(
                    eq(notificationPreferences.userId, userId),
                    eq(notificationPreferences.bookId, bookId)
                  )
                );
            } else {
              // Create new preference
              await tx.insert(notificationPreferences).values({
                userId,
                bookId,
                notifyOnAvailable: true,
              });
            }

            // Record metrics
            await LibraryMetrics.recordNotifyEmailSent();

            // Create audit log
            if (isFeatureEnabled("ENABLE_AUDIT_LOGS")) {
              await createAuditLog({
                action: "USER_LOGIN", // Using existing enum value
                actorType: "USER",
                actorId: userId,
                targetBookId: bookId,
                metadata: {
                  type: "NOTIFICATION_ENABLED",
                  bookTitle: book[0].title,
                },
              });
            }

            return {
              success: true,
              message: "You will be notified when this book becomes available",
            };
          } else {
            if (existingPref.length > 0) {
              // Disable notification
              await tx
                .update(notificationPreferences)
                .set({
                  notifyOnAvailable: false,
                })
                .where(
                  and(
                    eq(notificationPreferences.userId, userId),
                    eq(notificationPreferences.bookId, bookId)
                  )
                );
            }

            // Create audit log
            if (isFeatureEnabled("ENABLE_AUDIT_LOGS")) {
              await createAuditLog({
                action: "USER_LOGIN", // Using existing enum value
                actorType: "USER",
                actorId: userId,
                targetBookId: bookId,
                metadata: {
                  type: "NOTIFICATION_DISABLED",
                  bookTitle: book[0].title,
                },
              });
            }

            return {
              success: true,
              message: "Notification disabled",
            };
          }
        });
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating notification preference:", error);
    await LibraryMetrics.recordEmailFailure();
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get notification status for a book
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
    const bookId = url.searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json(
        { error: "Missing bookId parameter" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Get notification preference
    const preference = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.bookId, bookId)
        )
      )
      .limit(1);

    if (preference.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: preference[0].notifyOnAvailable,
          notifiedAt: preference[0].notifiedAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: false,
        notifiedAt: null,
      },
    });
  } catch (error) {
    console.error("Error fetching notification preference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
