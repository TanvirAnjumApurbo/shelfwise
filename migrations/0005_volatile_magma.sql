CREATE TYPE "public"."borrow_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURN_REQUEST_PENDING', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('BOOK_AVAILABLE', 'BORROW_APPROVED', 'BORROW_REJECTED', 'RETURN_APPROVED', 'OVERDUE_REMINDER');--> statement-breakpoint
CREATE TABLE "book_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "book_notifications_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "borrow_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"status" "borrow_request_status" DEFAULT 'PENDING' NOT NULL,
	"request_date" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_date" timestamp with time zone,
	"due_date" date,
	"return_request_date" timestamp with time zone,
	"returned_date" timestamp with time zone,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "borrow_requests_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "email_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"sent" varchar(10) DEFAULT 'false' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "email_notifications_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "book_notifications" ADD CONSTRAINT "book_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_notifications" ADD CONSTRAINT "book_notifications_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;