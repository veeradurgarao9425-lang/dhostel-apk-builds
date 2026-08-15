-- Restores `notifications.notification_type`, which application code still reads/writes
-- directly (authController, hostelController, subscriptionController, subscriptionCheck job,
-- monthlyReports job, weeklyReports job — 9 call sites). Same drift pattern as the
-- monthly_fees.fee_status incident from earlier today: the column was replaced with a
-- normalized `notification_type_id` FK into `notification_type_master` without any
-- corresponding application code update, so every notification insert has been failing
-- with "Unknown column 'notification_type'" since the change (this is also why the
-- database.ts startup schema-patch logs an error on every boot trying to MODIFY a column
-- that no longer exists).
--
-- Unlike fee_status_id, notification_type_master is fully and correctly seeded and every
-- existing row already has a notification_type_id, so the backfill can trust the join.
--
-- notification_type_id / notification_type_master are left in place, untouched.

ALTER TABLE notifications
  ADD COLUMN notification_type VARCHAR(50) NOT NULL DEFAULT 'General' AFTER notification_type_id;

UPDATE notifications n
JOIN notification_type_master ntm ON n.notification_type_id = ntm.id
SET n.notification_type = ntm.name;
