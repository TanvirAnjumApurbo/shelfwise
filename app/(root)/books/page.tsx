import Link from "next/link";
import BookList from "@/components/BookList";
import BookSearchForm from "@/components/BookSearchForm";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { convertDatabaseBooksToBooks, DatabaseBook } from "@/lib/utils/book";
import { desc, ilike, or } from "drizzle-orm";

interface AllBooksPageProps {
  searchParams?: {
    q?: string | string[];
  };
}

const AllBooksPage = async ({ searchParams }: AllBooksPageProps) => {
  const rawQuery = searchParams?.q;
  const searchQuery = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  const searchTerm = searchQuery?.trim() ?? "";

  const baseQuery = db.select().from(books);

  const booksQuery = searchTerm
    ? baseQuery.where(
        or(
          ilike(books.title, `%${searchTerm}%`),
          ilike(books.author, `%${searchTerm}%`),
          ilike(books.genre, `%${searchTerm}%`)
        )
      )
    : baseQuery;

  const allBooks = (await booksQuery.orderBy(
    desc(books.createdAt)
  )) as DatabaseBook[];
  const formattedBooks = convertDatabaseBooksToBooks(allBooks);
  const noResults = searchTerm && formattedBooks.length === 0;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div>
          <h1 className="text-4xl font-bold text-white">All Books</h1>
          <p className="text-white/70 text-lg">
            Discover our complete collection of books
          </p>
        </div>

        <BookSearchForm initialQuery={searchTerm} />

        {searchTerm && !noResults && (
          <p className="text-sm text-white/70">
            Showing results for{" "}
            <span className="font-semibold">“{searchTerm}”</span>
          </p>
        )}
      </div>

      {noResults ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-white">
          <h2 className="text-2xl font-semibold">No books found</h2>
          <p className="mt-2 text-white/70">
            Try a different search term or{" "}
            <Link href="/books" className="underline">
              view all books
            </Link>
            .
          </p>
        </div>
      ) : (
        <BookList title="" books={formattedBooks} containerClassName="mt-8" />
      )}
    </div>
  );
};

export default AllBooksPage;
