import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Only admins can trigger migrations
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    console.log("Starting manual payment schema migration...");

    // Create enums if they don't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fine_status') THEN
          CREATE TYPE "public"."fine_status" AS ENUM('PENDING', 'PAID', 'WAIVED', 'PARTIAL_PAID');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fine_type') THEN
          CREATE TYPE "public"."fine_type" AS ENUM('LATE_RETURN', 'LOST_BOOK', 'DAMAGE_FEE', 'PROCESSING_FEE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'penalty_type') THEN
          CREATE TYPE "public"."penalty_type" AS ENUM('FLAT_FEE', 'DAILY_FEE', 'LOST_BOOK_FEE');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
          CREATE TYPE "public"."payment_method" AS ENUM('STRIPE_CARD', 'STRIPE_BANK_TRANSFER', 'CASH', 'ADMIN_WAIVER', 'STUB');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
          CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');
        END IF;
      END $$;
    `);

    // Add audit actions if they don't exist (using simpler approach)
    const auditActions = [
      "FINE_CALCULATED",
      "FINE_PAID",
      "FINE_WAIVED",
      "USER_RESTRICTED",
      "USER_UNRESTRICTED",
      "PAYMENT_INTENT_CREATED",
      "PAYMENT_COMPLETED",
    ];

    for (const action of auditActions) {
      try {
        await db.execute(
          sql`ALTER TYPE "public"."audit_action" ADD VALUE ${action};`
        );
      } catch (error) {
        // Ignore error if value already exists
        console.log(`Audit action ${action} might already exist, skipping...`);
      }
    }

    // Create fines table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "fines" (
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
    `);

    // Create fine payments table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "fine_payments" (
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
    `);

    // Create payment transactions table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
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
    `);

    // Add columns to users table if they don't exist
    const userColumns = [
      {
        name: "total_fines_owed",
        type: "numeric(10, 2) DEFAULT '0.00' NOT NULL",
      },
      { name: "is_restricted", type: "boolean DEFAULT false NOT NULL" },
      { name: "restriction_reason", type: "text" },
      { name: "restricted_at", type: "timestamp with time zone" },
      { name: "restricted_by", type: "uuid" },
      { name: "last_fine_calculation", type: "timestamp with time zone" },
    ];

    for (const column of userColumns) {
      try {
        await db.execute(
          sql`ALTER TABLE "users" ADD COLUMN ${sql.raw(
            `"${column.name}" ${column.type}`
          )};`
        );
      } catch (error) {
        console.log(`Column ${column.name} might already exist, skipping...`);
      }
    }

    // Add foreign key constraints
    const constraints = [
      {
        table: "fine_payments",
        name: "fine_payments_fine_id_fines_id_fk",
        definition:
          'FOREIGN KEY ("fine_id") REFERENCES "public"."fines"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "fine_payments",
        name: "fine_payments_user_id_users_id_fk",
        definition:
          'FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "fine_payments",
        name: "fine_payments_admin_processed_by_users_id_fk",
        definition:
          'FOREIGN KEY ("admin_processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "fines",
        name: "fines_user_id_users_id_fk",
        definition:
          'FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "fines",
        name: "fines_book_id_books_id_fk",
        definition:
          'FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "fines",
        name: "fines_borrow_record_id_borrow_records_id_fk",
        definition:
          'FOREIGN KEY ("borrow_record_id") REFERENCES "public"."borrow_records"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "fines",
        name: "fines_waived_by_users_id_fk",
        definition:
          'FOREIGN KEY ("waived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "payment_transactions",
        name: "payment_transactions_user_id_users_id_fk",
        definition:
          'FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action',
      },
      {
        table: "payment_transactions",
        name: "payment_transactions_admin_processed_by_users_id_fk",
        definition:
          'FOREIGN KEY ("admin_processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action',
      },
    ];

    for (const constraint of constraints) {
      try {
        await db.execute(
          sql`ALTER TABLE ${sql.raw(
            `"${constraint.table}"`
          )} ADD CONSTRAINT ${sql.raw(`"${constraint.name}"`)} ${sql.raw(
            constraint.definition
          )};`
        );
      } catch (error) {
        console.log(
          `Constraint ${constraint.name} might already exist, skipping...`
        );
      }
    }

    console.log("✅ Manual payment schema migration completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Payment schema migration completed successfully",
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
