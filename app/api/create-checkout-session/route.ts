import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/database/drizzle";
import { fines, users, paymentTransactions } from "@/database/schema";
import { eq, inArray, and } from "drizzle-orm";
import { z } from "zod";
import config from "@/lib/config";
import { createAuditLog } from "@/lib/audit";

const createCheckoutSessionSchema = z.object({
  fineIds: z
    .array(z.string().uuid())
    .min(1, "At least one fine must be selected"),
  returnUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createCheckoutSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { fineIds, returnUrl } = validationResult.data;
    const userId = session.user.id;

    // Get user details
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get fines and validate ownership
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
      return NextResponse.json(
        { error: "Some fines were not found or already paid" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = selectedFines.reduce(
      (sum, fine) => sum + Number(fine.amount),
      0
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(totalAmount * 100);

    // Create payment transaction record
    const [paymentTransaction] = await db
      .insert(paymentTransactions)
      .values({
        userId,
        fineIds: JSON.stringify(fineIds),
        totalAmount: totalAmount.toString(),
        paymentMethod: "STRIPE_CARD",
        status: "PENDING",
      })
      .returning();

    // Prepare line items for Stripe checkout
    const lineItems = selectedFines.map((fine) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `Library Fine - ${
            fine.description?.split(":")[0] || "Late Return"
          }`,
          description:
            fine.description ||
            `Fine for overdue book (${fine.daysOverdue} days)`,
          metadata: {
            fineId: fine.id,
            userId: userId,
          },
        },
        unit_amount: Math.round(Number(fine.amount) * 100), // Convert to cents
      },
      quantity: 1,
    }));

    // Determine URLs
    const origin =
      config.env.apiEndpoint ||
      process.env.NEXT_PUBLIC_ORIGIN ||
      "http://localhost:3000";
    const successUrl =
      returnUrl ||
      `${origin}/fines/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/fines/payment?canceled=true`;

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user[0].email,
      metadata: {
        userId: userId,
        transactionId: paymentTransaction.id,
        fineIds: JSON.stringify(fineIds),
        totalAmount: totalAmount.toString(),
      },
      // Enable customer details collection
      billing_address_collection: "auto",
      // Set payment intent data for webhook identification
      payment_intent_data: {
        metadata: {
          userId: userId,
          transactionId: paymentTransaction.id,
          fineIds: JSON.stringify(fineIds),
        },
      },
      // Configure session expiration (24 hours)
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    });

    // Update payment transaction with Stripe session info
    await db
      .update(paymentTransactions)
      .set({
        stripePaymentIntentId: checkoutSession.payment_intent as string,
        stripeClientSecret: checkoutSession.id,
        processingData: JSON.stringify({
          sessionId: checkoutSession.id,
          sessionUrl: checkoutSession.url,
          expiresAt: checkoutSession.expires_at,
        }),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, paymentTransaction.id));

    // Create audit log
    await createAuditLog({
      action: "PAYMENT_SESSION_CREATED",
      actorType: "USER",
      actorId: userId,
      targetUserId: userId,
      metadata: {
        sessionId: checkoutSession.id,
        fineIds,
        totalAmount,
        transactionId: paymentTransaction.id,
      },
    });

    console.log(
      `✅ Created checkout session for user ${userId}: $${totalAmount}`
    );

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      sessionUrl: checkoutSession.url,
      transactionId: paymentTransaction.id,
    });
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
