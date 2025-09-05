"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { bookSchema, BOOK_GENRES } from "@/lib/validations";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import ColorPicker from "@/components/admin/ColorPicker";
import { createBook } from "@/lib/admin/actions/book";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props extends Partial<Book> {
  type?: "create" | "update";
}

// Create a form type that accepts both string and number for form fields
type BookFormInput = {
  title: string;
  description: string;
  author: string;
  genre: string;
  rating: string | number;
  totalCopies: string | number;
  coverUrl: string;
  coverColor: string;
  summary: string;
  videoUrl?: string;
  youtubeUrl?: string;
  // New book details
  publisher?: string;
  publicationDate?: string;
  edition?: string;
  language?: string;
  printLength?: string | number;
  bookType?: string;
  isbn?: string;
  itemWeight?: string | number;
  dimensions?: string;
  aboutAuthor?: string;
};

const BookForm = ({ type, ...book }: Props) => {
  const router = useRouter();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const form = useForm<BookFormInput>({
    resolver: zodResolver(bookSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      author: "",
      genre: "",
      rating: 1,
      totalCopies: 1,
      coverUrl: "",
      coverColor: "",
      videoUrl: "",
      youtubeUrl: "",
      summary: "",
      // New book details
      publisher: "",
      publicationDate: "",
      edition: "",
      language: "",
      printLength: "",
      bookType: "",
      isbn: "",
      itemWeight: "",
      dimensions: "",
      aboutAuthor: "",
    },
  });

  const onSubmit = async (values: BookFormInput) => {
    // Convert to the expected schema type
    const bookData: z.infer<typeof bookSchema> = {
      ...values,
      genre: values.genre as (typeof BOOK_GENRES)[number],
      rating: Number(values.rating),
      totalCopies: Number(values.totalCopies),
      printLength: values.printLength ? Number(values.printLength) : undefined,
      itemWeight: values.itemWeight ? Number(values.itemWeight) : undefined,
      // Convert empty strings to undefined for optional fields
      publisher:
        values.publisher && values.publisher.trim()
          ? values.publisher
          : undefined,
      publicationDate:
        values.publicationDate && values.publicationDate.trim()
          ? values.publicationDate
          : undefined,
      edition:
        values.edition && values.edition.trim() ? values.edition : undefined,
      language:
        values.language && values.language.trim() ? values.language : undefined,
      bookType:
        values.bookType && values.bookType !== ""
          ? (values.bookType as "paperback" | "hardcover")
          : undefined,
      isbn: values.isbn && values.isbn.trim() ? values.isbn : undefined,
      dimensions:
        values.dimensions && values.dimensions.trim()
          ? values.dimensions
          : undefined,
      aboutAuthor:
        values.aboutAuthor && values.aboutAuthor.trim()
          ? values.aboutAuthor
          : undefined,
    };

    const result = await createBook(bookData);

    if (result.success) {
      setShowSuccessDialog(true);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    form.reset();
    router.push("/admin/books");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name={"title"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Title
              </FormLabel>
              <FormControl>
                <Input
                  required
                  placeholder="Book title"
                  maxLength={150}
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <div className="flex justify-between items-center">
                <FormMessage />
                <span className="text-sm text-light-500">
                  {field.value?.length || 0}/150 characters
                </span>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"author"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Author
              </FormLabel>
              <FormControl>
                <Input
                  required
                  placeholder="Book author"
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"genre"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Genre
              </FormLabel>
              <FormControl>
                <select required {...field} className="book-form_select">
                  <option value="">Select book genre</option>
                  {BOOK_GENRES.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"rating"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Rating
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0.1}
                  max={5}
                  step={0.1}
                  placeholder="Book rating"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"totalCopies"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Total Copies
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Total copies"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"coverUrl"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Image
              </FormLabel>
              <FormControl>
                <FileUpload
                  type="image"
                  accept="image/*"
                  placeholder="Upload a book cover"
                  folder="books/covers"
                  variant="light"
                  onFileChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"coverColor"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Primary Color
              </FormLabel>
              <FormControl>
                <ColorPicker
                  onPickerChange={field.onChange}
                  value={field.value}
                  coverImageUrl={form.watch("coverUrl")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"description"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Book description"
                  maxLength={2000}
                  {...field}
                  rows={10}
                  className="book-form_input"
                />
              </FormControl>

              <div className="flex justify-between items-center">
                <FormMessage />
                <span className="text-sm text-light-500">
                  {field.value?.length || 0}/2000 characters
                </span>
              </div>
            </FormItem>
          )}
        />

        {/* Book Details Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-dark-500 border-b pb-2">
            Book Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name={"publisher"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Publisher
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Book publisher"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"publicationDate"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Publication Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder="Publication date"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"edition"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Edition
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Book edition (e.g., 1st Edition)"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"language"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Language
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Book language (e.g., English)"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"printLength"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Print Length (pages)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Number of pages"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"bookType"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Book Type
                  </FormLabel>
                  <FormControl>
                    <select {...field} className="book-form_select">
                      <option value="">Select book type</option>
                      <option value="paperback">Paperback</option>
                      <option value="hardcover">Hardcover</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"isbn"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    ISBN
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Book ISBN"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"itemWeight"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Item Weight (pounds)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      placeholder="Weight in pounds"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"dimensions"}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-base font-normal text-dark-500">
                    Dimensions (inches)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 8.5 x 11 x 1.2"
                      {...field}
                      className="book-form_input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name={"aboutAuthor"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                About the Author
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Information about the author"
                  maxLength={1000}
                  {...field}
                  rows={5}
                  className="book-form_input"
                />
              </FormControl>
              <div className="flex justify-between items-center">
                <FormMessage />
                <span className="text-sm text-light-500">
                  {field.value?.length || 0}/1000 characters
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"videoUrl"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Trailer (ImageKit Video) - Optional
              </FormLabel>
              <FormControl>
                <FileUpload
                  type="video"
                  accept="video/*"
                  placeholder="Upload a book trailer (optional)"
                  folder="books/videos"
                  variant="light"
                  onFileChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"youtubeUrl"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                YouTube Video URL - Optional
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://www.youtube.com/watch?v=... (optional)"
                  {...field}
                  className="book-form_input"
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-gray-500">
                Enter a YouTube video URL as an alternative to uploading a video
                file. If both are provided, YouTube URL will take priority.
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"summary"}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-base font-normal text-dark-500">
                Book Summary
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Book summary"
                  maxLength={1500}
                  {...field}
                  rows={5}
                  className="book-form_input"
                />
              </FormControl>

              <div className="flex justify-between items-center">
                <FormMessage />
                <span className="text-sm text-light-500">
                  {field.value?.length || 0}/1500 characters
                </span>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="book-form_btn text-white">
          Add Book to Library
        </Button>
      </form>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Success!</AlertDialogTitle>
            <AlertDialogDescription>
              Book has been added to the library successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleSuccessDialogClose}
              className="bg-green-600 hover:bg-green-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
};
export default BookForm;
