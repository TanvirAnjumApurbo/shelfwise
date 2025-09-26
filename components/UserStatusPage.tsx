"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Clock,
  Book,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface FineDetail {
  id: string;
  bookTitle: string;
  amount: number;
  daysOverdue: number;
  isBookLost: boolean;
  description: string;
}

interface UserStatusData {
  canBorrow: boolean;
  canReturnBooks: boolean;
  isRestricted: boolean;
  totalFinesOwed: number;
  restrictionReason: string | null;
  activeFinesCount: number;
  summary: string;
  activeFines: FineDetail[];
}

interface UserStatusPageProps {
  userId: string;
}

export default function UserStatusPage({ userId }: UserStatusPageProps) {
  const [statusData, setStatusData] = useState<UserStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    fetchUserStatus();
  }, [userId]);

  const fetchUserStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user-status/${userId}`);
      const result = await response.json();

      if (result.success) {
        setStatusData(result.data);
      } else {
        setError(result.error || "Failed to fetch status");
      }
    } catch (err) {
      setError("Failed to load status data");
      console.error("Error fetching user status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (fineId?: string) => {
    if (!statusData) return;

    const targetFineIds = fineId
      ? [fineId]
      : statusData.activeFines.map((f) => f.id).filter(Boolean);

    if (!targetFineIds.length) {
      toast.error("No fines to pay");
      return;
    }

    try {
      setPaymentProcessing(fineId || "all");

      console.log("🧾 Creating checkout session for fines:", targetFineIds);
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fineIds: targetFineIds,
          returnUrl: `${window.location.origin}/fines/payment/success`,
        }),
      });

      const result = await response.json();
      console.log("📦 Checkout session response:", result);

      if (response.ok && result.success && result.sessionUrl) {
        toast.success("Redirecting to secure Stripe checkout...");
        window.location.href = result.sessionUrl as string;
        return; // Do not reset state; leaving page
      }

      toast.error(result.error || "Failed to start payment");
    } catch (err) {
      console.error("Payment processing error:", err);
      toast.error("Payment initialization failed");
    } finally {
      setPaymentProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="gradient-vertical rounded-2xl p-8 border border-blue-500/30 shadow-xl">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-4 shadow-xl animate-spin">
                <Clock className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-2 animate-pulse">
              Loading your status...
            </div>
            <div className="text-light-100">
              Please wait while we fetch your library information
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="gradient-vertical rounded-2xl p-8 border border-red-500/30 shadow-xl">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-full p-4 shadow-xl">
                <AlertCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">
              Unable to Load Status
            </h2>
            <p className="text-red-200 mb-6 text-center max-w-md">{error}</p>
            <Button
              onClick={fetchUserStatus}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="gradient-vertical rounded-2xl p-8 border border-gray-500/30 shadow-xl">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gray-500/20 blur-xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-gray-500 to-gray-600 rounded-full p-4 shadow-xl">
                <AlertCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              No Status Data Available
            </div>
            <div className="text-light-100">
              Unable to retrieve your library status information
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Status Section */}
      <div className="text-center mb-12">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-xl rounded-full"></div>
          <h1 className="relative text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Your Library Status
          </h1>
        </div>
      </div>

      {/* Main Status Display */}
      {statusData.totalFinesOwed > 0 ? (
        <div className="gradient-vertical rounded-3xl p-8 mb-8 border border-red-500/30 shadow-2xl">
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-full p-6 shadow-2xl">
                <AlertCircle className="h-16 w-16 text-white" />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Outstanding Fines
            </h2>
            <div className="relative inline-block">
              <div className="text-6xl md:text-8xl font-black text-red-600 mb-2">
                ${statusData.totalFinesOwed.toFixed(2)}
              </div>
              <div className="text-pink-200 text-lg font-semibold">
                {statusData.activeFinesCount} active fine
                {statusData.activeFinesCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-8">
            <Button
              onClick={() => handlePayNow()}
              disabled={paymentProcessing === "all"}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-12 py-6 text-xl rounded-2xl shadow-2xl transform transition-all duration-200 hover:scale-105 border border-blue-400/30"
            >
              <CreditCard className="h-6 w-6 mr-3" />
              {paymentProcessing === "all"
                ? "Processing..."
                : "Pay All Fines Now"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="gradient-vertical rounded-3xl p-8 mb-8 border border-green-500/30 shadow-2xl">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-6 shadow-2xl">
                <CheckCircle2 className="h-16 w-16 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-4">
              All Clear! ✨
            </h2>
            <p className="text-xl text-green-200 mb-8 font-medium">
              You have no outstanding fines and full library access
            </p>
            <Button
              onClick={() => router.push("/books")}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-4 text-lg rounded-2xl shadow-2xl transform transition-all duration-200 hover:scale-105 border border-green-400/30"
            >
              <Book className="h-5 w-5 mr-2" />
              Browse Books
            </Button>
          </div>
        </div>
      )}

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="gradient-vertical rounded-2xl p-6 border border-blue-500/30 shadow-xl">
          <div className="text-center">
            <div
              className={`rounded-full p-4 mb-4 mx-auto w-fit ${
                statusData.canBorrow
                  ? "bg-green-500/20 border border-green-400/30"
                  : "bg-red-500/20 border border-red-400/30"
              }`}
            >
              <Book
                className={`h-8 w-8 ${
                  statusData.canBorrow ? "text-green-400" : "text-red-400"
                }`}
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Borrow Status</h3>
            <Badge
              variant={statusData.canBorrow ? "default" : "destructive"}
              className={`text-lg px-4 py-2 ${
                statusData.canBorrow
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {statusData.canBorrow ? "Available ✓" : "Restricted ✗"}
            </Badge>
          </div>
        </div>

        <div className="gradient-vertical rounded-2xl p-6 border border-blue-500/30 shadow-xl">
          <div className="text-center">
            <div
              className={`rounded-full p-4 mb-4 mx-auto w-fit ${
                statusData.canReturnBooks
                  ? "bg-green-500/20 border border-green-400/30"
                  : "bg-red-500/20 border border-red-400/30"
              }`}
            >
              <Book
                className={`h-8 w-8 ${
                  statusData.canReturnBooks ? "text-green-400" : "text-red-400"
                }`}
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Return Status</h3>
            <Badge
              variant={statusData.canReturnBooks ? "default" : "destructive"}
              className={`text-lg px-4 py-2 ${
                statusData.canReturnBooks
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {statusData.canReturnBooks ? "Available ✓" : "Restricted ✗"}
            </Badge>
          </div>
        </div>

        <div className="gradient-vertical rounded-2xl p-6 border border-blue-500/30 shadow-xl">
          <div className="text-center">
            <div
              className={`rounded-full p-4 mb-4 mx-auto w-fit ${
                statusData.isRestricted
                  ? "bg-red-500/20 border border-red-400/30"
                  : "bg-green-500/20 border border-green-400/30"
              }`}
            >
              {statusData.isRestricted ? (
                <AlertCircle className="h-8 w-8 text-red-400" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Account Status
            </h3>
            <Badge
              variant={statusData.isRestricted ? "destructive" : "default"}
              className={`text-lg px-4 py-2 ${
                statusData.isRestricted
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {statusData.isRestricted ? "Restricted" : "Active"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Fine Details */}
      {statusData.totalFinesOwed > 0 && (
        <div className="gradient-vertical rounded-2xl p-6 mb-8 border border-red-500/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              Fine Details ({statusData.activeFinesCount})
            </h3>
          </div>
          <div className="space-y-4">
            {statusData.activeFines.map((fine) => (
              <div
                key={fine.id}
                className="bg-gradient-to-r from-red-900/30 to-red-800/30 rounded-xl p-6 border border-red-500/30 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Book className="h-5 w-5 text-red-400" />
                      <h4 className="text-xl font-bold text-white">
                        {fine.bookTitle}
                      </h4>
                      {fine.isBookLost && (
                        <Badge
                          variant="destructive"
                          className="bg-red-600 text-white text-xs font-bold px-3 py-1 border-red-400"
                        >
                          LOST BOOK
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-200 mb-3 text-lg">
                      {fine.description}
                    </p>
                    <div className="flex items-center gap-6 text-gray-300">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-400" />
                        <span className="font-semibold text-white">
                          {fine.daysOverdue} days overdue
                        </span>
                      </span>
                      <span className="text-2xl font-black text-red-500">
                        ${fine.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handlePayNow(fine.id)}
                    disabled={paymentProcessing === fine.id}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 border border-blue-400/30"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {paymentProcessing === fine.id
                      ? "Processing..."
                      : "Pay Now"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Restrictions */}
      {statusData.isRestricted && (
        <div className="gradient-vertical rounded-2xl p-6 mb-8 border border-red-500/30 shadow-xl">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-full p-4 shadow-xl">
                <AlertCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-red-400 mb-4">
              Account Restricted
            </h3>
            <p className="text-xl text-gray-200 mb-6">
              {statusData.restrictionReason ||
                "Your account has been restricted."}
            </p>
            <div className="bg-gradient-to-r from-red-900/40 to-red-800/40 rounded-xl p-6 border border-red-500/30 text-left">
              <h4 className="font-bold text-red-400 mb-4 text-lg">
                While your account is restricted:
              </h4>
              <ul className="text-gray-200 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  You cannot make new borrow requests
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  You can still return borrowed books
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Pay all outstanding fines to restore full access
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  Contact library staff if you need assistance
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <Button
          onClick={fetchUserStatus}
          variant="outline"
          disabled={loading}
          className="bg-dark-300 border-light-100/20 text-light-100 hover:bg-dark-200 hover:text-white px-8 py-3 rounded-xl font-semibold"
        >
          {loading ? "Refreshing..." : "Refresh Status"}
        </Button>
      </div>
    </div>
  );
}
