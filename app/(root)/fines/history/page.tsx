import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/drizzle";
import { finePayments, fines, books, users } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  CreditCard,
  Calendar,
  BookOpen,
  ArrowLeft,
  DollarSign,
  Download,
} from "lucide-react";
import Link from "next/link";

export default async function PaymentHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Get user's payment history
  const paymentHistory = await db
    .select({
      payment: finePayments,
      fine: fines,
      book: {
        title: books.title,
        author: books.author,
      },
    })
    .from(finePayments)
    .innerJoin(fines, eq(finePayments.fineId, fines.id))
    .innerJoin(books, eq(fines.bookId, books.id))
    .where(eq(finePayments.userId, session.user.id))
    .orderBy(desc(finePayments.paymentDate));

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case "STRIPE_CARD":
        return <Badge className="bg-blue-100 text-blue-800">Credit Card</Badge>;
      case "CASH":
        return <Badge className="bg-green-100 text-green-800">Cash</Badge>;
      case "STUB":
        return (
          <Badge className="bg-gray-100 text-gray-800">Stub Payment</Badge>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const totalPaid = paymentHistory.reduce(
    (sum, record) => sum + Number(record.payment.amount),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/fines">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Fines
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="w-8 h-8" />
            Payment History
          </h1>
          <p className="text-gray-600 mt-2">
            View all your fine payments and transaction details
          </p>
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800">
                  Total Payments
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatAmount(totalPaid)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">
                  Total Transactions
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {paymentHistory.length}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800">
                  Most Recent
                </h3>
                <p className="text-sm font-medium text-gray-600">
                  {paymentHistory.length > 0
                    ? formatDate(paymentHistory[0].payment.paymentDate)
                    : "No payments yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </div>
              <Button variant="outline" size="sm" disabled>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Payment History
                </h3>
                <p className="text-gray-600">
                  You haven't made any fine payments yet.
                </p>
                <Link href="/fines" className="mt-4 inline-block">
                  <Button>View Current Fines</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((record) => (
                  <Card
                    key={record.payment.id}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              {record.book.title}
                            </h4>
                            {getPaymentMethodBadge(
                              record.payment.paymentMethod || "UNKNOWN"
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Author:</strong> {record.book.author}
                          </p>

                          {record.fine.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Fine Description:</strong>{" "}
                              {record.fine.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(record.payment.paymentDate)}
                            </div>

                            {record.payment.paymentReference && (
                              <div className="flex items-center gap-1">
                                <CreditCard className="w-4 h-4" />
                                <span className="font-mono text-xs">
                                  {record.payment.paymentReference.startsWith(
                                    "cs_"
                                  ) ||
                                  record.payment.paymentReference.startsWith(
                                    "pi_"
                                  )
                                    ? record.payment.paymentReference.substring(
                                        0,
                                        20
                                      ) + "..."
                                    : record.payment.paymentReference}
                                </span>
                              </div>
                            )}
                          </div>

                          {record.payment.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              <strong>Notes:</strong> {record.payment.notes}
                            </div>
                          )}
                        </div>

                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-green-600 mb-1">
                            {formatAmount(Number(record.payment.amount))}
                          </div>
                          <div className="text-xs text-gray-500">
                            Payment ID: {record.payment.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8 bg-blue-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Understanding Your Payment History
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
              <div>
                <h4 className="font-medium mb-2">Payment Methods</h4>
                <ul className="space-y-1">
                  <li>
                    • <strong>Credit Card:</strong> Stripe payment processing
                  </li>
                  <li>
                    • <strong>Cash:</strong> In-person payment at library
                  </li>
                  <li>
                    • <strong>Stub Payment:</strong> Temporary/test payment
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Important Notes</h4>
                <ul className="space-y-1">
                  <li>• Payments are applied immediately to your account</li>
                  <li>
                    • Fines continue until books are returned and approved
                  </li>
                  <li>• Contact library for payment disputes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/fines">
              <Button size="lg">
                <DollarSign className="w-4 h-4 mr-2" />
                View Current Fines
              </Button>
            </Link>
            <Link href="/library">
              <Button size="lg" variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Library
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            All payments are processed securely. Contact library administration
            if you have questions about any transaction.
          </p>
        </div>
      </div>
    </div>
  );
}
