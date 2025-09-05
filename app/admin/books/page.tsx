import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAllBooks } from "@/lib/admin/actions/book";
import BooksTable from "@/components/admin/BooksTable";

const Page = async () => {
  const result = await getAllBooks();
  const books = result.success ? result.data : [];

  // Debug: log the books data
  console.log("Admin books page - Books count:", books.length);
  console.log("Admin books page - Books data:", books);

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">All Books ({books.length})</h2>
        <Button className="bg-primary-admin" asChild>
          <Link href="/admin/books/new" className="text-white">
            + Create a New Book
          </Link>
        </Button>
      </div>

      <div className="mt-7 w-full overflow-hidden">
        <BooksTable books={books} />
      </div>
    </section>
  );
};

export default Page;
