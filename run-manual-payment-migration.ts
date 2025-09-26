import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import config from "@/lib/config";
import { sql } from "drizzle-orm";

// Use WebSocket driver which supports transactions
const pool = new Pool({ connectionString: config.env.databaseUrl });
const db = drizzle({ client: pool, casing: "snake_case" });

async function runManualMigration() {
  try {
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

    // Add audit actions if they don't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FINE_CALCULATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
          ALTER TYPE "public"."audit_action" ADD VALUE 'FINE_CALCULATED';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FINE_PAID' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
          ALTER TYPE "public"."audit_action" ADD VALUE 'FINE_PAID';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FINE_WAIVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
          ALTER TYPE "public"."audit_action" ADD VALUE 'FINE_WAIVED';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USER_RESTRICTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
          ALTER TYPE "public"."audit_action" ADD VALUE 'USER_RESTRICTED';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USER_UNRESTRICTED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
          ALTER TYPE "public"."audit_action" ADD VALUE 'USER_UNRESTRICTED';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAYMENT_INTENT_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
          ALTER TYPE "public"."audit_action" ADD VALUE 'PAYMENT_INTENT_CREATED';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAYMENT_COMPLETED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')) THEN
          ALTER TYPE "public"."audit_action" ADD VALUE 'PAYMENT_COMPLETED';
        END IF;
      END $$;
    `);

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
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_fines_owed') THEN
          ALTER TABLE "users" ADD COLUMN "total_fines_owed" numeric(10, 2) DEFAULT '0.00' NOT NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_restricted') THEN
          ALTER TABLE "users" ADD COLUMN "is_restricted" boolean DEFAULT false NOT NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'restriction_reason') THEN
          ALTER TABLE "users" ADD COLUMN "restriction_reason" text;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'restricted_at') THEN
          ALTER TABLE "users" ADD COLUMN "restricted_at" timestamp with time zone;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'restricted_by') THEN
          ALTER TABLE "users" ADD COLUMN "restricted_by" uuid;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_fine_calculation') THEN
          ALTER TABLE "users" ADD COLUMN "last_fine_calculation" timestamp with time zone;
        END IF;
      END $$;
    `);

    // Add foreign key constraints
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fine_payments_fine_id_fines_id_fk'
        ) THEN
          ALTER TABLE "fine_payments" ADD CONSTRAINT "fine_payments_fine_id_fines_id_fk" 
          FOREIGN KEY ("fine_id") REFERENCES "public"."fines"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fine_payments_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "fine_payments" ADD CONSTRAINT "fine_payments_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fine_payments_admin_processed_by_users_id_fk'
        ) THEN
          ALTER TABLE "fine_payments" ADD CONSTRAINT "fine_payments_admin_processed_by_users_id_fk" 
          FOREIGN KEY ("admin_processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fines_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "fines" ADD CONSTRAINT "fines_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fines_book_id_books_id_fk'
        ) THEN
          ALTER TABLE "fines" ADD CONSTRAINT "fines_book_id_books_id_fk" 
          FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fines_borrow_record_id_borrow_records_id_fk'
        ) THEN
          ALTER TABLE "fines" ADD CONSTRAINT "fines_borrow_record_id_borrow_records_id_fk" 
          FOREIGN KEY ("borrow_record_id") REFERENCES "public"."borrow_records"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fines_waived_by_users_id_fk'
        ) THEN
          ALTER TABLE "fines" ADD CONSTRAINT "fines_waived_by_users_id_fk" 
          FOREIGN KEY ("waived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'payment_transactions_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" 
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'payment_transactions_admin_processed_by_users_id_fk'
        ) THEN
          ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_admin_processed_by_users_id_fk" 
          FOREIGN KEY ("admin_processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        END IF;
      END $$;
    `);

    console.log("✅ Manual payment schema migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runManualMigration().catch(console.error);
}

export { runManualMigration };
