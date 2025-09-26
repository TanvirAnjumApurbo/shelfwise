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
import { fireEvent, render, screen } from "@testing-library/react";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/books",
  useSearchParams: () => new URLSearchParams("q=initial"),
}));

let BookSearchForm: typeof import("@/components/BookSearchForm").default;

describe("BookSearchForm", () => {
  beforeAll(async () => {
    BookSearchForm = (await import("@/components/BookSearchForm")).default;
  });

  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("updates the route when the search value changes", () => {
    render(<BookSearchForm initialQuery="initial" />);

    const input = screen.getByPlaceholderText(
      "Search by title, author, or genre"
    );

    fireEvent.change(input, { target: { value: "new term" } });

    expect(mockReplace).toHaveBeenLastCalledWith("/books?q=new+term", {
      scroll: false,
    });
  });

  it("clears the query when the clear button is pressed", () => {
    render(<BookSearchForm initialQuery="initial" />);

    const clearButton = screen.getByRole("button", { name: "Clear" });
    fireEvent.click(clearButton);

    expect(mockReplace).toHaveBeenLastCalledWith("/books", { scroll: false });
  });
});
