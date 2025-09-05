import BookList from "@/components/BookList";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { desc } from "drizzle-orm";
import { convertDatabaseBooksToBooks, DatabaseBook } from "@/lib/utils/book";

const AllBooksPage = async () => {
  const allBooks = (await db
    .select()
    .from(books)
    .orderBy(desc(books.createdAt))) as DatabaseBook[];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">All Books</h1>
        <p className="text-white/70 text-lg">
          Discover our complete collection of books
        </p>
      </div>

      <BookList
        title=""
        books={convertDatabaseBooksToBooks(allBooks)}
        containerClassName="mt-8"
      />
    </div>
  );
};

export default AllBooksPage;
