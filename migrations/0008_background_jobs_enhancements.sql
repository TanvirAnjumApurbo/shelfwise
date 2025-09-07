-- Migration: Add idempotency support and background job enhancements
-- Description: Adds idempotency key column and prepares for background job features

-- Add idempotency key to borrow_requests table
ALTER TABLE borrow_requests 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Create index for faster idempotency lookups
CREATE INDEX IF NOT EXISTS idx_borrow_requests_idempotency 
ON borrow_requests(user_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add index for due date queries (for background jobs)
CREATE INDEX IF NOT EXISTS idx_borrow_records_due_date 
ON borrow_records(due_date, status) 
WHERE status = 'BORROWED';

-- Add index for notification preferences queries
CREATE INDEX IF NOT EXISTS idx_notification_preferences_book_notify 
ON notification_preferences(book_id, notify_on_available) 
WHERE notify_on_available = true;

-- Add index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

-- Add index for metrics and monitoring
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status_created 
ON borrow_requests(status, created_at);

-- Verify schema integrity
DO $$
BEGIN
    -- Check that all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_requests' 
        AND column_name = 'idempotency_key'
    ) THEN
        RAISE EXCEPTION 'idempotency_key column was not added successfully';
    END IF;
    
    -- Check that notification preferences table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notification_preferences'
    ) THEN
        RAISE EXCEPTION 'notification_preferences table does not exist';
    END IF;
    
    RAISE NOTICE 'Background jobs migration completed successfully';
END $$;
