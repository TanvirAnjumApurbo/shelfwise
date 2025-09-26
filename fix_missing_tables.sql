-- Manual fix for migration conflicts
-- This script will create missing tables if they don't exist

-- Create password_reset_tokens table if it doesn't exist
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
);

-- Create payment_transactions table if it doesn't exist
DO $$
BEGIN
  -- Create payment enums if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM('STRIPE_CARD', 'STRIPE_BANK_TRANSFER', 'CASH', 'ADMIN_WAIVER', 'STUB');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');
  END IF;
END $$;

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
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_code_expires_at ON password_reset_tokens(code_expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- Ensure constraints exist
ALTER TABLE password_reset_tokens 
ADD CONSTRAINT IF NOT EXISTS password_reset_tokens_id_unique UNIQUE(id);

ALTER TABLE payment_transactions 
ADD CONSTRAINT IF NOT EXISTS payment_transactions_id_unique UNIQUE(id);

COMMIT;