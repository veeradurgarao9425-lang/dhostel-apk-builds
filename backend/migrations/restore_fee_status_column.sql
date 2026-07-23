-- Restores the `fee_status` column on `monthly_fees` that the application code
-- reads/writes everywhere (getMonthlyFeesSummary, recordPayment, recordAdjustment,
-- editCurrentMonthFee, report/cron jobs, etc).
--
-- Some out-of-band change on 2026-07-23 replaced this column with a normalized
-- `fee_status_id` FK into `fee_status_master`, without updating any application
-- code to match. Every query referencing `mf.fee_status` since then fails with
-- "Unknown column 'fee_status'" (this is why Pending Dues / payment recording
-- started server-erroring). This migration re-adds the plain string column the
-- app expects and backfills it from balance/paid_amount using the exact same
-- rule the app itself uses to compute fee status (see recordPayment), rather
-- than trusting fee_status_id, whose backfill did not consistently match those
-- values (e.g. rows labelled "Pending" with balance > 0 and paid_amount > 0).
--
-- fee_status_id / fee_status_master are left in place, untouched, in case the
-- normalization is finished properly later.

ALTER TABLE monthly_fees
  ADD COLUMN fee_status ENUM('Pending', 'Partially Paid', 'Fully Paid', 'Overdue') DEFAULT 'Pending' AFTER balance;

UPDATE monthly_fees
SET fee_status = CASE
  WHEN balance <= 0 THEN 'Fully Paid'
  WHEN paid_amount > 0 THEN 'Partially Paid'
  ELSE 'Pending'
END;

CREATE INDEX idx_fee_status ON monthly_fees(fee_status);
