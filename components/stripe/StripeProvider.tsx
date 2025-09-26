"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import config from "@/lib/config";

// Load Stripe outside of a component to avoid recreating the object on every render
const stripePromise = loadStripe(config.env.stripe.publishableKey);

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
  amount?: number;
}

export default function StripeProvider({
  children,
  clientSecret,
  amount,
}: StripeProviderProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#2563eb",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "8px",
      },
    },
    ...(amount && {
      loader: "auto",
    }),
  };

  return (
    <Elements options={options} stripe={stripePromise}>
      {children}
    </Elements>
  );
}
