"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
// Use sonner toast directly so messages appear (root layout already renders <Toaster /> from sonner)
import { toast } from "sonner";
import {
  Clock,
  Send,
  CheckCircle,
  RotateCcw,
  Bell,
  BellOff,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  userId: string;
  bookId: string;
  bookTitle: string;
  borrowingEligibility: {
    isEligible: boolean;
    message: string;
  };
  availableCopies: number;
}

type ButtonState =
  | "BORROW_BOOK" // Available to borrow
  | "SEND_REQUEST" // Submitting request
  | "REQUEST_PENDING" // Waiting for admin approval
  | "BORROWED" // Book borrowed (APPROVED)
  | "RETURN_REQUEST" // Submitting return request
  | "RETURN_PENDING" // Waiting for return confirmation
  | "NOTIFY_ME" // Book unavailable, can set notification
  | "DISABLED"; // User not eligible

interface BorrowStatus {
  status: string;
  dueDate?: string;
  borrowRequestId?: string;
}

const BorrowBookEnhanced = ({
  userId,
  bookId,
  bookTitle,
  borrowingEligibility: { isEligible, message },
  availableCopies,
}: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>("BORROW_BOOK");
  const [borrowStatus, setBorrowStatus] = useState<BorrowStatus | null>(null);
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [displayedBorrowCode, setDisplayedBorrowCode] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [borrowErrorMessage, setBorrowErrorMessage] = useState("");
  const [returnErrorMessage, setReturnErrorMessage] = useState("");

  // Generate random confirmation code
  const generateConfirmationCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Check current status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/borrow-status?userId=${userId}&bookId=${bookId}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setBorrowStatus(data.data);
            updateButtonState(data.data);
          } else {
            updateButtonState(null);
          }
        }
      } catch (error) {
        console.error("Error checking status:", error);
        updateButtonState(null);
      }
    };

    if (userId) {
      checkStatus();
      // Check status every 30 seconds
      const interval = setInterval(checkStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, bookId, availableCopies]);

  // Update countdown timer for borrowed books
  useEffect(() => {
    if (borrowStatus?.status === "APPROVED" && borrowStatus.dueDate) {
      const updateTimer = () => {
        const now = new Date();
        const due = new Date(borrowStatus.dueDate!);
        const diff = due.getTime() - now.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          if (days > 0) {
            setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
          } else {
            setTimeRemaining(`${hours}h ${minutes}m`);
          }
        } else {
          setTimeRemaining("Overdue");
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 60000); // Update every minute
      return () => clearInterval(timer);
    }
  }, [borrowStatus]);

  const updateButtonState = (status: BorrowStatus | null) => {
    if (!isEligible) {
      setButtonState("DISABLED");
      return;
    }

    if (!status) {
      // No active request/borrow
      if (availableCopies > 0) {
        setButtonState("BORROW_BOOK");
      } else {
        setButtonState("NOTIFY_ME");
      }
      return;
    }

    switch (status.status) {
      case "PENDING":
        setButtonState("REQUEST_PENDING");
        break;
      case "APPROVED":
        setButtonState("BORROWED");
        break;
      case "RETURN_PENDING":
        setButtonState("RETURN_PENDING");
        break;
      default:
        setButtonState(availableCopies > 0 ? "BORROW_BOOK" : "NOTIFY_ME");
    }
  };

  const handleBorrowRequest = async (userCode: string) => {
    if (!userCode || userCode.length < 5) {
      toast.error("Please enter the confirmation code");
      setBorrowErrorMessage("Please enter the confirmation code");
      return false; // Don't close dialog
    }

    // Validate the confirmation code matches the displayed code
    if (userCode.toUpperCase() !== displayedBorrowCode.toUpperCase()) {
      toast.error("Invalid code. Please try again.");
      setBorrowErrorMessage("Invalid code. Please try again.");
      return false; // Don't close dialog
    }

    // Clear any previous error message
    setBorrowErrorMessage("");
    setLoading(true);
    setButtonState("SEND_REQUEST");

    try {
      const response = await fetch("/api/borrow-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          confirmationCode: userCode,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || "Borrow request sent successfully");
        setButtonState("REQUEST_PENDING");
        router.refresh();

        // Close dialog and reset state on success
        setShowBorrowDialog(false);
        setConfirmationCode("");
        setDisplayedBorrowCode("");
        return true;
      } else {
        toast.error(data.error || "Failed to send request");
        setBorrowErrorMessage(data.error || "Failed to send request");

        if (response.status === 409) {
          // Conflict - refresh status
          const statusResponse = await fetch(
            `/api/borrow-status?userId=${userId}&bookId=${bookId}`
          );
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.data) {
              setBorrowStatus(statusData.data);
              updateButtonState(statusData.data);
            }
          }
        } else {
          setButtonState("BORROW_BOOK");
        }
        return false; // Don't close dialog on error
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
      setBorrowErrorMessage("Network error. Please try again.");
      setButtonState("BORROW_BOOK");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleReturnRequest = async (userCode: string) => {
    if (!userCode || userCode.length < 5) {
      toast.error("Please enter the confirmation code");
      setReturnErrorMessage("Please enter the confirmation code");
      return false; // Don't close dialog
    }

    // Validate confirmation code (should be "return" or part of book title)
    const userCodeLower = userCode.toLowerCase();
    const bookTitleLower = bookTitle.toLowerCase();

    if (userCodeLower !== "return" && !bookTitleLower.includes(userCodeLower)) {
      toast.error("Please enter 'return' or part of the book title to confirm");
      setReturnErrorMessage(
        "Please enter 'return' or part of the book title to confirm"
      );
      return false; // Don't close dialog
    }

    if (!borrowStatus?.borrowRequestId) {
      toast.error("No active borrow record found");
      setReturnErrorMessage("No active borrow record found");
      return false; // Don't close dialog
    }

    // Clear any previous error message
    setReturnErrorMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/return-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrowRequestId: borrowStatus.borrowRequestId,
          confirmationCode: userCode,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || "Return request sent successfully");
        setButtonState("RETURN_PENDING");
        router.refresh();

        // Close dialog and reset state on success
        setShowReturnDialog(false);
        setConfirmationCode("");
        return true;
      } else {
        toast.error(data.error || "Failed to send return request");
        setReturnErrorMessage(data.error || "Failed to send return request");
        return false; // Don't close dialog on error
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
      setReturnErrorMessage("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyMe = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          enable: !notificationEnabled,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNotificationEnabled(!notificationEnabled);
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to update notification preference");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case "BORROW_BOOK":
        return (
          <>
            <Image src="/icons/book.svg" alt="book" width={20} height={20} />
            <p className="font-bebas-neue text-xl text-dark-100">Borrow Book</p>
          </>
        );
      case "SEND_REQUEST":
        return (
          <>
            <Send className="w-5 h-5 animate-pulse" />
            <p className="font-bebas-neue text-xl text-dark-100">
              Sending Request...
            </p>
          </>
        );
      case "REQUEST_PENDING":
        return (
          <>
            <Clock className="w-5 h-5" />
            <p className="font-bebas-neue text-xl text-dark-100">
              Request Pending
            </p>
          </>
        );
      case "BORROWED":
        return (
          <>
            <RotateCcw className="w-5 h-5" />
            <p className="font-bebas-neue text-xl text-dark-100">Return Book</p>
          </>
        );
      case "RETURN_PENDING":
        return (
          <>
            <Clock className="w-5 h-5" />
            <p className="font-bebas-neue text-xl text-dark-100">
              Return Pending
            </p>
          </>
        );
      case "NOTIFY_ME":
        return (
          <>
            {notificationEnabled ? (
              <BellOff className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            <p className="font-bebas-neue text-xl text-dark-100">
              {notificationEnabled ? "Cancel Notification" : "Notify Me"}
            </p>
          </>
        );
      case "DISABLED":
        return (
          <>
            <AlertCircle className="w-5 h-5" />
            <p className="font-bebas-neue text-xl text-dark-100">
              Not Available
            </p>
          </>
        );
      default:
        return (
          <>
            <Image src="/icons/book.svg" alt="book" width={20} height={20} />
            <p className="font-bebas-neue text-xl text-dark-100">Borrow Book</p>
          </>
        );
    }
  };

  const handleButtonClick = () => {
    switch (buttonState) {
      case "BORROW_BOOK":
        setDisplayedBorrowCode(generateConfirmationCode());
        setShowBorrowDialog(true);
        break;
      case "BORROWED":
        setShowReturnDialog(true);
        break;
      case "NOTIFY_ME":
        handleNotifyMe();
        break;
      case "REQUEST_PENDING":
      case "RETURN_PENDING":
        toast("Request pending", { description: "Processing by admin." });
        break;
      case "DISABLED":
        toast.error(message || "Not available");
        break;
      default:
        break;
    }
  };

  const isDisabled =
    loading ||
    buttonState === "REQUEST_PENDING" ||
    buttonState === "RETURN_PENDING" ||
    buttonState === "SEND_REQUEST" ||
    buttonState === "DISABLED";

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button
          className="book-overview_btn"
          onClick={handleButtonClick}
          disabled={isDisabled}
          variant={buttonState === "NOTIFY_ME" ? "secondary" : "default"}
        >
          {getButtonContent()}
        </Button>

        {/* Due date and timer display */}
        {borrowStatus?.status === "APPROVED" && borrowStatus.dueDate && (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2 text-light-400">
              <Calendar className="w-4 h-4" />
              <span>
                Due: {new Date(borrowStatus.dueDate).toLocaleDateString()}
              </span>
            </div>
            {timeRemaining && (
              <div
                className={`flex items-center gap-2 ${
                  timeRemaining === "Overdue"
                    ? "text-red-500"
                    : "text-light-200"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-medium">{timeRemaining}</span>
              </div>
            )}
          </div>
        )}

        {/* Status message */}
        {buttonState === "REQUEST_PENDING" && (
          <p className="text-sm text-yellow-400">Waiting for admin approval</p>
        )}
        {buttonState === "RETURN_PENDING" && (
          <p className="text-sm text-blue-400">Return confirmation pending</p>
        )}
      </div>

      {/* Borrow Confirmation Dialog */}
      <AlertDialog open={showBorrowDialog} onOpenChange={setShowBorrowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Borrow Request</AlertDialogTitle>
            <AlertDialogDescription>
              To confirm your borrow request for "{bookTitle}", please enter the
              confirmation code shown below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <Label className="text-sm text-gray-600">
                Confirmation Code:
              </Label>
              <p className="text-2xl font-mono font-bold text-gray-900 mt-1">
                {displayedBorrowCode}
              </p>
            </div>
            <div>
              <Label htmlFor="confirmCode">Enter the code above:</Label>
              <Input
                id="confirmCode"
                value={confirmationCode}
                onChange={(e) =>
                  setConfirmationCode(e.target.value.toUpperCase())
                }
                placeholder="Enter confirmation code"
                className="mt-1"
                maxLength={6}
              />
            </div>
            {borrowErrorMessage && (
              <p className="text-red-500 text-sm">{borrowErrorMessage}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmationCode("");
                setDisplayedBorrowCode("");
                setBorrowErrorMessage("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <div className="flex gap-2">
              <Button
                onClick={() => handleBorrowRequest(confirmationCode)}
                disabled={loading || confirmationCode.length < 5}
                className="flex-1"
              >
                {loading ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return Confirmation Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Return Request</AlertDialogTitle>
            <AlertDialogDescription>
              To confirm your return request for "{bookTitle}", please type
              "return" or part of the book title below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="returnConfirmCode">Confirmation Text:</Label>
              <Input
                id="returnConfirmCode"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="Type 'return' or part of book title"
                className="mt-1"
              />
            </div>
            {returnErrorMessage && (
              <p className="text-red-500 text-sm">{returnErrorMessage}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmationCode("");
                setReturnErrorMessage("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <div className="flex gap-2">
              <Button
                onClick={() => handleReturnRequest(confirmationCode)}
                disabled={loading || confirmationCode.length < 5}
                className="flex-1"
              >
                {loading ? "Sending..." : "Send Return Request"}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BorrowBookEnhanced;
