"use server";

import { db } from "@/database/drizzle";
import {
  books,
  borrowRecords,
  users,
  fines,
  finePayments,
} from "@/database/schema";
import { eq, and, lt, sql, isNull } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import dayjs from "dayjs";

export interface FineCalculationResult {
  userId: string;
  bookId: string;
  borrowRecordId: string;
  daysOverdue: number;
  totalFine: number;
  breakdown: {
    flatFee?: number;
    dailyFees?: number;
    lostBookFee?: number;
    bookPrice?: number;
    penaltyPercentage?: number;
  };
  isBookLost: boolean;
  description: string;
}

export interface UserFineStatus {
  userId: string;
  totalFinesOwed: number;
  isRestricted: boolean;
  canBorrow: boolean;
  canReturnBooks: boolean;
  restrictions: {
    reason: string;
    restrictedAt: Date | null;
  };
  activeFines: Array<{
    id: string;
    bookTitle: string;
    amount: number;
    daysOverdue: number;
    isBookLost: boolean;
    description: string;
  }>;
}

/**
 * Calculate penalty based on days overdue
 * Rules:
 * - Days 1-7: Free borrowing period
 * - Day 8: $10 flat penalty (first late day)
 * - Days 9-14: Additional $0.5/day
 * - Day 15+: Book considered lost = Book Price + (30% of Book Price)
 */
const calculatePenaltyAmount = (
  daysOverdue: number,
  bookPrice: number
): FineCalculationResult["breakdown"] => {
  const breakdown: FineCalculationResult["breakdown"] = {};

  if (daysOverdue <= 0) {
    return breakdown;
  }

  if (daysOverdue >= 15) {
    // Day 15+: Book is considered lost
    breakdown.lostBookFee = bookPrice + bookPrice * 0.3;
    breakdown.bookPrice = bookPrice;
    breakdown.penaltyPercentage = 30;
  } else {
    // Day 8: Flat $10 fee
    if (daysOverdue >= 8) {
      breakdown.flatFee = 10.0;
    }

    // Days 9-14: Additional $0.5/day
    if (daysOverdue >= 9) {
      const dailyFeeDays = Math.min(daysOverdue - 8, 6); // Days 9-14 (6 days max)
      breakdown.dailyFees = dailyFeeDays * 0.5;
    }
  }

  return breakdown;
};

/**
 * Calculate total fine amount from breakdown
 */
const calculateTotalFine = (
  breakdown: FineCalculationResult["breakdown"]
): number => {
  let total = 0;

  if (breakdown.flatFee) total += breakdown.flatFee;
  if (breakdown.dailyFees) total += breakdown.dailyFees;
  if (breakdown.lostBookFee) total += breakdown.lostBookFee;

  return total;
};

/**
 * Calculate fines for overdue books
 */
export const calculateOverdueFines = async (): Promise<{
  success: boolean;
  data?: FineCalculationResult[];
  error?: string;
}> => {
  try {
    console.log("🔄 Starting overdue fine calculation...");

    // Get all borrowed books that are overdue (past 7 days from borrow date)
    const today = dayjs();
    const overdueRecords = await db
      .select({
        borrowRecord: borrowRecords,
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          price: books.price,
        },
        user: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .where(
        and(
          eq(borrowRecords.status, "BORROWED"),
          lt(borrowRecords.dueDate, today.format("YYYY-MM-DD"))
        )
      );

    console.log(`📊 Found ${overdueRecords.length} overdue records`);

    const fineResults: FineCalculationResult[] = [];

    for (const record of overdueRecords) {
      const dueDate = dayjs(record.borrowRecord.dueDate);
      const daysOverdue = today.diff(dueDate, "day");

      if (daysOverdue <= 0) continue;

      // Check if fine already exists for this borrow record
      const existingFine = await db
        .select()
        .from(fines)
        .where(eq(fines.borrowRecordId, record.borrowRecord.id))
        .limit(1);

      if (existingFine.length > 0) {
        console.log(
          `⏭️ Fine already exists for borrow record ${record.borrowRecord.id}`
        );
        continue;
      }

      const bookPrice = Number(record.book.price) || 50.0; // Default $50 if no price
      const breakdown = calculatePenaltyAmount(daysOverdue, bookPrice);
      const totalFine = calculateTotalFine(breakdown);
      const isBookLost = daysOverdue >= 15;

      // Generate description
      let description = `Late return penalty: ${daysOverdue} day(s) overdue. `;
      if (breakdown.flatFee) {
        description += `Flat fee: $${breakdown.flatFee}. `;
      }
      if (breakdown.dailyFees) {
        description += `Daily fees: $${breakdown.dailyFees}. `;
      }
      if (breakdown.lostBookFee) {
        description += `Lost book fee: $${breakdown.lostBookFee} (Book: $${breakdown.bookPrice} + 30% penalty). `;
      }

      const fineResult: FineCalculationResult = {
        userId: record.user.id,
        bookId: record.book.id,
        borrowRecordId: record.borrowRecord.id,
        daysOverdue,
        totalFine,
        breakdown,
        isBookLost,
        description: description.trim(),
      };

      fineResults.push(fineResult);
    }

    console.log(`💰 Calculated ${fineResults.length} new fines`);

    // Create fine records in database
    for (const fineResult of fineResults) {
      await db.insert(fines).values({
        userId: fineResult.userId,
        bookId: fineResult.bookId,
        borrowRecordId: fineResult.borrowRecordId,
        fineType: fineResult.isBookLost ? "LOST_BOOK" : "LATE_RETURN",
        penaltyType: fineResult.isBookLost
          ? "LOST_BOOK_FEE"
          : fineResult.breakdown.flatFee
          ? "FLAT_FEE"
          : "DAILY_FEE",
        amount: fineResult.totalFine.toString(),
        dueDate: dayjs()
          .subtract(fineResult.daysOverdue, "day")
          .format("YYYY-MM-DD"),
        calculationDate: dayjs().format("YYYY-MM-DD"),
        daysOverdue: fineResult.daysOverdue.toString(),
        isBookLost: fineResult.isBookLost,
        description: fineResult.description,
        status: "PENDING",
      });

      // Update user's total fines owed
      await db
        .update(users)
        .set({
          totalFinesOwed: sql`COALESCE(${users.totalFinesOwed}, 0) + ${fineResult.totalFine}`,
          lastFineCalculation: new Date(),
        })
        .where(eq(users.id, fineResult.userId));

      // Create audit log
      await createAuditLog({
        action: "FINE_CALCULATED",
        actorType: "SYSTEM",
        targetUserId: fineResult.userId,
        targetBookId: fineResult.bookId,
        metadata: {
          amount: fineResult.totalFine,
          daysOverdue: fineResult.daysOverdue,
          isBookLost: fineResult.isBookLost,
          breakdown: fineResult.breakdown,
        },
      });

      console.log(
        `✅ Created fine for user ${fineResult.userId}: $${fineResult.totalFine}`
      );
    }

    // Check and update user restrictions
    await updateUserRestrictions();

    return {
      success: true,
      data: fineResults,
    };
  } catch (error) {
    console.error("❌ Error calculating overdue fines:", error);
    return {
      success: false,
      error: "Failed to calculate overdue fines",
    };
  }
};

/**
 * Update user restrictions based on total fines owed
 * Rule: If total fine exceeds $60, user is locked/restricted
 */
export const updateUserRestrictions = async (): Promise<{
  success: boolean;
  data?: { restricted: number; unrestricted: number };
  error?: string;
}> => {
  try {
    const RESTRICTION_THRESHOLD = 60.0;

    // Get users who should be restricted (total fines > $60, not currently restricted)
    const usersToRestrict = await db
      .select()
      .from(users)
      .where(
        and(
          sql`CAST(${users.totalFinesOwed} AS DECIMAL) > ${RESTRICTION_THRESHOLD}`,
          eq(users.isRestricted, false)
        )
      );

    // Get users who should be unrestricted (total fines <= $60, currently restricted)
    const usersToUnrestrict = await db
      .select()
      .from(users)
      .where(
        and(
          sql`CAST(${users.totalFinesOwed} AS DECIMAL) <= ${RESTRICTION_THRESHOLD}`,
          eq(users.isRestricted, true)
        )
      );

    let restrictedCount = 0;
    let unrestrictedCount = 0;

    // Restrict users
    for (const user of usersToRestrict) {
      await db
        .update(users)
        .set({
          isRestricted: true,
          restrictionReason: `Total fines exceed $${RESTRICTION_THRESHOLD} threshold`,
          restrictedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await createAuditLog({
        action: "USER_RESTRICTED",
        actorType: "SYSTEM",
        targetUserId: user.id,
        metadata: {
          reason: "Fine threshold exceeded",
          threshold: RESTRICTION_THRESHOLD,
          totalFines: Number(user.totalFinesOwed),
        },
      });

      restrictedCount++;
      console.log(
        `🔒 Restricted user ${user.id} (Fines: $${user.totalFinesOwed})`
      );
    }

    // Unrestrict users
    for (const user of usersToUnrestrict) {
      await db
        .update(users)
        .set({
          isRestricted: false,
          restrictionReason: null,
          restrictedAt: null,
        })
        .where(eq(users.id, user.id));

      await createAuditLog({
        action: "USER_UNRESTRICTED",
        actorType: "SYSTEM",
        targetUserId: user.id,
        metadata: {
          reason: "Fines paid below threshold",
          threshold: RESTRICTION_THRESHOLD,
          totalFines: Number(user.totalFinesOwed),
        },
      });

      unrestrictedCount++;
      console.log(
        `🔓 Unrestricted user ${user.id} (Fines: $${user.totalFinesOwed})`
      );
    }

    return {
      success: true,
      data: { restricted: restrictedCount, unrestricted: unrestrictedCount },
    };
  } catch (error) {
    console.error("❌ Error updating user restrictions:", error);
    return {
      success: false,
      error: "Failed to update user restrictions",
    };
  }
};

/**
 * Get user's fine status and restrictions
 */
export const getUserFineStatus = async (
  userId: string
): Promise<{
  success: boolean;
  data?: UserFineStatus;
  error?: string;
}> => {
  try {
    // Get user info
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const userData = user[0];

    // Get active fines
    const activeFines = await db
      .select({
        fine: fines,
        book: {
          title: books.title,
        },
      })
      .from(fines)
      .innerJoin(books, eq(fines.bookId, books.id))
      .where(and(eq(fines.userId, userId), eq(fines.status, "PENDING")));

    const userFineStatus: UserFineStatus = {
      userId: userData.id,
      totalFinesOwed: Number(userData.totalFinesOwed) || 0,
      isRestricted: userData.isRestricted || false,
      canBorrow:
        !userData.isRestricted && Number(userData.totalFinesOwed) === 0,
      canReturnBooks: !userData.isRestricted, // Can return even if fines owed
      restrictions: {
        reason: userData.restrictionReason || "",
        restrictedAt: userData.restrictedAt,
      },
      activeFines: activeFines.map(({ fine, book }) => ({
        id: fine.id,
        bookTitle: book.title,
        amount: Number(fine.amount),
        daysOverdue: Number(fine.daysOverdue),
        isBookLost: fine.isBookLost || false,
        description: fine.description || "",
      })),
    };

    return {
      success: true,
      data: userFineStatus,
    };
  } catch (error) {
    console.error("❌ Error getting user fine status:", error);
    return {
      success: false,
      error: "Failed to get user fine status",
    };
  }
};

/**
 * Process fine payment (stub implementation for now)
 */
export const processFinePayment = async (params: {
  userId: string;
  fineId: string;
  amount: number;
  paymentMethod?: string;
  paymentReference?: string;
  adminId?: string;
}): Promise<{
  success: boolean;
  data?: { remainingAmount: number; isPaid: boolean };
  error?: string;
}> => {
  const {
    userId,
    fineId,
    amount,
    paymentMethod = "STUB",
    paymentReference,
    adminId,
  } = params;

  try {
    // Get fine details
    const fine = await db
      .select()
      .from(fines)
      .where(eq(fines.id, fineId))
      .limit(1);

    if (!fine.length) {
      return {
        success: false,
        error: "Fine not found",
      };
    }

    const fineData = fine[0];
    const totalAmount = Number(fineData.amount);
    const currentPaid = Number(fineData.paidAmount);
    const newPaidAmount = currentPaid + amount;
    const remainingAmount = Math.max(0, totalAmount - newPaidAmount);
    const isPaid = remainingAmount === 0;

    // Record payment
    await db.insert(finePayments).values({
      fineId,
      userId,
      amount: amount.toString(),
      paymentMethod,
      paymentReference: paymentReference || `STUB_${Date.now()}`,
      adminProcessedBy: adminId,
      notes:
        paymentMethod === "STUB"
          ? "Stub payment - to be replaced with actual payment integration"
          : undefined,
    });

    // Update fine status
    await db
      .update(fines)
      .set({
        paidAmount: newPaidAmount.toString(),
        status: isPaid ? "PAID" : "PARTIAL_PAID",
        paidAt: isPaid ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(fines.id, fineId));

    // Update user's total fines owed
    await db
      .update(users)
      .set({
        totalFinesOwed: sql`GREATEST(0, CAST(${users.totalFinesOwed} AS DECIMAL) - ${amount})`,
      })
      .where(eq(users.id, userId));

    // Create audit log
    await createAuditLog({
      action: "FINE_PAID",
      actorType: adminId ? "ADMIN" : "USER",
      actorId: adminId || userId,
      targetUserId: userId,
      metadata: {
        fineId,
        amount,
        paymentMethod,
        paymentReference,
        remainingAmount,
        isPaid,
      },
    });

    // Check if user restrictions should be updated
    await updateUserRestrictions();

    console.log(
      `💳 Processed payment for fine ${fineId}: $${amount} (Remaining: $${remainingAmount})`
    );

    return {
      success: true,
      data: { remainingAmount, isPaid },
    };
  } catch (error) {
    console.error("❌ Error processing fine payment:", error);
    return {
      success: false,
      error: "Failed to process payment",
    };
  }
};
