-- Add fine-related fields to users table
ALTER TABLE users 
ADD COLUMN total_fines_owed NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
ADD COLUMN is_restricted BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN restriction_reason TEXT,
ADD COLUMN restricted_at TIMESTAMPTZ,
ADD COLUMN restricted_by UUID,
ADD COLUMN last_fine_calculation TIMESTAMPTZ;

-- Create fine status enum
CREATE TYPE fine_status AS ENUM ('PENDING', 'PAID', 'WAIVED', 'PARTIAL_PAID');

-- Create fine type enum  
CREATE TYPE fine_type AS ENUM ('LATE_RETURN', 'LOST_BOOK', 'DAMAGE_FEE', 'PROCESSING_FEE');

-- Create penalty type enum
CREATE TYPE penalty_type AS ENUM ('FLAT_FEE', 'DAILY_FEE', 'LOST_BOOK_FEE');

-- Create fines table
CREATE TABLE fines (
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
CREATE TABLE fine_payments (
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

-- Add indexes for performance
CREATE INDEX idx_fines_user_id ON fines(user_id);
CREATE INDEX idx_fines_book_id ON fines(book_id);
CREATE INDEX idx_fines_borrow_record_id ON fines(borrow_record_id);
CREATE INDEX idx_fines_status ON fines(status);
CREATE INDEX idx_users_is_restricted ON users(is_restricted);
CREATE INDEX idx_users_total_fines_owed ON users(total_fines_owed);

-- Add fine-related audit actions to existing enum
-- Note: This requires recreating the enum in PostgreSQL, handle with care in production
-- ALTER TYPE audit_action ADD VALUE 'FINE_CALCULATED';
-- ALTER TYPE audit_action ADD VALUE 'FINE_PAID';
-- ALTER TYPE audit_action ADD VALUE 'FINE_WAIVED';
-- ALTER TYPE audit_action ADD VALUE 'USER_RESTRICTED';
-- ALTER TYPE audit_action ADD VALUE 'USER_UNRESTRICTED';

-- For now, just add a comment about the enum update needed
COMMENT ON TABLE fines IS 'Table for tracking library fines and penalties. Requires audit_action enum to be updated with fine-related actions.';

-- Trigger to update updated_at timestamp on fines table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fines_updated_at 
    BEFORE UPDATE ON fines
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
