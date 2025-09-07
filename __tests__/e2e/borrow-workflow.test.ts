/**
 * End-to-end tests for the complete borrow workflow
 * Tests the full cycle: borrow → approve → return → approve → reset
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { db } from "@/database/drizzle";
import {
  books,
  borrowRequests,
  borrowRecords,
  users,
  notificationPreferences,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import {
  createBorrowRequest,
  approveBorrowRequest,
  getUserBorrowRequestStatus,
} from "@/lib/actions/borrow-request";
import { processAvailabilityNotifications } from "@/lib/background-jobs";
import { LibraryMetrics } from "@/lib/metrics";
import { FeatureFlags } from "@/lib/feature-flags";

// Mock data
const mockUser = {
  id: "test-user-id",
  fullName: "Test User",
  email: "test@example.com",
  universityId: 12345,
  status: "APPROVED" as const,
  role: "USER" as const,
};

const mockAdmin = {
  id: "test-admin-id",
  fullName: "Test Admin",
  email: "admin@example.com",
  universityId: 67890,
  status: "APPROVED" as const,
  role: "ADMIN" as const,
};

const mockBook = {
  id: "test-book-id",
  title: "Test Book",
  author: "Test Author",
  genre: "Fiction",
  rating: "4.5",
  coverUrl: "https://example.com/cover.jpg",
  coverColor: "#000000",
  description: "A test book",
  totalCopies: 3,
  availableCopies: 2,
  reserveOnRequest: true,
  summary: "Test summary",
};

describe("End-to-End Borrow Workflow", () => {
  beforeEach(async () => {
    // Clean up and setup test data
    await db.delete(borrowRecords);
    await db.delete(borrowRequests);
    await db.delete(notificationPreferences);
    await db.delete(books);
    await db.delete(users);

    // Insert test data
    await db.insert(users).values([mockUser, mockAdmin]);
    await db.insert(books).values([mockBook]);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(borrowRecords);
    await db.delete(borrowRequests);
    await db.delete(notificationPreferences);
    await db.delete(books);
    await db.delete(users);
  });

  describe("Complete Borrow-Return Cycle", () => {
    it("should complete full workflow: borrow → approve → return → approve → reset", async () => {
      // Step 1: Create borrow request
      const borrowResult = await createBorrowRequest({
        userId: mockUser.id,
        bookId: mockBook.id,
        confirmationText: "confirm",
        idempotencyKey: "test-key-1",
      });

      expect(borrowResult.success).toBe(true);
      expect(borrowResult.data).toBeDefined();

      const requestId = borrowResult.data!.id;

      // Verify book inventory decreased (if RESERVE_ON_REQUEST is true)
      const bookAfterRequest = await db
        .select({ availableCopies: books.availableCopies })
        .from(books)
        .where(eq(books.id, mockBook.id))
        .limit(1);

      if (FeatureFlags.RESERVE_ON_REQUEST) {
        expect(bookAfterRequest[0].availableCopies).toBe(1); // 2 - 1
      } else {
        expect(bookAfterRequest[0].availableCopies).toBe(2); // unchanged
      }

      // Step 2: Check status shows pending request
      const statusAfterRequest = await getUserBorrowRequestStatus(
        mockUser.id,
        mockBook.id
      );
      expect(statusAfterRequest.success).toBe(true);
      expect(statusAfterRequest.data?.type).toBe("BORROW_REQUEST");
      expect(statusAfterRequest.data?.status).toBe("PENDING");

      // Step 3: Admin approves request
      const approveResult = await approveBorrowRequest({
        requestId,
        adminId: mockAdmin.id,
        adminNotes: "Approved for testing",
      });

      expect(approveResult.success).toBe(true);

      // Verify borrow record was created
      const borrowRecord = await db
        .select()
        .from(borrowRecords)
        .where(
          and(
            eq(borrowRecords.userId, mockUser.id),
            eq(borrowRecords.bookId, mockBook.id),
            eq(borrowRecords.status, "BORROWED")
          )
        )
        .limit(1);

      expect(borrowRecord.length).toBe(1);

      // Step 4: Check status shows borrowed
      const statusAfterApproval = await getUserBorrowRequestStatus(
        mockUser.id,
        mockBook.id
      );
      expect(statusAfterApproval.success).toBe(true);
      expect(statusAfterApproval.data?.type).toBe("BORROWED");
      expect(statusAfterApproval.data?.status).toBe("BORROWED");

      // Step 5: Create return request
      // TODO: Implement return request functionality
      // const returnResult = await createReturnRequest({
      //   userId: mockUser.id,
      //   borrowRecordId: borrowRecord[0].id,
      // });

      // Step 6: Admin approves return
      // TODO: Implement return approval functionality

      // Step 7: Verify button resets to "Borrow Book"
      // const statusAfterReturn = await getUserBorrowRequestStatus(mockUser.id, mockBook.id);
      // expect(statusAfterReturn.data).toBeNull(); // No active request or borrow
    });

    it("should handle idempotency correctly", async () => {
      const idempotencyKey = "duplicate-test-key";

      // First request
      const firstResult = await createBorrowRequest({
        userId: mockUser.id,
        bookId: mockBook.id,
        confirmationText: "confirm",
        idempotencyKey,
      });

      expect(firstResult.success).toBe(true);
      const firstRequestId = firstResult.data!.id;

      // Second request with same idempotency key
      const secondResult = await createBorrowRequest({
        userId: mockUser.id,
        bookId: mockBook.id,
        confirmationText: "confirm",
        idempotencyKey,
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.data!.id).toBe(firstRequestId); // Should return the same request

      // Verify only one request was created
      const requests = await db
        .select()
        .from(borrowRequests)
        .where(eq(borrowRequests.userId, mockUser.id));

      expect(requests.length).toBe(1);
    });

    it("should prevent double approval", async () => {
      // Create and get request
      const borrowResult = await createBorrowRequest({
        userId: mockUser.id,
        bookId: mockBook.id,
        confirmationText: "confirm",
      });

      const requestId = borrowResult.data!.id;

      // First approval
      const firstApproval = await approveBorrowRequest({
        requestId,
        adminId: mockAdmin.id,
      });

      expect(firstApproval.success).toBe(true);

      // Second approval attempt
      const secondApproval = await approveBorrowRequest({
        requestId,
        adminId: mockAdmin.id,
      });

      expect(secondApproval.success).toBe(false);
      expect(secondApproval.error).toContain("already been processed");
    });
  });

  describe("Notify-Me Feature", () => {
    it("should trigger notification when book becomes available", async () => {
      // Create a book with 0 available copies
      const unavailableBook = {
        ...mockBook,
        id: "unavailable-book-id",
        availableCopies: 0,
      };
      await db.insert(books).values([unavailableBook]);

      // User subscribes to notifications
      await db.insert(notificationPreferences).values({
        userId: mockUser.id,
        bookId: unavailableBook.id,
        notifyOnAvailable: true,
      });

      // Make book available
      await db
        .update(books)
        .set({ availableCopies: 1 })
        .where(eq(books.id, unavailableBook.id));

      // Trigger availability notifications
      await processAvailabilityNotifications(unavailableBook.id);

      // Verify notification was marked as sent
      const notification = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, mockUser.id),
            eq(notificationPreferences.bookId, unavailableBook.id)
          )
        )
        .limit(1);

      expect(notification[0].notifiedAt).toBeDefined();
      expect(notification[0].notifyOnAvailable).toBe(false); // Auto-disabled
    });

    it("should only notify first-come-first-served when multiple subscribers", async () => {
      // Create another user
      const secondUser = {
        ...mockUser,
        id: "second-user-id",
        email: "second@example.com",
        universityId: 54321,
      };
      await db.insert(users).values([secondUser]);

      // Create book with 1 available copy
      const limitedBook = {
        ...mockBook,
        id: "limited-book-id",
        availableCopies: 1,
      };
      await db.insert(books).values([limitedBook]);

      // Both users subscribe (first user subscribes first)
      await db.insert(notificationPreferences).values([
        {
          userId: mockUser.id,
          bookId: limitedBook.id,
          notifyOnAvailable: true,
        },
        {
          userId: secondUser.id,
          bookId: limitedBook.id,
          notifyOnAvailable: true,
        },
      ]);

      // Trigger notifications
      await processAvailabilityNotifications(limitedBook.id);

      // Check notifications
      const notifications = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.bookId, limitedBook.id));

      // First user should be notified
      const firstUserNotification = notifications.find(
        (n) => n.userId === mockUser.id
      );
      expect(firstUserNotification?.notifiedAt).toBeDefined();
      expect(firstUserNotification?.notifyOnAvailable).toBe(false);

      // Second user should not be notified (book only has 1 copy)
      const secondUserNotification = notifications.find(
        (n) => n.userId === secondUser.id
      );
      expect(secondUserNotification?.notifiedAt).toBeNull();
      expect(secondUserNotification?.notifyOnAvailable).toBe(true);
    });
  });

  describe("Inventory Invariant Tests", () => {
    it("should maintain inventory consistency across random operations", async () => {
      const initialCopies = mockBook.availableCopies;
      const operations = [];

      // Generate random sequence of operations
      for (let i = 0; i < 10; i++) {
        const operation = Math.random() < 0.7 ? "borrow" : "return";
        operations.push(operation);
      }

      let expectedAvailable = initialCopies;
      let activeRequests = 0;

      for (const operation of operations) {
        if (operation === "borrow" && expectedAvailable > 0) {
          const result = await createBorrowRequest({
            userId: `user-${Date.now()}-${Math.random()}`,
            bookId: mockBook.id,
            confirmationText: "confirm",
          });

          if (result.success && FeatureFlags.RESERVE_ON_REQUEST) {
            expectedAvailable--;
            activeRequests++;
          }
        }
        // TODO: Implement return operations
      }

      // Verify final inventory state
      const finalBook = await db
        .select({ availableCopies: books.availableCopies })
        .from(books)
        .where(eq(books.id, mockBook.id))
        .limit(1);

      expect(finalBook[0].availableCopies).toBeGreaterThanOrEqual(0);

      if (FeatureFlags.RESERVE_ON_REQUEST) {
        expect(finalBook[0].availableCopies).toBe(expectedAvailable);
      }
    });

    it("should detect and alert on inventory violations", async () => {
      // Manually create an inventory violation
      await db
        .update(books)
        .set({ availableCopies: -1 })
        .where(eq(books.id, mockBook.id));

      // Trigger inventory check
      await LibraryMetrics.alertInventoryViolation(mockBook.id, -1);

      // Verify alert was created
      const alerts = await LibraryMetrics.getRecentAlerts(1);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].bookId).toBe(mockBook.id);
      expect(alerts[0].severity).toBe("HIGH");
    });
  });

  describe("Feature Flag Tests", () => {
    it("should respect RESERVE_ON_REQUEST flag", async () => {
      // Test with RESERVE_ON_REQUEST = false
      process.env.FEATURE_RESERVE_ON_REQUEST = "false";

      const result = await createBorrowRequest({
        userId: mockUser.id,
        bookId: mockBook.id,
        confirmationText: "confirm",
      });

      expect(result.success).toBe(true);

      // Book should still have same available copies
      const book = await db
        .select({ availableCopies: books.availableCopies })
        .from(books)
        .where(eq(books.id, mockBook.id))
        .limit(1);

      expect(book[0].availableCopies).toBe(mockBook.availableCopies);

      // Reset
      delete process.env.FEATURE_RESERVE_ON_REQUEST;
    });

    it("should disable features when emergency rollback is active", async () => {
      // Activate emergency rollback
      process.env.EMERGENCY_DISABLE_NEW_FEATURES = "true";

      // Notifications should be disabled
      await processAvailabilityNotifications(mockBook.id);
      // Should exit early due to feature flag

      // Reset
      delete process.env.EMERGENCY_DISABLE_NEW_FEATURES;
    });
  });
});

/**
 * Property-based tests for inventory invariants
 */
describe("Property-Based Inventory Tests", () => {
  it("should maintain available_copies >= 0 invariant", async () => {
    // Property: available_copies should never go negative
    // This would use a property testing library like fast-check in a real implementation

    const testCases = [
      { initialCopies: 0, borrowAttempts: 5 },
      { initialCopies: 1, borrowAttempts: 3 },
      { initialCopies: 5, borrowAttempts: 10 },
    ];

    for (const testCase of testCases) {
      await db.delete(borrowRequests);
      await db.delete(books);

      const testBook = {
        ...mockBook,
        id: `test-book-${Date.now()}`,
        availableCopies: testCase.initialCopies,
      };
      await db.insert(books).values([testBook]);

      for (let i = 0; i < testCase.borrowAttempts; i++) {
        const result = await createBorrowRequest({
          userId: `user-${i}`,
          bookId: testBook.id,
          confirmationText: "confirm",
        });

        const currentBook = await db
          .select({ availableCopies: books.availableCopies })
          .from(books)
          .where(eq(books.id, testBook.id))
          .limit(1);

        // Invariant: available copies should never be negative
        expect(currentBook[0].availableCopies).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
