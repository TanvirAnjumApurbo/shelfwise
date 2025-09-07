ALTER TYPE "public"."borrow_status" ADD VALUE 'PENDING' BEFORE 'BORROWED';--> statement-breakpoint
ALTER TYPE "public"."borrow_status" ADD VALUE 'APPROVED' BEFORE 'BORROWED';--> statement-breakpoint
ALTER TYPE "public"."borrow_status" ADD VALUE 'RETURN_PENDING' BEFORE 'RETURNED';--> statement-breakpoint
ALTER TYPE "public"."borrow_status" ADD VALUE 'REJECTED';--> statement-breakpoint
ALTER TABLE "borrow_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "borrow_requests" CASCADE;--> statement-breakpoint
DROP TABLE "email_notifications" CASCADE;--> statement-breakpoint
ALTER TABLE "book_notifications" ALTER COLUMN "is_active" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "book_notifications" ALTER COLUMN "is_active" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "borrow_records" ALTER COLUMN "due_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "borrow_records" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "borrow_records" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "borrow_records" ADD COLUMN "request_date" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "borrow_records" ADD COLUMN "approval_date" timestamp with time zone;--> statement-breakpoint
DROP TYPE "public"."borrow_request_status";--> statement-breakpoint
DROP TYPE "public"."notification_type";