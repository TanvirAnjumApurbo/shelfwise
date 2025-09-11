import { relations } from "drizzle-orm/relations";
import { users, borrowRecords, books, reviews, borrowRequests, notificationPreferences, returnRequests, auditLogs } from "./schema";

export const borrowRecordsRelations = relations(borrowRecords, ({one, many}) => ({
	user: one(users, {
		fields: [borrowRecords.userId],
		references: [users.id]
	}),
	book: one(books, {
		fields: [borrowRecords.bookId],
		references: [books.id]
	}),
	borrowRequests: many(borrowRequests),
	returnRequests: many(returnRequests),
}));

export const usersRelations = relations(users, ({many}) => ({
	borrowRecords: many(borrowRecords),
	reviews: many(reviews),
	borrowRequests: many(borrowRequests),
	notificationPreferences: many(notificationPreferences),
	returnRequests: many(returnRequests),
	auditLogs_actorId: many(auditLogs, {
		relationName: "auditLogs_actorId_users_id"
	}),
	auditLogs_targetUserId: many(auditLogs, {
		relationName: "auditLogs_targetUserId_users_id"
	}),
}));

export const booksRelations = relations(books, ({many}) => ({
	borrowRecords: many(borrowRecords),
	reviews: many(reviews),
	borrowRequests: many(borrowRequests),
	notificationPreferences: many(notificationPreferences),
	returnRequests: many(returnRequests),
	auditLogs: many(auditLogs),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	user: one(users, {
		fields: [reviews.userId],
		references: [users.id]
	}),
	book: one(books, {
		fields: [reviews.bookId],
		references: [books.id]
	}),
}));

export const borrowRequestsRelations = relations(borrowRequests, ({one}) => ({
	user: one(users, {
		fields: [borrowRequests.userId],
		references: [users.id]
	}),
	book: one(books, {
		fields: [borrowRequests.bookId],
		references: [books.id]
	}),
	borrowRecord: one(borrowRecords, {
		fields: [borrowRequests.borrowRecordId],
		references: [borrowRecords.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
	book: one(books, {
		fields: [notificationPreferences.bookId],
		references: [books.id]
	}),
}));

export const returnRequestsRelations = relations(returnRequests, ({one}) => ({
	user: one(users, {
		fields: [returnRequests.userId],
		references: [users.id]
	}),
	book: one(books, {
		fields: [returnRequests.bookId],
		references: [books.id]
	}),
	borrowRecord: one(borrowRecords, {
		fields: [returnRequests.borrowRecordId],
		references: [borrowRecords.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user_actorId: one(users, {
		fields: [auditLogs.actorId],
		references: [users.id],
		relationName: "auditLogs_actorId_users_id"
	}),
	user_targetUserId: one(users, {
		fields: [auditLogs.targetUserId],
		references: [users.id],
		relationName: "auditLogs_targetUserId_users_id"
	}),
	book: one(books, {
		fields: [auditLogs.targetBookId],
		references: [books.id]
	}),
}));