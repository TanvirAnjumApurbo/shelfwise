"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Fine {
  id: string;
  amount: number;
  bookTitle: string;
  description: string;
  daysOverdue: number;
  isBookLost: boolean;
}

interface PayNowButtonProps {
  fines: Fine[];
  totalAmount: number;
  userId: string;
  variant?:
    | "default"
    | "outline"
    | "destructive"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  disabled?: boolean;
  onPaymentStart?: () => void;
  onPaymentComplete?: () => void;
  onPaymentError?: (error: string) => void;
}

export default function PayNowButton({
  fines,
  totalAmount,
  userId,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  onPaymentStart,
  onPaymentComplete,
  onPaymentError,
}: PayNowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handlePayment = async () => {
    if (fines.length === 0 || totalAmount <= 0) {
      toast.error("No fines selected for payment");
      return;
    }

    try {
      setIsLoading(true);
      onPaymentStart?.();

      console.log("🚀 Starting payment process...");
      console.log("📋 Fines:", fines);
      console.log("💰 Total amount:", totalAmount);

      // Create checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fineIds: fines.map((fine) => fine.id),
          returnUrl: `${window.location.origin}/fines/payment/success`,
        }),
      });

      console.log("📡 API Response status:", response.status);
      const result = await response.json();
      console.log("📦 API Response data:", result);

      if (result.success && result.sessionUrl) {
        console.log("✅ Success! Redirecting to Stripe:", result.sessionUrl);
        // Redirect to Stripe Checkout
        window.location.href = result.sessionUrl;
      } else {
        console.log("❌ API Error:", result.error);
        throw new Error(result.error || "Failed to create payment session");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Payment failed";
      console.error("❌ Payment error:", error);
      toast.error(errorMessage);
      onPaymentError?.(errorMessage);
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = () => {
    setShowConfirmDialog(false);
    handlePayment();
  };

  // Don't show button if no fines or zero amount
  if (fines.length === 0 || totalAmount <= 0) {
    return null;
  }

  const hasCriticalFines = fines.some(
    (fine) => fine.isBookLost || fine.daysOverdue > 14
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`${className} ${
          hasCriticalFines ? "bg-red-600 hover:bg-red-700" : ""
        }`}
        disabled={disabled || isLoading}
        onClick={() => setShowConfirmDialog(true)}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Setting up payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${totalAmount.toFixed(2)}
          </>
        )}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Confirm Payment
            </DialogTitle>
            <DialogDescription>
              Review your fine payment details before proceeding to Stripe
              checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-900">
                Payment Summary
              </h3>
              <div className="space-y-2">
                {fines.map((fine) => (
                  <div
                    key={fine.id}
                    className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {fine.bookTitle}
                      </div>
                      <div className="text-xs text-gray-500">
                        {fine.daysOverdue} days overdue
                        {fine.isBookLost && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            LOST BOOK
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {fine.description}
                      </div>
                    </div>
                    <div className="text-sm font-medium ml-4">
                      ${fine.amount.toFixed(2)}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200 font-bold">
                  <span>Total Amount</span>
                  <span className="text-lg text-blue-600">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Critical Fines Warning */}
            {hasCriticalFines && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800 mb-1">
                      Critical Fines Detected
                    </h4>
                    <p className="text-sm text-red-700">
                      Some books have been overdue for more than 14 days or are
                      marked as lost. These carry higher penalty amounts
                      including replacement costs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                Payment Information
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Secure payment processing via Stripe</li>
                <li>• Credit/debit cards accepted</li>
                <li>• Payment confirmation sent via email</li>
                <li>• Fines continue until books are returned</li>
                <li>• Account restrictions lift when fines are below $60</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isLoading}
              className={hasCriticalFines ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
