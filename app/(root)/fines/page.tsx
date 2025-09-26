import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserFineStatus } from "@/lib/services/fine-service";
import { getUserUnpaidFines } from "@/lib/services/payment-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PayNowButton from "@/components/PayNowButton";
import {
  CreditCard,
  DollarSign,
  BookOpen,
  AlertTriangle,
  Calendar,
  CheckCircle,
  History,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default async function FinesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [fineStatusResult, unpaidFinesResult] = await Promise.all([
    getUserFineStatus(session.user.id),
    getUserUnpaidFines(session.user.id),
  ]);

  if (!fineStatusResult.success || !fineStatusResult.data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">My Fines</h1>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">Failed to load fine information</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fineStatus = fineStatusResult.data;
  const unpaidFines = unpaidFinesResult.success
    ? unpaidFinesResult.data || []
    : [];
  const hasOutstandingFines = fineStatus.totalFinesOwed > 0;
  const totalOutstandingAmount = unpaidFines.reduce(
    (sum, fine) => sum + fine.amount,
    0
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Fines</h1>
          <p className="text-gray-600 mt-2">
            Manage and pay your library fines securely with Stripe
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="text-lg font-semibold">Total Outstanding</h3>
              <p
                className={`text-2xl font-bold ${
                  hasOutstandingFines ? "text-red-600" : "text-green-600"
                }`}
              >
                {formatAmount(totalOutstandingAmount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Unpaid fine amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <h3 className="text-lg font-semibold">Active Fines</h3>
              <p className="text-2xl font-bold text-orange-600">
                {fineStatus.activeFines.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Pending payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <h3 className="text-lg font-semibold">Account Status</h3>
              <div className="mt-2">
                {fineStatus.isRestricted ? (
                  <Badge variant="destructive">Restricted</Badge>
                ) : (
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Good Standing
                  </Badge>
                )}
              </div>
              {fineStatus.isRestricted && (
                <p className="text-xs text-red-600 mt-1">Fines ≥ $60.00</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Restriction Notice */}
        {fineStatus.isRestricted && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Account Restricted
                  </h3>
                  <p className="text-red-700 mb-2">
                    Your account has been restricted due to outstanding fines
                    exceeding $60.
                  </p>
                  <p className="text-sm text-red-600 mb-4">
                    <strong>Reason:</strong> {fineStatus.restrictions.reason}
                  </p>
                  {fineStatus.restrictions.restrictedAt && (
                    <p className="text-sm text-red-600 mb-4">
                      <strong>Restricted on:</strong>{" "}
                      {formatDate(
                        fineStatus.restrictions.restrictedAt.toString()
                      )}
                    </p>
                  )}
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      ⚠️ Restriction Effects:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Cannot borrow new books</li>
                      <li>• Can still return borrowed books</li>
                      <li>
                        •{" "}
                        <strong>
                          Fines continue to accumulate daily until books are
                          returned
                        </strong>
                      </li>
                      <li>
                        • Restrictions automatically lift when fines are below
                        $60
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Outstanding Fines with Pay Now */}
        {hasOutstandingFines ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Outstanding Fines
                </div>
                <div className="flex gap-2">
                  <PayNowButton
                    fines={unpaidFines}
                    totalAmount={totalOutstandingAmount}
                    userId={session.user.id}
                    variant="default"
                    size="default"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fine Payment Rule Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">
                      Important Fine Rules
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>
                        •{" "}
                        <strong>
                          Fines continue daily until books are returned and
                          approved by admin
                        </strong>
                      </li>
                      <li>• Payment alone does not stop fine accumulation</li>
                      <li>• Multiple partial payments are supported</li>
                      <li>
                        • Outstanding = Total Accumulated Fine - Total Payments
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {fineStatus.activeFines.map((fine) => {
                const unpaidFine = unpaidFines.find((f) => f.id === fine.id);
                const outstandingAmount = unpaidFine?.amount || 0;

                return (
                  <Card key={fine.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            {fine.bookTitle}
                            {fine.isBookLost && (
                              <Badge variant="destructive" className="text-xs">
                                Lost Book
                              </Badge>
                            )}
                            {fine.daysOverdue > 14 && (
                              <Badge
                                variant="outline"
                                className="text-xs text-orange-600 border-orange-600"
                              >
                                Critical
                              </Badge>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {fine.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              {fine.daysOverdue} days overdue
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-red-600 mb-2">
                            {formatAmount(outstandingAmount)}
                          </div>
                          {unpaidFine && (
                            <PayNowButton
                              fines={[unpaidFine]}
                              totalAmount={outstandingAmount}
                              userId={session.user.id}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Payment Breakdown */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">
                  Fine Breakdown by Penalty Type
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900">Days 1-7</h5>
                    <p className="text-gray-600">Free borrowing period</p>
                    <p className="text-green-600 font-semibold">$0.00</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900">Day 8</h5>
                    <p className="text-gray-600">First late day penalty</p>
                    <p className="text-orange-600 font-semibold">$10.00</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900">Days 9-14</h5>
                    <p className="text-gray-600">Daily accumulation</p>
                    <p className="text-orange-600 font-semibold">$0.50/day</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900">Day 15+</h5>
                    <p className="text-gray-600">Book marked as lost</p>
                    <p className="text-red-600 font-semibold">
                      Book Price + 30%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                No Outstanding Fines!
              </h3>
              <p className="text-green-700">
                Your account is in good standing with no pending fine payments.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment History Link */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View your complete payment transaction history including Stripe
              payments.
            </p>
            <Link href="/fines/history">
              <Button variant="outline">
                <History className="w-4 h-4 mr-2" />
                View Payment History
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Account Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Account Privileges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    fineStatus.canBorrow ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={
                    fineStatus.canBorrow ? "text-green-800" : "text-red-800"
                  }
                >
                  {fineStatus.canBorrow
                    ? "Can borrow books"
                    : "Cannot borrow books"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    fineStatus.canReturnBooks ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={
                    fineStatus.canReturnBooks
                      ? "text-green-800"
                      : "text-red-800"
                  }
                >
                  {fineStatus.canReturnBooks
                    ? "Can return books"
                    : "Cannot return books"}
                </span>
              </div>
            </div>

            {!fineStatus.canBorrow && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Pay outstanding fines to restore
                  borrowing privileges. You can still return books even with
                  outstanding fines.{" "}
                  <strong>
                    Fines continue to accumulate until books are returned and
                    approved.
                  </strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/library">
              <Button variant="outline">Browse Library</Button>
            </Link>
            <Link href="/my-profile">
              <Button variant="outline">My Profile</Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            Questions about your fines? Contact library administration for
            assistance.
            <br />
            All payments are processed securely through Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
