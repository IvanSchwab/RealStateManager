-- Migration: Add notification_sent_at column to payments table
-- This column tracks when an overdue notification was sent to prevent duplicate emails

-- Add notification_sent_at column
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- Add an index for efficient querying of payments that haven't been notified yet
CREATE INDEX IF NOT EXISTS idx_payments_notification_pending
ON payments (due_date, status)
WHERE notification_sent_at IS NULL;

-- Comment on column
COMMENT ON COLUMN payments.notification_sent_at IS 'Timestamp when overdue notification was sent to tenant';

-- Create a function to update overdue payment statuses
-- This can be called periodically via pg_cron
CREATE OR REPLACE FUNCTION update_overdue_payments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE payments
  SET
    status = 'vencido',
    updated_at = NOW()
  WHERE
    status = 'pendiente'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_overdue_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_payments() TO service_role;
