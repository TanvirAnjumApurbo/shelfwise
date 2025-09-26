-- Manual migration to add penalty system fields only
-- Only add what's missing, skip existing fields

-- Add user fields for penalty system
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_fines_owed NUMERIC(10,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restriction_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_fine_calculation TIMESTAMPTZ;

-- Create fine-related enums
DO $$ BEGIN
    CREATE TYPE fine_status AS ENUM ('PENDING', 'PAID', 'WAIVED', 'PARTIAL_PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fine_type AS ENUM ('LATE_RETURN', 'LOST_BOOK', 'DAMAGE_FEE', 'PROCESSING_FEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE penalty_type AS ENUM ('FLAT_FEE', 'DAILY_FEE', 'LOST_BOOK_FEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create fines table
CREATE TABLE IF NOT EXISTS fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    book_id UUID NOT NULL REFERENCES books(id),
    borrow_record_id UUID NOT NULL REFERENCES borrow_records(id),
    fine_type fine_type NOT NULL,
    penalty_type penalty_type NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    status fine_status DEFAULT 'PENDING' NOT NULL,
    due_date DATE NOT NULL,
    calculation_date DATE NOT NULL,
    days_overdue NUMERIC(5,2) NOT NULL,
    is_book_lost BOOLEAN DEFAULT FALSE NOT NULL,
    description TEXT NOT NULL,
    admin_notes TEXT,
    paid_at TIMESTAMPTZ,
    waived_at TIMESTAMPTZ,
    waived_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create fine payments table
CREATE TABLE IF NOT EXISTS fine_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fine_id UUID NOT NULL REFERENCES fines(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    admin_processed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add audit action enum values if they don't exist
DO $$ BEGIN
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'FINE_CALCULATED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'FINE_PAID';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'FINE_WAIVED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'USER_RESTRICTED';
    ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'USER_UNRESTRICTED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fines_user_id ON fines(user_id);
CREATE INDEX IF NOT EXISTS idx_fines_book_id ON fines(book_id);
CREATE INDEX IF NOT EXISTS idx_fines_borrow_record_id ON fines(borrow_record_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);
CREATE INDEX IF NOT EXISTS idx_users_is_restricted ON users(is_restricted);
CREATE INDEX IF NOT EXISTS idx_users_total_fines_owed ON users(total_fines_owed);
