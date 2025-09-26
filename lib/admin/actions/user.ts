"use server";

import { db } from "@/database/drizzle";
import {
  users,
  auditLogs,
  borrowRequests,
  books,
  returnRequests,
  borrowRecords,
  fines,
} from "@/database/schema";
import { eq, desc, sql, ilike, or, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";

interface RestrictUserParams {
  userId: string;
  adminId: string;
  restrictionReason: string;
}

interface UnrestrictUserParams {
  userId: string;
  adminId: string;
}

interface GetAllUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL";
  role?: "USER" | "ADMIN" | "ALL";
  isRestricted?: boolean | "ALL";
}

// Get all users with pagination and filters
export const getAllUsers = async (params: GetAllUsersParams = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "ALL",
      role = "ALL",
      isRestricted = "ALL",
    } = params;

    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = [];

    // Search condition
    if (search.trim()) {
      whereConditions.push(
        or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          sql`CAST(${users.universityId} AS TEXT) ILIKE ${`%${search}%`}`
        )
      );
    }

    // Status filter
    if (status !== "ALL") {
      whereConditions.push(eq(users.status, status));
    }

    // Role filter
    if (role !== "ALL") {
      whereConditions.push(eq(users.role, role));
    }

    // Restriction filter
    if (isRestricted !== "ALL") {
      whereConditions.push(eq(users.isRestricted, isRestricted));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get users with pagination
    const usersData = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
        status: users.status,
        role: users.role,
        totalFinesOwed: users.totalFinesOwed,
        isRestricted: users.isRestricted,
        restrictionReason: users.restrictionReason,
        restrictedAt: users.restrictedAt,
        lastActivityDate: users.lastActivityDate,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        users: JSON.parse(JSON.stringify(usersData)),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching all users:", error);
    return {
      success: false,
      error: "An error occurred while fetching users",
    };
  }
};

// Get user by ID with detailed information
export const getUserById = async (userId: string) => {
  try {
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(userData[0])),
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return {
      success: false,
      error: "An error occurred while fetching the user",
    };
  }
};

// Restrict a user
export const restrictUser = async (params: RestrictUserParams) => {
  const { userId, adminId, restrictionReason } = params;

  try {
    // Check if user exists and is not already restricted
    const existingUser = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        isRestricted: users.isRestricted,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    if (existingUser[0].isRestricted) {
      return {
        success: false,
        error: "User is already restricted",
      };
    }

    // Restrict the user
    await db
      .update(users)
      .set({
        isRestricted: true,
        restrictionReason,
        restrictedAt: new Date(),
        restrictedBy: adminId,
      })
      .where(eq(users.id, userId));

    // Create audit log
    await createAuditLog({
      action: "USER_RESTRICTED",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: userId,
      metadata: {
        restrictionReason,
        userEmail: existingUser[0].email,
        userName: existingUser[0].fullName,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return {
      success: true,
      message: "User has been restricted successfully",
    };
  } catch (error) {
    console.error("Error restricting user:", error);
    return {
      success: false,
      error: "An error occurred while restricting the user",
    };
  }
};

// Unrestrict a user
export const unrestrictUser = async (params: UnrestrictUserParams) => {
  const { userId, adminId } = params;

  try {
    // Check if user exists and is restricted
    const existingUser = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        isRestricted: users.isRestricted,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    if (!existingUser[0].isRestricted) {
      return {
        success: false,
        error: "User is not currently restricted",
      };
    }

    // Unrestrict the user
    await db
      .update(users)
      .set({
        isRestricted: false,
        restrictionReason: null,
        restrictedAt: null,
        restrictedBy: null,
      })
      .where(eq(users.id, userId));

    // Create audit log
    await createAuditLog({
      action: "USER_UNRESTRICTED",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: userId,
      metadata: {
        userEmail: existingUser[0].email,
        userName: existingUser[0].fullName,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return {
      success: true,
      message: "User has been unrestricted successfully",
    };
  } catch (error) {
    console.error("Error unrestricting user:", error);
    return {
      success: false,
      error: "An error occurred while unrestricting the user",
    };
  }
};

// Get user statistics
export const getUserStatistics = async () => {
  try {
    const stats = await db
      .select({
        totalUsers: sql<number>`count(*)`,
        pendingUsers: sql<number>`count(*) filter (where status = 'PENDING')`,
        approvedUsers: sql<number>`count(*) filter (where status = 'APPROVED')`,
        rejectedUsers: sql<number>`count(*) filter (where status = 'REJECTED')`,
        restrictedUsers: sql<number>`count(*) filter (where is_restricted = true)`,
        adminUsers: sql<number>`count(*) filter (where role = 'ADMIN')`,
        regularUsers: sql<number>`count(*) filter (where role = 'USER')`,
        usersWithFines: sql<number>`count(*) filter (where total_fines_owed::numeric > 0)`,
      })
      .from(users);

    return {
      success: true,
      data: stats[0],
    };
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return {
      success: false,
      error: "An error occurred while fetching user statistics",
    };
  }
};

// Get detailed user information including borrow history, fines, etc.
export const getUserDetails = async (userId: string) => {
  try {
    // Get basic user information
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const user = userData[0];

    // Get borrow statistics
    const borrowStats = await db
      .select({
        totalBorrowRequests: count(),
        pendingRequests: sql<number>`count(*) filter (where ${borrowRequests.status} = 'PENDING')`,
        approvedRequests: sql<number>`count(*) filter (where ${borrowRequests.status} = 'APPROVED')`,
        rejectedRequests: sql<number>`count(*) filter (where ${borrowRequests.status} = 'REJECTED')`,
      })
      .from(borrowRequests)
      .where(eq(borrowRequests.userId, userId));

    // Get recent borrow requests with book details
    const recentBorrowRequests = await db
      .select({
        id: borrowRequests.id,
        status: borrowRequests.status,
        requestedAt: borrowRequests.requestedAt,
        adminNotes: borrowRequests.adminNotes,
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          coverUrl: books.coverUrl,
          coverColor: books.coverColor,
        },
      })
      .from(borrowRequests)
      .innerJoin(books, eq(borrowRequests.bookId, books.id))
      .where(eq(borrowRequests.userId, userId))
      .orderBy(desc(borrowRequests.requestedAt))
      .limit(10);

    // Get return request statistics
    const returnStats = await db
      .select({
        totalReturnRequests: count(),
        pendingReturns: sql<number>`count(*) filter (where ${returnRequests.status} = 'PENDING')`,
        approvedReturns: sql<number>`count(*) filter (where ${returnRequests.status} = 'APPROVED')`,
        rejectedReturns: sql<number>`count(*) filter (where ${returnRequests.status} = 'REJECTED')`,
      })
      .from(returnRequests)
      .where(eq(returnRequests.userId, userId));

    // Get recent return requests with book details
    const recentReturnRequests = await db
      .select({
        id: returnRequests.id,
        status: returnRequests.status,
        requestedAt: returnRequests.requestedAt,
        adminNotes: returnRequests.adminNotes,
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          coverUrl: books.coverUrl,
          coverColor: books.coverColor,
        },
      })
      .from(returnRequests)
      .innerJoin(
        borrowRecords,
        eq(returnRequests.borrowRecordId, borrowRecords.id)
      )
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(returnRequests.userId, userId))
      .orderBy(desc(returnRequests.requestedAt))
      .limit(10);

    // Get current borrowed books (approved borrow requests without returns)
    const currentBorrowedBooks = await db
      .select({
        id: borrowRecords.id,
        borrowDate: borrowRecords.borrowDate,
        dueDate: borrowRecords.dueDate,
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          coverUrl: books.coverUrl,
          coverColor: books.coverColor,
        },
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(
        and(
          eq(borrowRecords.userId, userId),
          eq(borrowRecords.status, "BORROWED")
        )
      )
      .orderBy(desc(borrowRecords.borrowDate));

    // Get fine information
    const userFines = await db
      .select({
        id: fines.id,
        amount: fines.amount,
        description: fines.description,
        status: fines.status,
        createdAt: fines.createdAt,
        paidAt: fines.paidAt,
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
        },
      })
      .from(fines)
      .leftJoin(borrowRecords, eq(fines.borrowRecordId, borrowRecords.id))
      .leftJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(fines.userId, userId))
      .orderBy(desc(fines.createdAt))
      .limit(20);

    // Get recent audit logs for this user
    const recentAuditLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        actorType: auditLogs.actorType,
        actorId: auditLogs.actorId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.targetUserId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    return {
      success: true,
      data: {
        user: JSON.parse(JSON.stringify(user)),
        borrowStats: borrowStats[0] || {
          totalBorrowRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
        },
        returnStats: returnStats[0] || {
          totalReturnRequests: 0,
          pendingReturns: 0,
          approvedReturns: 0,
          rejectedReturns: 0,
        },
        recentBorrowRequests: JSON.parse(JSON.stringify(recentBorrowRequests)),
        recentReturnRequests: JSON.parse(JSON.stringify(recentReturnRequests)),
        currentBorrowedBooks: JSON.parse(JSON.stringify(currentBorrowedBooks)),
        fines: JSON.parse(JSON.stringify(userFines)),
        recentAuditLogs: JSON.parse(JSON.stringify(recentAuditLogs)),
      },
    };
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {
      success: false,
      error: "An error occurred while fetching user details",
    };
  }
};
