CREATE TYPE "public"."fine_status" AS ENUM('PENDING', 'PAID', 'WAIVED', 'PARTIAL_PAID');--> statement-breakpoint
CREATE TYPE "public"."fine_type" AS ENUM('LATE_RETURN', 'LOST_BOOK', 'DAMAGE_FEE', 'PROCESSING_FEE');--> statement-breakpoint
CREATE TYPE "public"."penalty_type" AS ENUM('FLAT_FEE', 'DAILY_FEE', 'LOST_BOOK_FEE');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('STRIPE_CARD', 'STRIPE_BANK_TRANSFER', 'CASH', 'ADMIN_WAIVER', 'STUB');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'FINE_CALCULATED';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'FINE_PAID';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'FINE_WAIVED';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'USER_RESTRICTED';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'USER_UNRESTRICTED';--> statement-breakpoint
CREATE TABLE "fine_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fine_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50),
	"payment_reference" varchar(255),
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_processed_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fine_payments_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "fines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"borrow_record_id" uuid NOT NULL,
	"fine_type" "fine_type" NOT NULL,
	"penalty_type" "penalty_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"status" "fine_status" DEFAULT 'PENDING' NOT NULL,
	"due_date" date NOT NULL,
	"calculation_date" date NOT NULL,
	"days_overdue" numeric(5, 2) NOT NULL,
	"is_book_lost" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"admin_notes" text,
	"paid_at" timestamp with time zone,
	"waived_at" timestamp with time zone,
	"waived_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fines_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fine_ids" text NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_client_secret" varchar(500),
	"stripe_charge_id" varchar(255),
	"external_transaction_id" varchar(255),
	"processing_data" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"admin_processed_by" uuid,
	"admin_notes" text,
	CONSTRAINT "payment_transactions_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_fines_owed" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_restricted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "restriction_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "restricted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "restricted_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_fine_calculation" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fine_payments" ADD CONSTRAINT "fine_payments_fine_id_fines_id_fk" FOREIGN KEY ("fine_id") REFERENCES "public"."fines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fine_payments" ADD CONSTRAINT "fine_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fine_payments" ADD CONSTRAINT "fine_payments_admin_processed_by_users_id_fk" FOREIGN KEY ("admin_processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_borrow_record_id_borrow_records_id_fk" FOREIGN KEY ("borrow_record_id") REFERENCES "public"."borrow_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_waived_by_users_id_fk" FOREIGN KEY ("waived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_admin_processed_by_users_id_fk" FOREIGN KEY ("admin_processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;