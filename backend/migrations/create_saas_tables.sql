-- Create subscription history table
CREATE TABLE IF NOT EXISTS subscription_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    event_type ENUM('Trial Started', 'Trial Expired', 'Subscription Renewed', 'Subscription Expired') NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_status ENUM('Sent', 'Failed') NOT NULL,
    error_message TEXT NULL,
    FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE SET NULL
);

-- Alter notifications to add Subscription Alert and Report
ALTER TABLE notifications 
MODIFY COLUMN notification_type ENUM('Payment Due', 'New Admission', 'Expense Alert', 'System Alert', 'General', 'Subscription Alert', 'Report') NOT NULL;
