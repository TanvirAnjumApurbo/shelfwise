import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import {
  completePayment,
  handleFailedPayment,
  handleCheckoutSessionCompleted,
} from "@/lib/services/payment-service";
import config from "@/lib/config";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.env.stripe.webhookSecret
    );
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`🔔 Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const completedSession = event.data.object as Stripe.Checkout.Session;

        console.log(`✅ Checkout session completed: ${completedSession.id}`);

        const checkoutResult = await handleCheckoutSessionCompleted({
          sessionId: completedSession.id,
          paymentIntentId: completedSession.payment_intent as string,
          customerEmail: completedSession.customer_details?.email || null,
          amountPaid: completedSession.amount_total || 0,
          paymentStatus: completedSession.payment_status,
          metadata: completedSession.metadata,
        });

        if (!checkoutResult.success) {
          console.error(
            "❌ Failed to handle checkout completion:",
            checkoutResult.error
          );
        } else {
          console.log("✅ Checkout session completion processed successfully");
        }
        break;

      case "payment_intent.succeeded":
        const succeededPaymentIntent = event.data
          .object as Stripe.PaymentIntent;

        console.log(`✅ Payment succeeded: ${succeededPaymentIntent.id}`);

        const completeResult = await completePayment({
          paymentIntentId: succeededPaymentIntent.id,
          transactionId: succeededPaymentIntent.metadata.transactionId,
        });

        if (!completeResult.success) {
          console.error("❌ Failed to complete payment:", completeResult.error);
        } else {
          console.log("✅ Payment completion processed successfully");
        }
        break;

      case "payment_intent.payment_failed":
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;

        console.log(`❌ Payment failed: ${failedPaymentIntent.id}`);

        const errorMessage =
          failedPaymentIntent.last_payment_error?.message ||
          "Payment failed due to unknown error";

        const failedResult = await handleFailedPayment(
          failedPaymentIntent.id,
          errorMessage
        );

        if (!failedResult.success) {
          console.error(
            "❌ Failed to handle payment failure:",
            failedResult.error
          );
        }
        break;

      case "payment_intent.canceled":
        const canceledPaymentIntent = event.data.object as Stripe.PaymentIntent;

        console.log(`🚫 Payment canceled: ${canceledPaymentIntent.id}`);

        await handleFailedPayment(
          canceledPaymentIntent.id,
          "Payment was canceled by user"
        );
        break;

      case "checkout.session.expired":
        const expiredSession = event.data.object as Stripe.Checkout.Session;

        console.log(`⏰ Checkout session expired: ${expiredSession.id}`);

        await handleFailedPayment(
          expiredSession.payment_intent as string,
          "Checkout session expired"
        );
        break;

      case "payment_method.attached":
        console.log("🔗 Payment method attached");
        break;

      case "charge.dispute.created":
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`⚠️ Dispute created for charge: ${dispute.charge}`);
        // TODO: Handle dispute - send notification to admin
        break;

      default:
        console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook event ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
