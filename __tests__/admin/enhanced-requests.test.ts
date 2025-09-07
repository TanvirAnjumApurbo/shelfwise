import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/database/drizzle";
import {
  users,
  books,
  borrowRequests,
  returnRequests,
  borrowRecords,
  auditLogs,
} from "@/database/schema";
import {
  approveBorrowRequest,
  rejectBorrowRequest,
} from "@/lib/actions/borrow-request-enhanced";
import {
  approveReturnRequest,
  rejectReturnRequest,
} from "@/lib/actions/return-request-enhanced";
import { eq, and } from "drizzle-orm";

// Test data setup
const testAdmin = {
  id: "test-admin-id",
  fullName: "Test Admin",
  email: "admin@test.com",
  universityId: 12345,
  password: "hashedpassword",
  universityCard: "card.jpg",
  role: "ADMIN" as const,
  status: "APPROVED" as const,
};

const testUser = {
  id: "test-user-id",
  fullName: "Test User",
  email: "user@test.com",
  universityId: 67890,
  password: "hashedpassword",
  universityCard: "card.jpg",
  role: "USER" as const,
  status: "APPROVED" as const,
};

const testBook = {
  id: "test-book-id",
  title: "Test Book",
  author: "Test Author",
  genre: "Test Genre",
  rating: "4.5",
  coverUrl: "https://example.com/cover.jpg",
  coverColor: "#000000",
  description: "A test book description",
  totalCopies: 5,
  availableCopies: 3,
  reserveOnRequest: true,
  summary: "Test summary",
};

describe("Admin Borrow Request Management", () => {
  let borrowRequestId: string;
  let borrowRecordId: string;

  beforeEach(async () => {
    // Clean up and setup test data
    await db.delete(auditLogs);
    await db.delete(returnRequests);
    await db.delete(borrowRequests);
    await db.delete(borrowRecords);
    await db.delete(books);
    await db.delete(users);

    // Insert test data
    await db.insert(users).values([testAdmin, testUser]);
    await db.insert(books).values([testBook]);

    // Create a test borrow request
    const [borrowRequest] = await db
      .insert(borrowRequests)
      .values({
        id: "test-borrow-request-id",
        userId: testUser.id,
        bookId: testBook.id,
        status: "PENDING",
      })
      .returning();

    borrowRequestId = borrowRequest.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(auditLogs);
    await db.delete(returnRequests);
    await db.delete(borrowRequests);
    await db.delete(borrowRecords);
    await db.delete(books);
    await db.delete(users);
  });

  it("should approve borrow request and start 7-day timer", async () => {
    const result = await approveBorrowRequest({
      requestId: borrowRequestId,
      adminId: testAdmin.id,
      adminNotes: "Approved for testing",
    });

    expect(result.success).toBe(true);

    // Check request status
    const [updatedRequest] = await db
      .select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, borrowRequestId));

    expect(updatedRequest.status).toBe("APPROVED");
    expect(updatedRequest.approvedAt).toBeTruthy();
    expect(updatedRequest.dueDate).toBeTruthy();
    expect(updatedRequest.adminNotes).toBe("Approved for testing");

    // Check borrow record creation
    const borrowRecord = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.id, updatedRequest.borrowRecordId!));

    expect(borrowRecord.length).toBe(1);
    expect(borrowRecord[0].status).toBe("BORROWED");

    // Verify 7-day timer
    const borrowDate = new Date(borrowRecord[0].borrowDate);
    const dueDate = new Date(borrowRecord[0].dueDate);
    const daysDiff = Math.ceil(
      (dueDate.getTime() - borrowDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(daysDiff).toBe(7);

    // Check inventory update (for RESERVE_ON_REQUEST=false)
    if (!testBook.reserveOnRequest) {
      const [updatedBook] = await db
        .select()
        .from(books)
        .where(eq(books.id, testBook.id));

      expect(updatedBook.availableCopies).toBe(testBook.availableCopies - 1);
    }

    // Check audit log
    const auditLog = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "BORROW_REQUEST_APPROVED"));

    expect(auditLog.length).toBe(1);
    expect(auditLog[0].actorId).toBe(testAdmin.id);
    expect(auditLog[0].targetUserId).toBe(testUser.id);
    expect(auditLog[0].targetBookId).toBe(testBook.id);
  });

  it("should reject borrow request and release inventory if reserved", async () => {
    const result = await rejectBorrowRequest({
      requestId: borrowRequestId,
      adminId: testAdmin.id,
      adminNotes: "Book not available for borrowing",
    });

    expect(result.success).toBe(true);

    // Check request status
    const [updatedRequest] = await db
      .select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, borrowRequestId));

    expect(updatedRequest.status).toBe("REJECTED");
    expect(updatedRequest.rejectedAt).toBeTruthy();
    expect(updatedRequest.adminNotes).toBe("Book not available for borrowing");

    // Check inventory release (for RESERVE_ON_REQUEST=true)
    if (testBook.reserveOnRequest) {
      const [updatedBook] = await db
        .select()
        .from(books)
        .where(eq(books.id, testBook.id));

      expect(updatedBook.availableCopies).toBe(testBook.availableCopies + 1);
    }

    // Check audit log
    const auditLog = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "BORROW_REQUEST_REJECTED"));

    expect(auditLog.length).toBe(1);
    expect(auditLog[0].actorId).toBe(testAdmin.id);
  });
});

describe("Admin Return Request Management", () => {
  let returnRequestId: string;
  let borrowRecordId: string;

  beforeEach(async () => {
    // Clean up and setup test data
    await db.delete(auditLogs);
    await db.delete(returnRequests);
    await db.delete(borrowRequests);
    await db.delete(borrowRecords);
    await db.delete(books);
    await db.delete(users);

    // Insert test data
    await db.insert(users).values([testAdmin, testUser]);
    await db.insert(books).values([testBook]);

    // Create a test borrow record
    const [borrowRecord] = await db
      .insert(borrowRecords)
      .values({
        id: "test-borrow-record-id",
        userId: testUser.id,
        bookId: testBook.id,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        status: "BORROWED",
      })
      .returning();

    borrowRecordId = borrowRecord.id;

    // Create a test return request
    const [returnRequest] = await db
      .insert(returnRequests)
      .values({
        id: "test-return-request-id",
        userId: testUser.id,
        bookId: testBook.id,
        borrowRecordId: borrowRecordId,
        status: "PENDING",
      })
      .returning();

    returnRequestId = returnRequest.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(auditLogs);
    await db.delete(returnRequests);
    await db.delete(borrowRequests);
    await db.delete(borrowRecords);
    await db.delete(books);
    await db.delete(users);
  });

  it("should approve return and increment stock", async () => {
    const result = await approveReturnRequest({
      requestId: returnRequestId,
      adminId: testAdmin.id,
      adminNotes: "Book returned in good condition",
    });

    expect(result.success).toBe(true);

    // Check return request status
    const [updatedRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, returnRequestId));

    expect(updatedRequest.status).toBe("APPROVED");
    expect(updatedRequest.approvedAt).toBeTruthy();

    // Check borrow record updated
    const [updatedBorrowRecord] = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.id, borrowRecordId));

    expect(updatedBorrowRecord.status).toBe("RETURNED");
    expect(updatedBorrowRecord.returnDate).toBeTruthy();

    // Check inventory increment
    const [updatedBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, testBook.id));

    expect(updatedBook.availableCopies).toBe(testBook.availableCopies + 1);

    // Check audit log
    const auditLog = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "RETURN_REQUEST_APPROVED"));

    expect(auditLog.length).toBe(1);
    expect(auditLog[0].actorId).toBe(testAdmin.id);
  });

  it("should reject return request and keep book borrowed", async () => {
    const result = await rejectReturnRequest({
      requestId: returnRequestId,
      adminId: testAdmin.id,
      adminNotes: "Book has damage, please visit library",
    });

    expect(result.success).toBe(true);

    // Check return request status
    const [updatedRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, returnRequestId));

    expect(updatedRequest.status).toBe("REJECTED");
    expect(updatedRequest.rejectedAt).toBeTruthy();
    expect(updatedRequest.adminNotes).toBe(
      "Book has damage, please visit library"
    );

    // Check borrow record still borrowed
    const [borrowRecord] = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.id, borrowRecordId));

    expect(borrowRecord.status).toBe("BORROWED");
    expect(borrowRecord.returnDate).toBeNull();

    // Check inventory unchanged
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, testBook.id));

    expect(book.availableCopies).toBe(testBook.availableCopies);
  });
});

describe("Concurrent Inventory Management", () => {
  it("should maintain inventory consistency under concurrent approvals", async () => {
    // This test simulates concurrent borrow request approvals
    // to ensure inventory doesn't go negative

    const initialCopies = 2;
    const book = {
      ...testBook,
      availableCopies: initialCopies,
      reserveOnRequest: false, // Test atomic decrement
    };

    await db.delete(books);
    await db.delete(users);
    await db.insert(users).values([testAdmin, testUser]);
    await db.insert(books).values([book]);

    // Create multiple pending requests
    const requests = await Promise.all([
      db
        .insert(borrowRequests)
        .values({
          userId: testUser.id,
          bookId: book.id,
          status: "PENDING",
        })
        .returning(),
      db
        .insert(borrowRequests)
        .values({
          userId: testUser.id,
          bookId: book.id,
          status: "PENDING",
        })
        .returning(),
      db
        .insert(borrowRequests)
        .values({
          userId: testUser.id,
          bookId: book.id,
          status: "PENDING",
        })
        .returning(),
    ]);

    // Simulate concurrent approvals
    const approvalPromises = requests.map(([request]) =>
      approveBorrowRequest({
        requestId: request.id,
        adminId: testAdmin.id,
      })
    );

    const results = await Promise.allSettled(approvalPromises);

    // Check that only the available number of books were approved
    const successfulApprovals = results.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;

    expect(successfulApprovals).toBeLessThanOrEqual(initialCopies);

    // Check final inventory
    const [finalBook] = await db
      .select()
      .from(books)
      .where(eq(books.id, book.id));

    expect(finalBook.availableCopies).toBeGreaterThanOrEqual(0);
    expect(finalBook.availableCopies).toBe(initialCopies - successfulApprovals);
  });
});
