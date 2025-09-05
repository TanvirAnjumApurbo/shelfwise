import BookList from "@/components/BookList";
import BookOverview from "@/components/BookOverview";
import { db } from "@/database/drizzle";
import { books, users } from "@/database/schema";
import { auth } from "@/auth";
import { desc } from "drizzle-orm";
import {
  convertDatabaseBookToBook,
  convertDatabaseBooksToBooks,
  DatabaseBook,
} from "@/lib/utils/book";

const Home = async () => {
  const session = await auth();

  const latestBooks = (await db
    .select()
    .from(books)
    .limit(11)
    .orderBy(desc(books.createdAt))) as DatabaseBook[];

  // Convert the first book's rating and other numeric fields
  const featuredBook = latestBooks[0]
    ? convertDatabaseBookToBook(latestBooks[0])
    : null;

  return (
    <>
      {featuredBook && (
        <BookOverview {...featuredBook} userId={session?.user?.id as string} />
      )}

      <BookList
        title="Latest Books"
        books={convertDatabaseBooksToBooks(latestBooks.slice(1))}
        containerClassName="mt-28"
      />
    </>
  );
};

export default Home;
