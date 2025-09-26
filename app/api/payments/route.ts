import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserUnpaidFines,
  createPaymentIntent,
  CompletePaymentParams,
  completePayment,
  handleFailedPayment,
  getPaymentTransaction,
} from "@/lib/services/payment-service";
import { z } from "zod";

// Schema for creating payment intent
const CreatePaymentIntentSchema = z.object({
  fineIds: z.array(z.string().uuid()),
  returnUrl: z.string().url().optional(),
});

// Schema for completing payment
const CompletePaymentSchema = z.object({
  paymentIntentId: z.string(),
  transactionId: z.string().uuid().optional(),
});

// Schema for handling failed payment
const FailedPaymentSchema = z.object({
  paymentIntentId: z.string(),
  errorMessage: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const transactionId = searchParams.get("transactionId");

    switch (action) {
      case "unpaid-fines":
        const finesResult = await getUserUnpaidFines(session.user.id);
        return NextResponse.json(finesResult);

      case "transaction":
        if (!transactionId) {
          return NextResponse.json(
            { success: false, error: "Transaction ID required" },
            { status: 400 }
          );
        }
        const transactionResult = await getPaymentTransaction(transactionId);
        return NextResponse.json(transactionResult);

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in payment API (GET):", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create-intent":
        const createIntentValidation =
          CreatePaymentIntentSchema.safeParse(data);
        if (!createIntentValidation.success) {
          return NextResponse.json(
            { success: false, error: "Invalid request data" },
            { status: 400 }
          );
        }

        const intentResult = await createPaymentIntent({
          userId: session.user.id,
          fineIds: createIntentValidation.data.fineIds,
          returnUrl: createIntentValidation.data.returnUrl,
        });

        return NextResponse.json(intentResult);

      case "complete-payment":
        const completeValidation = CompletePaymentSchema.safeParse(data);
        if (!completeValidation.success) {
          return NextResponse.json(
            { success: false, error: "Invalid request data" },
            { status: 400 }
          );
        }

        const completeResult = await completePayment(completeValidation.data);
        return NextResponse.json(completeResult);

      case "handle-failed":
        const failedValidation = FailedPaymentSchema.safeParse(data);
        if (!failedValidation.success) {
          return NextResponse.json(
            { success: false, error: "Invalid request data" },
            { status: 400 }
          );
        }

        const failedResult = await handleFailedPayment(
          failedValidation.data.paymentIntentId,
          failedValidation.data.errorMessage
        );
        return NextResponse.json(failedResult);

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in payment API (POST):", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
