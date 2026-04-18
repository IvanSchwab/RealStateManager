-- Migration: Add last_notified_at column to payments table
-- This column tracks when a manual notification was sent from the UI (distinct from notification_sent_at which is for batch notifications)

-- Add last_notified_at column
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- Comment on column
COMMENT ON COLUMN payments.last_notified_at IS 'Timestamp when a manual notification was sent from the UI';

-- Document the owner role in profiles
COMMENT ON COLUMN public.profiles.role IS 'admin: full access | collaborator: operational access | owner: read-only access to own properties (future feature)';
