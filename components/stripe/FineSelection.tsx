"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CreditCard,
  DollarSign,
  Calendar,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
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

interface FineSelectionProps {
  userId: string;
  onPaymentClick: (selectedFines: Fine[]) => void;
}

export default function FineSelection({
  userId,
  onPaymentClick,
}: FineSelectionProps) {
  const [fines, setFines] = useState<Fine[]>([]);
  const [selectedFines, setSelectedFines] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUnpaidFines();
  }, [userId]);

  const fetchUnpaidFines = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/payments?action=unpaid-fines`);
      const result = await response.json();

      if (result.success) {
        setFines(result.data || []);
        // Auto-select all fines by default
        setSelectedFines(
          new Set(result.data?.map((fine: Fine) => fine.id) || [])
        );
      } else {
        setError(result.error || "Failed to fetch fines");
        toast.error(result.error || "Failed to fetch fines");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch fines";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFineToggle = (fineId: string) => {
    const newSelected = new Set(selectedFines);
    if (newSelected.has(fineId)) {
      newSelected.delete(fineId);
    } else {
      newSelected.add(fineId);
    }
    setSelectedFines(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFines.size === fines.length) {
      setSelectedFines(new Set());
    } else {
      setSelectedFines(new Set(fines.map((fine) => fine.id)));
    }
  };

  const selectedFineData = fines.filter((fine) => selectedFines.has(fine.id));
  const totalAmount = selectedFineData.reduce(
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

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading your fines...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={fetchUnpaidFines} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fines.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="text-green-600">
            <DollarSign className="w-8 h-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-2">No Outstanding Fines</h3>
            <p className="text-gray-600">
              You don't have any unpaid fines at the moment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Outstanding Fines ({fines.length})
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedFines.size === fines.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fines.map((fine) => (
            <Card key={fine.id} className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedFines.has(fine.id)}
                    onCheckedChange={() => handleFineToggle(fine.id)}
                    className="mt-1"
                  />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {fine.bookTitle}
                          {fine.isBookLost && (
                            <Badge variant="destructive" className="text-xs">
                              Lost Book
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {fine.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {formatAmount(fine.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {formatDate(fine.dueDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {fine.daysOverdue} days overdue
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {selectedFines.size > 0 && (
        <Card className="w-full bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Payment Summary</h3>
                <p className="text-sm text-gray-600">
                  {selectedFines.size} fine{selectedFines.size > 1 ? "s" : ""}{" "}
                  selected
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {formatAmount(totalAmount)}
                </div>
                <Button
                  onClick={() => onPaymentClick(selectedFineData)}
                  className="mt-2"
                  disabled={selectedFines.size === 0}
                >
                  Pay Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
