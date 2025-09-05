"use client";

/* eslint-disable */
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteBook } from "@/lib/admin/actions/book";
import { toast } from "sonner";
import Link from "next/link";
import { getImageKitUrl } from "@/lib/utils/imagekit";
import { BOOK_GENRES } from "@/lib/validations";

interface BooksTableProps {
  books: Book[];
}

const BooksTable = ({ books }: BooksTableProps) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmationText, setConfirmationText] = useState<{
    [key: string]: string;
  }>({});

  // Filter and Sort States
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedBookType, setSelectedBookType] = useState<string>("all");
  const [selectedAvailability, setSelectedAvailability] =
    useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const booksPerPage = 10;

  // Debug: Log books data
  React.useEffect(() => {
    console.log("Books data received:", books);
    books.forEach((book, index) => {
      console.log(`Book ${index + 1}:`, {
        title: book.title,
        coverUrl: book.coverUrl,
        coverColor: book.coverColor,
      });
    });
  }, [books]);

  // Helper function to get full image URL
  const getImageUrl = (coverUrl: string | null) => {
    return getImageKitUrl(coverUrl);
  };

  // Helper functions to get unique filter options
  const getUniqueLanguages = () => {
    const languages = books
      .map((book) => book.language)
      .filter((lang) => lang && lang.trim() !== "")
      .map((lang) => lang!.trim());
    return [...new Set(languages)].sort();
  };

  const getUniqueBookTypes = () => {
    const types = books
      .map((book) => book.bookType)
      .filter((type) => type && type.trim() !== "")
      .map((type) => type!.trim());
    return [...new Set(types)].sort();
  };

  const filteredBooks = useMemo(() => {
    let filtered = books.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.isbn?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply genre filter
    if (selectedGenre !== "all") {
      filtered = filtered.filter((book) => book.genre === selectedGenre);
    }

    // Apply book type filter
    if (selectedBookType !== "all") {
      filtered = filtered.filter((book) => book.bookType === selectedBookType);
    }

    // Apply availability filter
    if (selectedAvailability !== "all") {
      if (selectedAvailability === "available") {
        filtered = filtered.filter((book) => book.availableCopies > 0);
      } else if (selectedAvailability === "out-of-stock") {
        filtered = filtered.filter((book) => book.availableCopies === 0);
      }
    }

    // Apply language filter
    if (selectedLanguage !== "all") {
      filtered = filtered.filter((book) => book.language === selectedLanguage);
    }

    // Apply rating filter
    if (ratingFilter !== "all") {
      const rating = parseFloat(ratingFilter);
      filtered = filtered.filter((book) => book.rating >= rating);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "author":
          aValue = a.author.toLowerCase();
          bValue = b.author.toLowerCase();
          break;
        case "rating":
          aValue = a.rating;
          bValue = b.rating;
          break;
        case "availableCopies":
          aValue = a.availableCopies;
          bValue = b.availableCopies;
          break;
        case "createdAt":
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case "genre":
          aValue = a.genre.toLowerCase();
          bValue = b.genre.toLowerCase();
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [
    books,
    searchTerm,
    selectedGenre,
    selectedBookType,
    selectedAvailability,
    selectedLanguage,
    ratingFilter,
    sortBy,
    sortOrder,
  ]);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const startIndex = (currentPage - 1) * booksPerPage;
  const endIndex = startIndex + booksPerPage;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  const handleDelete = async (bookId: string, bookTitle: string) => {
    const expectedText = `DELETE ${bookTitle}`;
    const userInput = confirmationText[bookId];

    if (userInput !== expectedText) {
      toast.error(`Please type "${expectedText}" to confirm deletion`);
      return;
    }

    setIsDeleting(bookId);
    try {
      const result = await deleteBook(bookId);
      if (result.success) {
        toast.success("Book deleted successfully");
        // Clear the confirmation text
        setConfirmationText((prev) => {
          const newState = { ...prev };
          delete newState[bookId];
          return newState;
        });
      } else {
        toast.error(result.message || "Failed to delete book");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the book");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    const dateObj = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return dateObj.toLocaleDateString("en-US", options);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const resetFilters = () => {
    setSelectedGenre("all");
    setSelectedBookType("all");
    setSelectedAvailability("all");
    setSelectedLanguage("all");
    setRatingFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = () => {
    return (
      selectedGenre !== "all" ||
      selectedBookType !== "all" ||
      selectedAvailability !== "all" ||
      selectedLanguage !== "all" ||
      ratingFilter !== "all" ||
      searchTerm !== "" ||
      sortBy !== "createdAt" ||
      sortOrder !== "desc"
    );
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(i);
    }

    return buttons;
  };

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 text-lg">No books found</p>
        <p className="text-gray-400 text-sm mt-2">
          Start by creating your first book
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <Input
                placeholder="Search books by title, author, genre, or ISBN..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 max-w-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              📚 {filteredBooks.length} of {books.length} books
            </div>
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-gray-600 hover:text-gray-800"
              >
                🗑️ Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                📚 Genre: {selectedGenre === "all" ? "All" : selectedGenre}
                <span className="ml-1">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Select Genre</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedGenre("all")}>
                All Genres
              </DropdownMenuItem>
              {BOOK_GENRES.map((genre) => (
                <DropdownMenuItem
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Book Type Filter */}
          {getUniqueBookTypes().length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  📖 Type:{" "}
                  {selectedBookType === "all" ? "All" : selectedBookType}
                  <span className="ml-1">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Book Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedBookType("all")}>
                  All Types
                </DropdownMenuItem>
                {getUniqueBookTypes().map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => setSelectedBookType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Availability Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                📦 Stock:{" "}
                {selectedAvailability === "all"
                  ? "All"
                  : selectedAvailability === "available"
                  ? "Available"
                  : "Out of Stock"}
                <span className="ml-1">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Availability</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedAvailability("all")}>
                All Books
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSelectedAvailability("available")}
              >
                Available
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSelectedAvailability("out-of-stock")}
              >
                Out of Stock
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Filter */}
          {getUniqueLanguages().length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  🌐 Language:{" "}
                  {selectedLanguage === "all" ? "All" : selectedLanguage}
                  <span className="ml-1">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedLanguage("all")}>
                  All Languages
                </DropdownMenuItem>
                {getUniqueLanguages().map((language) => (
                  <DropdownMenuItem
                    key={language}
                    onClick={() => setSelectedLanguage(language)}
                  >
                    {language}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Rating Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                ⭐ Rating:{" "}
                {ratingFilter === "all" ? "All" : `${ratingFilter}+ stars`}
                <span className="ml-1">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Minimum Rating</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRatingFilter("all")}>
                All Ratings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRatingFilter("4")}>
                4+ Stars
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRatingFilter("3")}>
                3+ Stars
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRatingFilter("2")}>
                2+ Stars
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRatingFilter("1")}>
                1+ Stars
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Options */}
          <div className="flex items-center space-x-2 ml-4 border-l border-gray-200 pl-4">
            <span className="text-sm text-gray-600 font-medium">Sort by:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  🔄{" "}
                  {sortBy === "title"
                    ? "Title"
                    : sortBy === "author"
                    ? "Author"
                    : sortBy === "rating"
                    ? "Rating"
                    : sortBy === "availableCopies"
                    ? "Available"
                    : sortBy === "createdAt"
                    ? "Created"
                    : sortBy === "genre"
                    ? "Genre"
                    : "Default"}{" "}
                  ({sortOrder === "asc" ? "↑" : "↓"})
                  <span className="ml-1">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("title");
                    setSortOrder("asc");
                  }}
                >
                  Title (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("title");
                    setSortOrder("desc");
                  }}
                >
                  Title (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("author");
                    setSortOrder("asc");
                  }}
                >
                  Author (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("author");
                    setSortOrder("desc");
                  }}
                >
                  Author (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("rating");
                    setSortOrder("desc");
                  }}
                >
                  Rating (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("rating");
                    setSortOrder("asc");
                  }}
                >
                  Rating (Low to High)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("availableCopies");
                    setSortOrder("desc");
                  }}
                >
                  Available Copies (Most)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("availableCopies");
                    setSortOrder("asc");
                  }}
                >
                  Available Copies (Least)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("createdAt");
                    setSortOrder("desc");
                  }}
                >
                  Created Date (Newest)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("createdAt");
                    setSortOrder("asc");
                  }}
                >
                  Created Date (Oldest)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("genre");
                    setSortOrder("asc");
                  }}
                >
                  Genre (A-Z)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">
              Active filters:
            </span>
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedGenre !== "all" && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Genre: {selectedGenre}
                <button
                  onClick={() => setSelectedGenre("all")}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedBookType !== "all" && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Type: {selectedBookType}
                <button
                  onClick={() => setSelectedBookType("all")}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedAvailability !== "all" && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                Stock:{" "}
                {selectedAvailability === "available"
                  ? "Available"
                  : "Out of Stock"}
                <button
                  onClick={() => setSelectedAvailability("all")}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedLanguage !== "all" && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                Language: {selectedLanguage}
                <button
                  onClick={() => setSelectedLanguage("all")}
                  className="ml-1 text-indigo-600 hover:text-indigo-800"
                >
                  ×
                </button>
              </span>
            )}
            {ratingFilter !== "all" && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                Rating: {ratingFilter}+ stars
                <button
                  onClick={() => setRatingFilter("all")}
                  className="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            )}
            {(sortBy !== "createdAt" || sortOrder !== "desc") && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                Sort:{" "}
                {sortBy === "title"
                  ? "Title"
                  : sortBy === "author"
                  ? "Author"
                  : sortBy === "rating"
                  ? "Rating"
                  : sortBy === "availableCopies"
                  ? "Available"
                  : sortBy === "createdAt"
                  ? "Created"
                  : sortBy === "genre"
                  ? "Genre"
                  : "Default"}{" "}
                ({sortOrder === "asc" ? "↑" : "↓"})
                <button
                  onClick={() => {
                    setSortBy("createdAt");
                    setSortOrder("desc");
                  }}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500 text-lg">No books match your search</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your search terms
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse books-table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">
                    Cover
                  </th>
                  <th
                    className="text-left py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "title") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("title");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Book Details</span>
                      {sortBy === "title" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-left py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "author") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("author");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Author</span>
                      {sortBy === "author" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-left py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "genre") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("genre");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Genre</span>
                      {sortBy === "genre" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-left py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "rating") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("rating");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Rating</span>
                      {sortBy === "rating" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-left py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "availableCopies") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("availableCopies");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Inventory</span>
                      {sortBy === "availableCopies" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="text-left py-4 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "createdAt") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("createdAt");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      {sortBy === "createdAt" && (
                        <span className="text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentBooks.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div
                        className="w-16 h-20 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center text-white text-sm font-medium overflow-hidden"
                        style={{
                          backgroundColor: book.coverColor || "#6B7280",
                        }}
                      >
                        {book.coverUrl && book.coverUrl.trim() !== "" ? (
                          (() => {
                            const imageUrl = getImageUrl(book.coverUrl);
                            return imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={book.title}
                                className="w-full h-full object-cover rounded-lg"
                                onLoad={() =>
                                  console.log(
                                    "✅ Image loaded successfully:",
                                    book.title,
                                    "URL:",
                                    imageUrl
                                  )
                                }
                                onError={(e) => {
                                  console.error(
                                    "❌ Image failed to load:",
                                    book.title,
                                    "Original URL:",
                                    book.coverUrl,
                                    "Processed URL:",
                                    imageUrl
                                  );
                                  // If image fails to load, show fallback
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-sm font-medium text-white">${book.title
                                      .charAt(0)
                                      .toUpperCase()}</span>`;
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium text-white">
                                {book.title.charAt(0).toUpperCase()}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-sm font-medium">
                            {book.title.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <p className="font-semibold text-gray-900 text-sm">
                          {book.title}
                        </p>
                        {book.isbn && (
                          <p className="text-xs text-gray-500 mt-1">
                            ISBN: {book.isbn}
                          </p>
                        )}
                        {book.publisher && (
                          <p className="text-xs text-gray-500">
                            Publisher: {book.publisher}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-gray-900">{book.author}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-gray-900 font-medium">{book.genre}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium text-gray-900">
                          {book.rating}
                        </span>
                        <span className="text-gray-400 text-sm">/5</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Total:</span>
                          <span className="font-medium text-gray-900">
                            {book.totalCopies}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            Available:
                          </span>
                          <span
                            className={`font-medium ${
                              book.availableCopies > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {book.availableCopies}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <p className="text-gray-900 font-medium">
                          {formatDate(book.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                          <Link href={`/admin/books/${book.id}/edit`}>
                            📝 Edit
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              disabled={isDeleting === book.id}
                            >
                              {isDeleting === book.id
                                ? "🔄 Deleting..."
                                : "🗑️ Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Book: {book.title}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the book "{book.title}" and
                                remove all associated data.
                                <br />
                                <br />
                                To confirm deletion, please type:{" "}
                                <strong>DELETE {book.title}</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="my-4">
                              <Input
                                placeholder={`Type "DELETE ${book.title}" to confirm`}
                                value={confirmationText[book.id] || ""}
                                onChange={(e) =>
                                  setConfirmationText((prev) => ({
                                    ...prev,
                                    [book.id]: e.target.value,
                                  }))
                                }
                                className="w-full"
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => {
                                  setConfirmationText((prev) => {
                                    const newState = { ...prev };
                                    delete newState[book.id];
                                    return newState;
                                  });
                                }}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDelete(book.id, book.title)
                                }
                                className="bg-red-600 hover:bg-red-700"
                                disabled={
                                  confirmationText[book.id] !==
                                  `DELETE ${book.title}`
                                }
                              >
                                Delete Book
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredBooks.length)} of{" "}
                {filteredBooks.length} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {getPaginationButtons().map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BooksTable;
