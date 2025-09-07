"use server";

import { db } from "@/database/drizzle";
import {
  notificationPreferences,
  books,
  users,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface NotificationPreferenceParams {
  userId: string;
  bookId: string;
  enable: boolean;
}

// Toggle notification preference for a book
export const toggleNotificationPreference = async (params: NotificationPreferenceParams) => {
  const { userId, bookId, enable } = params;

  try {
    // Check if preference already exists
    const existingPref = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.bookId, bookId)
        )
      )
      .limit(1);

    if (enable) {
      if (existingPref.length > 0) {
        // Update existing preference
        await db
          .update(notificationPreferences)
          .set({
            notifyOnAvailable: true,
            notifiedAt: null,
          })
          .where(
            and(
              eq(notificationPreferences.userId, userId),
              eq(notificationPreferences.bookId, bookId)
            )
          );
      } else {
        // Create new preference
        await db.insert(notificationPreferences).values({
          userId,
          bookId,
          notifyOnAvailable: true,
        });
      }

      revalidatePath(`/books/${bookId}`);

      return {
        success: true,
        message: "You will be notified when this book becomes available",
      };
    } else {
      if (existingPref.length > 0) {
        // Disable notification
        await db
          .update(notificationPreferences)
          .set({
            notifyOnAvailable: false,
          })
          .where(
            and(
              eq(notificationPreferences.userId, userId),
              eq(notificationPreferences.bookId, bookId)
            )
          );
      }

      revalidatePath(`/books/${bookId}`);

      return {
        success: true,
        message: "Notification disabled",
      };
    }
  } catch (error) {
    console.error("Error toggling notification preference:", error);
    return {
      success: false,
      error: "An error occurred while updating notification preference",
    };
  }
};

// Check if user has notification enabled for a book
export const getNotificationPreference = async (userId: string, bookId: string) => {
  try {
    const preference = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.bookId, bookId)
        )
      )
      .limit(1);

    if (preference.length > 0) {
      return {
        success: true,
        data: {
          enabled: preference[0].notifyOnAvailable,
          notifiedAt: preference[0].notifiedAt,
        },
      };
    }

    return {
      success: true,
      data: {
        enabled: false,
        notifiedAt: null,
      },
    };
  } catch (error) {
    console.error("Error fetching notification preference:", error);
    return {
      success: false,
      error: "An error occurred while fetching notification preference",
    };
  }
};

// Get all users waiting for a specific book
export const getUsersWaitingForBook = async (bookId: string) => {
  try {
    const waitingUsers = await db
      .select({
        userId: notificationPreferences.userId,
        email: users.email,
        fullName: users.fullName,
        notifiedAt: notificationPreferences.notifiedAt,
      })
      .from(notificationPreferences)
      .innerJoin(users, eq(notificationPreferences.userId, users.id))
      .where(
        and(
          eq(notificationPreferences.bookId, bookId),
          eq(notificationPreferences.notifyOnAvailable, true)
        )
      );

    return {
      success: true,
      data: waitingUsers,
    };
  } catch (error) {
    console.error("Error fetching waiting users:", error);
    return {
      success: false,
      error: "An error occurred while fetching waiting users",
    };
  }
};

// Get all books a user is waiting for
export const getBooksUserIsWaitingFor = async (userId: string) => {
  try {
    const waitingBooks = await db
      .select({
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          coverUrl: books.coverUrl,
          availableCopies: books.availableCopies,
        },
        preference: {
          notifiedAt: notificationPreferences.notifiedAt,
          createdAt: notificationPreferences.createdAt,
        },
      })
      .from(notificationPreferences)
      .innerJoin(books, eq(notificationPreferences.bookId, books.id))
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notifyOnAvailable, true)
        )
      );

    return {
      success: true,
      data: waitingBooks,
    };
  } catch (error) {
    console.error("Error fetching books user is waiting for:", error);
    return {
      success: false,
      error: "An error occurred while fetching waiting list",
    };
  }
};
