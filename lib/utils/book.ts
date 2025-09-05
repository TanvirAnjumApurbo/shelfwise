// Type for raw book data from database (before conversion)
export interface DatabaseBook {
  id: string;
  title: string;
  author: string;
  genre: string;
  rating: string; // numeric type returns as string
  totalCopies: number;
  availableCopies: number;
  description: string;
  coverColor: string;
  coverUrl: string;
  videoUrl: string | null;
  youtubeUrl: string | null;
  summary: string;
  // New book details
  publisher: string | null;
  publicationDate: string | null; // date type returns as string
  edition: string | null;
  language: string | null;
  printLength: number | null;
  bookType: string | null;
  isbn: string | null;
  itemWeight: string | null; // numeric type returns as string
  dimensions: string | null;
  aboutAuthor: string | null;
  createdAt: Date | null;
}

/**
 * Converts a raw book record from the database to the proper Book type
 * Handles type conversion for numeric and date fields
 */
export function convertDatabaseBookToBook(dbBook: DatabaseBook): Book {
  return {
    ...dbBook,
    rating: Number(dbBook.rating),
    itemWeight: dbBook.itemWeight ? Number(dbBook.itemWeight) : null,
    publicationDate: dbBook.publicationDate
      ? new Date(dbBook.publicationDate)
      : null,
  };
}

/**
 * Converts an array of raw book records from the database to proper Book types
 */
export function convertDatabaseBooksToBooks(dbBooks: DatabaseBook[]): Book[] {
  return dbBooks.map(convertDatabaseBookToBook);
}
