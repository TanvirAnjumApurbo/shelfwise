import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config({ path: ".env.local" });

async function createTestFines() {
  const [{ db }, { fines, books, users, borrowRecords }, { eq }] =
    await Promise.all([
      import("@/database/drizzle"),
      import("@/database/schema"),
      import("drizzle-orm"),
    ]);

  try {
    console.log("🚀 Creating test fines...");

    // Get the first user (you can replace this with your specific user ID)
    const TARGET_USER_ID =
      "c9ce036f-da01-42fa-bee6-b2f493bb3820" satisfies string;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, TARGET_USER_ID))
      .limit(1);

    if (!user.length) {
      console.log(
        `❌ Target user ${TARGET_USER_ID} not found. Please ensure this user exists before running the script.`
      );
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
    const today = new Date();

    const borrowRecordTemplates = [
      {
        offsetDays: 10,
        dueOffset: 5,
      },
      {
        offsetDays: 20,
        dueOffset: 8,
      },
      {
        offsetDays: 35,
        dueOffset: 15,
      },
    ];

    const borrowRecordsData = borrowRecordTemplates.map((template, index) => {
      const borrowDate = new Date(today);
      borrowDate.setDate(today.getDate() - template.offsetDays);

      const dueDate = new Date(borrowDate);
      dueDate.setDate(borrowDate.getDate() + template.dueOffset);

      return {
        id: randomUUID(),
        userId,
        bookId: testBooks[index % testBooks.length].id,
        borrowDate,
        dueDate: dueDate.toISOString().slice(0, 10),
        status: "BORROWED" as const,
      } satisfies typeof borrowRecords.$inferInsert;
    });

    const testFinesData = borrowRecordsData.map((record, index) => {
      const dueDateValue = new Date(record.dueDate);
      const daysOverdue = Math.max(
        1,
        Math.ceil(
          (today.getTime() - dueDateValue.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      const scenarios = [
        {
          amount: 15.0,
          fineType: "LATE_RETURN" as const,
          penaltyType: "FLAT_FEE" as const,
          isBookLost: false,
          description: "Book overdue for 5 days - $10 flat fee + daily penalty",
        },
        {
          amount: 25.5,
          fineType: "LATE_RETURN" as const,
          penaltyType: "DAILY_FEE" as const,
          isBookLost: false,
          description: "Book overdue for 12 days - escalated daily penalties",
        },
        {
          amount: 75.0,
          fineType: "LOST_BOOK" as const,
          penaltyType: "LOST_BOOK_FEE" as const,
          isBookLost: true,
          description: "Book marked as lost - replacement cost + penalty",
        },
      ];

      const scenario = scenarios[index] ?? scenarios[scenarios.length - 1];

      return {
        id: randomUUID(),
        userId,
        bookId: record.bookId,
        borrowRecordId: record.id,
        fineType: scenario.fineType,
        penaltyType: scenario.penaltyType,
        amount: scenario.amount.toFixed(2),
        paidAmount: "0.00",
        status: "PENDING" as const,
        dueDate: record.dueDate,
        calculationDate: today.toISOString().slice(0, 10),
        daysOverdue: daysOverdue.toString(),
        isBookLost: scenario.isBookLost,
        description: scenario.description,
      } satisfies typeof fines.$inferInsert;
    });

    // Delete any existing test fines first
    await db.delete(fines).where(eq(fines.userId, userId));

    // Delete existing borrow records for the user to avoid constraint issues
    await db.delete(borrowRecords).where(eq(borrowRecords.userId, userId));

    await db.insert(borrowRecords).values(borrowRecordsData);

    // Insert the test fines
    await db.insert(fines).values(testFinesData);

    const totalFineAmount = testFinesData.reduce(
      (sum, fine) => sum + parseFloat(fine.amount),
      0
    );
    const restrictionThreshold = 60;
    const isRestricted = totalFineAmount > restrictionThreshold;

    await db
      .update(users)
      .set({
        totalFinesOwed: totalFineAmount.toFixed(2),
        isRestricted,
        restrictionReason: isRestricted
          ? `Total fines exceed $${restrictionThreshold} threshold`
          : null,
        restrictedAt: isRestricted ? new Date() : null,
        lastFineCalculation: new Date(),
      })
      .where(eq(users.id, userId));

    const [updatedUser] = await db
      .select({
        totalFinesOwed: users.totalFinesOwed,
        isRestricted: users.isRestricted,
        restrictionReason: users.restrictionReason,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log("✅ Test fines created successfully!");
    console.log(
      `📊 Created ${testFinesData.length} test fines for user ${userId}`
    );
    console.log("💰 Total test fine amount: $" + totalFineAmount.toFixed(2));
    if (updatedUser) {
      console.log(
        `📌 User total fines now: $${updatedUser.totalFinesOwed} | Restricted: ${updatedUser.isRestricted}`
      );
      if (updatedUser.restrictionReason) {
        console.log(`🚫 Restriction reason: ${updatedUser.restrictionReason}`);
      }
    }

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
