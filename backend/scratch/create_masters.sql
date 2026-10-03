USE hostel_management;

CREATE TABLE IF NOT EXISTS hostel_type_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);
INSERT IGNORE INTO hostel_type_master (id, name) VALUES (1, 'Boys'), (2, 'Girls'), (3, 'Co-ed');

CREATE TABLE IF NOT EXISTS subscription_status_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);
INSERT IGNORE INTO subscription_status_master (id, name) VALUES (1, 'Active'), (2, 'Trial'), (3, 'Expired');

SELECT * FROM hostel_type_master;
SELECT * FROM subscription_status_master;
