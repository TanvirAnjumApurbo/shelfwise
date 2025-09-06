import { z } from "zod";

export const BOOK_GENRES = [
  "Fiction",
  "Non-Fiction",
  "Mystery & Thriller",
  "Romance",
  "Science Fiction",
  "Fantasy",
  "Horror",
  "Biography & Autobiography",
  "History",
  "Science & Technology",
  "Business & Economics",
  "Self-Help",
  "Health & Fitness",
  "Philosophy",
  "Religion & Spirituality",
  "Psychology",
  "Education",
  "Textbook",
  "Reference",
  "Art & Design",
  "Music",
  "Travel",
  "Cooking",
  "Sports & Recreation",
  "Children's Books",
  "Young Adult",
  "Poetry",
  "Drama & Plays",
  "Essays",
  "Short Stories",
  "Comics & Graphic Novels",
  "True Crime",
  "Politics & Social Sciences",
  "Law",
  "Medical",
  "Engineering",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Literature & Literary Criticism",
  "Classics",
  "Humor & Entertainment",
  "Adventure",
  "Western",
  "Historical Fiction",
  "Contemporary Fiction",
  "Literary Fiction",
  "Crime & Detective",
  "Paranormal",
  "Urban Fantasy",
  "Epic Fantasy",
  "Space Opera",
  "Dystopian",
  "Memoir",
  "Cultural Studies",
  "Sociology",
  "Anthropology",
  "Other",
] as const;

export type BookGenre = (typeof BOOK_GENRES)[number];

export const getBookGenres = () => BOOK_GENRES;

export const signUpSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  universityId: z.coerce.number(),
  universityCard: z.string().nonempty("University Card is required"),
  password: z.string().min(8),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const bookSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(2000),
  author: z.string().trim().min(2).max(100),
  genre: z.enum(BOOK_GENRES),
  rating: z.coerce.number().min(0.1).max(5).multipleOf(0.1),
  totalCopies: z.coerce.number().int().positive().lte(10000),
  coverUrl: z.string().nonempty(),
  coverColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-F]{6}$/i),
  videoUrl: z.string().optional(),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  summary: z.string().trim().min(10).max(1500),
  // New book details
  publisher: z.string().trim().optional(),
  publicationDate: z.string().optional(),
  edition: z.string().trim().optional(),
  language: z.string().trim().optional(),
  printLength: z.coerce.number().int().positive().optional(),
  bookType: z.enum(["paperback", "hardcover"]).optional(),
  isbn: z.string().trim().optional(),
  itemWeight: z.coerce.number().positive().optional(),
  dimensions: z.string().trim().optional(),
  aboutAuthor: z.string().trim().max(1000).optional(),
  price: z.coerce.number().positive().optional(),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5).int(),
  comment: z.string().trim().min(5).max(1000),
});
