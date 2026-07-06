-- ============================================
-- QR Signup Aadhaar Image Upload
-- ============================================
-- Purpose: Store Aadhaar front/back photo URLs captured on the public
--          QR self-registration form (/api/public/qr-signup)
-- Date: 2026-07-06
-- ============================================

ALTER TABLE students
ADD COLUMN id_proof_front_url VARCHAR(500) NULL AFTER id_proof_number,
ADD COLUMN id_proof_back_url VARCHAR(500) NULL AFTER id_proof_front_url;
