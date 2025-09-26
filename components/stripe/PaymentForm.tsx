"use client";

import { useState, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  fineIds: string[];
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function PaymentForm({
  clientSecret,
  amount,
  fineIds,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "initial" | "processing" | "succeeded" | "failed"
  >("initial");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe || !clientSecret) {
      return;
    }

    // Check if payment was already completed
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent) {
        switch (paymentIntent.status) {
          case "succeeded":
            setPaymentStatus("succeeded");
            toast.success("Payment successful!");
            onSuccess();
            break;
          case "processing":
            setPaymentStatus("processing");
            toast.info("Your payment is processing...");
            break;
          case "requires_payment_method":
            setPaymentStatus("failed");
            toast.error("Your payment was not successful, please try again.");
            break;
          default:
            setPaymentStatus("initial");
            break;
        }
      }
    });
  }, [stripe, clientSecret, onSuccess]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe has not loaded yet. Please try again.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setPaymentStatus("processing");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/fines/payment/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setPaymentStatus("failed");
        setErrorMessage(error.message || "An unexpected error occurred.");
        onError(error.message || "Payment failed");
        toast.error(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setPaymentStatus("succeeded");
        toast.success("Payment successful!");
        onSuccess();
      } else {
        setPaymentStatus("processing");
        toast.info("Your payment is processing...");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setPaymentStatus("failed");
      setErrorMessage(errorMsg);
      onError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents);
  };

  if (paymentStatus === "succeeded") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Payment Successful!
          </h3>
          <p className="text-sm text-gray-600">
            Your fine payment of {formatAmount(amount)} has been processed
            successfully.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Pay Fine - {formatAmount(amount)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Payment Information</h4>
              <PaymentElement />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Billing Address</h4>
              <AddressElement options={{ mode: "billing" }} />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!stripe || isLoading || paymentStatus === "processing"}
            className="w-full"
          >
            {isLoading || paymentStatus === "processing" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>Pay {formatAmount(amount)}</>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your payment is secured by Stripe. Your card information is
            encrypted and never stored on our servers.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
