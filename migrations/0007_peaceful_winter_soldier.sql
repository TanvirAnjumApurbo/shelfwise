CREATE TYPE "public"."request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURN_PENDING', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('BORROW', 'RETURN');--> statement-breakpoint
CREATE TABLE "borrow_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"due_date" date,
	"borrow_record_id" uuid,
	"admin_notes" text,
	"meta" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "borrow_requests_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"notify_on_available" boolean DEFAULT true NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "notification_preferences_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "return_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"borrow_record_id" uuid NOT NULL,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "return_requests_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "book_notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "book_notifications" CASCADE;--> statement-breakpoint
ALTER TABLE "borrow_records" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "borrow_records" ALTER COLUMN "status" SET DEFAULT 'BORROWED'::text;--> statement-breakpoint
DROP TYPE "public"."borrow_status";--> statement-breakpoint
CREATE TYPE "public"."borrow_status" AS ENUM('BORROWED', 'RETURNED');--> statement-breakpoint
ALTER TABLE "borrow_records" ALTER COLUMN "status" SET DEFAULT 'BORROWED'::"public"."borrow_status";--> statement-breakpoint
ALTER TABLE "borrow_records" ALTER COLUMN "status" SET DATA TYPE "public"."borrow_status" USING "status"::"public"."borrow_status";--> statement-breakpoint
ALTER TABLE "borrow_records" ALTER COLUMN "due_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "reserve_on_request" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_borrow_record_id_borrow_records_id_fk" FOREIGN KEY ("borrow_record_id") REFERENCES "public"."borrow_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_borrow_record_id_borrow_records_id_fk" FOREIGN KEY ("borrow_record_id") REFERENCES "public"."borrow_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_records" DROP COLUMN "admin_notes";--> statement-breakpoint
ALTER TABLE "borrow_records" DROP COLUMN "request_date";--> statement-breakpoint
ALTER TABLE "borrow_records" DROP COLUMN "approval_date";