-- Comprehensive script to ensure borrow_requests table has all required fields
-- This script is idempotent and can be run multiple times safely

-- Ensure borrow_requests table exists
CREATE TABLE IF NOT EXISTS borrow_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid NOT NULL,
    status text DEFAULT 'PENDING' NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    due_date date,
    borrow_record_id uuid,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Add idempotency_key column if it doesn't exist
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

-- Add meta column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_requests' AND column_name = 'meta'
    ) THEN
        ALTER TABLE borrow_requests ADD COLUMN meta TEXT;
        RAISE NOTICE 'Added meta column to borrow_requests table';
    ELSE
        RAISE NOTICE 'meta column already exists';
    END IF;
END $$;

-- Add unique constraint to idempotency_key if it doesn't exist
-- First, we need to handle any existing NULL or duplicate values
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'borrow_requests' 
        AND constraint_name = 'borrow_requests_idempotency_key_unique'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Update any NULL values to a unique value (this is a fallback for existing data)
        UPDATE borrow_requests 
        SET idempotency_key = 'legacy-' || id::text 
        WHERE idempotency_key IS NULL;
        
        -- Handle any potential duplicates by appending a suffix
        WITH duplicate_keys AS (
            SELECT idempotency_key, 
                   ROW_NUMBER() OVER (PARTITION BY idempotency_key ORDER BY created_at) as rn
            FROM borrow_requests 
            WHERE idempotency_key IS NOT NULL
        )
        UPDATE borrow_requests 
        SET idempotency_key = idempotency_key || '-dup-' || (dk.rn - 1)::text
        FROM duplicate_keys dk
        WHERE borrow_requests.idempotency_key = dk.idempotency_key 
        AND dk.rn > 1;
        
        -- Now add the unique constraint
        ALTER TABLE borrow_requests 
        ADD CONSTRAINT borrow_requests_idempotency_key_unique UNIQUE (idempotency_key);
        
        RAISE NOTICE 'Added unique constraint to idempotency_key column';
    ELSE
        RAISE NOTICE 'Unique constraint on idempotency_key already exists';
    END IF;
END $$;

-- Create index for faster idempotency lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'idx_borrow_requests_idempotency_user'
    ) THEN
        CREATE INDEX idx_borrow_requests_idempotency_user 
            ON borrow_requests(user_id, idempotency_key) 
            WHERE idempotency_key IS NOT NULL;
        RAISE NOTICE 'Created idx_borrow_requests_idempotency_user index';
    ELSE
        RAISE NOTICE 'idx_borrow_requests_idempotency_user index already exists';
    END IF;
END $$;

-- Verify the final schema
DO $$
DECLARE
    idempotency_col_exists BOOLEAN;
    meta_col_exists BOOLEAN;
    unique_constraint_exists BOOLEAN;
BEGIN
    -- Check for idempotency_key column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_requests' AND column_name = 'idempotency_key'
    ) INTO idempotency_col_exists;
    
    -- Check for meta column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_requests' AND column_name = 'meta'
    ) INTO meta_col_exists;
    
    -- Check for unique constraint
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'borrow_requests' 
        AND constraint_name = 'borrow_requests_idempotency_key_unique'
        AND constraint_type = 'UNIQUE'
    ) INTO unique_constraint_exists;
    
    -- Report results
    IF idempotency_col_exists AND meta_col_exists AND unique_constraint_exists THEN
        RAISE NOTICE '✅ Schema update completed successfully!';
        RAISE NOTICE '   - idempotency_key column: EXISTS (with UNIQUE constraint)';
        RAISE NOTICE '   - meta column: EXISTS';
        RAISE NOTICE '   - Both fields are ready for use in borrow request deduplication';
    ELSE
        RAISE NOTICE '❌ Schema update incomplete:';
        RAISE NOTICE '   - idempotency_key column: %', CASE WHEN idempotency_col_exists THEN 'EXISTS' ELSE 'MISSING' END;
        RAISE NOTICE '   - meta column: %', CASE WHEN meta_col_exists THEN 'EXISTS' ELSE 'MISSING' END;
        RAISE NOTICE '   - unique constraint: %', CASE WHEN unique_constraint_exists THEN 'EXISTS' ELSE 'MISSING' END;
    END IF;
END $$;
