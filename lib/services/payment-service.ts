"use server";

import { db } from "@/database/drizzle";
import {
  fines,
  users,
  books,
  paymentTransactions,
  finePayments,
} from "@/database/schema";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import { updateUserRestrictions } from "@/lib/services/fine-service";

export interface CreatePaymentIntentParams {
  userId: string;
  fineIds: string[];
  returnUrl?: string;
}

export interface CreatePaymentIntentResult {
  success: boolean;
  paymentIntent?: {
    id: string;
    clientSecret: string;
    amount: number;
    transactionId: string;
  };
  error?: string;
}

export interface CompletePaymentParams {
  paymentIntentId: string;
  transactionId?: string;
}

export interface CompletePaymentResult {
  success: boolean;
  data?: {
    transactionId: string;
    amountPaid: number;
    finesPaid: string[];
  };
  error?: string;
}

export interface CheckoutSessionCompletedParams {
  sessionId: string;
  paymentIntentId: string;
  customerEmail: string | null;
  amountPaid: number;
  paymentStatus: string;
  metadata: { [key: string]: string };
}

export interface CheckoutSessionCompletedResult {
  success: boolean;
  data?: {
    transactionId: string;
    amountPaid: number;
    userId: string;
  };
  error?: string;
}

/**
 * Get user's unpaid fines for payment processing
 */
export const getUserUnpaidFines = async (
  userId: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    amount: number;
    bookTitle: string;
    description: string;
    daysOverdue: number;
    dueDate: string;
    isBookLost: boolean;
  }>;
  error?: string;
}> => {
  try {
    const unpaidFines = await db
      .select({
        fine: fines,
        book: books,
      })
      .from(fines)
      .innerJoin(books, eq(fines.bookId, books.id))
      .where(and(eq(fines.userId, userId), eq(fines.status, "PENDING")));

    const fineData = unpaidFines.map(({ fine, book }) => ({
      id: fine.id,
      amount: Number(fine.amount) - Number(fine.paidAmount || 0),
      bookTitle: book.title,
      description: fine.description || "",
      daysOverdue: Number(fine.daysOverdue),
      dueDate: fine.dueDate,
      isBookLost: fine.isBookLost || false,
    }));

    return {
      success: true,
      data: fineData,
    };
  } catch (error) {
    console.error("❌ Error fetching user unpaid fines:", error);
    return {
      success: false,
      error: "Failed to fetch unpaid fines",
    };
  }
};

/**
 * Create Stripe payment intent for fine payment
 */
export const createPaymentIntent = async (
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResult> => {
  const { userId, fineIds, returnUrl } = params;

  try {
    // Validate fines exist and belong to user
    const selectedFines = await db
      .select()
      .from(fines)
      .where(
        and(
          inArray(fines.id, fineIds),
          eq(fines.userId, userId),
          eq(fines.status, "PENDING")
        )
      );

    if (selectedFines.length !== fineIds.length) {
      return {
        success: false,
        error: "Some fines not found or already paid",
      };
    }

    // Calculate total amount (subtract already paid amounts)
    const totalAmount = selectedFines.reduce((sum, fine) => {
      const remaining = Number(fine.amount) - Number(fine.paidAmount || 0);
      return sum + remaining;
    }, 0);

    if (totalAmount <= 0) {
      return {
        success: false,
        error: "No outstanding amount to pay",
      };
    }

    // Create payment transaction record
    const [transaction] = await db
      .insert(paymentTransactions)
      .values({
        userId,
        fineIds: JSON.stringify(fineIds),
        totalAmount: totalAmount.toString(),
        paymentMethod: "STRIPE_CARD",
        status: "PENDING",
      })
      .returning();

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(totalAmount),
      currency: "usd",
      metadata: {
        userId,
        transactionId: transaction.id,
        fineIds: JSON.stringify(fineIds),
      },
      automatic_payment_methods: {
        enabled: true,
      },
      ...(returnUrl && {
        return_url: returnUrl,
      }),
    });

    // Update transaction with Stripe payment intent ID
    await db
      .update(paymentTransactions)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret!,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));

    // Create audit log
    await createAuditLog({
      action: "PAYMENT_INTENT_CREATED",
      actorType: "USER",
      actorId: userId,
      targetUserId: userId,
      metadata: {
        transactionId: transaction.id,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        fineIds,
      },
    });

    console.log(
      `💳 Created payment intent for user ${userId}: $${totalAmount}`
    );

    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: totalAmount,
        transactionId: transaction.id,
      },
    };
  } catch (error) {
    console.error("❌ Error creating payment intent:", error);
    return {
      success: false,
      error: "Failed to create payment intent",
    };
  }
};

/**
 * Handle Stripe checkout session completion
 */
export const handleCheckoutSessionCompleted = async (
  params: CheckoutSessionCompletedParams
): Promise<CheckoutSessionCompletedResult> => {
  const {
    sessionId,
    paymentIntentId,
    customerEmail,
    amountPaid,
    paymentStatus,
    metadata,
  } = params;

  try {
    if (paymentStatus !== "paid") {
      return {
        success: false,
        error: `Payment not completed. Status: ${paymentStatus}`,
      };
    }

    // Extract metadata
    const userId = metadata.userId;
    const transactionId = metadata.transactionId;
    const fineIds = JSON.parse(metadata.fineIds || "[]") as string[];

    if (!userId || !transactionId) {
      return {
        success: false,
        error: "Missing required metadata from checkout session",
      };
    }

    // Find and update the transaction record
    const [transaction] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      return {
        success: false,
        error: "Transaction record not found",
      };
    }

    // Update transaction with session completion details
    await db
      .update(paymentTransactions)
      .set({
        status: "COMPLETED",
        stripePaymentIntentId: paymentIntentId,
        externalTransactionId: sessionId,
        completedAt: new Date(),
        updatedAt: new Date(),
        processingData: JSON.stringify({
          sessionId,
          paymentIntentId,
          customerEmail,
          amountPaid: amountPaid / 100, // Convert from cents
          paymentStatus,
        }),
      })
      .where(eq(paymentTransactions.id, transactionId));

    // Process fine payments
    const totalAmountPaid = amountPaid / 100; // Convert cents to dollars
    const actualFineIds =
      fineIds.length > 0 ? fineIds : JSON.parse(transaction.fineIds);

    for (const fineId of actualFineIds) {
      const [fine] = await db
        .select()
        .from(fines)
        .where(eq(fines.id, fineId))
        .limit(1);

      if (!fine) continue;

      const outstandingAmount =
        Number(fine.amount) - Number(fine.paidAmount || 0);
      const amountToApply = Math.min(
        outstandingAmount,
        totalAmountPaid / actualFineIds.length
      );

      if (amountToApply <= 0) continue;

      // Create fine payment record
      await db.insert(finePayments).values({
        fineId: fine.id,
        userId: fine.userId,
        amount: amountToApply.toString(),
        paymentMethod: "STRIPE_CARD",
        paymentReference: sessionId,
        notes: `Stripe checkout session: ${sessionId}`,
      });

      // Update fine status
      const newPaidAmount = Number(fine.paidAmount || 0) + amountToApply;
      const isFullyPaid = newPaidAmount >= Number(fine.amount);

      await db
        .update(fines)
        .set({
          paidAmount: newPaidAmount.toString(),
          status: isFullyPaid ? "PAID" : "PARTIAL_PAID",
          paidAt: isFullyPaid ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(fines.id, fine.id));

      // Update user's total fines owed
      await db
        .update(users)
        .set({
          totalFinesOwed: sql`GREATEST(0, CAST(total_fines_owed AS DECIMAL) - ${amountToApply})`,
        })
        .where(eq(users.id, fine.userId));

      console.log(`💳 Processed fine payment: ${fineId} -> $${amountToApply}`);
    }

    // Update user restrictions if needed
    await updateUserRestrictions();

    // Create audit log
    await createAuditLog({
      action: "PAYMENT_COMPLETED",
      actorType: "SYSTEM",
      actorId: userId,
      targetUserId: userId,
      metadata: {
        sessionId,
        paymentIntentId,
        transactionId,
        amountPaid: totalAmountPaid,
        fineIds: actualFineIds,
        customerEmail,
        paymentStatus,
      },
    });

    console.log(
      `✅ Checkout session completed successfully: ${sessionId} ($${totalAmountPaid})`
    );

    return {
      success: true,
      data: {
        transactionId,
        amountPaid: totalAmountPaid,
        userId,
      },
    };
  } catch (error) {
    console.error("❌ Error handling checkout session completion:", error);
    return {
      success: false,
      error: "Failed to process checkout session completion",
    };
  }
};

/**
 * Complete payment processing after Stripe confirmation
 */
export const completePayment = async (
  params: CompletePaymentParams
): Promise<CompletePaymentResult> => {
  const { paymentIntentId, transactionId } = params;

  try {
    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return {
        success: false,
        error: "Payment not completed",
      };
    }

    // Find transaction record
    const transactionQuery = transactionId
      ? eq(paymentTransactions.id, transactionId)
      : eq(paymentTransactions.stripePaymentIntentId, paymentIntentId);

    const [transaction] = await db
      .select()
      .from(paymentTransactions)
      .where(transactionQuery)
      .limit(1);

    if (!transaction) {
      return {
        success: false,
        error: "Transaction record not found",
      };
    }

    const fineIds = JSON.parse(transaction.fineIds) as string[];
    const totalAmount = Number(transaction.totalAmount);

    // Update transaction status
    await db
      .update(paymentTransactions)
      .set({
        status: "COMPLETED",
        stripeChargeId: paymentIntent.latest_charge?.toString(),
        externalTransactionId: paymentIntent.id,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));

    // Update fines and create payment records
    for (const fineId of fineIds) {
      const [fine] = await db
        .select()
        .from(fines)
        .where(eq(fines.id, fineId))
        .limit(1);

      if (!fine) continue;

      const outstandingAmount =
        Number(fine.amount) - Number(fine.paidAmount || 0);
      const amountToPay = Math.min(
        outstandingAmount,
        totalAmount / fineIds.length
      );

      if (amountToPay <= 0) continue;

      // Create fine payment record
      await db.insert(finePayments).values({
        fineId: fine.id,
        userId: fine.userId,
        amount: amountToPay.toString(),
        paymentMethod: "STRIPE_CARD",
        paymentReference: paymentIntent.id,
        notes: `Stripe payment: ${paymentIntent.id}`,
      });

      // Update fine status
      const newPaidAmount = Number(fine.paidAmount || 0) + amountToPay;
      const isFullyPaid = newPaidAmount >= Number(fine.amount);

      await db
        .update(fines)
        .set({
          paidAmount: newPaidAmount.toString(),
          status: isFullyPaid ? "PAID" : "PARTIAL_PAID",
          paidAt: isFullyPaid ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(fines.id, fine.id));

      // Update user's total fines owed
      await db
        .update(users)
        .set({
          totalFinesOwed: sql`GREATEST(0, CAST(total_fines_owed AS DECIMAL) - ${amountToPay})`,
        })
        .where(eq(users.id, fine.userId));
    }

    // Check if user restrictions should be updated
    await updateUserRestrictions();

    // Create audit log
    await createAuditLog({
      action: "PAYMENT_COMPLETED",
      actorType: "USER",
      actorId: transaction.userId,
      targetUserId: transaction.userId,
      metadata: {
        transactionId: transaction.id,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        fineIds,
        stripeChargeId: paymentIntent.latest_charge?.toString(),
      },
    });

    console.log(
      `✅ Payment completed for transaction ${transaction.id}: $${totalAmount}`
    );

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        amountPaid: totalAmount,
        finesPaid: fineIds,
      },
    };
  } catch (error) {
    console.error("❌ Error completing payment:", error);
    return {
      success: false,
      error: "Failed to complete payment",
    };
  }
};

/**
 * Handle failed payment processing
 */
export const handleFailedPayment = async (
  paymentIntentId: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Update transaction status
    await db
      .update(paymentTransactions)
      .set({
        status: "FAILED",
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId));

    return { success: true };
  } catch (error) {
    console.error("❌ Error handling failed payment:", error);
    return {
      success: false,
      error: "Failed to update payment status",
    };
  }
};

/**
 * Get payment transaction details
 */
export const getPaymentTransaction = async (
  transactionId: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    const [transaction] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId))
      .limit(1);

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found",
      };
    }

    return {
      success: true,
      data: {
        ...transaction,
        fineIds: JSON.parse(transaction.fineIds),
        totalAmount: Number(transaction.totalAmount),
      },
    };
  } catch (error) {
    console.error("❌ Error fetching payment transaction:", error);
    return {
      success: false,
      error: "Failed to fetch transaction",
    };
  }
};
