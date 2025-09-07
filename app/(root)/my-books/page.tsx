import { auth } from "@/auth";
import { getUserBorrowedBooks } from "@/lib/actions/book";
import BorrowedBookCard from "@/components/BorrowedBookCard";
import { redirect } from "next/navigation";
import { convertDatabaseBookToBook } from "@/lib/utils/book";

const MyBooksPage = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const result = await getUserBorrowedBooks(session.user.id);

  if (!result.success) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-white mb-4">
          My Borrowed Books
        </h1>
        <p className="text-red-400">{result.error}</p>
      </div>
    );
  }

  const borrowedBooks = result.data || [];

  // Convert database books to proper Book type
  const convertedBorrowedBooks = borrowedBooks.map((item) => ({
    ...item,
    book: convertDatabaseBookToBook(item.book),
  }));

  const activeBorrows = convertedBorrowedBooks.filter(
    (item) => item.borrowRecord.status === "BORROWED"
  );
  const returnedBooks = convertedBorrowedBooks.filter(
    (item) => item.borrowRecord.status === "RETURNED"
  );

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          My Borrowed Books
        </h1>
        <p className="text-white/70 text-lg">
          Track your borrowed and returned books
        </p>
      </div>

      {convertedBorrowedBooks.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto mb-6 w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            No Books Borrowed
          </h2>
          <p className="text-white/70 mb-6">
            You haven't borrowed any books yet. Explore our collection and start
            reading!
          </p>
          <a
            href="/books"
            className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Browse All Books
          </a>
        </div>
      ) : (
        <>
          {/* Currently Borrowed Books */}
          {activeBorrows.length > 0 && (
            <section>
              <h2 className="font-bebas-neue text-4xl text-light-100 mb-6">
                Currently Borrowed ({activeBorrows.length})
              </h2>
              <ul className="book-list">
                {activeBorrows.map((item) => (
                  <BorrowedBookCard
                    key={item.borrowRecord.id}
                    book={item.book}
                    borrowRecord={item.borrowRecord}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Returned Books */}
          {returnedBooks.length > 0 && (
            <section>
              <h2 className="font-bebas-neue text-4xl text-light-100 mb-6">
                Reading History ({returnedBooks.length})
              </h2>
              <ul className="book-list">
                {returnedBooks.map((item) => (
                  <BorrowedBookCard
                    key={item.borrowRecord.id}
                    book={item.book}
                    borrowRecord={item.borrowRecord}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default MyBooksPage;
