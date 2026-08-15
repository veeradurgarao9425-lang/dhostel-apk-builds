ALTER TABLE hostel_master 
ADD COLUMN trial_start_date DATETIME NULL,
ADD COLUMN trial_end_date DATETIME NULL,
ADD COLUMN subscription_status ENUM('Trial', 'Active', 'Expired') DEFAULT 'Trial',
ADD COLUMN subscription_start_date DATETIME NULL,
ADD COLUMN subscription_end_date DATETIME NULL,
ADD COLUMN subscription_plan VARCHAR(50) NULL;

-- Set default 40 days trial for existing hostels from TODAY to give them a grace period.
UPDATE hostel_master 
SET 
  trial_start_date = NOW(),
  trial_end_date = DATE_ADD(NOW(), INTERVAL 40 DAY),
  subscription_status = 'Trial',
  is_active = 1;
