"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import StripeProvider from "@/components/stripe/StripeProvider";
import FineSelection from "@/components/stripe/FineSelection";
import PaymentForm from "@/components/stripe/PaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface Fine {
  id: string;
  amount: number;
  bookTitle: string;
  description: string;
  daysOverdue: number;
  dueDate: string;
  isBookLost: boolean;
}

interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  transactionId: string;
}

export default function PaymentPage() {
  const { data: session, status } = useSession();
  const [selectedFines, setSelectedFines] = useState<Fine[]>([]);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(
    null
  );
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "selection" | "payment" | "success"
  >("selection");

  // Redirect if not authenticated
  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    redirect("/sign-in");
  }

  const handlePaymentClick = async (fines: Fine[]) => {
    try {
      setIsCreatingIntent(true);
      setSelectedFines(fines);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create-intent",
          fineIds: fines.map((fine) => fine.id),
          returnUrl: `${window.location.origin}/fines/payment/success`,
        }),
      });

      const result = await response.json();

      if (result.success && result.paymentIntent) {
        setPaymentIntent(result.paymentIntent);
        setCurrentStep("payment");
        toast.success("Payment form ready!");
      } else {
        toast.error(result.error || "Failed to create payment");
      }
    } catch (error) {
      console.error("Error creating payment intent:", error);
      toast.error("Failed to create payment");
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = () => {
    setCurrentStep("success");
    toast.success("Payment completed successfully!");

    // Redirect to fines page after a delay
    setTimeout(() => {
      window.location.href = "/fines";
    }, 3000);
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error);
    toast.error(error);
    // Stay on payment form to allow retry
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setPaymentIntent(null);
    setSelectedFines([]);
  };

  const totalAmount = selectedFines.reduce((sum, fine) => sum + fine.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Pay Fines</h1>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center ${
                currentStep === "selection"
                  ? "text-blue-600"
                  : currentStep === "payment" || currentStep === "success"
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                  currentStep === "selection"
                    ? "border-blue-600 bg-blue-50"
                    : currentStep === "payment" || currentStep === "success"
                    ? "border-green-600 bg-green-50"
                    : "border-gray-300"
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Select Fines</span>
            </div>

            <div
              className={`w-8 h-px ${
                currentStep === "payment" || currentStep === "success"
                  ? "bg-green-600"
                  : "bg-gray-300"
              }`}
            />

            <div
              className={`flex items-center ${
                currentStep === "payment"
                  ? "text-blue-600"
                  : currentStep === "success"
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                  currentStep === "payment"
                    ? "border-blue-600 bg-blue-50"
                    : currentStep === "success"
                    ? "border-green-600 bg-green-50"
                    : "border-gray-300"
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Payment</span>
            </div>

            <div
              className={`w-8 h-px ${
                currentStep === "success" ? "bg-green-600" : "bg-gray-300"
              }`}
            />

            <div
              className={`flex items-center ${
                currentStep === "success" ? "text-green-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                  currentStep === "success"
                    ? "border-green-600 bg-green-50"
                    : "border-gray-300"
                }`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {currentStep === "selection" && (
          <FineSelection
            userId={session.user.id!}
            onPaymentClick={handlePaymentClick}
          />
        )}

        {currentStep === "payment" && paymentIntent && (
          <div className="space-y-6">
            {/* Selected Fines Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Payment Summary</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToSelection}
                    disabled={isCreatingIntent}
                  >
                    Change Selection
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedFines.map((fine) => (
                    <div
                      key={fine.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <span className="font-medium">{fine.bookTitle}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({fine.daysOverdue} days overdue)
                        </span>
                      </div>
                      <span className="font-medium">
                        ${fine.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200 font-bold text-lg">
                    <span>Total</span>
                    <span className="text-blue-600">
                      ${totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Payment Form */}
            <StripeProvider
              clientSecret={paymentIntent.clientSecret}
              amount={paymentIntent.amount}
            >
              <PaymentForm
                clientSecret={paymentIntent.clientSecret}
                amount={paymentIntent.amount}
                fineIds={selectedFines.map((f) => f.id)}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </StripeProvider>
          </div>
        )}

        {currentStep === "success" && (
          <Card className="text-center">
            <CardContent className="p-12">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-4">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-6">
                Your fine payment of ${totalAmount.toFixed(2)} has been
                processed successfully. You should receive a confirmation email
                shortly.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>Redirecting you to the fines page in a moment...</p>
                <Button onClick={() => (window.location.href = "/fines")}>
                  Go to Fines Page Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isCreatingIntent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p>Setting up your payment...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
