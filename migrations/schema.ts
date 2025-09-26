import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  date,
  boolean,
  foreignKey,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const auditAction = pgEnum("audit_action", [
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
export const auditActorType = pgEnum("audit_actor_type", [
  "USER",
  "ADMIN",
  "SYSTEM",
]);
export const borrowRequestStatus = pgEnum("borrow_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RETURN_REQUEST_PENDING",
  "RETURNED",
]);
export const borrowStatus = pgEnum("borrow_status", ["BORROWED", "RETURNED"]);
export const notificationType = pgEnum("notification_type", [
  "BOOK_AVAILABLE",
  "BORROW_APPROVED",
  "BORROW_REJECTED",
  "RETURN_APPROVED",
  "OVERDUE_REMINDER",
]);
export const requestStatus = pgEnum("request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "RETURN_PENDING",
  "RETURNED",
]);
export const requestType = pgEnum("request_type", ["BORROW", "RETURN"]);
export const role = pgEnum("role", ["USER", "ADMIN"]);
export const status = pgEnum("status", ["PENDING", "APPROVED", "REJECTED"]);

export const books = pgTable("books", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: varchar({ length: 255 }).notNull(),
  author: varchar({ length: 255 }).notNull(),
  genre: text().notNull(),
  rating: numeric({ precision: 3, scale: 1 }).notNull(),
  coverUrl: text("cover_url").notNull(),
  coverColor: varchar("cover_color", { length: 7 }).notNull(),
  description: text().notNull(),
  totalCopies: integer("total_copies").default(1).notNull(),
  availableCopies: integer("available_copies").default(0).notNull(),
  videoUrl: text("video_url"),
  summary: varchar().notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  youtubeUrl: text("youtube_url"),
  publisher: varchar({ length: 255 }),
  publicationDate: date("publication_date"),
  edition: varchar({ length: 100 }),
  language: varchar({ length: 50 }),
  printLength: integer("print_length"),
  bookType: varchar("book_type", { length: 20 }),
  isbn: varchar({ length: 20 }),
  itemWeight: numeric("item_weight", { precision: 5, scale: 2 }),
  dimensions: varchar({ length: 50 }),
  aboutAuthor: text("about_author"),
  price: numeric({ precision: 10, scale: 2 }),
  reserveOnRequest: boolean("reserve_on_request").default(true).notNull(),
});

export const borrowRecords = pgTable(
  "borrow_records",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    bookId: uuid("book_id").notNull(),
    borrowDate: timestamp("borrow_date", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    dueDate: date("due_date").notNull(),
    returnDate: date("return_date"),
    status: borrowStatus().default("BORROWED").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "borrow_records_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: "borrow_records_book_id_books_id_fk",
    }),
  ]
);

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: text().notNull(),
    universityId: integer("university_id").notNull(),
    password: text().notNull(),
    universityCard: text("university_card").notNull(),
    status: status().default("PENDING"),
    role: role().default("USER"),
    lastActivityDate: date("last_activity_date").defaultNow(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    unique("users_email_unique").on(table.email),
    unique("users_university_id_unique").on(table.universityId),
  ]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    codeHash: text("code_hash").notNull(),
    resetTokenHash: text("reset_token_hash"),
    codeExpiresAt: timestamp("code_expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    resetTokenExpiresAt: timestamp("reset_token_expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    codeVerifiedAt: timestamp("code_verified_at", {
      withTimezone: true,
      mode: "string",
    }),
    consumedAt: timestamp("consumed_at", {
      withTimezone: true,
      mode: "string",
    }),
    attempts: integer().default(0).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "password_reset_tokens_user_id_users_id_fk",
    }),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    bookId: uuid("book_id").notNull(),
    rating: integer().notNull(),
    comment: text().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "reviews_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: "reviews_book_id_books_id_fk",
    }),
  ]
);

export const borrowRequests = pgTable(
  "borrow_requests",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    bookId: uuid("book_id").notNull(),
    status: requestStatus().default("PENDING").notNull(),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp("approved_at", {
      withTimezone: true,
      mode: "string",
    }),
    rejectedAt: timestamp("rejected_at", {
      withTimezone: true,
      mode: "string",
    }),
    dueDate: date("due_date"),
    borrowRecordId: uuid("borrow_record_id"),
    adminNotes: text("admin_notes"),
    meta: text(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "borrow_requests_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: "borrow_requests_book_id_books_id_fk",
    }),
    foreignKey({
      columns: [table.borrowRecordId],
      foreignColumns: [borrowRecords.id],
      name: "borrow_requests_borrow_record_id_borrow_records_id_fk",
    }),
  ]
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    bookId: uuid("book_id").notNull(),
    notifyOnAvailable: boolean("notify_on_available").default(true).notNull(),
    notifiedAt: timestamp("notified_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "notification_preferences_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: "notification_preferences_book_id_books_id_fk",
    }),
  ]
);

export const returnRequests = pgTable(
  "return_requests",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    bookId: uuid("book_id").notNull(),
    borrowRecordId: uuid("borrow_record_id").notNull(),
    status: requestStatus().default("PENDING").notNull(),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp("approved_at", {
      withTimezone: true,
      mode: "string",
    }),
    rejectedAt: timestamp("rejected_at", {
      withTimezone: true,
      mode: "string",
    }),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "return_requests_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: "return_requests_book_id_books_id_fk",
    }),
    foreignKey({
      columns: [table.borrowRecordId],
      foreignColumns: [borrowRecords.id],
      name: "return_requests_borrow_record_id_borrow_records_id_fk",
    }),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    action: auditAction().notNull(),
    actorType: auditActorType("actor_type").notNull(),
    actorId: uuid("actor_id"),
    targetUserId: uuid("target_user_id"),
    targetBookId: uuid("target_book_id"),
    targetRequestId: uuid("target_request_id"),
    metadata: text(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.actorId],
      foreignColumns: [users.id],
      name: "audit_logs_actor_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.targetUserId],
      foreignColumns: [users.id],
      name: "audit_logs_target_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.targetBookId],
      foreignColumns: [books.id],
      name: "audit_logs_target_book_id_books_id_fk",
    }),
  ]
);
