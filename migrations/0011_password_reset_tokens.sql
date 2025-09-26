-- Create table to support password reset flow
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    reset_token_hash TEXT,
    code_expires_at TIMESTAMPTZ NOT NULL,
    reset_token_expires_at TIMESTAMPTZ,
    code_verified_at TIMESTAMPTZ,
    consumed_at TIMESTAMPTZ,
    attempts INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_code_expires_at
    ON password_reset_tokens(code_expires_at);
