import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function StripeTestPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            Stripe Payment System Demo
          </h1>
          <p className="text-gray-600">
            Complete fine payment system with Stripe integration. This demo
            shows how users can pay their library fines using credit cards.
          </p>
        </div>

        {/* Demo Cards */}
        <div className="grid gap-6 mb-8">
          {/* System Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment System Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Stripe Integration</h3>
                  <p className="text-sm text-gray-600">
                    Secure payment processing with Stripe Elements
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Fine Selection</h3>
                  <p className="text-sm text-gray-600">
                    Select specific fines or pay all at once
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Real-time Updates</h3>
                  <p className="text-sm text-gray-600">
                    Instant account updates after payment
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Multiple Methods</h3>
                  <p className="text-sm text-gray-600">
                    Cards, bank transfers, and more
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo Fines */}
          <Card>
            <CardHeader>
              <CardTitle>Demo: Sample Outstanding Fines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="border rounded-lg p-4 border-l-4 border-l-red-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">The Great Gatsby</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Late return penalty: 12 days overdue
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <span>Due: Dec 1, 2024</span>
                        <span>12 days overdue</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        $12.50
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 border-l-4 border-l-red-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">To Kill a Mockingbird</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Lost book fee: Book Price + 30% penalty
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <span>Due: Nov 20, 2024</span>
                        <span>23 days overdue</span>
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                          Lost Book
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        $32.50
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Total Outstanding</h3>
                    <p className="text-sm text-gray-600">2 fines selected</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      $45.00
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Test Payment Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/fines">
                  <Button className="w-full h-16 text-lg">
                    <CreditCard className="w-6 h-6 mr-2" />
                    View My Actual Fines
                  </Button>
                </Link>

                <Link href="/fines/payment">
                  <Button variant="outline" className="w-full h-16 text-lg">
                    <DollarSign className="w-6 h-6 mr-2" />
                    Go to Payment Page
                  </Button>
                </Link>
              </div>

              <div className="text-center text-sm text-gray-500 mt-6">
                <p>
                  <strong>Test Mode:</strong> Use test card number 4242 4242
                  4242 4242 with any future expiry date and CVC.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Implementation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Features Implemented</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>✅ Stripe payment intent creation</li>
                    <li>✅ Secure payment form with Stripe Elements</li>
                    <li>✅ Payment confirmation and webhooks</li>
                    <li>✅ Database transaction tracking</li>
                    <li>✅ Real-time fine status updates</li>
                    <li>✅ User account restriction management</li>
                    <li>✅ Payment history and audit logs</li>
                    <li>✅ Responsive payment UI</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">API Endpoints</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>
                      <code>/api/payments</code> - Payment management
                    </li>
                    <li>
                      <code>/api/webhooks/stripe</code> - Stripe webhooks
                    </li>
                    <li>
                      <code>/api/admin/fines</code> - Fine calculations
                    </li>
                    <li>
                      <code>/fines</code> - User fine dashboard
                    </li>
                    <li>
                      <code>/fines/payment</code> - Payment flow
                    </li>
                    <li>
                      <code>/fines/payment/success</code> - Success page
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This is a demo system using Stripe test
                  mode. In production, ensure proper webhook endpoint
                  configuration and use live Stripe keys.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Links */}
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/admin/migrate-payment">
              <Button variant="outline" size="sm">
                Admin: Run Migration
              </Button>
            </Link>
            <Link href="/admin/fines">
              <Button variant="outline" size="sm">
                Admin: Fine Management
              </Button>
            </Link>
            <Link href="/library">
              <Button variant="outline" size="sm">
                Back to Library
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
