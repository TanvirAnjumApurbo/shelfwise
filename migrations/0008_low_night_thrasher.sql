CREATE TYPE "public"."audit_action" AS ENUM('BORROW_REQUEST_CREATED', 'BORROW_REQUEST_APPROVED', 'BORROW_REQUEST_REJECTED', 'RETURN_REQUEST_CREATED', 'RETURN_REQUEST_APPROVED', 'RETURN_REQUEST_REJECTED', 'BOOK_BORROWED', 'BOOK_RETURNED', 'INVENTORY_UPDATED', 'USER_LOGIN', 'USER_LOGOUT', 'ADMIN_ACTION');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('USER', 'ADMIN', 'SYSTEM');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" "audit_action" NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" uuid,
	"target_user_id" uuid,
	"target_book_id" uuid,
	"target_request_id" uuid,
	"metadata" text,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "borrow_requests" ADD COLUMN "idempotency_key" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_book_id_books_id_fk" FOREIGN KEY ("target_book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;