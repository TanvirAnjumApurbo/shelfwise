"use server";

import { db } from "@/database/drizzle";
import {
  users,
  borrowRequests,
  returnRequests,
  fines,
} from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserFineStatus } from "@/lib/services/fine-service";

/**
 * Check if user can make a new borrow request
 * Rules:
 * 1. User must not be restricted
 * 2. User must have no pending fines
 * 3. User must have approved status
 */
export const canUserBorrowBooks = async (
  userId: string
): Promise<{
  success: boolean;
  canBorrow: boolean;
  reason?: string;
  data?: {
    isRestricted: boolean;
    totalFinesOwed: number;
    userStatus: string;
  };
}> => {
  try {
    // Get user details
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return {
        success: true,
        canBorrow: false,
        reason: "User not found",
      };
    }

    const userData = user[0];

    // Check user status
    if (userData.status !== "APPROVED") {
      return {
        success: true,
        canBorrow: false,
        reason: "User account is not approved",
        data: {
          isRestricted: userData.isRestricted || false,
          totalFinesOwed: Number(userData.totalFinesOwed) || 0,
          userStatus: userData.status || "UNKNOWN",
        },
      };
    }

    // Check if user is restricted
    if (userData.isRestricted) {
      return {
        success: true,
        canBorrow: false,
        reason:
          userData.restrictionReason ||
          "User account is restricted due to outstanding fines",
        data: {
          isRestricted: true,
          totalFinesOwed: Number(userData.totalFinesOwed) || 0,
          userStatus: userData.status || "APPROVED",
        },
      };
    }

    // Check for pending fines
    const totalFines = Number(userData.totalFinesOwed) || 0;
    if (totalFines > 0) {
      return {
        success: true,
        canBorrow: false,
        reason: `You have outstanding fines of $${totalFines.toFixed(
          2
        )}. Please pay your fines before borrowing books.`,
        data: {
          isRestricted: false,
          totalFinesOwed: totalFines,
          userStatus: userData.status || "APPROVED",
        },
      };
    }

    // User can borrow
    return {
      success: true,
      canBorrow: true,
      data: {
        isRestricted: false,
        totalFinesOwed: 0,
        userStatus: userData.status || "APPROVED",
      },
    };
  } catch (error) {
    console.error("❌ Error checking user borrow eligibility:", error);
    return {
      success: false,
      canBorrow: false,
      reason: "Failed to check borrowing eligibility",
    };
  }
};

/**
 * Check if user can send return request for a specific book
 * Rules:
 * 1. User can return books even if they have fines (to encourage returns)
 * 2. But they cannot send return requests for books that have existing fines until paid
 */
export const canUserReturnBook = async (
  userId: string,
  borrowRecordId: string
): Promise<{
  success: boolean;
  canReturn: boolean;
  reason?: string;
  data?: {
    hasPendingFines: boolean;
    fineAmount?: number;
  };
}> => {
  try {
    // Check if there are pending fines for this specific borrow record
    const existingFines = await db
      .select()
      .from(fines)
      .where(
        and(
          eq(fines.borrowRecordId, borrowRecordId),
          eq(fines.status, "PENDING")
        )
      );

    if (existingFines.length > 0) {
      const totalFineAmount = existingFines.reduce(
        (sum, fine) => sum + Number(fine.amount),
        0
      );

      return {
        success: true,
        canReturn: false,
        reason: `This book has pending fines of $${totalFineAmount.toFixed(
          2
        )}. Please pay the fine before returning the book.`,
        data: {
          hasPendingFines: true,
          fineAmount: totalFineAmount,
        },
      };
    }

    // User can return this book
    return {
      success: true,
      canReturn: true,
      data: {
        hasPendingFines: false,
      },
    };
  } catch (error) {
    console.error("❌ Error checking user return eligibility:", error);
    return {
      success: false,
      canReturn: false,
      reason: "Failed to check return eligibility",
    };
  }
};

/**
 * Get user's borrowing restrictions summary
 */
export const getUserBorrowingStatus = async (
  userId: string
): Promise<{
  success: boolean;
  data?: {
    canBorrow: boolean;
    canReturnBooks: boolean;
    isRestricted: boolean;
    totalFinesOwed: number;
    restrictionReason: string | null;
    activeFinesCount: number;
    summary: string;
  };
  error?: string;
}> => {
  try {
    const fineStatusResult = await getUserFineStatus(userId);

    if (!fineStatusResult.success || !fineStatusResult.data) {
      return {
        success: false,
        error: fineStatusResult.error || "Failed to get fine status",
      };
    }

    const fineStatus = fineStatusResult.data;
    const borrowEligibility = await canUserBorrowBooks(userId);

    let summary = "";
    if (fineStatus.totalFinesOwed === 0 && !fineStatus.isRestricted) {
      summary = "All Good ✅ - You can borrow books freely";
    } else if (fineStatus.isRestricted) {
      summary = `Account Restricted ❌ - ${fineStatus.restrictions.reason}`;
    } else if (fineStatus.totalFinesOwed > 0) {
      summary = `Outstanding Fines ⚠️ - Pay $${fineStatus.totalFinesOwed.toFixed(
        2
      )} to continue borrowing`;
    }

    return {
      success: true,
      data: {
        canBorrow: borrowEligibility.canBorrow,
        canReturnBooks: fineStatus.canReturnBooks,
        isRestricted: fineStatus.isRestricted,
        totalFinesOwed: fineStatus.totalFinesOwed,
        restrictionReason: fineStatus.restrictions.reason,
        activeFinesCount: fineStatus.activeFines.length,
        summary,
      },
    };
  } catch (error) {
    console.error("❌ Error getting user borrowing status:", error);
    return {
      success: false,
      error: "Failed to get borrowing status",
    };
  }
};
