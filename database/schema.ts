import {
  varchar,
  uuid,
  integer,
  text,
  pgTable,
  date,
  pgEnum,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

// Export fine-related tables and enums
export * from "./fines-schema";

// Export payment-related tables and enums
export * from "./payment-schema";

export const STATUS_ENUM = pgEnum("status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const ROLE_ENUM = pgEnum("role", ["USER", "ADMIN"]);
export const BORROW_STATUS_ENUM = pgEnum("borrow_status", [
  "BORROWED",
  "RETURNED",
]);

export const REQUEST_STATUS_ENUM = pgEnum("request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "RETURN_PENDING",
  "RETURNED",
]);

export const REQUEST_TYPE_ENUM = pgEnum("request_type", ["BORROW", "RETURN"]);

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: text("email").notNull().unique(),
  universityId: integer("university_id").notNull().unique(),
  password: text("password").notNull(),
  universityCard: text("university_card").notNull(),
  status: STATUS_ENUM("status").default("PENDING"),
  role: ROLE_ENUM("role").default("USER"),
  // Fine and restriction related fields
  totalFinesOwed: numeric("total_fines_owed", { precision: 10, scale: 2 })
    .default("0.00")
    .notNull(),
  isRestricted: boolean("is_restricted").default(false).notNull(),
  restrictionReason: text("restriction_reason"),
  restrictedAt: timestamp("restricted_at", { withTimezone: true }),
  restrictedBy: uuid("restricted_by"), // References admin who restricted
  lastFineCalculation: timestamp("last_fine_calculation", {
    withTimezone: true,
  }),
  lastActivityDate: date("last_activity_date").defaultNow(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});

export const books = pgTable("books", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  genre: text("genre").notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull(),
  coverUrl: text("cover_url").notNull(),
  coverColor: varchar("cover_color", { length: 7 }).notNull(),
  description: text("description").notNull(),
  totalCopies: integer("total_copies").notNull().default(1),
  availableCopies: integer("available_copies").notNull().default(0),
  reserveOnRequest: boolean("reserve_on_request").notNull().default(true),
  videoUrl: text("video_url"),
  youtubeUrl: text("youtube_url"),
  summary: varchar("summary").notNull(),
  // New book details
  publisher: varchar("publisher", { length: 255 }),
  publicationDate: date("publication_date"),
  edition: varchar("edition", { length: 100 }),
  language: varchar("language", { length: 50 }),
  printLength: integer("print_length"),
  bookType: varchar("book_type", { length: 20 }), // paperback/hardcover
  isbn: varchar("isbn", { length: 20 }),
  itemWeight: numeric("item_weight", { precision: 5, scale: 2 }), // in pounds
  dimensions: varchar("dimensions", { length: 50 }), // in inches (e.g., "8.5 x 11 x 1.2")
  aboutAuthor: text("about_author"),
  price: numeric("price", { precision: 10, scale: 2 }), // price for penalty calculations
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const borrowRecords = pgTable("borrow_records", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  bookId: uuid("book_id")
    .references(() => books.id)
    .notNull(),
  borrowDate: timestamp("borrow_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
  dueDate: date("due_date").notNull(),
  returnDate: date("return_date"),
  status: BORROW_STATUS_ENUM("status").default("BORROWED").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  bookId: uuid("book_id")
    .references(() => books.id)
    .notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// New table for borrow requests
export const borrowRequests = pgTable("borrow_requests", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  bookId: uuid("book_id")
    .references(() => books.id)
    .notNull(),
  status: REQUEST_STATUS_ENUM("status").default("PENDING").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  dueDate: date("due_date"), // Set when approved
  borrowRecordId: uuid("borrow_record_id").references(() => borrowRecords.id),
  adminNotes: text("admin_notes"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(), // For request deduplication - unique constraint added
  meta: text("meta"), // JSON metadata
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// New table for return requests
export const returnRequests = pgTable("return_requests", {
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
  status: REQUEST_STATUS_ENUM("status").default("PENDING").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Table for notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  bookId: uuid("book_id")
    .references(() => books.id)
    .notNull(),
  notifyOnAvailable: boolean("notify_on_available").default(true).notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Audit log enums and table
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
  // Fine-related actions
  "FINE_CALCULATED",
  "FINE_PAID",
  "FINE_WAIVED",
  "USER_RESTRICTED",
  "USER_UNRESTRICTED",
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
