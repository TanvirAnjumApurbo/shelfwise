"use server";

import { db } from "@/database/drizzle";
import { books, borrowRecords, reviews, users } from "@/database/schema";
import { eq, desc, and } from "drizzle-orm";
import dayjs from "dayjs";
import { reviewSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export const borrowBook = async (params: BorrowBookParams) => {
  const { userId, bookId } = params;

  try {
    const book = await db
      .select({ availableCopies: books.availableCopies })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book.length || book[0].availableCopies <= 0) {
      return {
        success: false,
        error: "Book is not available for borrowing",
      };
    }

    const dueDate = dayjs().add(7, "day").toDate().toDateString();

    const record = await db.insert(borrowRecords).values({
      userId,
      bookId,
      dueDate,
      status: "BORROWED",
    });

    await db
      .update(books)
      .set({ availableCopies: book[0].availableCopies - 1 })
      .where(eq(books.id, bookId));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(record)),
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      error: "An error occurred while borrowing the book",
    };
  }
};

export const getUserBorrowedBooks = async (userId: string) => {
  try {
    const borrowedBooks = await db
      .select({
        book: books,
        borrowRecord: borrowRecords,
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(borrowRecords.userId, userId));

    return {
      success: true,
      data: borrowedBooks,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "An error occurred while fetching borrowed books",
    };
  }
};

export const addReview = async (params: {
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
}) => {
  try {
    const validation = reviewSchema.safeParse({
      rating: params.rating,
      comment: params.comment,
    });

    if (!validation.success) {
      return {
        success: false,
        error: "Invalid review data",
      };
    }

    // Check if user has already reviewed this book
    const existingReview = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, params.userId),
          eq(reviews.bookId, params.bookId)
        )
      )
      .limit(1);

    if (existingReview.length > 0) {
      return {
        success: false,
        error: "You have already reviewed this book",
      };
    }

    const review = await db.insert(reviews).values({
      userId: params.userId,
      bookId: params.bookId,
      rating: params.rating,
      comment: params.comment,
    });

    revalidatePath(`/books/${params.bookId}`);

    return {
      success: true,
      data: review,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "An error occurred while adding the review",
    };
  }
};

export const getBookReviews = async (bookId: string) => {
  try {
    const bookReviews = await db
      .select({
        review: reviews,
        user: {
          fullName: users.fullName,
          universityId: users.universityId,
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.bookId, bookId))
      .orderBy(desc(reviews.createdAt));

    return {
      success: true,
      data: bookReviews,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "An error occurred while fetching reviews",
    };
  }
};

export const getUserReviewForBook = async (userId: string, bookId: string) => {
  try {
    const userReview = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.bookId, bookId)))
      .limit(1);

    return {
      success: true,
      data: userReview[0] || null,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "An error occurred while fetching user review",
    };
  }
};
