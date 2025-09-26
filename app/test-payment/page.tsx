"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testPayment = async () => {
    try {
      setLoading(true);
      setResult(null);

      console.log("🚀 Testing payment API...");

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fineIds: ["test-fine-id"], // dummy fine ID for testing
          returnUrl: `${window.location.origin}/fines/payment/success`,
        }),
      });

      console.log("📡 Response status:", response.status);
      console.log(
        "📡 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const data = await response.json();
      console.log("📦 Response data:", data);

      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data,
      });

      if (data.success && data.sessionUrl) {
        console.log("✅ Success! Redirecting to:", data.sessionUrl);
        // Don't actually redirect for testing
        // window.location.href = data.sessionUrl;
      } else {
        console.log("❌ Error:", data.error);
      }
    } catch (error) {
      console.error("💥 Fetch error:", error);
      setResult({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Payment API Test</h1>

      <Button onClick={testPayment} disabled={loading}>
        {loading ? "Testing..." : "Test Payment API"}
      </Button>

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>Check the browser console for detailed logs.</p>
        <p>This test page helps debug the payment API integration.</p>
      </div>
    </div>
  );
}
