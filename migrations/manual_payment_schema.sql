DO $$
BEGIN
  -- Create enums if they don't exist
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
