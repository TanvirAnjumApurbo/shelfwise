import {
  varchar,
  uuid,
  text,
  pgTable,
  timestamp,
  pgEnum,
  numeric,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { users, books, borrowRecords } from "./schema";

// Fine status enum
export const FINE_STATUS_ENUM = pgEnum("fine_status", [
  "PENDING",
  "PAID",
  "WAIVED",
  "PARTIAL_PAID",
]);

// Fine type enum
export const FINE_TYPE_ENUM = pgEnum("fine_type", [
  "LATE_RETURN",
  "LOST_BOOK",
  "DAMAGE_FEE",
  "PROCESSING_FEE",
]);

// Penalty calculation type enum
export const PENALTY_TYPE_ENUM = pgEnum("penalty_type", [
  "FLAT_FEE", // $10 on first late day
  "DAILY_FEE", // $0.5/day from day 9-14
  "LOST_BOOK_FEE", // Book price + 30% penalty
]);

// Fines table for tracking all penalties
export const fines = pgTable("fines", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  bookId: uuid("book_id")
    .references(() => books.id)
    .notNull(),
  borrowRecordId: uuid("borrow_record_id")
    .references(() => borrowRecords.id)
    .notNull(),
  fineType: FINE_TYPE_ENUM("fine_type").notNull(),
  penaltyType: PENALTY_TYPE_ENUM("penalty_type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 })
    .default("0.00")
    .notNull(),
  status: FINE_STATUS_ENUM("status").default("PENDING").notNull(),
  dueDate: date("due_date").notNull(), // Original due date
  calculationDate: date("calculation_date").notNull(), // When fine was calculated
  daysOverdue: numeric("days_overdue", { precision: 5, scale: 2 }).notNull(),
  isBookLost: boolean("is_book_lost").default(false).notNull(),
  description: text("description").notNull(),
  adminNotes: text("admin_notes"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  waivedAt: timestamp("waived_at", { withTimezone: true }),
  waivedBy: uuid("waived_by").references(() => users.id), // Admin who waived
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Fine payment history for tracking partial payments
export const finePayments = pgTable("fine_payments", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fineId: uuid("fine_id")
    .references(() => fines.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }), // STUB, CASH, CARD, etc.
  paymentReference: varchar("payment_reference", { length: 255 }), // Transaction ID
  paymentDate: timestamp("payment_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
  adminProcessedBy: uuid("admin_processed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
