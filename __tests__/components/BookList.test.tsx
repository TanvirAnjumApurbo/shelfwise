/**
 * @jest-environment jsdom
 */

import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("imagekitio-next", () => ({
  IKImage: ({ children }: { children?: any }) => (
    <div data-testid="ik-image">{children}</div>
  ),
}));

jest.mock("@/lib/config", () => ({
  __esModule: true,
  default: {
    env: {
      imagekit: {
        urlEndpoint: "https://example.com",
      },
    },
  },
}));

const mockBookCard = jest.fn((props: any) => (
  <li data-testid="book-card">{props.title}</li>
));

jest.mock("@/components/BookCard", () => ({
  __esModule: true,
  default: (props: any) => mockBookCard(props),
}));

let BookList: typeof import("@/components/BookList").default;

const createBook = (overrides: Partial<Book> = {}): Book => ({
  id: "book-id",
  title: "Sample Book",
  author: "Author Name",
  genre: "Fiction",
  rating: 4.5,
  totalCopies: 3,
  availableCopies: 2,
  description: "A sample description",
  coverColor: "#123456",
  coverUrl: "/covers/sample.jpg",
  videoUrl: null,
  youtubeUrl: null,
  summary: "Sample summary",
  publisher: null,
  publicationDate: null,
  edition: null,
  language: null,
  printLength: null,
  bookType: null,
  isbn: null,
  itemWeight: null,
  dimensions: null,
  aboutAuthor: null,
  price: null,
  createdAt: null,
  ...overrides,
});

describe("BookList", () => {
  beforeAll(async () => {
    BookList = (await import("@/components/BookList")).default;
  });

  beforeEach(() => {
    mockBookCard.mockClear();
  });

  it("renders heading and book items when title is provided", () => {
    const books = [
      createBook({ id: "1" }),
      createBook({ id: "2", title: "Another" }),
    ];

    render(<BookList title="Featured" books={books} />);

    const heading = screen.getByRole("heading", { level: 2, name: "Featured" });
    expect(heading).toBeTruthy();
    expect(screen.getAllByTestId("book-card")).toHaveLength(2);
  });

  it("omits the heading when title is empty", () => {
    const books = [createBook({ id: "1" })];

    render(<BookList title="" books={books} />);

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getAllByTestId("book-card")).toHaveLength(1);
  });
});
