-- Developer / platform money management + developer notification centre.
-- Idempotent (CREATE TABLE IF NOT EXISTS) so runAllMigrations can replay it.
-- Mirrors the block in src/config/schemaPatcher.ts — keep the two in sync.

CREATE TABLE IF NOT EXISTS hostel_billing (
  billing_id INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id INT NOT NULL UNIQUE,
  owner_id INT NULL,
  agreed_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  billing_frequency ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
  status ENUM('ACTIVE', 'PAUSED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  last_payment_date DATE NULL,
  next_due_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hostel_billing_due (next_due_date),
  INDEX idx_hostel_billing_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hostel_billing_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id INT NOT NULL,
  billing_id INT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  paid_on DATE NOT NULL,
  payment_method VARCHAR(50) NULL,
  reference VARCHAR(150) NULL,
  notes TEXT NULL,
  recorded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hbp_hostel (hostel_id),
  INDEX idx_hbp_paid_on (paid_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_expenses (
  expense_id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(60) NOT NULL DEFAULT 'Other',
  description VARCHAR(255) NULL,
  amount DECIMAL(12, 2) NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_platform_expenses_date (expense_date),
  INDEX idx_platform_expenses_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS developer_notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(60) NOT NULL DEFAULT 'GENERAL',
  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  priority ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
  related_entity VARCHAR(60) NULL,
  related_entity_id VARCHAR(100) NULL,
  metadata JSON NULL,
  is_read TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dev_notif_read (is_read, created_at),
  INDEX idx_dev_notif_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
