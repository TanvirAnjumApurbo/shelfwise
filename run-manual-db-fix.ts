import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const sql = neon(process.env.DATABASE_URL!);

async function runFix() {
  try {
    console.log("🔧 Running manual database fix...");

    // Create password_reset_tokens table
    console.log("Creating password_reset_tokens table...");
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        reset_token_hash TEXT,
        code_expires_at TIMESTAMPTZ NOT NULL,
        reset_token_expires_at TIMESTAMPTZ,
        code_verified_at TIMESTAMPTZ,
        consumed_at TIMESTAMPTZ,
        attempts INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create payment enums
    console.log("Creating payment enums...");
    try {
      await sql`CREATE TYPE payment_method AS ENUM('STRIPE_CARD', 'STRIPE_BANK_TRANSFER', 'CASH', 'ADMIN_WAIVER', 'STUB')`;
    } catch (e) {
      console.log("payment_method enum already exists");
    }

    try {
      await sql`CREATE TYPE payment_status AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')`;
    } catch (e) {
      console.log("payment_status enum already exists");
    }

    // Create payment_transactions table
    console.log("Creating payment_transactions table...");
    await sql`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        fine_ids TEXT NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method payment_method NOT NULL,
        status payment_status DEFAULT 'PENDING' NOT NULL,
        stripe_payment_intent_id VARCHAR(255),
        stripe_client_secret VARCHAR(500),
        stripe_charge_id VARCHAR(255),
        external_transaction_id VARCHAR(255),
        processing_data TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        processed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        admin_processed_by UUID REFERENCES users(id),
        admin_notes TEXT
      )
    `;

    // Create indexes
    console.log("Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_code_expires_at ON password_reset_tokens(code_expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status)`;

    console.log("✅ Manual database fix completed successfully!");

    // Verify tables exist
    const tables = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('password_reset_tokens', 'payment_transactions')
      ORDER BY table_name, ordinal_position
    `;

    console.log("📋 Created tables verification:");
    console.table(tables);
  } catch (error) {
    console.error("❌ Error running manual fix:", error);
  }
}

runFix();
