import React from "react";
import { db } from "@/database/drizzle";
import { books } from "@/database/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BookOverview from "@/components/BookOverview";
import BookVideo from "@/components/BookVideo";
import { convertDatabaseBookToBook, DatabaseBook } from "@/lib/utils/book";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const session = await auth();

  // Fetch data based on id
  const [bookDetails] = (await db
    .select()
    .from(books)
    .where(eq(books.id, id))
    .limit(1)) as [DatabaseBook];

  if (!bookDetails) redirect("/404");

  // Convert rating from string to number (since it's stored as numeric in DB)
  const bookData = convertDatabaseBookToBook(bookDetails);

  // Check if there's any video content (either ImageKit or YouTube)
  const hasVideo =
    (bookData.videoUrl && bookData.videoUrl.trim()) ||
    (bookData.youtubeUrl && bookData.youtubeUrl.trim());

  return (
    <>
      <BookOverview {...bookData} userId={session?.user?.id as string} />

      <div className="book-details">
        <div className="flex-[1.5]">
          {/* Book Details Section */}
          <section className="flex flex-col gap-7 mb-10">
            <h3>Book Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg text-light-100">
              {bookData.publisher && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">Publisher:</span>
                  <span>{bookData.publisher}</span>
                </div>
              )}

              {bookData.publicationDate && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">
                    Publication Date:
                  </span>
                  <span>{bookData.publicationDate.toLocaleDateString()}</span>
                </div>
              )}

              {bookData.edition && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">Edition:</span>
                  <span>{bookData.edition}</span>
                </div>
              )}

              {bookData.language && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">Language:</span>
                  <span>{bookData.language}</span>
                </div>
              )}

              {bookData.printLength && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">
                    Print Length:
                  </span>
                  <span>{bookData.printLength} pages</span>
                </div>
              )}

              {bookData.bookType && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">Type:</span>
                  <span className="capitalize">{bookData.bookType}</span>
                </div>
              )}

              {bookData.isbn && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">ISBN:</span>
                  <span>{bookData.isbn}</span>
                </div>
              )}

              {bookData.itemWeight && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">
                    Item Weight:
                  </span>
                  <span>{bookData.itemWeight} pounds</span>
                </div>
              )}

              {bookData.dimensions && (
                <div className="flex flex-col gap-1">
                  <span className="text-light-400 font-medium">
                    Dimensions:
                  </span>
                  <span>{bookData.dimensions} inches</span>
                </div>
              )}
            </div>
          </section>

          {/* About the Author Section */}
          {bookData.aboutAuthor && (
            <section className="flex flex-col gap-7 mb-10">
              <h3>About the Author</h3>

              <div className="space-y-5 text-xl text-light-100 text-justify">
                {bookData.aboutAuthor.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </section>
          )}

          {hasVideo && (
            <section className="flex flex-col gap-7">
              <h3>Video</h3>
              <BookVideo
                videoUrl={bookData.videoUrl}
                youtubeUrl={bookData.youtubeUrl}
              />
            </section>
          )}

          <section className={`${hasVideo ? "mt-10" : ""} flex flex-col gap-7`}>
            <h3>Summary</h3>

            <div className="space-y-5 text-xl text-light-100 text-justify">
              {bookData.summary.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </section>
        </div>

        {/*  SIMILAR*/}
      </div>
    </>
  );
};
export default Page;
