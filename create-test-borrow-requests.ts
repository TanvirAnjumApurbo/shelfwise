// Test script to create sample borrow requests for testing admin dashboard
import { borrowRequests, books, users } from "./database/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";
import { eq, and } from "drizzle-orm";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const createTestBorrowRequests = async () => {
  console.log("Creating test borrow requests...");

  try {
    // Get some users and books to create requests for
    const testUsers = await db.select().from(users).limit(3);
    const testBooks = await db.select().from(books).limit(3);

    if (testUsers.length === 0 || testBooks.length === 0) {
      console.error("No users or books found. Please seed the database first.");
      return;
    }

    console.log(
      "Found users:",
      testUsers.map((u) => ({ id: u.id, name: u.fullName }))
    );
    console.log(
      "Found books:",
      testBooks.map((b) => ({ id: b.id, title: b.title, coverUrl: b.coverUrl }))
    );

    // Create test borrow requests
    const testRequests = [
      {
        userId: testUsers[0].id,
        bookId: testBooks[0].id,
        status: "PENDING" as const,
      },
      {
        userId: testUsers[1].id,
        bookId: testBooks[1].id,
        status: "PENDING" as const,
      },
    ];

    if (testUsers.length > 2 && testBooks.length > 2) {
      testRequests.push({
        userId: testUsers[2].id,
        bookId: testBooks[2].id,
        status: "PENDING" as const,
      });
    }

    for (const request of testRequests) {
      // Check if request already exists
      const existing = await db
        .select()
        .from(borrowRequests)
        .where(
          and(
            eq(borrowRequests.userId, request.userId),
            eq(borrowRequests.bookId, request.bookId),
            eq(borrowRequests.status, "PENDING")
          )
        );

      if (existing.length === 0) {
        const result = await db
          .insert(borrowRequests)
          .values(request)
          .returning();
        console.log(`✅ Created borrow request: ${result[0].id}`);
      } else {
        console.log(
          `⚠️ Request already exists for user ${request.userId} and book ${request.bookId}`
        );
      }
    }

    console.log("🎉 Test borrow requests created successfully!");
    console.log(
      "📋 You can now view them in the admin dashboard at /admin/book-requests"
    );
  } catch (error) {
    console.error("❌ Error creating test requests:", error);
  }
};

createTestBorrowRequests().catch(console.error);
