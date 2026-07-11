-- Migration: Add salary cycle columns to staff_payments
-- Adds: for_month (YYYY-MM), mode, transaction_id, receipt_number

ALTER TABLE staff_payments
  ADD COLUMN IF NOT EXISTS for_month VARCHAR(7) NULL COMMENT 'Salary month this payment applies to, format YYYY-MM',
  ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'Cash' COMMENT 'Payment mode: Cash, UPI, Bank Transfer',
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100) NULL;

-- Update existing payment_type to default Advance (since older records were advance/wage payments)
-- payment_type column already exists as VARCHAR, values: Wage, Advance, Salary, Bonus, Deduction
