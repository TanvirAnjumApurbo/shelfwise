-- Manual SQL to add missing columns and enums
-- Run this in Drizzle Studio or your database console

-- Add the reserve_on_request column to books table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'books' AND column_name = 'reserve_on_request') THEN
        ALTER TABLE books ADD COLUMN reserve_on_request BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Create request_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURN_PENDING', 'RETURNED');
    END IF;
END $$;

-- Add meta column to borrow_requests table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'borrow_requests' AND column_name = 'meta') THEN
        ALTER TABLE borrow_requests ADD COLUMN meta TEXT;
        RAISE NOTICE 'Added meta column to borrow_requests table';
    ELSE
        RAISE NOTICE 'meta column already exists';
    END IF;
END $$;

-- Add idempotency_key column to borrow_requests table if it doesn't exist (fallback for missed 0008 migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_requests' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE borrow_requests ADD COLUMN idempotency_key VARCHAR(255);
        RAISE NOTICE 'Added idempotency_key column to borrow_requests table';
    ELSE
        RAISE NOTICE 'idempotency_key column already exists';
    END IF;
END $$;

-- Add unique constraint to idempotency_key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'borrow_requests' 
        AND constraint_name = 'borrow_requests_idempotency_key_unique'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE borrow_requests ADD CONSTRAINT borrow_requests_idempotency_key_unique UNIQUE (idempotency_key);
        RAISE NOTICE 'Added unique constraint to idempotency_key column';
    ELSE
        RAISE NOTICE 'Unique constraint on idempotency_key already exists';
    END IF;
END $$;

-- Create supporting index for idempotency lookups if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'idx_borrow_requests_idempotency'
    ) THEN
        CREATE INDEX idx_borrow_requests_idempotency 
            ON borrow_requests(user_id, idempotency_key) 
            WHERE idempotency_key IS NOT NULL;
        RAISE NOTICE 'Created idx_borrow_requests_idempotency index';
    ELSE
        RAISE NOTICE 'idx_borrow_requests_idempotency index already exists';
    END IF;
END $$;

-- Verify the schema is properly set up
DO $$
BEGIN
    -- Check idempotency_key column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_requests' AND column_name = 'idempotency_key'
    ) THEN
        RAISE EXCEPTION 'idempotency_key column is missing from borrow_requests table';
    END IF;
    
    -- Check meta column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_requests' AND column_name = 'meta'
    ) THEN
        RAISE EXCEPTION 'meta column is missing from borrow_requests table';
    END IF;
    
    -- Check unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'borrow_requests' 
        AND constraint_name = 'borrow_requests_idempotency_key_unique'
        AND constraint_type = 'UNIQUE'
    ) THEN
        RAISE EXCEPTION 'Unique constraint on idempotency_key is missing';
    END IF;
    
    RAISE NOTICE 'Borrow requests schema verification completed successfully';
    RAISE NOTICE 'Required fields: idempotency_key (unique), meta (JSON/text)';
END $$;
