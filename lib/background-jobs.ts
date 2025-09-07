import { db } from "@/database/drizzle";
import {
  books,
  borrowRecords,
  borrowRequests,
  users,
  notificationPreferences,
} from "@/database/schema";
import { eq, and, lt, sql, desc, lte } from "drizzle-orm";
import { sendEmail } from "./workflow";
import { LibraryMetrics } from "./metrics";
import { FeatureFlags, isFeatureEnabled } from "./feature-flags";
import { createAuditLog } from "./audit";
import dayjs from "dayjs";

/**
 * Background job handlers for library operations
 */

export interface EmailTemplate {
  subject: string;
  body: string;
}

export class EmailTemplates {
  static dueSoonReminder(data: {
    userName: string;
    bookTitle: string;
    author: string;
    dueDate: string;
    daysUntilDue: number;
  }): EmailTemplate {
    return {
      subject: `Book Due Soon - ${data.bookTitle}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">📚 Book Due Soon Reminder</h2>
          <p>Dear ${data.userName},</p>
          
          <p>This is a friendly reminder that your borrowed book is due soon:</p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">Book Details</h3>
            <p><strong>Title:</strong> ${data.bookTitle}</p>
            <p><strong>Author:</strong> ${data.author}</p>
            <p><strong>Due Date:</strong> ${data.dueDate}</p>
            <p><strong>Days Until Due:</strong> ${data.daysUntilDue} day(s)</p>
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1e40af;">📋 What You Can Do:</h4>
            <ul style="color: #1e40af;">
              <li>Return the book before the due date to avoid late fees</li>
              <li>Request an extension if you need more time (subject to availability)</li>
              <li>Visit the library during operating hours</li>
            </ul>
          </div>
          
          <p>Thank you for using our library system!</p>
          
          <p>Best regards,<br>ShelfWise Library Team</p>
        </div>
      `,
    };
  }

  static overdueNotification(data: {
    userName: string;
    bookTitle: string;
    author: string;
    dueDate: string;
    daysOverdue: number;
  }): EmailTemplate {
    return {
      subject: `OVERDUE: Please Return - ${data.bookTitle}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Overdue Book Notice</h2>
          <p>Dear ${data.userName},</p>
          
          <p><strong>Your borrowed book is now overdue and must be returned immediately:</strong></p>
          
          <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #991b1b;">Book Details</h3>
            <p><strong>Title:</strong> ${data.bookTitle}</p>
            <p><strong>Author:</strong> ${data.author}</p>
            <p><strong>Due Date:</strong> ${data.dueDate}</p>
            <p><strong>Days Overdue:</strong> ${data.daysOverdue} day(s)</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">🚨 Important Notice:</h4>
            <ul style="color: #92400e;">
              <li>Late fees may apply to your account</li>
              <li>Your borrowing privileges may be suspended</li>
              <li>Please return the book as soon as possible</li>
              <li>Contact the library if you have any issues</li>
            </ul>
          </div>
          
          <p>Please return the book immediately to avoid further penalties.</p>
          
          <p>Best regards,<br>ShelfWise Library Team</p>
        </div>
      `,
    };
  }

  static bookAvailableNotification(data: {
    userName: string;
    bookTitle: string;
    author: string;
  }): EmailTemplate {
    return {
      subject: `📚 Book Now Available - ${data.bookTitle}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">🎉 Great News!</h2>
          <p>Dear ${data.userName},</p>
          
          <p>The book you requested to be notified about is now available for borrowing:</p>
          
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #065f46;">Book Details</h3>
            <p><strong>Title:</strong> ${data.bookTitle}</p>
            <p><strong>Author:</strong> ${data.author}</p>
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1e40af;">📋 Next Steps:</h4>
            <ul style="color: #1e40af;">
              <li>Visit our library website to request this book</li>
              <li>Act quickly - books may become unavailable again</li>
              <li>This is a one-time notification</li>
            </ul>
          </div>
          
          <p>Happy reading!</p>
          
          <p>Best regards,<br>ShelfWise Library Team</p>
        </div>
      `,
    };
  }
}

/**
 * Background job to check for due and overdue books
 */
export async function processDueNotifications() {
  if (
    !isFeatureEnabled("ENABLE_BACKGROUND_JOBS") ||
    !isFeatureEnabled("ENABLE_OVERDUE")
  ) {
    console.log("Due notifications disabled by feature flags");
    return;
  }

  try {
    console.log("Starting due notifications job...");

    const today = dayjs().format("YYYY-MM-DD");
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");

    // Find books due tomorrow (due soon notifications)
    const dueSoonBooks = await db
      .select({
        borrowRecord: borrowRecords,
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
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        and(
          eq(borrowRecords.status, "BORROWED"),
          eq(borrowRecords.dueDate, tomorrow)
        )
      );

    // Find overdue books
    const overdueBooks = await db
      .select({
        borrowRecord: borrowRecords,
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
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        and(
          eq(borrowRecords.status, "BORROWED"),
          lt(borrowRecords.dueDate, today)
        )
      );

    // Send due soon notifications
    for (const record of dueSoonBooks) {
      try {
        const template = EmailTemplates.dueSoonReminder({
          userName: record.user.fullName,
          bookTitle: record.book.title,
          author: record.book.author,
          dueDate: dayjs(record.borrowRecord.dueDate).format("MMMM D, YYYY"),
          daysUntilDue: 1,
        });

        if (isFeatureEnabled("ENABLE_EMAIL_NOTIFICATIONS")) {
          await sendEmail({
            email: record.user.email,
            subject: template.subject,
            message: template.body,
          });
        }

        await LibraryMetrics.recordDueSoonNotificationSent();

        await createAuditLog({
          action: "ADMIN_ACTION",
          actorType: "SYSTEM",
          targetUserId: record.user.id,
          targetBookId: record.book.id,
          metadata: {
            type: "DUE_SOON_NOTIFICATION",
            dueDate: record.borrowRecord.dueDate,
            borrowRecordId: record.borrowRecord.id,
          },
        });
      } catch (error) {
        console.error(
          `Failed to send due soon notification for borrow record ${record.borrowRecord.id}:`,
          error
        );
        await LibraryMetrics.recordEmailFailure();
      }
    }

    // Send overdue notifications and mark as overdue
    for (const record of overdueBooks) {
      try {
        const daysOverdue = dayjs(today).diff(
          dayjs(record.borrowRecord.dueDate),
          "day"
        );

        const template = EmailTemplates.overdueNotification({
          userName: record.user.fullName,
          bookTitle: record.book.title,
          author: record.book.author,
          dueDate: dayjs(record.borrowRecord.dueDate).format("MMMM D, YYYY"),
          daysOverdue,
        });

        if (isFeatureEnabled("ENABLE_EMAIL_NOTIFICATIONS")) {
          await sendEmail({
            email: record.user.email,
            subject: template.subject,
            message: template.body,
          });
        }

        await LibraryMetrics.recordOverdueNotificationSent();

        await createAuditLog({
          action: "ADMIN_ACTION",
          actorType: "SYSTEM",
          targetUserId: record.user.id,
          targetBookId: record.book.id,
          metadata: {
            type: "OVERDUE_NOTIFICATION",
            dueDate: record.borrowRecord.dueDate,
            daysOverdue,
            borrowRecordId: record.borrowRecord.id,
          },
        });
      } catch (error) {
        console.error(
          `Failed to send overdue notification for borrow record ${record.borrowRecord.id}:`,
          error
        );
        await LibraryMetrics.recordEmailFailure();
      }
    }

    // Update metrics
    await LibraryMetrics.updateOverdueBooks(overdueBooks.length);

    console.log(
      `Due notifications job completed. Sent ${dueSoonBooks.length} due soon and ${overdueBooks.length} overdue notifications.`
    );
  } catch (error) {
    console.error("Error in due notifications job:", error);
    throw error;
  }
}

/**
 * Background job to notify users when books become available
 */
export async function processAvailabilityNotifications(bookId: string) {
  if (
    !isFeatureEnabled("ENABLE_BACKGROUND_JOBS") ||
    !isFeatureEnabled("ENABLE_NOTIFY")
  ) {
    console.log("Availability notifications disabled by feature flags");
    return;
  }

  try {
    console.log(`Processing availability notifications for book ${bookId}...`);

    // Get book details
    const bookDetails = await db
      .select({
        title: books.title,
        author: books.author,
        availableCopies: books.availableCopies,
      })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!bookDetails.length || bookDetails[0].availableCopies <= 0) {
      console.log(`Book ${bookId} is not available for notification`);
      return;
    }

    // Get active subscribers for this book
    const subscribers = await db
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
      .orderBy(notificationPreferences.createdAt) // First come, first served
      .limit(bookDetails[0].availableCopies); // Only notify as many as available copies

    if (!subscribers.length) {
      console.log(`No active subscribers for book ${bookId}`);
      return;
    }

    // Send notifications to subscribers
    for (const subscriber of subscribers) {
      try {
        const template = EmailTemplates.bookAvailableNotification({
          userName: subscriber.fullName,
          bookTitle: bookDetails[0].title,
          author: bookDetails[0].author,
        });

        if (isFeatureEnabled("ENABLE_EMAIL_NOTIFICATIONS")) {
          await sendEmail({
            email: subscriber.email,
            subject: template.subject,
            message: template.body,
          });
        }

        // Mark as notified and disable subscription (one-shot)
        await db
          .update(notificationPreferences)
          .set({
            notifiedAt: new Date(),
            notifyOnAvailable: false, // Auto-disable after notification
          })
          .where(
            and(
              eq(notificationPreferences.userId, subscriber.userId),
              eq(notificationPreferences.bookId, bookId)
            )
          );

        await LibraryMetrics.recordNotifyEmailSent();

        await createAuditLog({
          action: "ADMIN_ACTION",
          actorType: "SYSTEM",
          targetUserId: subscriber.userId,
          targetBookId: bookId,
          metadata: {
            type: "AVAILABILITY_NOTIFICATION",
            bookTitle: bookDetails[0].title,
          },
        });
      } catch (error) {
        console.error(
          `Failed to send availability notification to user ${subscriber.userId}:`,
          error
        );
        await LibraryMetrics.recordEmailFailure();
      }
    }

    console.log(
      `Sent availability notifications to ${subscribers.length} users for book ${bookId}`
    );
  } catch (error) {
    console.error("Error in availability notifications job:", error);
    throw error;
  }
}

/**
 * Scheduled job runner for nightly tasks
 */
export async function runNightlyJobs() {
  if (!isFeatureEnabled("ENABLE_BACKGROUND_JOBS")) {
    console.log("Background jobs disabled by feature flags");
    return;
  }

  console.log("Starting nightly jobs...");

  try {
    // Run due notifications
    await processDueNotifications();

    // Update general metrics
    const pendingRequestsCount = await db
      .select({ count: sql`count(*)` })
      .from(borrowRequests)
      .where(eq(borrowRequests.status, "PENDING"));

    await LibraryMetrics.updatePendingRequests(
      Number(pendingRequestsCount[0]?.count) || 0
    );

    // Run invariant checks
    console.log("Running invariant consistency checks...");
    // TODO: Implement comprehensive invariant checks

    console.log("Nightly jobs completed successfully");
  } catch (error) {
    console.error("Error in nightly jobs:", error);

    // Alert on job failure
    await createAuditLog({
      action: "ADMIN_ACTION",
      actorType: "SYSTEM",
      metadata: {
        type: "NIGHTLY_JOB_FAILURE",
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}
