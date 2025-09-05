import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import BookCover from "@/components/BookCover";

dayjs.extend(relativeTime);

interface BorrowedBookCardProps {
  book: Book;
  borrowRecord: {
    id: string;
    userId: string;
    bookId: string;
    borrowDate: Date | string;
    dueDate: string;
    returnDate: string | null;
    status: "BORROWED" | "RETURNED";
    createdAt: Date | string | null;
  };
}

const BorrowedBookCard = ({ book, borrowRecord }: BorrowedBookCardProps) => {
  const isOverdue =
    dayjs(borrowRecord.dueDate).isBefore(dayjs()) &&
    borrowRecord.status === "BORROWED";
  const daysUntilDue = dayjs(borrowRecord.dueDate).diff(dayjs(), "day");

  return (
    <li className="xs:w-52 w-full">
      <Link
        href={`/books/${book.id}`}
        className="w-full flex flex-col items-center"
      >
        <div className="relative">
          <BookCover
            coverColor={book.coverColor}
            coverImage={book.coverUrl}
            variant="regular"
          />

          {/* Status Badge */}
          <div className="absolute top-2 right-2 z-20">
            {borrowRecord.status === "RETURNED" ? (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Returned
              </span>
            ) : isOverdue ? (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                Overdue
              </span>
            ) : (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                Borrowed
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 w-full max-w-full">
          <p className="book-title line-clamp-1">{book.title}</p>
          <p className="book-genre">{book.genre}</p>

          <div className="mt-2 text-xs text-gray-400 space-y-1">
            <p>
              Borrowed: {dayjs(borrowRecord.borrowDate).format("MMM DD, YYYY")}
            </p>
            {borrowRecord.status === "BORROWED" ? (
              <p className={isOverdue ? "text-red-400" : "text-blue-400"}>
                Due: {dayjs(borrowRecord.dueDate).format("MMM DD, YYYY")}
                {!isOverdue && daysUntilDue >= 0 && (
                  <span className="ml-1">
                    (
                    {daysUntilDue === 0
                      ? "Due today"
                      : `${daysUntilDue} days left`}
                    )
                  </span>
                )}
              </p>
            ) : (
              <p className="text-green-400">
                Returned:{" "}
                {borrowRecord.returnDate
                  ? dayjs(borrowRecord.returnDate).format("MMM DD, YYYY")
                  : "N/A"}
              </p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
};

export default BorrowedBookCard;
