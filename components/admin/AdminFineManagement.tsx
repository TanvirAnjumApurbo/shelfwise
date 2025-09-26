"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calculator, RefreshCw, CheckCircle } from "lucide-react";

interface FineCalculationResult {
  success: boolean;
  data?: Array<{
    userId: string;
    bookId: string;
    borrowRecordId: string;
    daysOverdue: number;
    totalFine: number;
    isBookLost: boolean;
    description: string;
  }>;
  error?: string;
}

export default function AdminFineManagement() {
  const [calculationResult, setCalculationResult] =
    useState<FineCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculateFines = async () => {
    try {
      setLoading(true);
      setCalculationResult(null);

      const response = await fetch("/api/admin/fines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "calculate_fines" }),
      });

      const result = await response.json();
      setCalculationResult(result);
    } catch (error) {
      console.error("Error calculating fines:", error);
      setCalculationResult({
        success: false,
        error: "Failed to calculate fines",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDailyJob = async () => {
    try {
      setLoading(true);
      setCalculationResult(null);

      const response = await fetch("/api/admin/fines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "daily_job" }),
      });

      const result = await response.json();
      setCalculationResult(result);
    } catch (error) {
      console.error("Error running daily job:", error);
      setCalculationResult({
        success: false,
        error: "Failed to run daily job",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Fine Calculation Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={handleCalculateFines}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Calculate Overdue Fines
            </Button>
            <Button
              onClick={handleDailyJob}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Run Daily Job
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {calculationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {calculationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculationResult.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="text-sm">
                    Success
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {calculationResult.data?.length || 0} new fines calculated
                  </span>
                </div>

                {calculationResult.data &&
                  calculationResult.data.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold">New Fines Created:</h4>
                      {calculationResult.data.map((fine, index) => (
                        <div
                          key={`${fine.borrowRecordId}-${index}`}
                          className="p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                User: {fine.userId.slice(0, 8)}...
                              </p>
                              <p className="text-xs text-gray-600">
                                {fine.daysOverdue} days overdue
                              </p>
                              <p className="text-xs text-gray-600">
                                {fine.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-red-600">
                                ${fine.totalFine.toFixed(2)}
                              </p>
                              {fine.isBookLost && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  LOST BOOK
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{calculationResult.error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>Penalty System Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Borrowing Rules:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 7 days free borrowing period</li>
                  <li>• No fines during free period</li>
                  <li>• Must have no pending fines to borrow</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Penalty Rules:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Day 8: $10 flat penalty</li>
                  <li>• Days 9-14: +$0.5 per day</li>
                  <li>• Day 15+: Book lost = Price + 30%</li>
                  <li>• Fines &gt; $60 = Account restriction</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-xs">
                <strong>Penalty System:</strong> 7 days free → Day 8: $10 flat
                fee → Days 9-14: +$0.5/day → Day 15+: Lost book (Book Price +
                30% penalty). Account restrictions apply when total fines exceed
                $60.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
