"use server";

import { db } from "@/database/drizzle";
import {
  books,
  borrowRecords,
  returnRequests,
  users,
  auditLogs,
} from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/workflow";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

interface CreateReturnRequestParams {
  userId: string;
  bookId: string;
  borrowRecordId: string;
  confirmationText: string;
}

interface ApproveReturnRequestParams {
  requestId: string;
  adminId: string;
  adminNotes?: string;
}

interface RejectReturnRequestParams {
  requestId: string;
  adminId: string;
  adminNotes?: string;
}

// Create a new return request
export const createReturnRequest = async (
  params: CreateReturnRequestParams
) => {
  const { userId, bookId, borrowRecordId, confirmationText } = params;

  try {
    // Verify the borrow record exists and belongs to the user
    const borrowRecord = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.id, borrowRecordId),
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.bookId, bookId),
          eq(borrowRecords.status, "BORROWED")
        )
      )
      .limit(1);

    if (!borrowRecord.length) {
      return {
        success: false,
        error: "Invalid borrow record or book already returned",
      };
    }

    // Check for existing return request
    const existingRequest = await db
      .select()
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.borrowRecordId, borrowRecordId),
          sql`status IN ('PENDING')`
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return {
        success: false,
        error: "Return request already exists for this book",
      };
    }

    // Create the return request
    const [newRequest] = await db
      .insert(returnRequests)
      .values({
        userId,
        bookId,
        borrowRecordId,
        status: "PENDING",
      })
      .returning();

    // Create audit log
    await createAuditLog({
      action: "RETURN_REQUEST_CREATED",
      actorType: "USER",
      actorId: userId,
      targetBookId: bookId,
      targetRequestId: newRequest.id,
      metadata: {
        borrowRecordId: borrowRecordId,
      },
    });

    return {
      success: true,
      data: newRequest,
    };
  } catch (error) {
    console.error("Error creating return request:", error);
    return {
      success: false,
      error: "An error occurred while creating the return request",
    };
  }
};

// Admin: Get all pending return requests
export const getPendingReturnRequests = async () => {
  try {
    const requests = await db
      .select({
        request: returnRequests,
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
        },
        borrowRecord: {
          borrowDate: borrowRecords.borrowDate,
          dueDate: borrowRecords.dueDate,
        },
      })
      .from(returnRequests)
      .innerJoin(users, eq(returnRequests.userId, users.id))
      .innerJoin(books, eq(returnRequests.bookId, books.id))
      .innerJoin(
        borrowRecords,
        eq(returnRequests.borrowRecordId, borrowRecords.id)
      )
      .where(eq(returnRequests.status, "PENDING"))
      .orderBy(desc(returnRequests.requestedAt));

    return {
      success: true,
      data: requests,
    };
  } catch (error) {
    console.error("Error fetching pending return requests:", error);
    return {
      success: false,
      error: "An error occurred while fetching return requests",
    };
  }
};

// Admin: Approve return request
export const approveReturnRequest = async (
  params: ApproveReturnRequestParams
) => {
  const { requestId, adminId, adminNotes } = params;

  try {
    // Get the request details with book and user info
    const requestDetails = await db
      .select({
        request: returnRequests,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
        },
        borrowRecord: {
          id: borrowRecords.id,
          borrowDate: borrowRecords.borrowDate,
          dueDate: borrowRecords.dueDate,
        },
      })
      .from(returnRequests)
      .innerJoin(users, eq(returnRequests.userId, users.id))
      .innerJoin(books, eq(returnRequests.bookId, books.id))
      .innerJoin(
        borrowRecords,
        eq(returnRequests.borrowRecordId, borrowRecords.id)
      )
      .where(eq(returnRequests.id, requestId))
      .limit(1);

    if (!requestDetails.length) {
      return {
        success: false,
        error: "Return request not found",
      };
    }

    const { request, user, book, borrowRecord } = requestDetails[0];

    if (request.status !== "PENDING") {
      return {
        success: false,
        error: "Request has already been processed",
      };
    }

    // Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      const returnedAt = new Date();

      // Update return request status
      const [updatedRequest] = await tx
        .update(returnRequests)
        .set({
          status: "APPROVED",
          approvedAt: returnedAt,
          adminNotes: adminNotes,
        })
        .where(eq(returnRequests.id, requestId))
        .returning();

      // Update borrow record - mark as returned
      const [updatedBorrowRecord] = await tx
        .update(borrowRecords)
        .set({
          status: "RETURNED",
          returnDate: returnedAt.toISOString().split("T")[0], // Format as date
        })
        .where(eq(borrowRecords.id, request.borrowRecordId))
        .returning();

      // Increment available copies (stop countdown, increment available_copies)
      await tx
        .update(books)
        .set({
          availableCopies: sql`${books.availableCopies} + 1`,
        })
        .where(eq(books.id, request.bookId));

      return { updatedRequest, updatedBorrowRecord };
    });

    // Create audit log
    await createAuditLog({
      action: "RETURN_REQUEST_APPROVED",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: request.userId,
      targetBookId: request.bookId,
      targetRequestId: requestId,
      metadata: {
        borrowRecordId: request.borrowRecordId,
        adminNotes: adminNotes,
        returnedAt: result.updatedBorrowRecord.returnDate,
      },
    });

    // Send email notification
    try {
      await sendEmail({
        email: user.email,
        subject: "Book Return Confirmed - ShelfWise Library",
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Book Return Confirmed!</h2>
            <p>Dear ${user.fullName},</p>
            
            <p>Your book return has been successfully processed and confirmed.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Book Details:</h3>
              <p><strong>Title:</strong> ${book.title}</p>
              <p><strong>Author:</strong> ${book.author}</p>
              <p><strong>Borrowed Date:</strong> ${new Date(
                borrowRecord.borrowDate
              ).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(
                borrowRecord.dueDate
              ).toLocaleDateString()}</p>
              <p><strong>Returned Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #059669; margin: 0;"><strong>✓ Return Complete</strong></p>
              <p style="color: #059669; margin: 5px 0 0 0;">Thank you for returning the book on time and in good condition.</p>
            </div>
            
            ${
              adminNotes
                ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>`
                : ""
            }
            
            <p>You can now borrow other books from our library. Happy reading!</p>
            
            <p>Best regards,<br>ShelfWise Library Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send return confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    revalidatePath("/admin");
    return {
      success: true,
      data: result.updatedRequest,
    };
  } catch (error) {
    console.error("Error approving return request:", error);
    return {
      success: false,
      error: "An error occurred while approving the return request",
    };
  }
};

// Admin: Reject return request
export const rejectReturnRequest = async (
  params: RejectReturnRequestParams
) => {
  const { requestId, adminId, adminNotes } = params;

  try {
    // Get the request details
    const requestDetails = await db
      .select({
        request: returnRequests,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
        },
      })
      .from(returnRequests)
      .innerJoin(users, eq(returnRequests.userId, users.id))
      .innerJoin(books, eq(returnRequests.bookId, books.id))
      .where(eq(returnRequests.id, requestId))
      .limit(1);

    if (!requestDetails.length) {
      return {
        success: false,
        error: "Return request not found",
      };
    }

    const { request, user, book } = requestDetails[0];

    if (request.status !== "PENDING") {
      return {
        success: false,
        error: "Request has already been processed",
      };
    }

    // Update request status (keep APPROVED borrow status, log reason)
    const [updatedRequest] = await db
      .update(returnRequests)
      .set({
        status: "REJECTED",
        rejectedAt: new Date(),
        adminNotes: adminNotes,
      })
      .where(eq(returnRequests.id, requestId))
      .returning();

    // Create audit log
    await createAuditLog({
      action: "RETURN_REQUEST_REJECTED",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: request.userId,
      targetBookId: request.bookId,
      targetRequestId: requestId,
      metadata: {
        adminNotes: adminNotes,
        reason: "Admin rejection - user needs to visit library",
      },
    });

    // Send email notification
    try {
      await sendEmail({
        email: user.email,
        subject: "Return Request Update - ShelfWise Library",
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Return Request Update</h2>
            <p>Dear ${user.fullName},</p>
            
            <p>Your return request requires additional attention and has been declined for online processing.</p>
            
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
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #92400e;">Next Steps:</h4>
              <p style="color: #92400e;">Please visit the library in person to complete the return process. Our staff will assist you with any issues.</p>
            </div>
            
            <p>Thank you for your understanding.</p>
            
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
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Error rejecting return request:", error);
    return {
      success: false,
      error: "An error occurred while rejecting the return request",
    };
  }
};
