/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";
import BorrowBookEnhanced from "@/components/BorrowBookEnhanced";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

// Mock hooks/use-toast
jest.mock("@/hooks/use-toast", () => ({
  toast: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockProps = {
  userId: "user-123",
  bookId: "book-456",
  bookTitle: "Test Book",
  borrowingEligibility: {
    isEligible: true,
    message: "Eligible to borrow",
  },
  availableCopies: 5,
};

describe("BorrowBookEnhanced Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock crypto.randomUUID
    Object.defineProperty(global, "crypto", {
      value: {
        randomUUID: () => "test-uuid-123",
      },
    });
  });

  test("renders borrow button when book is available", async () => {
    // Mock fetch to return no active status
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });

    render(<BorrowBookEnhanced {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Borrow Book")).toBeInTheDocument();
    });
  });

  test("shows request pending when user has pending request", async () => {
    // Mock fetch to return pending status
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          status: "PENDING",
          borrowRequestId: "request-123",
        },
      }),
    });

    render(<BorrowBookEnhanced {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Request Pending")).toBeInTheDocument();
    });
  });

  test("prevents duplicate requests with idempotency", async () => {
    // Mock initial status check
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      })
      // Mock borrow request response (duplicate detected)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "request-123" },
          message: "Request already processed",
        }),
      });

    render(<BorrowBookEnhanced {...mockProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Borrow Book")).toBeInTheDocument();
    });

    // Click borrow button
    fireEvent.click(screen.getByText("Borrow Book"));

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText("Confirm Borrow Request")).toBeInTheDocument();
    });

    // Enter confirmation code and submit
    const codeInput = screen.getByPlaceholderText("Enter confirmation code");
    fireEvent.change(codeInput, { target: { value: "TESTCD" } });

    const submitButton = screen.getByText("Send Request");
    fireEvent.click(submitButton);

    // Verify API was called with idempotency key
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/borrow-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId: "book-456",
          confirmationCode: "TESTCD",
          idempotencyKey: "test-uuid-123",
        }),
      });
    });
  });

  test("validates confirmation code length", async () => {
    // Mock initial status
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });

    const { toast } = require("@/hooks/use-toast");

    render(<BorrowBookEnhanced {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Borrow Book")).toBeInTheDocument();
    });

    // Click borrow button
    fireEvent.click(screen.getByText("Borrow Book"));

    await waitFor(() => {
      expect(screen.getByText("Confirm Borrow Request")).toBeInTheDocument();
    });

    // Try to submit with short code
    const codeInput = screen.getByPlaceholderText("Enter confirmation code");
    fireEvent.change(codeInput, { target: { value: "TEST" } });

    const submitButton = screen.getByText("Send Request");
    fireEvent.click(submitButton);

    // Should show error toast
    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Please enter the confirmation code",
      variant: "destructive",
    });
  });

  test("shows notify me button when book unavailable", async () => {
    // Mock initial status
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });

    render(<BorrowBookEnhanced {...{ ...mockProps, availableCopies: 0 }} />);

    await waitFor(() => {
      expect(screen.getByText("Notify Me")).toBeInTheDocument();
    });
  });

  test("handles 409 conflict gracefully", async () => {
    // Mock initial status check
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      })
      // Mock 409 conflict response
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: "You already have an active request",
          currentStatus: "PENDING",
        }),
      })
      // Mock status refresh
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: "PENDING", borrowRequestId: "existing-123" },
        }),
      });

    render(<BorrowBookEnhanced {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Borrow Book")).toBeInTheDocument();
    });

    // Click borrow button
    fireEvent.click(screen.getByText("Borrow Book"));

    await waitFor(() => {
      expect(screen.getByText("Confirm Borrow Request")).toBeInTheDocument();
    });

    // Enter code and submit
    const codeInput = screen.getByPlaceholderText("Enter confirmation code");
    fireEvent.change(codeInput, { target: { value: "TESTCD" } });

    fireEvent.click(screen.getByText("Send Request"));

    // Should refresh status and show updated button
    await waitFor(() => {
      expect(screen.getByText("Request Pending")).toBeInTheDocument();
    });
  });

  test("displays countdown timer for borrowed books", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Mock borrowed status
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          status: "APPROVED",
          dueDate: tomorrow.toISOString(),
          borrowRequestId: "borrow-123",
        },
      }),
    });

    render(<BorrowBookEnhanced {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Return Book")).toBeInTheDocument();
      // Should show due date
      expect(screen.getByText(/Due:/)).toBeInTheDocument();
    });
  });

  test("toggles notification preference", async () => {
    // Mock initial status and notification APIs
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "You will be notified when this book becomes available",
        }),
      });

    render(<BorrowBookEnhanced {...{ ...mockProps, availableCopies: 0 }} />);

    await waitFor(() => {
      expect(screen.getByText("Notify Me")).toBeInTheDocument();
    });

    // Click notify me button
    fireEvent.click(screen.getByText("Notify Me"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId: "book-456",
          enable: true,
        }),
      });
    });
  });
});
