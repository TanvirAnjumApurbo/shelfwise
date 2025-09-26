import Stripe from "stripe";
import config from "@/lib/config";

const stripeSecretKey = config.env.stripe.secretKey;

if (!stripeSecretKey) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY. Add it to your environment to enable payments."
  );
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

export const formatAmountForDisplay = (
  amount: number,
  currency: string = "usd"
): string => {
  const numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  });
  return numberFormat.format(amount);
};

export const formatAmountForStripe = (
  amount: number,
  currency: string = "usd"
): number => {
  const numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  });
  const parts = numberFormat.formatToParts(amount);
  let zeroDecimalCurrency = false;
  for (const part of parts) {
    if (part.type === "decimal") {
      zeroDecimalCurrency = false;
      break;
    }
    if (part.type === "fraction") {
      zeroDecimalCurrency = false;
      break;
    }
  }
  return zeroDecimalCurrency ? amount : Math.round(amount * 100);
};
