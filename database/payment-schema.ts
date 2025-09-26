import {
  varchar,
  uuid,
  text,
  pgTable,
  timestamp,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { users, fines } from "./schema";

// Payment transaction status enum
export const PAYMENT_STATUS_ENUM = pgEnum("payment_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
]);

// Payment method enum
export const PAYMENT_METHOD_ENUM = pgEnum("payment_method", [
  "STRIPE_CARD",
  "STRIPE_BANK_TRANSFER",
  "CASH",
  "ADMIN_WAIVER",
  "STUB",
]);

// Payment transactions table for tracking Stripe and other payments
export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  fineIds: text("fine_ids").notNull(), // JSON array of fine IDs
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: PAYMENT_METHOD_ENUM("payment_method").notNull(),
  status: PAYMENT_STATUS_ENUM("status").default("PENDING").notNull(),

  // Stripe specific fields
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeClientSecret: varchar("stripe_client_secret", { length: 500 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),

  // General payment reference
  externalTransactionId: varchar("external_transaction_id", { length: 255 }),

  // Processing metadata
  processingData: text("processing_data"), // JSON for any additional data
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  // Admin fields for manual processing
  adminProcessedBy: uuid("admin_processed_by").references(() => users.id),
  adminNotes: text("admin_notes"),
});
