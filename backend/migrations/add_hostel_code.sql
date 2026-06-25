ALTER TABLE hostel_master ADD COLUMN hostel_code VARCHAR(10) UNIQUE AFTER hostel_name;

-- Update existing hostels with a random 6-character hex code
UPDATE hostel_master SET hostel_code = SUBSTRING(MD5(RAND()), 1, 6) WHERE hostel_code IS NULL;
