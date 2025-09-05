import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import BookForm from "@/components/admin/forms/BookForm";
import { getBookById } from "@/lib/admin/actions/book";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}

const Page = async ({ params }: PageProps) => {
  const result = await getBookById(params.id);

  if (!result.success) {
    notFound();
  }

  const book = result.data;

  return (
    <>
      <Button asChild className="back-btn">
        <Link href="/admin/books">Go Back</Link>
      </Button>

      <section className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Edit Book</h1>
        <BookForm type="update" {...book} />
      </section>
    </>
  );
};

export default Page;
