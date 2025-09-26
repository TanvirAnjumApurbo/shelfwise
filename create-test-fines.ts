import { db } from "@/database/drizzle";
import { fines, books, users } from "@/database/schema";
import { eq } from "drizzle-orm";

async function createTestFines() {
  try {
    console.log("🚀 Creating test fines...");

    // Get the first user (you can replace this with your specific user ID)
    const user = await db.select().from(users).limit(1);
    if (!user.length) {
      console.log("❌ No users found. Please create a user first.");
      return;
    }

    const userId = user[0].id;
    console.log("👤 Using user:", userId);

    // Get some books for the fines
    const testBooks = await db.select().from(books).limit(3);
    if (!testBooks.length) {
      console.log("❌ No books found. Please add some books first.");
      return;
    }

    // Create test fines
    const testFinesData = [
      {
        id: "test-fine-1",
        userId: userId,
        bookId: testBooks[0].id,
        amount: 15.0,
        paidAmount: 0,
        status: "PENDING" as const,
        daysOverdue: 5,
        isBookLost: false,
        dueDate: "2025-09-07", // 5 days ago
        description: "Book overdue for 5 days - daily penalty applied",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "test-fine-2",
        userId: userId,
        bookId: testBooks[1]?.id || testBooks[0].id,
        amount: 25.5,
        paidAmount: 0,
        status: "PENDING" as const,
        daysOverdue: 12,
        isBookLost: false,
        dueDate: "2025-08-31", // 12 days ago
        description: "Book overdue for 12 days - escalated penalty",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "test-fine-3",
        userId: userId,
        bookId: testBooks[2]?.id || testBooks[0].id,
        amount: 75.0,
        paidAmount: 0,
        status: "PENDING" as const,
        daysOverdue: 20,
        isBookLost: true,
        dueDate: "2025-08-23", // 20 days ago
        description: "Book marked as lost - replacement cost + penalty",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Delete any existing test fines first
    await db.delete(fines).where(eq(fines.userId, userId));

    // Insert the test fines
    const result = await db.insert(fines).values(testFinesData);

    console.log("✅ Test fines created successfully!");
    console.log(
      `📊 Created ${testFinesData.length} test fines for user ${userId}`
    );
    console.log(
      "💰 Total test fine amount: $" +
        testFinesData.reduce((sum, fine) => sum + fine.amount, 0)
    );

    return testFinesData;
  } catch (error) {
    console.error("❌ Error creating test fines:", error);
    throw error;
  }
}

// Run the function
createTestFines()
  .then(() => {
    console.log("🎉 Test fines setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to create test fines:", error);
    process.exit(1);
  });
