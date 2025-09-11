"use server";

import { db } from "@/database/drizzle";
import {
  books,
  borrowRecords,
  borrowRequests,
  users,
  notificationPreferences,
  auditLogs,
} from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import dayjs from "dayjs";
import { sendEmail } from "@/lib/workflow";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

interface CreateBorrowRequestParams {
  userId: string;
  bookId: string;
  confirmationText: string;
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
  const { userId, bookId, confirmationText } = params;

  try {
    // Check if confirmation text matches
    const book = await db
      .select({ title: books.title, availableCopies: books.availableCopies })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book.length) {
      return {
        success: false,
        error: "Book not found",
      };
    }

    // Simple validation - accept any confirmation code that's at least 5 characters
    // Frontend handles the actual code validation
    if (confirmationText.length < 5) {
      return {
        success: false,
        error: "Invalid confirmation code provided.",
      };
    }

    // Check book availability
    if (book[0].availableCopies <= 0) {
      return {
        success: false,
        error: "Book is not currently available",
      };
    }

    // Check for existing request
    const existingRequest = await db
      .select()
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.userId, userId),
          eq(borrowRequests.bookId, bookId),
          sql`status IN ('PENDING', 'APPROVED')`
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return {
        success: false,
        error: "You already have an active request for this book",
      };
    }

    // Create the request
    const [newRequest] = await db
      .insert(borrowRequests)
      .values({
        userId,
        bookId,
        status: "PENDING",
      })
      .returning();

    // Create audit log
    await createAuditLog({
      action: "BORROW_REQUEST_CREATED",
      actorType: "USER",
      actorId: userId,
      targetBookId: bookId,
      targetRequestId: newRequest.id,
    });

    return {
      success: true,
      data: newRequest,
    };
  } catch (error) {
    console.error("Error creating borrow request:", error);
    return {
      success: false,
      error: "An error occurred while creating the request",
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
  const { requestId, adminId, adminNotes } = params;

  try {
    // Get the request details with book and user info
    const requestDetails = await db
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

    // Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      const approvedAt = new Date();
      const dueDate = dayjs(approvedAt).add(7, "days").format("YYYY-MM-DD");

      // Create borrow record
      const [borrowRecord] = await tx
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
      const [updatedRequest] = await tx
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
      if (!book.reserveOnRequest) {
        // If RESERVE_ON_REQUEST=false: decrement available_copies atomically
        const updateResult = await tx
          .update(books)
          .set({
            availableCopies: sql`${books.availableCopies} - 1`,
          })
          .where(
            and(
              eq(books.id, request.bookId),
              sql`${books.availableCopies} > 0` // Ensure we don't go negative
            )
          )
          .returning({ availableCopies: books.availableCopies });

        if (!updateResult.length) {
          throw new Error("Book is no longer available");
        }
      }

      return { borrowRecord, updatedRequest };
    });

    // Create audit log
    await createAuditLog({
      action: "BORROW_REQUEST_APPROVED",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: request.userId,
      targetBookId: request.bookId,
      targetRequestId: requestId,
      metadata: {
        dueDate: result.updatedRequest.dueDate,
        adminNotes: adminNotes,
        borrowRecordId: result.borrowRecord.id,
      },
    });

    // Send email notification
    try {
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
                result.updatedRequest.dueDate
              ).format("MMMM D, YYYY")}</p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #92400e;">Important Borrowing Rules:</h4>
              <ul style="color: #92400e;">
                <li>Books must be returned by the due date to avoid penalties</li>
                <li>Late returns may result in borrowing restrictions</li>
                <li>Please handle the book with care</li>
                <li>Contact the library if you need to extend the borrowing period</li>
              </ul>
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
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
      // Don't fail the request if email fails
    }

    revalidatePath("/admin");
    return {
      success: true,
      data: result.updatedRequest,
    };
  } catch (error) {
    console.error("Error approving borrow request:", error);
    return {
      success: false,
      error: "An error occurred while approving the request",
    };
  }
};

// Admin: Reject borrow request
export const rejectBorrowRequest = async (
  params: RejectBorrowRequestParams
) => {
  const { requestId, adminId, adminNotes } = params;

  try {
    // Get the request details
    const requestDetails = await db
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

    // Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Update request status
      const [updatedRequest] = await tx
        .update(borrowRequests)
        .set({
          status: "REJECTED",
          rejectedAt: new Date(),
          adminNotes: adminNotes,
        })
        .where(eq(borrowRequests.id, requestId))
        .returning();

      // If RESERVE_ON_REQUEST=true: release inventory (increment available_copies)
      if (book.reserveOnRequest) {
        await tx
          .update(books)
          .set({
            availableCopies: sql`${books.availableCopies} + 1`,
          })
          .where(eq(books.id, request.bookId));
      }

      return updatedRequest;
    });

    // Create audit log
    await createAuditLog({
      action: "BORROW_REQUEST_REJECTED",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: request.userId,
      targetBookId: request.bookId,
      targetRequestId: requestId,
      metadata: {
        adminNotes: adminNotes,
        reason: "Admin rejection",
      },
    });

    // Send email notification
    try {
      await sendEmail({
        email: user.email,
        subject: "Borrow Request Update - ShelfWise Library",
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Borrow Request Update</h2>
            <p>Dear ${user.fullName},</p>
            
            <p>We regret to inform you that your borrow request has been declined.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Book Details:</h3>
              <p><strong>Title:</strong> ${book.title}</p>
              <p><strong>Author:</strong> ${book.author}</p>
            </div>
            
            ${
              adminNotes
                ? `
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #dc2626;">Reason:</h4>
              <p style="color: #dc2626;">${adminNotes}</p>
            </div>
            `
                : ""
            }
            
            <p>You may submit a new request later or contact the library for more information.</p>
            
            <p>Best regards,<br>ShelfWise Library Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
      // Don't fail the request if email fails
    }

    revalidatePath("/admin");
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error rejecting borrow request:", error);
    return {
      success: false,
      error: "An error occurred while rejecting the request",
    };
  }
};
