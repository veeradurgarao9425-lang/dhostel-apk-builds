USE hostel_management;

-- Insert roles if not exist
INSERT IGNORE INTO user_roles (role_id, role_name, role_description) VALUES
(1, 'Admin', 'System administrator with full access'),
(2, 'Hostel Owner', 'Manages individual hostel operations'),
(3, 'Tenant', 'Hostel resident'),
(4, 'Staff', 'Hostel staff');

-- Insert clean Owner user
INSERT INTO users (user_id, username, email, password_hash, role_id, full_name, phone, is_active, hostel_id)
VALUES (1, 'veeradurgarao', 'veeradurgarao840@gmail.com', '$2a$10$rZArB7jtR471iqZq70DBQOO9JJebAcFUNeeuCp5VzV4wkjLeH2Enu', 2, 'Veera Durgarao', '6303359425', 1, 1)
ON DUPLICATE KEY UPDATE
  password_hash = '$2a$10$rZArB7jtR471iqZq70DBQOO9JJebAcFUNeeuCp5VzV4wkjLeH2Enu',
  full_name = 'Veera Durgarao',
  phone = '6303359425',
  role_id = 2,
  is_active = 1,
  hostel_id = 1;

-- Also allow login with 6303359425 as username/email or veeradurgarao9425@gmail.com
INSERT INTO users (user_id, username, email, password_hash, role_id, full_name, phone, is_active, hostel_id)
VALUES (2, '6303359425', 'veeradurgarao9425@gmail.com', '$2a$10$rZArB7jtR471iqZq70DBQOO9JJebAcFUNeeuCp5VzV4wkjLeH2Enu', 2, 'Veera Durgarao', '6303359425', 1, 1)
ON DUPLICATE KEY UPDATE
  password_hash = '$2a$10$rZArB7jtR471iqZq70DBQOO9JJebAcFUNeeuCp5VzV4wkjLeH2Enu',
  full_name = 'Veera Durgarao',
  phone = '6303359425',
  role_id = 2,
  is_active = 1,
  hostel_id = 1;

-- Insert clean Hostel for this owner
INSERT INTO hostel_master (hostel_id, hostel_name, owner_id, hostel_type, address, city, state, pincode, total_rooms, contact_number, email, registration_number, is_active)
VALUES (1, 'Hostix Executive Hostel', 1, 'Co-ed', 'Plot 42, Hitech City', 'Hyderabad', 'Telangana', '500081', 10, '6303359425', 'veeradurgarao840@gmail.com', 'HSTX2026', 1)
ON DUPLICATE KEY UPDATE
  hostel_name = 'Hostix Executive Hostel',
  owner_id = 1,
  contact_number = '6303359425';

-- Clean sample rooms
INSERT INTO rooms (room_id, hostel_id, room_number, room_type_id, floor_number, capacity, occupied_beds, rent_per_bed, is_available) VALUES
(1, 1, '101', 2, 1, 2, 1, 6500.00, TRUE),
(2, 1, '102', 3, 1, 3, 2, 5500.00, TRUE),
(3, 1, '201', 2, 2, 2, 2, 7000.00, FALSE),
(4, 1, '202', 4, 2, 4, 1, 4500.00, TRUE)
ON DUPLICATE KEY UPDATE room_number = VALUES(room_number);

-- Clean sample student
INSERT INTO students (student_id, hostel_id, first_name, last_name, gender, phone, email, admission_date, is_active) VALUES
(1, 1, 'Rahul', 'Sharma', 'Male', '9876543210', 'rahul@gmail.com', '2026-01-10', 1),
(2, 1, 'Priya', 'Patel', 'Female', '9876543211', 'priya@gmail.com', '2026-01-15', 1)
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name);

SELECT user_id, email, phone, full_name, role_id, hostel_id FROM users;
SELECT hostel_id, hostel_name, owner_id FROM hostel_master;
