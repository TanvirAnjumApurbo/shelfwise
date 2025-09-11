"use server";

import { db } from "@/database/drizzle";
import {
  books,
  borrowRecords,
  borrowRequests,
  returnRequests,
  users,
  notificationPreferences,
} from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/workflow";
import { revalidatePath } from "next/cache";

interface CreateReturnRequestParams {
  userId: string;
  bookId: string;
  borrowRecordId: string;
  confirmationText: string;
}

interface ApproveReturnRequestParams {
  requestId: string;
  adminNotes?: string;
}

interface RejectReturnRequestParams {
  requestId: string;
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
        error: "No active borrow record found for this book",
      };
    }

    // Check if confirmation text matches
    const book = await db
      .select({ title: books.title })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book.length) {
      return {
        success: false,
        error: "Book not found",
      };
    }

    // Simple validation - user must type "return" or the book title
    const bookTitle = book[0].title.toLowerCase();
    const confirmLower = confirmationText.toLowerCase();

    if (confirmLower !== "return" && !bookTitle.includes(confirmLower)) {
      return {
        success: false,
        error:
          "Confirmation text does not match. Please type 'return' or part of the book title.",
      };
    }

    // Check for existing pending return request
    const existingPendingRequest = await db
      .select()
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.userId, userId),
          eq(returnRequests.bookId, bookId),
          eq(returnRequests.borrowRecordId, borrowRecordId),
          eq(returnRequests.status, "PENDING")
        )
      )
      .limit(1);

    if (existingPendingRequest.length > 0) {
      return {
        success: false,
        error: "You already have a pending return request for this book",
      };
    }

    // Check if there's a recent rejected request (within last 24 hours)
    // If so, inform user but still allow them to try again
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentRejectedRequest = await db
      .select()
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.userId, userId),
          eq(returnRequests.bookId, bookId),
          eq(returnRequests.borrowRecordId, borrowRecordId),
          eq(returnRequests.status, "REJECTED"),
          sql`${returnRequests.rejectedAt} > ${oneDayAgo.toISOString()}`
        )
      )
      .limit(1);

    // Find the corresponding borrow request to update its status
    const borrowRequestRecord = await db
      .select()
      .from(borrowRequests)
      .where(
        and(
          eq(borrowRequests.userId, userId),
          eq(borrowRequests.bookId, bookId),
          eq(borrowRequests.borrowRecordId, borrowRecordId),
          eq(borrowRequests.status, "APPROVED")
        )
      )
      .limit(1);

    if (!borrowRequestRecord.length) {
      return {
        success: false,
        error: "No corresponding borrow request found",
      };
    }

    // Use transaction to ensure both operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Create the return request
      const [request] = await tx
        .insert(returnRequests)
        .values({
          userId,
          bookId,
          borrowRecordId,
          status: "PENDING",
          adminNotes:
            recentRejectedRequest.length > 0
              ? JSON.stringify({
                  resubmission: true,
                  previousRejectionAt: recentRejectedRequest[0].rejectedAt,
                })
              : null,
        })
        .returning();

      // Update the borrow request status to RETURN_PENDING
      await tx
        .update(borrowRequests)
        .set({
          status: "RETURN_PENDING",
          meta: sql`COALESCE(meta, '') || ${JSON.stringify({
            returnRequestId: request.id,
            returnConfirmationText: confirmationText,
            isResubmission: recentRejectedRequest.length > 0,
          })}`,
        })
        .where(eq(borrowRequests.id, borrowRequestRecord[0].id));

      return request;
    });

    revalidatePath(`/books/${bookId}`);
    revalidatePath("/");

    return {
      success: true,
      data: result,
      message:
        recentRejectedRequest.length > 0
          ? "Return request resubmitted successfully. Previous request was rejected, but you can try again."
          : "Return request submitted successfully.",
    };
  } catch (error) {
    console.error("Error creating return request:", error);
    return {
      success: false,
      error: "An error occurred while creating the return request",
    };
  }
};

// Get user's return request status for a book
export const getUserReturnRequestStatus = async (
  userId: string,
  bookId: string,
  borrowRecordId: string
) => {
  try {
    const returnRequest = await db
      .select()
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.userId, userId),
          eq(returnRequests.bookId, bookId),
          eq(returnRequests.borrowRecordId, borrowRecordId),
          eq(returnRequests.status, "PENDING")
        )
      )
      .limit(1);

    if (returnRequest.length > 0) {
      return {
        success: true,
        data: {
          type: "RETURN_REQUEST",
          status: returnRequest[0].status,
          requestId: returnRequest[0].id,
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("Error getting return request status:", error);
    return {
      success: false,
      error: "An error occurred while fetching request status",
    };
  }
};

// Check if user has any rejected return requests for this book
export const hasRecentRejectedReturnRequest = async (
  userId: string,
  bookId: string,
  borrowRecordId: string
) => {
  try {
    // Check for rejected return requests in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const rejectedRequest = await db
      .select()
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.userId, userId),
          eq(returnRequests.bookId, bookId),
          eq(returnRequests.borrowRecordId, borrowRecordId),
          eq(returnRequests.status, "REJECTED"),
          sql`${returnRequests.rejectedAt} > ${oneDayAgo.toISOString()}`
        )
      )
      .limit(1);

    return {
      success: true,
      hasRecentRejection: rejectedRequest.length > 0,
      data: rejectedRequest.length > 0 ? rejectedRequest[0] : null,
    };
  } catch (error) {
    console.error("Error checking rejected return requests:", error);
    return {
      success: false,
      hasRecentRejection: false,
      error: "An error occurred while checking rejected requests",
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
          coverColor: books.coverColor,
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
  const { requestId, adminNotes } = params;

  try {
    // Get the request details
    const request = await db
      .select({
        userId: returnRequests.userId,
        bookId: returnRequests.bookId,
        borrowRecordId: returnRequests.borrowRecordId,
      })
      .from(returnRequests)
      .where(eq(returnRequests.id, requestId))
      .limit(1);

    if (!request.length) {
      return {
        success: false,
        error: "Request not found",
      };
    }

    // Use transaction to ensure all operations succeed together
    await db.transaction(async (tx) => {
      // Update the borrow record
      await tx
        .update(borrowRecords)
        .set({
          status: "RETURNED",
          returnDate: new Date().toDateString(),
        })
        .where(eq(borrowRecords.id, request[0].borrowRecordId));

      // Update the return request
      await tx
        .update(returnRequests)
        .set({
          status: "APPROVED",
          approvedAt: new Date(),
          adminNotes,
        })
        .where(eq(returnRequests.id, requestId));

      // Update the corresponding borrow request status back to RETURNED
      await tx
        .update(borrowRequests)
        .set({
          status: "RETURNED",
          meta: sql`COALESCE(meta, '') || ${JSON.stringify({
            returnApprovedAt: new Date().toISOString(),
            adminNotes,
          })}`,
        })
        .where(
          and(
            eq(borrowRequests.userId, request[0].userId),
            eq(borrowRequests.bookId, request[0].bookId),
            eq(borrowRequests.borrowRecordId, request[0].borrowRecordId),
            eq(borrowRequests.status, "RETURN_PENDING")
          )
        );

      // Increase available copies
      await tx
        .update(books)
        .set({ availableCopies: sql`${books.availableCopies} + 1` })
        .where(eq(books.id, request[0].bookId));
    });

    // Get user and book details for email
    const userDetails = await db
      .select({
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.id, request[0].userId))
      .limit(1);

    const bookDetails = await db
      .select({
        title: books.title,
        author: books.author,
      })
      .from(books)
      .where(eq(books.id, request[0].bookId))
      .limit(1);

    // Send approval email
    if (userDetails.length > 0 && bookDetails.length > 0) {
      await sendEmail({
        email: userDetails[0].email,
        subject: "Your Book Return has been Confirmed",
        message: `
          <h2>Book Return Confirmed</h2>
          <p>Dear ${userDetails[0].fullName},</p>
          <p>Your return of "<strong>${bookDetails[0].title}</strong>" by ${bookDetails[0].author} has been confirmed.</p>
          <p>Thank you for returning the book on time.</p>
          <p>You can now borrow this or other available books from the library.</p>
          <br>
          <p>Best regards,<br>Library Management System</p>
        `,
      });
    }

    // Notify waiting users that the book is available
    await notifyWaitingUsers(request[0].bookId);

    revalidatePath("/admin");
    revalidatePath(`/books/${request[0].bookId}`);

    return {
      success: true,
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
  const { requestId, adminNotes } = params;

  try {
    // Get the request details
    const request = await db
      .select({
        userId: returnRequests.userId,
        bookId: returnRequests.bookId,
        borrowRecordId: returnRequests.borrowRecordId,
      })
      .from(returnRequests)
      .where(eq(returnRequests.id, requestId))
      .limit(1);

    if (!request.length) {
      return {
        success: false,
        error: "Request not found",
      };
    }

    // Use transaction to ensure all operations succeed together
    await db.transaction(async (tx) => {
      // Update the return request
      await tx
        .update(returnRequests)
        .set({
          status: "REJECTED",
          rejectedAt: new Date(),
          adminNotes,
        })
        .where(eq(returnRequests.id, requestId));

      // Update the corresponding borrow request status back to APPROVED
      await tx
        .update(borrowRequests)
        .set({
          status: "APPROVED",
          meta: sql`COALESCE(meta, '') || ${JSON.stringify({
            returnRejectedAt: new Date().toISOString(),
            adminNotes,
          })}`,
        })
        .where(
          and(
            eq(borrowRequests.userId, request[0].userId),
            eq(borrowRequests.bookId, request[0].bookId),
            eq(borrowRequests.borrowRecordId, request[0].borrowRecordId),
            eq(borrowRequests.status, "RETURN_PENDING")
          )
        );
    });

    // Get user and book details for email
    const userDetails = await db
      .select({
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.id, request[0].userId))
      .limit(1);

    const bookDetails = await db
      .select({
        title: books.title,
        author: books.author,
      })
      .from(books)
      .where(eq(books.id, request[0].bookId))
      .limit(1);

    // Send rejection email
    if (userDetails.length > 0 && bookDetails.length > 0) {
      await sendEmail({
        email: userDetails[0].email,
        subject: "Your Book Return Request has been Rejected",
        message: `
          <h2>Return Request Rejected</h2>
          <p>Dear ${userDetails[0].fullName},</p>
          <p>Your return request for "<strong>${
            bookDetails[0].title
          }</strong>" by ${bookDetails[0].author} has been rejected.</p>
          ${adminNotes ? `<p><strong>Reason:</strong> ${adminNotes}</p>` : ""}
          <p>Please visit the library or contact us for more information about returning this book.</p>
          <br>
          <p>Best regards,<br>Library Management System</p>
        `,
      });
    }

    revalidatePath("/admin");
    revalidatePath(`/books/${request[0].bookId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error rejecting return request:", error);
    return {
      success: false,
      error: "An error occurred while rejecting the return request",
    };
  }
};

// Helper function to notify users waiting for a book
const notifyWaitingUsers = async (bookId: string) => {
  try {
    // Get users with notification preferences for this book
    const waitingUsers = await db
      .select({
        userId: notificationPreferences.userId,
        email: users.email,
        fullName: users.fullName,
      })
      .from(notificationPreferences)
      .innerJoin(users, eq(notificationPreferences.userId, users.id))
      .where(
        and(
          eq(notificationPreferences.bookId, bookId),
          eq(notificationPreferences.notifyOnAvailable, true)
        )
      )
      .limit(1); // Notify only the first waiting user

    if (waitingUsers.length > 0) {
      const bookDetails = await db
        .select({
          title: books.title,
          author: books.author,
        })
        .from(books)
        .where(eq(books.id, bookId))
        .limit(1);

      if (bookDetails.length > 0) {
        await sendEmail({
          email: waitingUsers[0].email,
          subject: "Book Now Available!",
          message: `
            <h2>Book Available</h2>
            <p>Dear ${waitingUsers[0].fullName},</p>
            <p>Good news! The book "<strong>${bookDetails[0].title}</strong>" by ${bookDetails[0].author} is now available for borrowing.</p>
            <p>Visit the library website to request this book before it becomes unavailable again.</p>
            <br>
            <p>Best regards,<br>Library Management System</p>
          `,
        });

        // Update notification timestamp
        await db
          .update(notificationPreferences)
          .set({ notifiedAt: new Date() })
          .where(
            and(
              eq(notificationPreferences.userId, waitingUsers[0].userId),
              eq(notificationPreferences.bookId, bookId)
            )
          );
      }
    }
  } catch (error) {
    console.error("Error notifying waiting users:", error);
  }
};
