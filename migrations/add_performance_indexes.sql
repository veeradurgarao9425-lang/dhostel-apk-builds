-- Performance Optimization Indexes for Hostix Multi-Tenant Platform
-- Safe idempotent index creation for high-traffic tables

-- 1. Students Table
CREATE INDEX IF NOT EXISTS idx_students_hostel_status ON students (hostel_id, status);
CREATE INDEX IF NOT EXISTS idx_students_room_status ON students (room_id, status);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students (phone);
CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);

-- 2. Monthly Fees Table
CREATE INDEX IF NOT EXISTS idx_monthly_fees_student_month ON monthly_fees (student_id, fee_month);
CREATE INDEX IF NOT EXISTS idx_monthly_fees_hostel_month_status ON monthly_fees (hostel_id, fee_month, fee_status);
CREATE INDEX IF NOT EXISTS idx_monthly_fees_status_balance ON monthly_fees (fee_status, balance);

-- 3. Fee Payments Table
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_student ON fee_payments (fee_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_hostel_date ON fee_payments (hostel_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_date ON fee_payments (student_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt_no ON fee_payments (receipt_number);

-- 4. Expenses Table
CREATE INDEX IF NOT EXISTS idx_expenses_hostel_date ON expenses (hostel_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id);

-- 5. Rooms Table
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_number ON rooms (hostel_id, room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms (hostel_id, floor_number);

-- 6. Hostel Master Table
CREATE INDEX IF NOT EXISTS idx_hostel_master_owner ON hostel_master (owner_id, is_active);

-- 7. Notifications Table
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications (student_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at);

-- 8. Chat Messages Table
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages (room_id, created_at);

-- 9. Complaints Table
CREATE INDEX IF NOT EXISTS idx_complaints_hostel_status ON complaints (hostel_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints (student_id, created_at);

-- 10. Leave Requests Table
CREATE INDEX IF NOT EXISTS idx_leave_requests_hostel_status ON leave_requests (hostel_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests (student_id);
