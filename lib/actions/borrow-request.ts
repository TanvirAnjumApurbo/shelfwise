"use server";

import { db } from "@/database/drizzle";
import {
  books,
  borrowRecords,
  borrowRequests,
  returnRequests,
  users,
  notificationPreferences,
  auditLogs,
} from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import dayjs from "dayjs";
import { sendEmail } from "@/lib/workflow";
import { createAuditLog } from "@/lib/audit";
import { LibraryMetrics } from "@/lib/metrics";
import { FeatureFlags, isFeatureEnabled } from "@/lib/feature-flags";
import {
  BorrowRequestIdempotency,
  IdempotencyManager,
} from "@/lib/idempotency";
import { processAvailabilityNotifications } from "@/lib/background-jobs";
import { BackgroundWorker } from "@/lib/worker";
import { canUserBorrowBooks } from "@/lib/services/user-restriction-service";
import { revalidatePath } from "next/cache";

interface CreateBorrowRequestParams {
  userId: string;
  bookId: string;
  confirmationText: string;
  idempotencyKey?: string; // Optional client-provided idempotency key
}

interface ApproveBorrowRequestParams {
  requestId: string;
  adminId: string;
  adminNotes?: string;
}

interface RejectBorrowRequestParams {
  requestId: string;
  adminId: string;
  adminNotes?: string;
}

// Create a new borrow request
export const createBorrowRequest = async (
  params: CreateBorrowRequestParams
) => {
  const { userId, bookId, confirmationText, idempotencyKey } = params;

  console.log("🚀 [CREATE BORROW REQUEST] Starting with params:", {
    userId,
    bookId,
    confirmationText,
    idempotencyKey,
  });

  // Check database connection first
  try {
    console.log("🔌 [CREATE BORROW REQUEST] Testing database connection");
    // Simple test query to verify connection
    await db.select().from(books).limit(1);
    console.log("✅ [CREATE BORROW REQUEST] Database connection verified");
  } catch (error) {
    console.error(
      "💥 [CREATE BORROW REQUEST] Database connection failed:",
      error
    );
    return {
      success: false,
      error: "Database connection failed",
    };
  }

  // Try transaction first, fall back to non-transaction if not supported
  try {
    console.log("💾 [CREATE BORROW REQUEST] Attempting transaction approach");
    return await db.transaction(async (tx) => {
      return await performBorrowRequestOperations(tx, {
        userId,
        bookId,
        confirmationText,
        idempotencyKey,
      });
    });
  } catch (transactionError) {
    console.log(
      "⚠️ [CREATE BORROW REQUEST] Transaction failed, trying direct approach"
    );
    console.error("Transaction error:", transactionError);

    // If transaction fails, fall back to direct operations (less safe but functional)
    return await performBorrowRequestOperations(db, {
      userId,
      bookId,
      confirmationText,
      idempotencyKey,
    });
  }
};

// Extracted the core logic into a separate function that works with both transaction and direct DB
async function performBorrowRequestOperations(
  dbOrTx: any, // Can be either db or transaction
  params: CreateBorrowRequestParams
) {
  const { userId, bookId, confirmationText, idempotencyKey } = params;

  try {
    console.log("💾 [CREATE BORROW REQUEST] Starting database operations");

    // Check if user is eligible to borrow books (no fines, not restricted)
    console.log(
      "🔍 [CREATE BORROW REQUEST] Checking user borrowing eligibility"
    );
    const borrowEligibility = await canUserBorrowBooks(userId);

    if (!borrowEligibility.success) {
      console.log(
        "❌ [CREATE BORROW REQUEST] Failed to check borrowing eligibility"
      );
      return {
        success: false,
        error: "Unable to verify borrowing eligibility",
      };
    }

    if (!borrowEligibility.canBorrow) {
      console.log(
        "❌ [CREATE BORROW REQUEST] User not eligible to borrow:",
        borrowEligibility.reason
      );
      return {
        success: false,
        error:
          borrowEligibility.reason ||
          "You are not eligible to borrow books at this time",
      };
    }

    console.log("✅ [CREATE BORROW REQUEST] User is eligible to borrow books");

    // Check if confirmation text matches
    console.log("📖 [CREATE BORROW REQUEST] Fetching book details");
    const book = await dbOrTx
      .select({
        title: books.title,
        availableCopies: books.availableCopies,
        reserveOnRequest: books.reserveOnRequest,
      })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    console.log("📚 [CREATE BORROW REQUEST] Book query result:", book);

    if (!book.length) {
      console.log("❌ [CREATE BORROW REQUEST] Book not found");
      return {
        success: false,
        error: "Book not found",
      };
    }

    console.log("✅ [CREATE BORROW REQUEST] Book found:", {
      title: book[0].title,
      availableCopies: book[0].availableCopies,
      reserveOnRequest: book[0].reserveOnRequest,
    });

    // Validate confirmation text according to design spec:
    console.log("🔍 [CREATE BORROW REQUEST] Validating confirmation text");

    if (confirmationText.length < 5) {
      console.log("❌ [CREATE BORROW REQUEST] Confirmation text too short");
      return {
        success: false,
        error: "Confirmation code must be at least 5 characters long.",
      };
    }

    const rawConfirmation = confirmationText.trim();
    const confirmationLower = rawConfirmation.toLowerCase();
    const bookTitleLower = book[0].title.toLowerCase();
    const codePattern = /^[A-Z0-9]{5,12}$/i; // Supports the random code UX

    console.log("🔤 [CREATE BORROW REQUEST] Confirmation validation:", {
      rawConfirmation,
      confirmationLower,
      bookTitleLower,
      matchesCodePattern: codePattern.test(rawConfirmation),
    });

    let isValidConfirmation = false;
    if (codePattern.test(rawConfirmation)) {
      isValidConfirmation = true; // New enhanced UI path
      console.log("✅ [CREATE BORROW REQUEST] Valid code pattern matched");
    } else {
      isValidConfirmation =
        confirmationLower === "confirm" ||
        confirmationLower.includes(bookTitleLower) ||
        bookTitleLower.includes(confirmationLower);
      console.log("🔍 [CREATE BORROW REQUEST] Text validation result:", {
        isConfirmWord: confirmationLower === "confirm",
        confirmationIncludesTitle: confirmationLower.includes(bookTitleLower),
        titleIncludesConfirmation: bookTitleLower.includes(confirmationLower),
        finalResult: isValidConfirmation,
      });
    }

    if (!isValidConfirmation) {
      console.log("❌ [CREATE BORROW REQUEST] Invalid confirmation text");
      return {
        success: false,
        error: `Invalid confirmation code. Enter the displayed code, the word \"confirm\", or part of the book title \"${book[0].title}\" to proceed.`,
      };
    }

    console.log("✅ [CREATE BORROW REQUEST] Confirmation text validated");

    // Determine if we should reserve immediately: global flag OR per-book column
    console.log("🏷️ [CREATE BORROW REQUEST] Checking reservation settings");

    let globalReserveFlag;
    let bookReserveFlag;
    let shouldReserveOnRequest;

    try {
      globalReserveFlag = isFeatureEnabled("RESERVE_ON_REQUEST");
      console.log(
        "✅ [CREATE BORROW REQUEST] Global reserve flag:",
        globalReserveFlag
      );
    } catch (error) {
      console.error(
        "❌ [CREATE BORROW REQUEST] Error getting global reserve flag:",
        error
      );
      globalReserveFlag = false;
    }

    bookReserveFlag = book[0].reserveOnRequest;
    shouldReserveOnRequest = globalReserveFlag || bookReserveFlag;

    console.log("📋 [CREATE BORROW REQUEST] Reservation settings:", {
      globalFlag: globalReserveFlag,
      bookFlag: bookReserveFlag,
      shouldReserveOnRequest,
    });

    // If reserving now, ensure availability > 0
    if (shouldReserveOnRequest && book[0].availableCopies <= 0) {
      console.log(
        "❌ [CREATE BORROW REQUEST] No copies available for reservation"
      );
      return {
        success: false,
        error: "Book is not available for borrowing",
      };
    }

    // Check for existing pending request
    console.log(
      "🔍 [CREATE BORROW REQUEST] Checking for existing pending request"
    );
    const existingRequest = await dbOrTx
      .select()
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.userId, userId),
          eq(borrowRequests.bookId, bookId),
          eq(borrowRequests.status, "PENDING")
        )
      )
      .limit(1);

    console.log("📋 [CREATE BORROW REQUEST] Existing request check:", {
      found: existingRequest.length > 0,
      count: existingRequest.length,
    });

    if (existingRequest.length > 0) {
      console.log("❌ [CREATE BORROW REQUEST] Existing pending request found");
      return {
        success: false,
        error: "You already have a pending request for this book",
      };
    }

    // Check if user already has this book borrowed
    console.log(
      "🔍 [CREATE BORROW REQUEST] Checking for existing borrow record"
    );
    const existingBorrow = await dbOrTx
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "BORROWED")
        )
      )
      .limit(1);

    console.log("📋 [CREATE BORROW REQUEST] Existing borrow check:", {
      found: existingBorrow.length > 0,
      count: existingBorrow.length,
    });

    if (existingBorrow.length > 0) {
      console.log("❌ [CREATE BORROW REQUEST] Book already borrowed by user");
      return {
        success: false,
        error: "You already have this book borrowed",
      };
    }

    // Create the borrow request
    console.log("📝 [CREATE BORROW REQUEST] Creating borrow request record");
    const request = await dbOrTx
      .insert(borrowRequests)
      .values({
        userId,
        bookId,
        status: "PENDING",
        idempotencyKey,
      })
      .returning();

    console.log("✅ [CREATE BORROW REQUEST] Borrow request created:", {
      requestId: request[0]?.id,
      status: request[0]?.status,
    });

    // Handle inventory reservation
    if (shouldReserveOnRequest) {
      console.log("📦 [CREATE BORROW REQUEST] Reserving inventory");
      const updateResult = await dbOrTx
        .update(books)
        .set({ availableCopies: sql`${books.availableCopies} - 1` })
        .where(and(eq(books.id, bookId), sql`${books.availableCopies} > 0`))
        .returning({ availableCopies: books.availableCopies });

      console.log(
        "📦 [CREATE BORROW REQUEST] Inventory update result:",
        updateResult
      );

      if (!updateResult.length) {
        console.log(
          "❌ [CREATE BORROW REQUEST] Failed to reserve - no copies available"
        );
        return {
          success: false,
          error: "Book is not available for borrowing",
        };
      }

      if (updateResult[0].availableCopies < 0) {
        console.log("⚠️ [CREATE BORROW REQUEST] Inventory violation detected");
        await LibraryMetrics.alertInventoryViolation(
          bookId,
          updateResult[0].availableCopies
        );
        return {
          success: false,
          error: "Inventory violation detected",
        };
      }

      console.log("✅ [CREATE BORROW REQUEST] Inventory reserved successfully");
    } else {
      console.log("ℹ️ [CREATE BORROW REQUEST] Skipping inventory reservation");
    }

    // Record metrics
    console.log("📊 [CREATE BORROW REQUEST] Recording metrics");
    try {
      await LibraryMetrics.recordBorrowRequestCreated();
      console.log("✅ [CREATE BORROW REQUEST] Metrics recorded successfully");
    } catch (error) {
      console.error(
        "❌ [CREATE BORROW REQUEST] Error recording metrics:",
        error
      );
      // Don't fail the request if metrics fail
    }

    // Create audit log
    try {
      if (isFeatureEnabled("ENABLE_AUDIT_LOGS")) {
        console.log("📋 [CREATE BORROW REQUEST] Creating audit log");
        await createAuditLog({
          action: "BORROW_REQUEST_CREATED",
          actorType: "USER",
          actorId: userId,
          targetBookId: bookId,
          targetRequestId: request[0].id,
          metadata: {
            confirmationText,
            idempotencyKey,
            reserveOnRequest: shouldReserveOnRequest,
          },
        });
        console.log("✅ [CREATE BORROW REQUEST] Audit log created");
      } else {
        console.log("ℹ️ [CREATE BORROW REQUEST] Audit logs disabled");
      }
    } catch (error) {
      console.error(
        "❌ [CREATE BORROW REQUEST] Error creating audit log:",
        error
      );
      // Don't fail the request if audit log fails
    }

    console.log("🔄 [CREATE BORROW REQUEST] Revalidating paths");
    try {
      revalidatePath(`/books/${bookId}`);
      revalidatePath("/");
      console.log("✅ [CREATE BORROW REQUEST] Paths revalidated successfully");
    } catch (error) {
      console.error(
        "❌ [CREATE BORROW REQUEST] Error revalidating paths:",
        error
      );
      // Don't fail the request if revalidation fails
    }

    console.log("🎉 [CREATE BORROW REQUEST] Operations completed successfully");
    return {
      success: true,
      data: request[0],
    };
  } catch (error) {
    console.error("💥 [CREATE BORROW REQUEST] Error in operations:", error);
    console.error(
      "💥 [CREATE BORROW REQUEST] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    throw error; // Let transaction handle rollback or re-throw for caller
  }
}

// Get user's borrow request status for a book
export const getUserBorrowRequestStatus = async (
  userId: string,
  bookId: string
) => {
  try {
    // Check for the most recent borrow request for this user and book
    const allRequests = await db
      .select()
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.userId, userId),
          eq(borrowRequests.bookId, bookId)
        )
      )
      .orderBy(desc(borrowRequests.requestedAt));

    if (allRequests.length === 0) {
      return {
        success: true,
        data: null,
      };
    }

    // Find the most relevant request based on priority:
    // 1. PENDING (highest priority - user has an active request)
    // 2. RETURN_PENDING (user requested return, admin hasn't processed)
    // 3. APPROVED (user has borrowed the book)

    const pendingRequest = allRequests.find((req) => req.status === "PENDING");
    const returnPendingRequest = allRequests.find(
      (req) => req.status === "RETURN_PENDING"
    );
    const approvedRequest = allRequests.find(
      (req) => req.status === "APPROVED"
    );

    if (pendingRequest) {
      return {
        success: true,
        data: {
          type: "BORROW_REQUEST",
          status: pendingRequest.status,
          requestId: pendingRequest.id,
        },
      };
    }

    // For RETURN_PENDING, also check if there's a pending return request
    if (returnPendingRequest) {
      // Verify there's actually a pending return request
      const hasActivePendingReturnRequest = await db
        .select()
        .from(returnRequests)
        .where(
          and(
            eq(returnRequests.userId, userId),
            eq(returnRequests.bookId, bookId),
            eq(
              returnRequests.borrowRecordId,
              returnPendingRequest.borrowRecordId || ""
            ),
            eq(returnRequests.status, "PENDING")
          )
        )
        .limit(1);

      if (hasActivePendingReturnRequest.length > 0) {
        return {
          success: true,
          data: {
            type: "RETURN_PENDING",
            status: "RETURN_PENDING",
            requestId: returnPendingRequest.id,
            borrowRecordId: returnPendingRequest.borrowRecordId,
            dueDate: returnPendingRequest.dueDate,
          },
        };
      }
    }

    if (approvedRequest) {
      return {
        success: true,
        data: {
          type: "BORROWED",
          status: "BORROWED",
          borrowRecordId: approvedRequest.borrowRecordId,
          dueDate: approvedRequest.dueDate,
        },
      };
    }

    // Check for active borrow record (fallback)
    const borrowRecord = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "BORROWED")
        )
      )
      .limit(1);

    if (borrowRecord.length > 0) {
      return {
        success: true,
        data: {
          type: "BORROWED",
          status: "BORROWED",
          borrowRecordId: borrowRecord[0].id,
          dueDate: borrowRecord[0].dueDate,
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("Error getting borrow request status:", error);
    return {
      success: false,
      error: "An error occurred while fetching request status",
    };
  }
};

// Admin: Get all pending borrow requests
export const getPendingBorrowRequests = async () => {
  try {
    const requests = await db
      .select({
        request: borrowRequests,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          universityId: users.universityId,
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          coverUrl: books.coverUrl,
          coverColor: books.coverColor,
        },
      })
      .from(borrowRequests)
      .innerJoin(users, eq(borrowRequests.userId, users.id))
      .innerJoin(books, eq(borrowRequests.bookId, books.id))
      .where(eq(borrowRequests.status, "PENDING"))
      .orderBy(desc(borrowRequests.requestedAt));

    return {
      success: true,
      data: requests,
    };
  } catch (error) {
    console.error("Error fetching pending borrow requests:", error);
    return {
      success: false,
      error: "An error occurred while fetching borrow requests",
    };
  }
};

// Admin: Approve borrow request
export const approveBorrowRequest = async (
  params: ApproveBorrowRequestParams
) => {
  const { requestId, adminNotes, adminId } = params;

  // Use the same pattern - try transaction first, fall back if needed
  try {
    return await db.transaction(async (tx) => {
      return await performApproveBorrowRequest(tx, params);
    });
  } catch (transactionError) {
    console.log(
      "⚠️ [APPROVE REQUEST] Transaction failed, trying direct approach"
    );
    return await performApproveBorrowRequest(db, params);
  }
};

async function performApproveBorrowRequest(
  dbOrTx: any,
  params: ApproveBorrowRequestParams
) {
  const { requestId, adminNotes, adminId } = params;

  try {
    // Get the request details with book and user info
    const requestDetails = await dbOrTx
      .select({
        request: borrowRequests,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          availableCopies: books.availableCopies,
          reserveOnRequest: books.reserveOnRequest,
        },
      })
      .from(borrowRequests)
      .innerJoin(users, eq(borrowRequests.userId, users.id))
      .innerJoin(books, eq(borrowRequests.bookId, books.id))
      .where(eq(borrowRequests.id, requestId))
      .limit(1);

    if (!requestDetails.length) {
      return {
        success: false,
        error: "Borrow request not found",
      };
    }

    const { request, user, book } = requestDetails[0];

    if (request.status !== "PENDING") {
      return {
        success: false,
        error: "Request has already been processed",
      };
    }

    const approvedAt = new Date();
    const dueDate = dayjs(approvedAt).add(7, "days").format("YYYY-MM-DD");

    // Create borrow record
    const [borrowRecord] = await dbOrTx
      .insert(borrowRecords)
      .values({
        userId: request.userId,
        bookId: request.bookId,
        borrowDate: approvedAt,
        dueDate: dueDate,
        status: "BORROWED",
      })
      .returning();

    // Update request status
    const [updatedRequest] = await dbOrTx
      .update(borrowRequests)
      .set({
        status: "APPROVED",
        approvedAt: approvedAt,
        dueDate: dueDate,
        borrowRecordId: borrowRecord.id,
        adminNotes: adminNotes,
      })
      .where(eq(borrowRequests.id, requestId))
      .returning();

    // Handle inventory based on reserve_on_request setting
    if (!isFeatureEnabled("RESERVE_ON_REQUEST") && !book.reserveOnRequest) {
      const updateResult = await dbOrTx
        .update(books)
        .set({
          availableCopies: sql`${books.availableCopies} - 1`,
        })
        .where(
          and(eq(books.id, request.bookId), sql`${books.availableCopies} > 0`)
        )
        .returning({ availableCopies: books.availableCopies });

      if (!updateResult.length) {
        throw new Error("Book is no longer available");
      }

      if (updateResult[0].availableCopies < 0) {
        await LibraryMetrics.alertInventoryViolation(
          request.bookId,
          updateResult[0].availableCopies
        );
        throw new Error("Inventory violation detected");
      }
    }

    // Record metrics
    await LibraryMetrics.recordBorrowRequestApproved();

    // Create audit log
    if (isFeatureEnabled("ENABLE_AUDIT_LOGS")) {
      await createAuditLog({
        action: "BORROW_REQUEST_APPROVED",
        actorType: "ADMIN",
        actorId: adminId,
        targetUserId: request.userId,
        targetBookId: request.bookId,
        targetRequestId: requestId,
        metadata: {
          dueDate: updatedRequest.dueDate,
          adminNotes: adminNotes,
          borrowRecordId: borrowRecord.id,
          reserveOnRequest:
            isFeatureEnabled("RESERVE_ON_REQUEST") || book.reserveOnRequest,
        },
      });
    }

    // Send email notification
    try {
      if (isFeatureEnabled("ENABLE_EMAIL_NOTIFICATIONS")) {
        await sendEmail({
          email: user.email,
          subject: "Borrow Request Approved - ShelfWise Library",
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Borrow Request Approved!</h2>
              <p>Dear ${user.fullName},</p>
              
              <p>Great news! Your borrow request has been approved.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Book Details:</h3>
                <p><strong>Title:</strong> ${book.title}</p>
                <p><strong>Author:</strong> ${book.author}</p>
                <p><strong>Due Date:</strong> ${dayjs(
                  updatedRequest.dueDate
                ).format("MMMM D, YYYY")}</p>
              </div>
              
              ${
                adminNotes
                  ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>`
                  : ""
              }
              
              <p>You can collect your book from the library. Happy reading!</p>
              
              <p>Best regards,<br>ShelfWise Library Team</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/book-requests");
    revalidatePath(`/books/${request.bookId}`);

    return {
      success: true,
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Error approving borrow request:", error);
    throw error;
  }
}

// Admin: Reject borrow request
export const rejectBorrowRequest = async (
  params: RejectBorrowRequestParams
) => {
  const { requestId, adminNotes, adminId } = params;

  try {
    return await db.transaction(async (tx) => {
      return await performRejectBorrowRequest(tx, params);
    });
  } catch (transactionError) {
    console.log(
      "⚠️ [REJECT REQUEST] Transaction failed, trying direct approach"
    );
    return await performRejectBorrowRequest(db, params);
  }
};

async function performRejectBorrowRequest(
  dbOrTx: any,
  params: RejectBorrowRequestParams
) {
  const { requestId, adminNotes, adminId } = params;

  try {
    // Get the request details
    const requestDetails = await dbOrTx
      .select({
        request: borrowRequests,
        user: {
          email: users.email,
          fullName: users.fullName,
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          availableCopies: books.availableCopies,
          reserveOnRequest: books.reserveOnRequest,
        },
      })
      .from(borrowRequests)
      .innerJoin(users, eq(borrowRequests.userId, users.id))
      .innerJoin(books, eq(borrowRequests.bookId, books.id))
      .where(eq(borrowRequests.id, requestId))
      .limit(1);

    if (!requestDetails.length) {
      return {
        success: false,
        error: "Request not found",
      };
    }

    const { request, user, book } = requestDetails[0];

    if (request.status !== "PENDING") {
      return {
        success: false,
        error: "Request has already been processed",
      };
    }

    // Update the request
    await dbOrTx
      .update(borrowRequests)
      .set({
        status: "REJECTED",
        rejectedAt: new Date(),
        adminNotes,
      })
      .where(eq(borrowRequests.id, requestId));

    // Restore reserved copy only if reservation was done earlier
    const shouldReserveOnRequest =
      isFeatureEnabled("RESERVE_ON_REQUEST") || book.reserveOnRequest;
    if (shouldReserveOnRequest) {
      await dbOrTx
        .update(books)
        .set({ availableCopies: sql`${books.availableCopies} + 1` })
        .where(eq(books.id, request.bookId));
    }

    // Record metrics
    await LibraryMetrics.recordBorrowRequestRejected();

    // Create audit log
    if (isFeatureEnabled("ENABLE_AUDIT_LOGS")) {
      await createAuditLog({
        action: "BORROW_REQUEST_REJECTED",
        actorType: "ADMIN",
        actorId: adminId,
        targetUserId: request.userId,
        targetBookId: request.bookId,
        targetRequestId: requestId,
        metadata: {
          adminNotes,
          reserveOnRequest: shouldReserveOnRequest,
        },
      });
    }

    // Send rejection email
    try {
      if (isFeatureEnabled("ENABLE_EMAIL_NOTIFICATIONS")) {
        await sendEmail({
          email: user.email,
          subject: "Borrow Request Update - ShelfWise Library",
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Borrow Request Update</h2>
              <p>Dear ${user.fullName},</p>
              
              <p>We wanted to update you regarding your borrow request for "<strong>${
                book.title
              }</strong>" by ${book.author}.</p>
              
              ${
                adminNotes
                  ? `<div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <p><strong>Message from Library:</strong></p>
                      <p>${adminNotes}</p>
                    </div>`
                  : ""
              }
              
              <p>You may submit a new request for this book or contact the library for more information.</p>
              
              <p>Best regards,<br>ShelfWise Library Team</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/book-requests");
    revalidatePath(`/books/${request.bookId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error rejecting borrow request:", error);
    throw error;
  }
}
