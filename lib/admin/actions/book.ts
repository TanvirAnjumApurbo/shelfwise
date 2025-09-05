"use server";

import { books } from "@/database/schema";
import { db } from "@/database/drizzle";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const createBook = async (params: BookParams) => {
  try {
    const newBook = await db
      .insert(books)
      .values({
        title: params.title,
        author: params.author,
        genre: params.genre,
        rating: params.rating.toString(),
        coverUrl: params.coverUrl,
        coverColor: params.coverColor,
        description: params.description,
        totalCopies: params.totalCopies,
        availableCopies: params.totalCopies,
        videoUrl: params.videoUrl || null,
        youtubeUrl: params.youtubeUrl || null,
        summary: params.summary,
        publisher: params.publisher || null,
        publicationDate: params.publicationDate || null,
        edition: params.edition || null,
        language: params.language || null,
        printLength: params.printLength || null,
        bookType: params.bookType || null,
        isbn: params.isbn || null,
        itemWeight: params.itemWeight?.toString() || null,
        dimensions: params.dimensions || null,
        aboutAuthor: params.aboutAuthor || null,
      })
      .returning();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newBook[0])),
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "An error occurred while creating the book",
    };
  }
};

export const getAllBooks = async () => {
  try {
    const allBooks = await db
      .select()
      .from(books)
      .orderBy(desc(books.createdAt));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allBooks)),
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "An error occurred while fetching books",
    };
  }
};

export const updateBook = async (
  bookId: string,
  params: Partial<BookParams>
) => {
  try {
    const updateData: any = {};

    if (params.title) updateData.title = params.title;
    if (params.author) updateData.author = params.author;
    if (params.genre) updateData.genre = params.genre;
    if (params.rating) updateData.rating = params.rating.toString();
    if (params.coverUrl) updateData.coverUrl = params.coverUrl;
    if (params.coverColor) updateData.coverColor = params.coverColor;
    if (params.description) updateData.description = params.description;
    if (params.totalCopies) {
      updateData.totalCopies = params.totalCopies;
      updateData.availableCopies = params.totalCopies;
    }
    if (params.videoUrl !== undefined)
      updateData.videoUrl = params.videoUrl || null;
    if (params.youtubeUrl !== undefined)
      updateData.youtubeUrl = params.youtubeUrl || null;
    if (params.summary) updateData.summary = params.summary;
    if (params.publisher !== undefined)
      updateData.publisher = params.publisher || null;
    if (params.publicationDate !== undefined)
      updateData.publicationDate = params.publicationDate || null;
    if (params.edition !== undefined)
      updateData.edition = params.edition || null;
    if (params.language !== undefined)
      updateData.language = params.language || null;
    if (params.printLength !== undefined)
      updateData.printLength = params.printLength || null;
    if (params.bookType !== undefined)
      updateData.bookType = params.bookType || null;
    if (params.isbn !== undefined) updateData.isbn = params.isbn || null;
    if (params.itemWeight !== undefined)
      updateData.itemWeight = params.itemWeight?.toString() || null;
    if (params.dimensions !== undefined)
      updateData.dimensions = params.dimensions || null;
    if (params.aboutAuthor !== undefined)
      updateData.aboutAuthor = params.aboutAuthor || null;

    const updatedBook = await db
      .update(books)
      .set(updateData)
      .where(eq(books.id, bookId))
      .returning();

    if (updatedBook.length === 0) {
      return {
        success: false,
        message: "Book not found",
      };
    }

    revalidatePath("/admin/books");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedBook[0])),
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "An error occurred while updating the book",
    };
  }
};

export const deleteBook = async (bookId: string) => {
  try {
    const deletedBook = await db
      .delete(books)
      .where(eq(books.id, bookId))
      .returning();

    if (deletedBook.length === 0) {
      return {
        success: false,
        message: "Book not found",
      };
    }

    revalidatePath("/admin/books");

    return {
      success: true,
      message: "Book deleted successfully",
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "An error occurred while deleting the book",
    };
  }
};

export const getBookById = async (bookId: string) => {
  try {
    const book = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (book.length === 0) {
      return {
        success: false,
        message: "Book not found",
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(book[0])),
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "An error occurred while fetching the book",
    };
  }
};
