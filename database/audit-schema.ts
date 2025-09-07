import {
  varchar,
  uuid,
  text,
  pgTable,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users, books, borrowRequests, returnRequests } from "./schema";

export const AUDIT_ACTION_ENUM = pgEnum("audit_action", [
  "BORROW_REQUEST_CREATED",
  "BORROW_REQUEST_APPROVED",
  "BORROW_REQUEST_REJECTED",
  "RETURN_REQUEST_CREATED",
  "RETURN_REQUEST_APPROVED",
  "RETURN_REQUEST_REJECTED",
  "BOOK_BORROWED",
  "BOOK_RETURNED",
  "INVENTORY_UPDATED",
  "USER_LOGIN",
  "USER_LOGOUT",
  "ADMIN_ACTION",
]);

export const AUDIT_ACTOR_TYPE_ENUM = pgEnum("audit_actor_type", [
  "USER",
  "ADMIN",
  "SYSTEM",
]);

// Audit log table for tracking all actions
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  action: AUDIT_ACTION_ENUM("action").notNull(),
  actorType: AUDIT_ACTOR_TYPE_ENUM("actor_type").notNull(),
  actorId: uuid("actor_id").references(() => users.id), // Null for SYSTEM actions
  targetUserId: uuid("target_user_id").references(() => users.id), // User being acted upon
  targetBookId: uuid("target_book_id").references(() => books.id), // Book being acted upon
  targetRequestId: uuid("target_request_id"), // Generic request ID (borrow/return)
  metadata: text("metadata"), // JSON metadata with additional context
  ipAddress: varchar("ip_address", { length: 45 }), // Support IPv6
  userAgent: varchar("user_agent", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
