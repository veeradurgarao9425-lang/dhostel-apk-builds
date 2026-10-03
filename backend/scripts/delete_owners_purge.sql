-- =============================================================================
-- Hostix: Permanent Database Purge Script for Specific Owners
-- Targets:
--   1. veeradurgarao9425@gmail.com (user_id: 9, Hostel: 2 "Mens")
--   2. hostixhelp@gmail.com (user_id: 15, Hostels: 7 "Lohitha hostel", 8 "Sanvi")
--   3. gdurgarao9425@gmail.com (user_id: 11, Hostel: 4 "Chiru co living")
-- =============================================================================

START TRANSACTION;

SET @owner_ids = '9, 11, 15';
SET @hostel_ids = '2, 4, 7, 8';

-- 1. Remove Student Payments and Dues
DELETE FROM fee_payments WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM monthly_fees WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM student_monthly_fees WHERE hostel_id IN (2, 4, 7, 8);

-- 2. Remove Student Operations & Records
DELETE FROM tenant_expenses WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM complaints WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM attendance WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM guest_entries WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM leave_requests WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM visitors WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM ratings WHERE hostel_id IN (2, 4, 7, 8);

-- 3. Remove Food & Mess Operations
DELETE FROM mess_skips WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM mess_menus WHERE hostel_id IN (2, 4, 7, 8);

-- 4. Remove Staff & Payroll
DELETE FROM staff_payments WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM staff WHERE hostel_id IN (2, 4, 7, 8);

-- 5. Remove Financial Ledgers & Cashflow
DELETE FROM expenses WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM incomes WHERE hostel_id IN (2, 4, 7, 8);

-- 6. Remove Platform SaaS Billings & History
DELETE FROM hostel_billing_payments WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM hostel_billing WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM subscription_history WHERE hostel_id IN (2, 4, 7, 8);

-- 7. Remove Communication & Notices
DELETE FROM notices WHERE hostel_id IN (2, 4, 7, 8);
DELETE FROM notifications WHERE hostel_id IN (2, 4, 7, 8) OR user_id IN (9, 11, 15);
DELETE FROM support_sessions WHERE target_user_id IN (9, 11, 15) OR hostel_id IN (2, 4, 7, 8);

-- 8. Remove Inventory (Beds & Rooms)
DELETE FROM beds WHERE room_id IN (SELECT room_id FROM rooms WHERE hostel_id IN (2, 4, 7, 8));
DELETE FROM rooms WHERE hostel_id IN (2, 4, 7, 8);

-- 9. Remove Students
DELETE FROM students WHERE hostel_id IN (2, 4, 7, 8);

-- 10. Remove Hostels
DELETE FROM hostel_master WHERE hostel_id IN (2, 4, 7, 8) OR owner_id IN (9, 11, 15);

-- 11. Finally, Remove Owner User Accounts
DELETE FROM users WHERE user_id IN (9, 11, 15) OR email IN (
  'veeradurgarao9425@gmail.com',
  'hostixhelp@gmail.com',
  'gdurgarao9425@gmail.com'
);

COMMIT;

-- Verify deletion:
SELECT user_id, full_name, email FROM users WHERE user_id IN (9, 11, 15);
SELECT hostel_id, hostel_name FROM hostel_master WHERE hostel_id IN (2, 4, 7, 8);
