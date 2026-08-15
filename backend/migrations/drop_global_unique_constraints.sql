-- Drop global unique constraints if they exist on the tables
-- This ensures students/staff/guests can be registered in multiple hostels

-- We use IF EXISTS logic implicitly by just trying to drop index
-- Note: MySQL requires knowing the index name, usually it's the column name
-- Let's provide the statements for the common ones

-- Students
SET @dbname = DATABASE();
SET @tablename = 'students';
SET @indexname = 'phone';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE `table_schema` = @dbname
      AND `table_name` = @tablename
      AND `index_name` = @indexname
  ) > 0,
  'ALTER TABLE students DROP INDEX phone;',
  'SELECT 1;'
));
PREPARE dropIfExists FROM @preparedStatement;
EXECUTE dropIfExists;
DEALLOCATE PREPARE dropIfExists;

SET @indexname = 'email';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE `table_schema` = @dbname
      AND `table_name` = @tablename
      AND `index_name` = @indexname
  ) > 0,
  'ALTER TABLE students DROP INDEX email;',
  'SELECT 1;'
));
PREPARE dropIfExists FROM @preparedStatement;
EXECUTE dropIfExists;
DEALLOCATE PREPARE dropIfExists;

-- Staff
SET @tablename = 'staff';
SET @indexname = 'phone';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE `table_schema` = @dbname
      AND `table_name` = @tablename
      AND `index_name` = @indexname
  ) > 0,
  'ALTER TABLE staff DROP INDEX phone;',
  'SELECT 1;'
));
PREPARE dropIfExists FROM @preparedStatement;
EXECUTE dropIfExists;
DEALLOCATE PREPARE dropIfExists;

SET @indexname = 'email';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE `table_schema` = @dbname
      AND `table_name` = @tablename
      AND `index_name` = @indexname
  ) > 0,
  'ALTER TABLE staff DROP INDEX email;',
  'SELECT 1;'
));
PREPARE dropIfExists FROM @preparedStatement;
EXECUTE dropIfExists;
DEALLOCATE PREPARE dropIfExists;

SET @indexname = 'aadhaar_number';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE `table_schema` = @dbname
      AND `table_name` = @tablename
      AND `index_name` = @indexname
  ) > 0,
  'ALTER TABLE staff DROP INDEX aadhaar_number;',
  'SELECT 1;'
));
PREPARE dropIfExists FROM @preparedStatement;
EXECUTE dropIfExists;
DEALLOCATE PREPARE dropIfExists;

-- Guests
SET @tablename = 'guests';
SET @indexname = 'phone';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE `table_schema` = @dbname
      AND `table_name` = @tablename
      AND `index_name` = @indexname
  ) > 0,
  'ALTER TABLE guests DROP INDEX phone;',
  'SELECT 1;'
));
PREPARE dropIfExists FROM @preparedStatement;
EXECUTE dropIfExists;
DEALLOCATE PREPARE dropIfExists;
