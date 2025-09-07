"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  createBorrowRequest,
  getUserBorrowRequestStatus,
} from "@/lib/actions/borrow-request";
import {
  createReturnRequest,
  getUserReturnRequestStatus,
} from "@/lib/actions/return-request";
import {
  toggleNotificationPreference,
  getNotificationPreference,
} from "@/lib/actions/notification";
import {
  Clock,
  Send,
  CheckCircle,
  RotateCcw,
  Bell,
  BellOff,
} from "lucide-react";

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
  | "BORROW_BOOK"
  | "SEND_REQUEST"
  | "REQUEST_PENDING"
  | "BORROWED"
  | "RETURN_REQUEST"
  | "RETURN_PENDING"
  | "NOTIFY_ME";

const BorrowBook = ({
  userId,
  bookId,
  bookTitle,
  borrowingEligibility: { isEligible, message },
  availableCopies,
}: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>("BORROW_BOOK");
  const [borrowRecordId, setBorrowRecordId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // Check current status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check for borrow request or active borrow
        const borrowStatus = await getUserBorrowRequestStatus(userId, bookId);

        if (borrowStatus.success && borrowStatus.data) {
          if (borrowStatus.data.type === "BORROW_REQUEST") {
            setButtonState("REQUEST_PENDING");
          } else if (borrowStatus.data.type === "BORROWED") {
            setBorrowRecordId(borrowStatus.data.borrowRecordId ?? null);
            setDueDate(borrowStatus.data.dueDate ?? null);

            // Check for return request
            if (borrowStatus.data.borrowRecordId) {
              const returnStatus = await getUserReturnRequestStatus(
                userId,
                bookId,
                borrowStatus.data.borrowRecordId
              );

              if (returnStatus.success && returnStatus.data) {
                setButtonState("RETURN_PENDING");
              } else {
                setButtonState("BORROWED");
              }
            }
          }
        } else if (availableCopies === 0) {
          setButtonState("NOTIFY_ME");
          // Check notification preference
          const notifPref = await getNotificationPreference(userId, bookId);
          if (notifPref.success && notifPref.data) {
            setNotificationEnabled(notifPref.data.enabled);
          }
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    if (userId) {
      checkStatus();
    }
  }, [userId, bookId, availableCopies]);

  const handleBorrowRequest = async (confirmationText: string) => {
    if (!isEligible) {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setButtonState("SEND_REQUEST");

    try {
      const result = await createBorrowRequest({
        bookId,
        userId,
        confirmationText,
      });

      if (result.success) {
        toast({
          title: "Request Sent Successfully!",
          description:
            "Your borrow request has been sent and is pending admin approval. You will be notified via email once it's processed.",
        });
        setButtonState("REQUEST_PENDING");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        setButtonState("BORROW_BOOK");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while sending the request",
        variant: "destructive",
      });
      setButtonState("BORROW_BOOK");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnRequest = async (confirmationText: string) => {
    if (!borrowRecordId) {
      toast({
        title: "Error",
        description: "No active borrow record found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await createReturnRequest({
        bookId,
        userId,
        borrowRecordId,
        confirmationText,
      });

      if (result.success) {
        toast({
          title: "Return Request Sent!",
          description:
            "Your return request has been sent and is pending admin approval. You will be notified via email once it's processed.",
        });
        setButtonState("RETURN_PENDING");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while sending the return request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyMe = async () => {
    setLoading(true);

    try {
      const newState = !notificationEnabled;
      const result = await toggleNotificationPreference({
        userId,
        bookId,
        enable: newState,
      });

      if (result.success) {
        setNotificationEnabled(newState);
        toast({
          title: "Success",
          description:
            result.message ||
            (newState
              ? "You will be notified when this book becomes available"
              : "Notification disabled"),
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating notification preference",
        variant: "destructive",
      });
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
            <Send className="w-5 h-5" />
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
            <p className="font-bebas-neue text-xl text-dark-100">
              Return Request
            </p>
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
        toast({
          title: "Request Pending",
          description:
            "Your request is being processed by the admin. You will receive an email notification once it's approved or rejected.",
        });
        break;
      default:
        break;
    }
  };

  const isDisabled =
    loading ||
    buttonState === "REQUEST_PENDING" ||
    buttonState === "RETURN_PENDING" ||
    buttonState === "SEND_REQUEST";

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          className="book-overview_btn"
          onClick={handleButtonClick}
          disabled={isDisabled}
          variant={buttonState === "NOTIFY_ME" ? "secondary" : "default"}
        >
          {getButtonContent()}
        </Button>

        {dueDate && buttonState === "BORROWED" && (
          <p className="text-sm text-light-400">
            Due Date: {new Date(dueDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <ConfirmationDialog
        open={showBorrowDialog}
        onOpenChange={setShowBorrowDialog}
        title="Confirm Borrow Request"
        description={`Type "confirm" or part of the book title "${bookTitle}" to confirm your borrow request.`}
        bookTitle={bookTitle}
        acceptedKeywords={["confirm"]}
        placeholder="Type to confirm..."
        onConfirm={handleBorrowRequest}
        confirmButtonText="Send Request"
      />

      <ConfirmationDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        title="Confirm Return Request"
        description={`Type "return" or part of the book title "${bookTitle}" to confirm your return request.`}
        bookTitle={bookTitle}
        acceptedKeywords={["return"]}
        placeholder="Type to confirm..."
        onConfirm={handleReturnRequest}
        confirmButtonText="Send Return Request"
      />
    </>
  );
};

export default BorrowBook;
