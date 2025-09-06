interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  rating: number;
  totalCopies: number;
  availableCopies: number;
  description: string;
  coverColor: string;
  coverUrl: string;
  videoUrl: string | null;
  youtubeUrl: string | null;
  summary: string;
  // New book details
  publisher: string | null;
  publicationDate: Date | null;
  edition: string | null;
  language: string | null;
  printLength: number | null;
  bookType: string | null; // paperback/hardcover
  isbn: string | null;
  itemWeight: number | null; // in pounds
  dimensions: string | null; // in inches
  aboutAuthor: string | null;
  price: number | null; // price for penalty calculations
  createdAt: Date | null;
}

interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
  universityId: number;
  universityCard: string;
}

interface BookParams {
  title: string;
  author: string;
  genre: string;
  rating: number;
  coverUrl: string;
  coverColor: string;
  description: string;
  totalCopies: number;
  videoUrl?: string;
  youtubeUrl?: string;
  summary: string;
  // New book details
  publisher?: string;
  publicationDate?: string;
  edition?: string;
  language?: string;
  printLength?: number;
  bookType?: string;
  isbn?: string;
  itemWeight?: number;
  dimensions?: string;
  aboutAuthor?: string;
  price?: number;
}

interface BorrowBookParams {
  bookId: string;
  userId: string;
}

interface ReviewParams {
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
}

interface Review {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ReviewWithUser {
  review: Review;
  user: {
    fullName: string;
    universityId: number;
  };
}
