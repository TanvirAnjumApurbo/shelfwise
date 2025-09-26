import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { getPaymentTransaction } from "@/lib/services/payment-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  CreditCard,
  Calendar,
  DollarSign,
  BookOpen,
  Download,
  Home,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface PaymentSuccessContentProps {
  searchParams: { session_id?: string; transaction_id?: string };
}

async function PaymentSuccessContent({
  searchParams,
}: PaymentSuccessContentProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const sessionId = searchParams.session_id;

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Invalid Payment Session
            </h2>
            <p className="text-gray-600 mb-6">
              No payment session found. Please try making a payment again.
            </p>
            <Link href="/fines">
              <Button>Return to Fines</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  try {
    // Retrieve checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-yellow-800 mb-2">
                Payment Pending
              </h2>
              <p className="text-gray-600 mb-6">
                Your payment is still being processed. Please wait a few moments
                and check your fines page.
              </p>
              <div className="space-x-2">
                <Link href="/fines">
                  <Button>Check Fines Status</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Get transaction details
    const transactionId = checkoutSession.metadata?.transactionId;
    let transactionDetails = null;

    if (transactionId) {
      const transactionResult = await getPaymentTransaction(transactionId);
      if (transactionResult.success) {
        transactionDetails = transactionResult.data;
      }
    }

    const amountPaid = (checkoutSession.amount_total || 0) / 100; // Convert from cents
    const fineIds = checkoutSession.metadata?.fineIds
      ? JSON.parse(checkoutSession.metadata.fineIds)
      : [];

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-800 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 text-lg">
              Your fine payment has been processed successfully
            </p>
          </div>

          {/* Payment Details Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-800">
                      Amount Paid
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      ${amountPaid.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium">Credit Card</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Session ID</span>
                      <span className="font-mono text-sm">{sessionId}</span>
                    </div>
                    {checkoutSession.payment_intent && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Intent</span>
                        <span className="font-mono text-sm">
                          {checkoutSession.payment_intent.toString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">
                    Transaction Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fines Paid</span>
                      <span className="font-medium">
                        {fineIds.length} item(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <Badge className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    </div>
                    {transactionDetails && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID</span>
                        <span className="font-mono text-sm">
                          {transactionDetails.id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Confirmation Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">
                      Receipt and Confirmation
                    </h4>
                    <p className="text-sm text-blue-700">
                      A payment confirmation email has been sent to your
                      registered email address. You can also download a PDF
                      receipt from your payment history.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-orange-800">
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 mb-3">
                  ⚠️ Fine Payment Rules
                </h4>
                <ul className="text-sm text-orange-700 space-y-2">
                  <li>
                    <strong>
                      • Fines continue to accumulate daily until books are
                      returned
                    </strong>
                  </li>
                  <li>• Payment alone does not stop fine accumulation</li>
                  <li>
                    • You must still return the physical books to the library
                  </li>
                  <li>
                    • Returns require admin approval to stop fine accumulation
                  </li>
                  <li>
                    • Account restrictions automatically lift when total fines
                    are below $60
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">
                  ✅ What happens next?
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Your payment has been recorded in our system</li>
                  <li>• Your account balance has been updated</li>
                  <li>• You can now check your updated fine status</li>
                  <li>
                    • Remember to return any borrowed books to avoid additional
                    fines
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/fines">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  View Updated Fine Status
                </Button>
              </Link>

              <Link href="/library">
                <Button size="lg" variant="outline">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Library
                </Button>
              </Link>

              <Link href="/fines/history">
                <Button size="lg" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Payment History
                </Button>
              </Link>
            </div>

            <div className="pt-4">
              <Link href="/">
                <Button variant="ghost" className="text-gray-600">
                  <Home className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <Card className="mt-8 bg-gray-50">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                If you have questions about your payment or fine status, please
                contact library administration.
              </p>
              <div className="text-xs text-gray-500">
                Payment processed securely by Stripe • Session ID: {sessionId}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error retrieving payment session:", error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Error Loading Payment Details
            </h2>
            <p className="text-gray-600 mb-6">
              We couldn't verify your payment session. Please check your fines
              page for the latest status.
            </p>
            <Link href="/fines">
              <Button>Check Fines Status</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; transaction_id?: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p>Loading payment details...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PaymentSuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
