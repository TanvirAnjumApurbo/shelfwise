"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminMigrationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runMigration = async () => {
    try {
      setIsRunning(true);
      setResult(null);

      const response = await fetch("/api/admin/migrate-payment-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult("✅ Migration completed successfully!");
        toast.success("Migration completed successfully!");
      } else {
        setResult(`❌ Migration failed: ${data.error}`);
        toast.error(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setResult(`❌ Migration failed: ${errorMsg}`);
      toast.error(`Migration failed: ${errorMsg}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Payment Schema Migration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Run this migration to set up the payment schema for Stripe fine
            payments. This will create the necessary tables and constraints in
            your database.
          </p>

          <Button
            onClick={runMigration}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Migration...
              </>
            ) : (
              "Run Payment Schema Migration"
            )}
          </Button>

          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.includes("✅")
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
