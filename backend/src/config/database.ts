import knex from 'knex';
import dotenv from 'dotenv';
import { seedBulkGrowthStories } from '../seedBulkStories.js';

dotenv.config();

// Validate required environment variables for database
const validateDatabaseConfig = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const missing = required.filter(key => process.env[key] === undefined || process.env[key] === '');

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set these variables before starting the server');
    process.exit(1);
  }
};

validateDatabaseConfig();

export const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === 'false' ? false : {
      rejectUnauthorized: false
    }
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    createTimeoutMillis: 5000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
  },
  acquireConnectionTimeout: 30000,
});

export async function patchDatabaseSchema() {
  try {
    console.log('[schema-patch] Checking database tables...');
    const [tables] = await db.raw("SHOW TABLES");
    const tableNames = (tables as any[]).map(t => Object.values(t)[0] as string);
    const tableNamesLower = tableNames.map(t => t.toLowerCase());
    // 0. Ensure core base tables exist in topological order
    try {
      if (!tableNamesLower.includes('users')) {
        console.log('[schema-patch] creating missing users table...');
        await db.raw(`
          CREATE TABLE users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NULL,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            phone VARCHAR(20) NULL,
            password VARCHAR(255) NULL,
            password_hash VARCHAR(255) NULL,
            role VARCHAR(50) DEFAULT 'OWNER',
            role_id INT DEFAULT 2,
            hostel_id INT NULL,
            is_active TINYINT DEFAULT 1,
            last_login DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('user_roles')) {
        console.log('[schema-patch] creating missing user_roles table...');
        await db.raw(`
          CREATE TABLE user_roles (
            role_id INT PRIMARY KEY,
            role_name VARCHAR(50) NOT NULL UNIQUE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw(`
          INSERT IGNORE INTO user_roles (role_id, role_name) VALUES
          (1, 'Admin'), (2, 'Hostel Owner'), (3, 'Tenant'), (4, 'Staff')
        `);
      }
      if (!tableNamesLower.includes('hostel_master')) {
        console.log('[schema-patch] creating missing hostel_master table...');
        await db.raw(`
          CREATE TABLE hostel_master (
            hostel_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_name VARCHAR(255) NOT NULL,
            owner_id INT NULL,
            address TEXT NULL,
            city VARCHAR(100) NULL,
            state VARCHAR(100) NULL,
            pincode VARCHAR(10) NULL,
            contact_number VARCHAR(20) NULL,
            admission_fee DECIMAL(10, 2) DEFAULT 0,
            hostel_code VARCHAR(10) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('rooms')) {
        console.log('[schema-patch] creating missing rooms table...');
        await db.raw(`
          CREATE TABLE rooms (
            room_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            room_number VARCHAR(50) NOT NULL,
            floor INT DEFAULT 1,
            capacity INT DEFAULT 1,
            occupied_beds INT DEFAULT 0,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('students')) {
        console.log('[schema-patch] creating missing students table...');
        await db.raw(`
          CREATE TABLE students (
            student_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            room_id INT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NULL,
            email VARCHAR(255) NULL,
            phone VARCHAR(20) NOT NULL,
            status INT DEFAULT 1 COMMENT '1=Active, 0=Vacated, 2=Inactive, 3=Pending',
            fee_plan TINYINT DEFAULT 1,
            admission_date DATE NULL,
            plan_start_date DATE NULL,
            plan_end_date DATE NULL,
            plan_amount DECIMAL(10,2) NULL,
            monthly_rent DECIMAL(10,2) DEFAULT 0,
            admission_fee DECIMAL(10,2) DEFAULT 0,
            admission_status INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
            FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE SET NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('payment_modes')) {
        console.log('[schema-patch] creating missing payment_modes table...');
        await db.raw(`
          CREATE TABLE payment_modes (
            payment_mode_id INT AUTO_INCREMENT PRIMARY KEY,
            payment_mode_name VARCHAR(100) NOT NULL UNIQUE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw(`
          INSERT IGNORE INTO payment_modes (payment_mode_id, payment_mode_name) VALUES
          (1, 'Cash'), (2, 'UPI'), (3, 'Bank Transfer'), (4, 'Card'), (5, 'Cheque')
        `);
      }
      if (!tableNamesLower.includes('notifications')) {
        console.log('[schema-patch] creating missing notifications table...');
        await db.raw(`
          CREATE TABLE notifications (
            notification_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            user_id INT NULL,
            student_id INT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(100) DEFAULT 'GENERAL',
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('expense_categories')) {
        console.log('[schema-patch] creating missing expense_categories table...');
        await db.raw(`
          CREATE TABLE expense_categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(100) NOT NULL UNIQUE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw(`
          INSERT IGNORE INTO expense_categories (category_id, category_name) VALUES
          (1, 'Maintenance & Repairs'), (2, 'Utilities & Electricity'), (3, 'Food & Groceries'), (4, 'Staff Wages & Salaries'), (5, 'Rent & Taxes'), (6, 'Miscellaneous')
        `);
      }
      if (!tableNamesLower.includes('expenses')) {
        console.log('[schema-patch] creating missing expenses table...');
        await db.raw(`
          CREATE TABLE expenses (
            expense_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            category_id INT NULL,
            expense_date DATE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            payment_mode_id INT NULL,
            vendor_name VARCHAR(150) NULL,
            description TEXT NULL,
            bill_number VARCHAR(100) NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('income')) {
        console.log('[schema-patch] creating missing income table...');
        await db.raw(`
          CREATE TABLE income (
            income_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            income_date DATE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            source VARCHAR(150) NULL,
            payment_mode_id INT NULL,
            receipt_number VARCHAR(100) NULL,
            description TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('monthly_fees')) {
        console.log('[schema-patch] creating missing monthly_fees table...');
        await db.raw(`
          CREATE TABLE monthly_fees (
            fee_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            student_id INT NOT NULL,
            fee_month VARCHAR(7) NULL COMMENT 'Format: YYYY-MM',
            monthly_rent DECIMAL(10, 2) DEFAULT 0,
            carry_forward DECIMAL(10, 2) DEFAULT 0,
            total_due DECIMAL(10, 2) DEFAULT 0,
            paid_amount DECIMAL(10, 2) DEFAULT 0,
            balance DECIMAL(10, 2) DEFAULT 0,
            amount DECIMAL(10, 2) DEFAULT 0,
            due_date DATE NULL,
            fee_status VARCHAR(50) DEFAULT 'Pending',
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating core parent tables:', e.message);
    }

    // 1. Ensure fee_history exists
    try {
      if (!tableNamesLower.includes('fee_history')) {
        console.log('[schema-patch] creating missing fee_history table...');
        await db.raw(`
          CREATE TABLE fee_history (
            history_id INT AUTO_INCREMENT PRIMARY KEY,
            fee_id INT NOT NULL,
            student_id INT NOT NULL,
            action VARCHAR(50) NOT NULL,
            old_values JSON NULL,
            new_values JSON NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fee_id) REFERENCES monthly_fees(fee_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
          )
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating fee_history table:', e.message);
    }

    // Ensure email_logs table exists
    try {
      if (!tableNamesLower.includes('email_logs')) {
        console.log('[schema-patch] creating missing email_logs table...');
        await db.raw(`
          CREATE TABLE email_logs (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            email_type VARCHAR(50) NOT NULL,
            subject VARCHAR(255) NULL,
            delivery_status VARCHAR(50) NOT NULL DEFAULT 'Sent',
            error_message TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating email_logs table:', e.message);
    }

    // 1.45 Ensure id_proof_types table exists
    try {
      if (!tableNamesLower.includes('id_proof_types')) {
        console.log('[schema-patch] creating missing id_proof_types table...');
        await db.raw(`
          CREATE TABLE id_proof_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            regex_pattern VARCHAR(255) NULL,
            min_length INT DEFAULT 1,
            max_length INT DEFAULT 50,
            display_order INT DEFAULT 1,
            is_active TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw(`
          INSERT IGNORE INTO id_proof_types (id, code, name, regex_pattern, min_length, max_length, display_order, is_active) VALUES
          (1, 'AADHAAR', 'Aadhaar Card', '^[0-9]{12}$', 12, 12, 1, 1),
          (2, 'PAN', 'PAN Card', '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', 10, 10, 2, 1),
          (3, 'DRIVING_LICENSE', 'Driving License', '^[A-Z]{2}[0-9]{13}$', 10, 15, 3, 1),
          (4, 'VOTER_ID', 'Voter ID', '^[A-Z]{3}[0-9]{7}$', 10, 10, 4, 1),
          (5, 'PASSPORT', 'Passport', '^[A-Z]{1}[0-9]{7}$', 8, 8, 5, 1)
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating id_proof_types table:', e.message);
    }

    // 1.48 Ensure relations_master table exists
    try {
      if (!tableNamesLower.includes('relations_master')) {
        console.log('[schema-patch] creating missing relations_master table...');
        await db.raw(`
          CREATE TABLE relations_master (
            relation_id INT AUTO_INCREMENT PRIMARY KEY,
            relation_name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT NULL,
            display_order INT DEFAULT 1,
            is_active TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw(`
          INSERT IGNORE INTO relations_master (relation_id, relation_name, description, display_order, is_active) VALUES
          (1, 'Father', 'Father', 1, 1),
          (2, 'Mother', 'Mother', 2, 1),
          (3, 'Brother', 'Brother', 3, 1),
          (4, 'Sister', 'Sister', 4, 1),
          (5, 'Guardian', 'Legal Guardian', 5, 1),
          (6, 'Relative', 'Relative', 6, 1),
          (7, 'Other', 'Other Relation', 7, 1)
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating relations_master table:', e.message);
    }

    // 1.5 Ensure room_amenities_master exists
    try {
      if (!tableNamesLower.includes('room_amenities_master')) {
        console.log('[schema-patch] creating missing room_amenities_master table...');
        await db.raw(`
          CREATE TABLE room_amenities_master (
            amenity_id INT AUTO_INCREMENT PRIMARY KEY,
            amenity_name VARCHAR(100) NOT NULL UNIQUE,
            amenity_icon VARCHAR(50) NULL,
            description TEXT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('[schema-patch] seeding default room amenities...');
        await db.raw(`
          INSERT INTO room_amenities_master (amenity_name, amenity_icon, description, display_order) VALUES
          ('Wifi', 'wifi', 'High-speed wireless internet connectivity', 1),
          ('Attached Bathroom', 'bath', 'Private bathroom attached to room', 2),
          ('Chair', 'chair', 'Comfortable chair for study', 3),
          ('Fridge', 'box', 'Refrigerator', 4),
          ('Water', 'droplet', 'Water supply', 5)
        `);

        console.log('[schema-patch] creating indexes for room_amenities_master...');
        await db.raw("CREATE INDEX idx_room_amenities_active ON room_amenities_master(is_active)");
        await db.raw("CREATE INDEX idx_room_amenities_order ON room_amenities_master(display_order)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating room_amenities_master table:', e.message);
    }

    // 1.7 Ensure amenities_master exists
    try {
      if (!tableNamesLower.includes('amenities_master')) {
        console.log('[schema-patch] creating missing amenities_master table...');
        await db.raw(`
          CREATE TABLE amenities_master (
            amenity_id INT AUTO_INCREMENT PRIMARY KEY,
            amenity_name VARCHAR(100) NOT NULL UNIQUE,
            amenity_icon VARCHAR(50) NULL,
            description TEXT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('[schema-patch] seeding default hostel amenities...');
        await db.raw(`
          INSERT INTO amenities_master (amenity_name, amenity_icon, description, display_order) VALUES
          ('WiFi', 'wifi', 'High-speed internet access', 1),
          ('CCTV', 'video', '24/7 security surveillance', 2),
          ('Power Backup', 'battery-charging', 'Uninterrupted power supply', 3),
          ('Laundry', 'washing-machine', 'Washing machine and drying area', 4),
          ('Drinking Water', 'droplet', 'RO purified drinking water', 5),
          ('Security Guard', 'shield-check', 'On-duty security personnel', 6),
          ('Gym', 'dumbbell', 'Fitness equipment and gym area', 7),
          ('Food / Mess', 'utensils', 'Daily meals provided in mess', 8)
        `);

        console.log('[schema-patch] creating indexes for amenities_master...');
        await db.raw("CREATE INDEX idx_amenities_active ON amenities_master(is_active)");
        await db.raw("CREATE INDEX idx_amenities_order ON amenities_master(display_order)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating amenities_master table:', e.message);
    }

    // 2. Ensure fee_payments columns exist
    try {
      if (tableNamesLower.includes('fee_payments')) {
        console.log('[schema-patch] Checking fee_payments columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM fee_payments");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('receipt_number')) {
          console.log('[schema-patch] adding receipt_number to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN receipt_number VARCHAR(100) NULL");
        }
        if (!columnNames.includes('due_date')) {
          console.log('[schema-patch] adding due_date to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN due_date DATE NULL");
        }
        if (!columnNames.includes('payment_mode_id')) {
          console.log('[schema-patch] adding payment_mode_id to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN payment_mode_id INT NULL");
        }
        if (!columnNames.includes('transaction_id')) {
          console.log('[schema-patch] adding transaction_id to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN transaction_id VARCHAR(100) NULL");
        }
        if (!columnNames.includes('transaction_type')) {
          console.log('[schema-patch] adding transaction_type to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN transaction_type VARCHAR(50) NULL DEFAULT 'PAYMENT'");
        }
        if (!columnNames.includes('reason')) {
          console.log('[schema-patch] adding reason to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN reason VARCHAR(255) NULL");
        }
        if (!columnNames.includes('verification_status')) {
          console.log('[schema-patch] adding verification_status to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN verification_status VARCHAR(50) DEFAULT 'Verified'");
        }
        if (!columnNames.includes('proof_url')) {
          console.log('[schema-patch] adding proof_url to fee_payments...');
          await db.raw("ALTER TABLE fee_payments ADD COLUMN proof_url TEXT NULL");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error updating fee_payments columns:', e.message);
    }

    // Ensure monthly_fees columns exist
    try {
      if (tableNamesLower.includes('monthly_fees')) {
        console.log('[schema-patch] Checking monthly_fees columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM monthly_fees");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('fee_month')) {
          console.log('[schema-patch] adding fee_month to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN fee_month VARCHAR(7) NULL COMMENT 'Format: YYYY-MM'");
        }
        if (!columnNames.includes('monthly_rent')) {
          console.log('[schema-patch] adding monthly_rent to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN monthly_rent DECIMAL(10, 2) DEFAULT 0");
        }
        if (!columnNames.includes('carry_forward')) {
          console.log('[schema-patch] adding carry_forward to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN carry_forward DECIMAL(10, 2) DEFAULT 0");
        }
        if (!columnNames.includes('total_due')) {
          console.log('[schema-patch] adding total_due to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN total_due DECIMAL(10, 2) DEFAULT 0");
        }
        if (!columnNames.includes('paid_amount')) {
          console.log('[schema-patch] adding paid_amount to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN paid_amount DECIMAL(10, 2) DEFAULT 0");
        }
        if (!columnNames.includes('balance')) {
          console.log('[schema-patch] adding balance to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0");
        }
        if (!columnNames.includes('fee_status')) {
          console.log('[schema-patch] adding fee_status to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN fee_status VARCHAR(50) DEFAULT 'Pending'");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error updating fee_payments columns:', e.message);
    }

    // 2.5 Ensure students table notice and bed columns exist
    try {
      if (tableNamesLower.includes('students')) {
        console.log('[schema-patch] Checking students columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM students");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('status')) {
          console.log('[schema-patch] adding status to students...');
          if (columnNames.includes('student_status')) {
            await db.raw("ALTER TABLE students CHANGE COLUMN student_status status INT DEFAULT 1");
          } else if (columnNames.includes('is_active')) {
            await db.raw("ALTER TABLE students ADD COLUMN status INT DEFAULT 1");
            await db.raw("UPDATE students SET status = IF(is_active = 1, 1, 0)");
          } else {
            await db.raw("ALTER TABLE students ADD COLUMN status INT DEFAULT 1 COMMENT '1=Active, 0=Vacated, 2=Inactive, 3=Pending'");
          }
        }
        if (!columnNames.includes('is_active')) {
          console.log('[schema-patch] adding is_active to students...');
          await db.raw("ALTER TABLE students ADD COLUMN is_active TINYINT DEFAULT 1");
          await db.raw("UPDATE students SET is_active = IF(status = 1, 1, 0)");
        }
        if (!columnNames.includes('floor_number')) {
          console.log('[schema-patch] adding floor_number to students...');
          if (columnNames.includes('floor')) {
            await db.raw("ALTER TABLE students CHANGE COLUMN floor floor_number VARCHAR(50) NULL");
          } else {
            await db.raw("ALTER TABLE students ADD COLUMN floor_number VARCHAR(50) NULL");
          }
        }
        if (!columnNames.includes('vacate_notice_date')) {
          console.log('[schema-patch] adding vacate_notice_date to students...');
          await db.raw("ALTER TABLE students ADD COLUMN vacate_notice_date DATE NULL");
        }
        if (!columnNames.includes('vacate_notice_reason')) {
          console.log('[schema-patch] adding vacate_notice_reason to students...');
          await db.raw("ALTER TABLE students ADD COLUMN vacate_notice_reason VARCHAR(255) NULL");
        }
        if (!columnNames.includes('bed_id')) {
          console.log('[schema-patch] adding bed_id to students...');
          await db.raw("ALTER TABLE students ADD COLUMN bed_id VARCHAR(50) NULL");
        }
        if (!columnNames.includes('permanent_address')) {
          console.log('[schema-patch] adding permanent_address to students...');
          await db.raw("ALTER TABLE students ADD COLUMN permanent_address TEXT NULL");
        }
        if (!columnNames.includes('current_address')) {
          console.log('[schema-patch] adding current_address to students...');
          await db.raw("ALTER TABLE students ADD COLUMN current_address TEXT NULL");
        }
        if (!columnNames.includes('id_proof_number')) {
          console.log('[schema-patch] adding id_proof_number to students...');
          await db.raw("ALTER TABLE students ADD COLUMN id_proof_number VARCHAR(100) NULL");
        }
        if (!columnNames.includes('profile_photo_url')) {
          console.log('[schema-patch] adding profile_photo_url to students...');
          await db.raw("ALTER TABLE students ADD COLUMN profile_photo_url VARCHAR(500) NULL");
        }
        if (!columnNames.includes('id_proof_front_url')) {
          console.log('[schema-patch] adding id_proof_front_url to students...');
          await db.raw("ALTER TABLE students ADD COLUMN id_proof_front_url VARCHAR(500) NULL");
        }
        if (!columnNames.includes('id_proof_back_url')) {
          console.log('[schema-patch] adding id_proof_back_url to students...');
          await db.raw("ALTER TABLE students ADD COLUMN id_proof_back_url VARCHAR(500) NULL");
        }
        // ── Fee Plan columns (lump-sum billing cycle support) ──────────────────
        if (!columnNames.includes('fee_plan')) {
          console.log('[schema-patch] adding fee_plan to students...');
          await db.raw("ALTER TABLE students ADD COLUMN fee_plan TINYINT NOT NULL DEFAULT 1 COMMENT '1=Monthly,3=Quarterly,6=Half-yearly,12=Yearly'");
        }
        if (!columnNames.includes('plan_start_date')) {
          console.log('[schema-patch] adding plan_start_date to students...');
          await db.raw("ALTER TABLE students ADD COLUMN plan_start_date DATE NULL COMMENT 'Start of current paid plan cycle'");
        }
        if (!columnNames.includes('plan_end_date')) {
          console.log('[schema-patch] adding plan_end_date to students...');
          await db.raw("ALTER TABLE students ADD COLUMN plan_end_date DATE NULL COMMENT 'End of current paid plan cycle'");
        }
        if (!columnNames.includes('plan_amount')) {
          console.log('[schema-patch] adding plan_amount to students...');
          await db.raw("ALTER TABLE students ADD COLUMN plan_amount DECIMAL(10,2) NULL COMMENT 'Total amount collected for current plan cycle'");
        }
        if (!columnNames.includes('inactive_date')) {
          console.log('[schema-patch] adding inactive_date to students...');
          await db.raw("ALTER TABLE students ADD COLUMN inactive_date DATE NULL COMMENT 'Date student became inactive/vacated'");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error updating students columns:', e.message);
    }

    // 2.6 Hostel-scoped uniqueness on phone / ID-proof number (Aadhaar, PAN, etc.),
    // as a DB-level backstop for the application-level checkHostelUniqueIdentifiers
    // check — without this, two concurrent registrations for the same phone/ID
    // could both pass the pre-insert check and both land in the DB. Scoped to
    // (hostel_id, column) rather than global, since the same phone/ID is allowed
    // to appear in two different hostels. MySQL unique indexes permit multiple
    // NULLs, so rows missing phone/id_proof_number don't collide.
    try {
      const ensureUniqueIndex = async (table: string, indexName: string, columns: string) => {
        const [rows] = await db.raw('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, indexName]);
        if ((rows as any[]).length === 0) {
          console.log(`[schema-patch] adding unique index ${indexName} on ${table}(${columns})...`);
          await db.raw(`CREATE UNIQUE INDEX ${indexName} ON ${table}(${columns})`);
        }
      };

      if (tableNamesLower.includes('students')) {
        await ensureUniqueIndex('students', 'idx_students_hostel_phone_uniq', 'hostel_id, phone');
        await ensureUniqueIndex('students', 'idx_students_hostel_idproof_uniq', 'hostel_id, id_proof_number');
      }
      if (tableNamesLower.includes('staff')) {
        await ensureUniqueIndex('staff', 'idx_staff_hostel_phone_uniq', 'hostel_id, phone');
        await ensureUniqueIndex('staff', 'idx_staff_hostel_aadhaar_uniq', 'hostel_id, aadhaar_number');
      }
      if (tableNamesLower.includes('guests')) {
        await ensureUniqueIndex('guests', 'idx_guests_hostel_phone_uniq', 'hostel_id, phone');
        await ensureUniqueIndex('guests', 'idx_guests_hostel_idproof_uniq', 'hostel_id, id_proof_number');
      }
    } catch (e: any) {
      console.error('[schema-patch] Error adding hostel-scoped unique indexes:', e.message);
    }

    // Ensure hostel_master columns exist
    try {
      if (tableNamesLower.includes('hostel_master')) {
        console.log('[schema-patch] Checking hostel_master columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM hostel_master");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('is_active')) {
          console.log('[schema-patch] adding is_active to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN is_active TINYINT DEFAULT 1");
        }
        if (!columnNames.includes('default_refundable_deposit')) {
          console.log('[schema-patch] adding default_refundable_deposit to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN default_refundable_deposit DECIMAL(10, 2) DEFAULT 0");
        }
        if (!columnNames.includes('state')) {
          console.log('[schema-patch] adding state to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN state VARCHAR(100) NULL");
        }
        if (!columnNames.includes('pincode')) {
          console.log('[schema-patch] adding pincode to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN pincode VARCHAR(10) NULL");
        }
        if (!columnNames.includes('total_floors')) {
          console.log('[schema-patch] adding total_floors to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN total_floors INT DEFAULT 1");
        }
        if (!columnNames.includes('amenities')) {
          console.log('[schema-patch] adding amenities to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN amenities TEXT NULL");
        }
        if (!columnNames.includes('admission_fee')) {
          console.log('[schema-patch] adding admission_fee to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN admission_fee DECIMAL(10, 2) DEFAULT 0");
        }
        if (!columnNames.includes('hostel_code')) {
          console.log('[schema-patch] adding hostel_code to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN hostel_code VARCHAR(10) UNIQUE AFTER hostel_name");
          // Generate codes for existing hostels
          await db.raw("UPDATE hostel_master SET hostel_code = SUBSTRING(MD5(RAND()), 1, 6) WHERE hostel_code IS NULL");
        }
        if (!columnNames.includes('subscription_status_id')) {
          console.log('[schema-patch] adding subscription_status_id to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN subscription_status_id INT DEFAULT 1");
        }
        if (!columnNames.includes('subscription_status')) {
          console.log('[schema-patch] adding subscription_status to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN subscription_status INT DEFAULT 1");
        }
        if (!columnNames.includes('hostel_type_id')) {
          console.log('[schema-patch] adding hostel_type_id to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN hostel_type_id INT DEFAULT 1");
        }
        if (!columnNames.includes('trial_start_date')) {
          console.log('[schema-patch] adding trial_start_date to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN trial_start_date DATETIME NULL");
        }
        if (!columnNames.includes('trial_end_date')) {
          console.log('[schema-patch] adding trial_end_date to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN trial_end_date DATETIME NULL");
        }
        if (!columnNames.includes('updated_at')) {
          console.log('[schema-patch] adding updated_at to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating hostel_master columns:', e.message);
    }

    // Ensure users columns exist
    try {
      if (tableNamesLower.includes('users')) {
        console.log('[schema-patch] Checking users columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM users");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('password_hash')) {
          console.log('[schema-patch] adding password_hash to users...');
          await db.raw("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL");
          await db.raw("UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL");
        }
        if (!columnNames.includes('password')) {
          console.log('[schema-patch] adding password to users...');
          await db.raw("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL");
          await db.raw("UPDATE users SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL");
        }
        if (!columnNames.includes('username')) {
          console.log('[schema-patch] adding username to users...');
          await db.raw("ALTER TABLE users ADD COLUMN username VARCHAR(255) NULL");
        }
        if (!columnNames.includes('role')) {
          console.log('[schema-patch] adding role to users...');
          await db.raw("ALTER TABLE users ADD COLUMN role VARCHAR(50) NULL DEFAULT 'OWNER'");
        }
        if (!columnNames.includes('is_active')) {
          console.log('[schema-patch] adding is_active to users...');
          await db.raw("ALTER TABLE users ADD COLUMN is_active TINYINT DEFAULT 1");
        }
        if (!columnNames.includes('last_login')) {
          console.log('[schema-patch] adding last_login to users...');
          await db.raw("ALTER TABLE users ADD COLUMN last_login DATETIME NULL");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating users columns:', e.message);
    }

    // Ensure rooms columns exist
    try {
      if (tableNamesLower.includes('rooms')) {
        console.log('[schema-patch] Checking rooms columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM rooms");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('capacity')) {
          console.log('[schema-patch] adding capacity to rooms...');
          await db.raw("ALTER TABLE rooms ADD COLUMN capacity INT DEFAULT 1");
        }
        if (!columnNames.includes('occupied_beds')) {
          console.log('[schema-patch] adding occupied_beds to rooms...');
          await db.raw("ALTER TABLE rooms ADD COLUMN occupied_beds INT DEFAULT 0");
        }
        if (!columnNames.includes('floor_number')) {
          console.log('[schema-patch] adding floor_number to rooms...');
          if (columnNames.includes('floor')) {
            await db.raw("ALTER TABLE rooms CHANGE COLUMN floor floor_number INT DEFAULT 1");
          } else {
            await db.raw("ALTER TABLE rooms ADD COLUMN floor_number INT DEFAULT 1");
          }
        }
        if (!columnNames.includes('created_at')) {
          console.log('[schema-patch] adding created_at to rooms...');
          await db.raw("ALTER TABLE rooms ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        }
        if (!columnNames.includes('updated_at')) {
          console.log('[schema-patch] adding updated_at to rooms...');
          await db.raw("ALTER TABLE rooms ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating rooms columns:', e.message);
    }

    // 3. Ensure income table exists
    try {
      if (!tableNamesLower.includes('income')) {
        console.log('[schema-patch] creating missing income table...');
        await db.raw(`
          CREATE TABLE income (
            income_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            income_date DATE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            source VARCHAR(255) NOT NULL,
            payment_mode_id INT NOT NULL,
            receipt_number VARCHAR(100) NULL,
            description TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
            FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(payment_mode_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[schema-patch] creating indexes for income table...');
        await db.raw("CREATE INDEX idx_income_hostel ON income(hostel_id)");
        await db.raw("CREATE INDEX idx_income_date ON income(income_date)");
      } else {
        console.log('[schema-patch] Checking income columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM income");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('payment_mode_id')) {
          console.log('[schema-patch] adding payment_mode_id to income...');
          await db.raw("ALTER TABLE income ADD COLUMN payment_mode_id INT NULL");
        }
        if (!columnNames.includes('receipt_number')) {
          console.log('[schema-patch] adding receipt_number to income...');
          await db.raw("ALTER TABLE income ADD COLUMN receipt_number VARCHAR(100) NULL");
        }
        if (!columnNames.includes('description')) {
          console.log('[schema-patch] adding description to income...');
          await db.raw("ALTER TABLE income ADD COLUMN description TEXT NULL");
        }
        if (!columnNames.includes('updated_at')) {
          console.log('[schema-patch] adding updated_at to income...');
          await db.raw("ALTER TABLE income ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating income table:', e.message);
    }

    // 4. Ensure expenses columns exist
    try {
      if (tableNamesLower.includes('expenses')) {
        console.log('[schema-patch] Checking expenses columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM expenses");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('payment_mode_id')) {
          console.log('[schema-patch] adding payment_mode_id to expenses...');
          await db.raw("ALTER TABLE expenses ADD COLUMN payment_mode_id INT NULL");
        }
        if (!columnNames.includes('vendor_name')) {
          console.log('[schema-patch] adding vendor_name to expenses...');
          await db.raw("ALTER TABLE expenses ADD COLUMN vendor_name VARCHAR(255) NULL");
        }
        if (!columnNames.includes('bill_number')) {
          console.log('[schema-patch] adding bill_number to expenses...');
          await db.raw("ALTER TABLE expenses ADD COLUMN bill_number VARCHAR(100) NULL");
        }
        if (!columnNames.includes('created_by')) {
          console.log('[schema-patch] adding created_by to expenses...');
          await db.raw("ALTER TABLE expenses ADD COLUMN created_by INT NULL");
        }
        if (!columnNames.includes('updated_at')) {
          console.log('[schema-patch] adding updated_at to expenses...');
          await db.raw("ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating expenses columns:', e.message);
    }

    // 5. Ensure staff table exists
    try {
      if (!tableNamesLower.includes('staff')) {
        console.log('[schema-patch] creating missing staff table...');
        await db.raw(`
          CREATE TABLE staff (
            staff_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255) NULL,
            role VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'ACTIVE',
            join_date DATE NOT NULL,
            monthly_salary DECIMAL(10, 2) NULL,
            aadhaar_number VARCHAR(20) NULL,
            photo VARCHAR(255) NULL,
            aadhaar_front VARCHAR(255) NULL,
            aadhaar_back VARCHAR(255) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[schema-patch] creating indexes for staff table...');
        await db.raw("CREATE INDEX idx_staff_hostel ON staff(hostel_id)");

        console.log('[schema-patch] seeding default staff record...');
        const hostels = await db('hostel_master').select('hostel_id').limit(1);
        if (hostels.length > 0) {
          const hid = hostels[0].hostel_id;
          await db('staff').insert({
            hostel_id: hid,
            full_name: 'Veera Durgarao',
            phone: '9797949646',
            role: 'Cook',
            status: 'ACTIVE',
            join_date: '2026-06-01',
            monthly_salary: 30000.00
          });
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating staff table:', e.message);
    }

    // 6. Ensure reminders table exists
    try {
      if (!tableNamesLower.includes('reminders')) {
        console.log('[schema-patch] creating missing reminders table...');
        await db.raw(`
          CREATE TABLE reminders (
            reminder_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            reminder_date DATE NOT NULL,
            description TEXT NULL,
            priority VARCHAR(20) DEFAULT 'MEDIUM',
            category VARCHAR(50) DEFAULT 'General',
            status VARCHAR(20) DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[schema-patch] creating indexes for reminders table...');
        await db.raw("CREATE INDEX idx_reminders_hostel ON reminders(hostel_id)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating reminders table:', e.message);
    }

    // 7. Ensure notices table exists
    try {
      if (!tableNamesLower.includes('notices')) {
        console.log('[schema-patch] creating missing notices table...');
        await db.raw(`
          CREATE TABLE notices (
            notice_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            notice_type VARCHAR(100) DEFAULT 'General',
            image_url TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[schema-patch] creating indexes for notices table...');
        await db.raw("CREATE INDEX idx_notices_hostel ON notices(hostel_id)");
      } else {
        // Ensure image_url column exists
        const [columns] = await db.raw("SHOW COLUMNS FROM notices");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());
        if (!columnNames.includes('image_url')) {
          console.log('[schema-patch] adding image_url to notices...');
          await db.raw("ALTER TABLE notices ADD COLUMN image_url TEXT NULL");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating notices table:', e.message);
    }

    // 7.5 Ensure notice_categories table exists
    try {
      if (!tableNamesLower.includes('notice_categories')) {
        console.log('[schema-patch] creating missing notice_categories table...');
        await db.raw(`
          CREATE TABLE notice_categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            category_name VARCHAR(100) NOT NULL,
            color VARCHAR(50) DEFAULT '#6366F1',
            emoji VARCHAR(10) DEFAULT '📢',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE UNIQUE INDEX idx_notice_cat_unique ON notice_categories(hostel_id, category_name)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating notice_categories table:', e.message);
    }

    // 8. Ensure app_settings table exists
    try {
      if (!tableNamesLower.includes('app_settings')) {
        console.log('[schema-patch] creating missing app_settings table...');
        await db.raw(`
          CREATE TABLE app_settings (
            setting_id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT NULL,
            description TEXT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating app_settings table:', e.message);
    }

    // 9. Ensure guests table exists (short-stay paying guests / daily visitors)
    try {
      if (!tableNamesLower.includes('guests')) {
        console.log('[schema-patch] creating missing guests table...');
        await db.raw(`
          CREATE TABLE guests (
            guest_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(20) NULL,
            check_in_date DATE NOT NULL,
            check_out_date DATE NULL,
            days INT DEFAULT 1,
            amount_paid DECIMAL(10, 2) DEFAULT 0,
            purpose VARCHAR(255) NULL,
            room_number VARCHAR(50) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE INDEX idx_guests_hostel ON guests(hostel_id)");
        await db.raw("CREATE INDEX idx_guests_checkin ON guests(check_in_date)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating guests table:', e.message);
    }

    // 10. Ensure staff_payments table exists (per-worker wage payment history)
    try {
      if (!tableNamesLower.includes('staff_payments')) {
        console.log('[schema-patch] creating missing staff_payments table...');
        await db.raw(`
          CREATE TABLE staff_payments (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            staff_id INT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            payment_date DATE NOT NULL,
            days_worked INT NULL,
            payment_type VARCHAR(30) DEFAULT 'Wage',
            note TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
            FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE INDEX idx_staff_payments_hostel ON staff_payments(hostel_id)");
        await db.raw("CREATE INDEX idx_staff_payments_staff ON staff_payments(staff_id)");
        await db.raw("CREATE INDEX idx_staff_payments_date ON staff_payments(payment_date)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating staff_payments table:', e.message);
    }

    // 11. Ensure otps table exists and has all required columns
    // (used for email verification on owner register + tenant forgot-password OTP)
    try {
      if (!tableNamesLower.includes('otps')) {
        console.log('[schema-patch] creating missing otps table...');
        await db.raw(`
          CREATE TABLE otps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp VARCHAR(10) NOT NULL,
            expires_at DATETIME NOT NULL,
            verified TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_otps_email (email)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[schema-patch] otps table created.');
      } else {
        // Table exists — ensure verified column is present (older deployments may lack it)
        const [otpCols] = await db.raw("SHOW COLUMNS FROM otps");
        const otpColNames = (otpCols as any[]).map((c: any) => c.Field);
        if (!otpColNames.includes('verified')) {
          console.log('[schema-patch] adding verified column to otps...');
          await db.raw("ALTER TABLE otps ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating otps table:', e.message);
    }

    // 12. Make guardian fields optional on students (avoid '0000000000'/'N/A' placeholder pollution)
    try {
      if (tableNamesLower.includes('students')) {
        await db.raw("ALTER TABLE students MODIFY COLUMN guardian_phone VARCHAR(15) NULL").catch(() => { });
        await db.raw("ALTER TABLE students MODIFY COLUMN guardian_name VARCHAR(150) NULL").catch(() => { });
      }
    } catch (e: any) {
      console.error('[schema-patch] Error relaxing students guardian columns:', e.message);
    }

    // 13. Ensure user_push_tokens exists
    try {
      if (!tableNamesLower.includes('user_push_tokens')) {
        console.log('[schema-patch] creating missing user_push_tokens table...');
        await db.raw(`
          CREATE TABLE user_push_tokens (
            token_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            push_token VARCHAR(255) NOT NULL UNIQUE,
            device_name VARCHAR(100) NULL,
            platform VARCHAR(50) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[schema-patch] creating indexes for user_push_tokens table...');
        await db.raw("CREATE INDEX idx_user_push_tokens_user ON user_push_tokens(user_id)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating user_push_tokens table:', e.message);
    }

    // 13.5 Ensure user_push_tokens supports tenant (student_id) tokens, not just owner/staff (user_id)
    try {
      if (tableNamesLower.includes('user_push_tokens')) {
        const [columns] = await db.raw("SHOW COLUMNS FROM user_push_tokens");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('student_id')) {
          console.log('[schema-patch] adding student_id to user_push_tokens...');
          await db.raw("ALTER TABLE user_push_tokens ADD COLUMN student_id INT NULL");
          await db.raw("ALTER TABLE user_push_tokens ADD FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE");
        }
        console.log('[schema-patch] Relaxing user_push_tokens.user_id to nullable...');
        await db.raw("ALTER TABLE user_push_tokens MODIFY COLUMN user_id INT NULL");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error updating user_push_tokens for tenant tokens:', e.message);
    }

    // 13.6 Ensure guests table has email, id_proof_type_id, id_proof_number, and status columns
    try {
      if (tableNamesLower.includes('guests')) {
        const [guestCols] = await db.raw("SHOW COLUMNS FROM guests");
        const guestColNames = (guestCols as any[]).map(c => c.Field.toLowerCase());

        if (!guestColNames.includes('email')) {
          console.log('[schema-patch] adding email column to guests...');
          await db.raw("ALTER TABLE guests ADD COLUMN email VARCHAR(255) NULL");
        }

        if (!guestColNames.includes('id_proof_type_id')) {
          console.log('[schema-patch] adding id_proof_type_id column to guests...');
          await db.raw("ALTER TABLE guests ADD COLUMN id_proof_type_id INT NULL");
          await db.raw("ALTER TABLE guests ADD FOREIGN KEY (id_proof_type_id) REFERENCES id_proof_types(id) ON DELETE SET NULL").catch(() => { });
        }

        if (!guestColNames.includes('id_proof_number')) {
          console.log('[schema-patch] adding id_proof_number column to guests...');
          await db.raw("ALTER TABLE guests ADD COLUMN id_proof_number VARCHAR(100) NULL");
        }

        // guests.status — plain VARCHAR so it never suffers ENUM-drift.
        // The controller reads it as g.status || 'staying', so NULL-safe.
        if (!guestColNames.includes('status')) {
          console.log('[schema-patch] adding status column to guests...');
          await db.raw("ALTER TABLE guests ADD COLUMN status VARCHAR(50) DEFAULT 'staying'");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating guests columns:', e.message);
    }

    // 14. Ensure notifications table has hostel_id and priority columns
    // NOTE: priority is VARCHAR(20), not ENUM — ENUM columns are a historical
    // source of drift bugs (fee_status, notification_type). VARCHAR is safe to
    // extend without a migration.
    try {
      if (tableNamesLower.includes('notifications')) {
        console.log('[schema-patch] Checking notifications columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM notifications");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('hostel_id')) {
          console.log('[schema-patch] adding hostel_id to notifications...');
          await db.raw("ALTER TABLE notifications ADD COLUMN hostel_id INT NULL, ADD FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE");
        }
        if (!columnNames.includes('priority')) {
          console.log('[schema-patch] adding priority to notifications...');
          // Use VARCHAR, not ENUM, to prevent drift when new priority levels are added.
          await db.raw("ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'Medium'");
        } else {
          // If it was previously created as an ENUM, migrate it to VARCHAR silently.
          const [notifCols] = await db.raw("SHOW COLUMNS FROM notifications WHERE Field = 'priority'");
          if (notifCols.length > 0 && String(notifCols[0].Type).startsWith('enum')) {
            console.log('[schema-patch] converting notifications.priority from ENUM to VARCHAR(20)...');
            await db.raw("ALTER TABLE notifications MODIFY COLUMN priority VARCHAR(20) DEFAULT 'Medium'");
          }
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating notifications columns:', e.message);
    }

    // 15. Ensure default categories exist in expense_categories
    try {
      if (tableNamesLower.includes('expense_categories')) {
        console.log('[schema-patch] Ensuring default expense categories exist...');
        const [columns] = await db.raw("SHOW COLUMNS FROM expense_categories");
        const expColNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!expColNames.includes('description')) {
          console.log('[schema-patch] adding description to expense_categories...');
          await db.raw("ALTER TABLE expense_categories ADD COLUMN description TEXT NULL");
        }

        const categories = await db('expense_categories').select('category_name');
        const categoryNames = categories.map((c: any) => c.category_name.toLowerCase());

        const defaultCats = [
          { name: 'Water Bill', desc: 'Monthly water charges' },
          { name: 'Others', desc: 'Miscellaneous other expenses' },
          { name: 'Electricity Bill', desc: 'Monthly electricity charges' },
          { name: 'Groceries', desc: 'Food and provisions' },
          { name: 'Salary', desc: 'Staff salaries' },
          { name: 'Maintenance', desc: 'Repairs and maintenance' },
          { name: 'Internet Bill', desc: 'Internet and WiFi charges' },
          { name: 'Lift Bill', desc: 'Lift maintenance and electricity charges' }
        ];

        for (const cat of defaultCats) {
          if (!categoryNames.includes(cat.name.toLowerCase())) {
            console.log(`[schema-patch] Adding "${cat.name}" category...`);
            await db('expense_categories').insert({
              category_name: cat.name,
              description: cat.desc
            });
          }
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error seeding default expense categories:', e.message);
    }

    // 16. Ecosystem Tables (Complaints, Leave, Visitor, Mess Menu)
    try {
      if (!tableNamesLower.includes('complaints')) {
        console.log('[schema-patch] creating missing complaints table...');
        await db.raw(`
          CREATE TABLE complaints (
            complaint_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            student_id INT NOT NULL,
            category VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            status VARCHAR(50) DEFAULT 'Open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('leave_requests')) {
        console.log('[schema-patch] creating missing leave_requests table...');
        await db.raw(`
          CREATE TABLE leave_requests (
            leave_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            student_id INT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            reason TEXT NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('visitor_requests')) {
        console.log('[schema-patch] creating missing visitor_requests table...');
        await db.raw(`
          CREATE TABLE visitor_requests (
            visitor_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            student_id INT NOT NULL,
            visitor_name VARCHAR(255) NOT NULL,
            relation VARCHAR(100) NULL,
            visit_date DATE NOT NULL,
            visit_time VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      if (!tableNamesLower.includes('mess_menu')) {
        console.log('[schema-patch] creating missing mess_menu table...');
        await db.raw(`
          CREATE TABLE mess_menu (
            menu_id INT AUTO_INCREMENT PRIMARY KEY,
            hostel_id INT NOT NULL,
            day_of_week VARCHAR(20) NULL,
            meal_type VARCHAR(50) NOT NULL,
            items TEXT NOT NULL,
            timing VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating ecosystem tables:', e.message);
    }

    // 17. Ensure notifications has student_id and string type
    try {
      if (tableNamesLower.includes('notifications')) {
        const [columns] = await db.raw("SHOW COLUMNS FROM notifications");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('student_id')) {
          console.log('[schema-patch] adding student_id to notifications...');
          await db.raw("ALTER TABLE notifications ADD COLUMN student_id INT NULL");
          await db.raw("ALTER TABLE notifications ADD FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE");
        }
        // Make user_id nullable since notifications can now be for students
        await db.raw("ALTER TABLE notifications MODIFY COLUMN user_id INT NULL");
        // Change notification_type to VARCHAR to support new types without ENUM issues
        await db.raw("ALTER TABLE notifications MODIFY COLUMN notification_type VARCHAR(100) NOT NULL");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error updating notifications for ecosystem:', e.message);
    }

    // 18. Ensure student_fee_payments has verification_status and proof_url
    try {
      if (tableNamesLower.includes('student_fee_payments')) {
        const [columns] = await db.raw("SHOW COLUMNS FROM student_fee_payments");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());

        if (!columnNames.includes('verification_status')) {
          console.log('[schema-patch] adding verification_status to student_fee_payments...');
          await db.raw("ALTER TABLE student_fee_payments ADD COLUMN verification_status VARCHAR(50) DEFAULT 'Verified'");
        }
        if (!columnNames.includes('proof_url')) {
          console.log('[schema-patch] adding proof_url to student_fee_payments...');
          await db.raw("ALTER TABLE student_fee_payments ADD COLUMN proof_url TEXT NULL");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error updating student_fee_payments for ecosystem:', e.message);
    }

    // 19. Ensure tenant_expenses table exists
    try {
      if (!tableNamesLower.includes('tenant_expenses')) {
        console.log('[schema-patch] creating missing tenant_expenses table...');
        await db.raw(`
          CREATE TABLE tenant_expenses (
            expense_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            category VARCHAR(100) NOT NULL,
            date DATE NOT NULL,
            payment_mode VARCHAR(50) DEFAULT 'Cash',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE INDEX idx_tenant_expenses_student ON tenant_expenses(student_id)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating tenant_expenses table:', e.message);
    }

    // Ensure tenant_expenses has category column
    try {
      if (tableNamesLower.includes('tenant_expenses')) {
        const [columns] = await db.raw("SHOW COLUMNS FROM tenant_expenses");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());
        if (!columnNames.includes('category')) {
          console.log('[schema-patch] Adding missing category column to tenant_expenses...');
          await db.raw("ALTER TABLE tenant_expenses ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Others'");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error adding category column to tenant_expenses:', e.message);
    }

    // 20. Ensure splits_members table exists
    try {
      if (!tableNamesLower.includes('splits_members')) {
        console.log('[schema-patch] creating missing splits_members table...');
        await db.raw(`
          CREATE TABLE splits_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            member_id VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE UNIQUE INDEX idx_splits_members_uniq ON splits_members(student_id, member_id)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating splits_members table:', e.message);
    }

    // 21. Ensure splits_expenses table exists
    try {
      if (!tableNamesLower.includes('splits_expenses')) {
        console.log('[schema-patch] creating missing splits_expenses table...');
        await db.raw(`
          CREATE TABLE splits_expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            expense_id VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            paid_by_id VARCHAR(50) NOT NULL,
            participant_ids TEXT NOT NULL,
            expense_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE UNIQUE INDEX idx_splits_expenses_uniq ON splits_expenses(student_id, expense_id)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating splits_expenses table:', e.message);
    }

    // 22. Ensure tenant_budgets table exists
    try {
      if (!tableNamesLower.includes('tenant_budgets')) {
        console.log('[schema-patch] creating missing tenant_budgets table...');
        await db.raw(`
          CREATE TABLE tenant_budgets (
            student_id INT PRIMARY KEY,
            amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating tenant_budgets table:', e.message);
    }

    // 23. Ensure tenant_saving_goals table exists
    try {
      if (!tableNamesLower.includes('tenant_saving_goals')) {
        console.log('[schema-patch] creating missing tenant_saving_goals table...');
        await db.raw(`
          CREATE TABLE tenant_saving_goals (
            student_id INT PRIMARY KEY,
            name VARCHAR(255) DEFAULT 'Savings Goal',
            amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            saved_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating tenant_saving_goals table:', e.message);
    }

    // 23b. Ensure name and saved_amount columns exist in tenant_saving_goals
    try {
      if (tableNamesLower.includes('tenant_saving_goals')) {
        const columns = await db.raw("SHOW COLUMNS FROM tenant_saving_goals");
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('name')) {
          console.log('[schema-patch] Adding name column to tenant_saving_goals...');
          await db.raw("ALTER TABLE tenant_saving_goals ADD COLUMN name VARCHAR(255) DEFAULT 'Savings Goal'");
        }
        if (!columnNames.includes('saved_amount')) {
          console.log('[schema-patch] Adding saved_amount column to tenant_saving_goals...');
          await db.raw("ALTER TABLE tenant_saving_goals ADD COLUMN saved_amount DECIMAL(10, 2) NOT NULL DEFAULT 0");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/adding columns to tenant_saving_goals:', e.message);
    }

    // 24. Ensure image_urls column exists in complaints
    try {
      if (tableNamesLower.includes('complaints')) {
        const columns = await db.raw("SHOW COLUMNS FROM complaints");
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('image_urls')) {
          console.log('[schema-patch] Adding image_urls column to complaints...');
          await db.raw("ALTER TABLE complaints ADD COLUMN image_urls TEXT NULL AFTER description");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/adding image_urls column to complaints:', e.message);
    }

    // 25. Ensure due/overdue reminder tracking columns exist on monthly_fees
    try {
      if (tableNamesLower.includes('monthly_fees')) {
        const columns = await db.raw("SHOW COLUMNS FROM monthly_fees");
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('due_reminder_sent_date')) {
          console.log('[schema-patch] Adding due_reminder_sent_date column to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN due_reminder_sent_date DATE NULL");
        }
        if (!columnNames.includes('overdue_reminder_sent_date')) {
          console.log('[schema-patch] Adding overdue_reminder_sent_date column to monthly_fees...');
          await db.raw("ALTER TABLE monthly_fees ADD COLUMN overdue_reminder_sent_date DATE NULL");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/adding reminder columns to monthly_fees:', e.message);
    }

    // 26. Ensure vacate_reminder_sent column exists on students
    try {
      if (tableNamesLower.includes('students')) {
        const columns = await db.raw("SHOW COLUMNS FROM students");
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('vacate_reminder_sent')) {
          console.log('[schema-patch] Adding vacate_reminder_sent column to students...');
          await db.raw("ALTER TABLE students ADD COLUMN vacate_reminder_sent TINYINT DEFAULT 0");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/adding vacate_reminder_sent column to students:', e.message);
    }

    // 27. Ensure notified column exists on reminders
    try {
      if (tableNamesLower.includes('reminders')) {
        const columns = await db.raw("SHOW COLUMNS FROM reminders");
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('notified')) {
          console.log('[schema-patch] Adding notified column to reminders...');
          await db.raw("ALTER TABLE reminders ADD COLUMN notified TINYINT DEFAULT 0");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/adding notified column to reminders:', e.message);
    }

    // 28. Ensure default_refundable_deposit exists on hostel_master
    try {
      if (tableNamesLower.includes('hostel_master')) {
        const columns = await db.raw("SHOW COLUMNS FROM hostel_master");
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('default_refundable_deposit')) {
          console.log('[schema-patch] Adding default_refundable_deposit column to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN default_refundable_deposit DECIMAL(10,2) DEFAULT 0.00");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/adding default_refundable_deposit to hostel_master:', e.message);
    }

    // 29. Ensure refundable_deposit and is_old_student exist on students
    try {
      if (tableNamesLower.includes('students')) {
        const columns = await db.raw("SHOW COLUMNS FROM students");
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('refundable_deposit')) {
          console.log('[schema-patch] Adding refundable_deposit column to students...');
          await db.raw("ALTER TABLE students ADD COLUMN refundable_deposit DECIMAL(10,2) DEFAULT 0.00");
        }
        if (!columnNames.includes('is_old_student')) {
          console.log('[schema-patch] Adding is_old_student column to students...');
          await db.raw("ALTER TABLE students ADD COLUMN is_old_student TINYINT DEFAULT 0");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/adding columns to students:', e.message);
    }

    // 30. Growth Journey feature ("Nova AI" tenant tab) — gamified learning tables.
    // All content tables (paths/levels/stories/vocabulary/quiz_questions) are GLOBAL,
    // no hostel_id — every tenant across every hostel shares the same curriculum.
    // Only per-student state (profiles/progress/activity_log/user_vocabulary) is scoped.
    try {
      if (!tableNamesLower.includes('growth_profiles')) {
        console.log('[schema-patch] creating missing growth_profiles table...');
        await db.raw(`
          CREATE TABLE growth_profiles (
            student_id INT PRIMARY KEY,
            level INT NOT NULL DEFAULT 1,
            xp INT NOT NULL DEFAULT 0,
            coins INT NOT NULL DEFAULT 0,
            current_streak INT NOT NULL DEFAULT 0,
            longest_streak INT NOT NULL DEFAULT 0,
            last_activity_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }

      if (!tableNamesLower.includes('growth_paths')) {
        console.log('[schema-patch] creating missing growth_paths table...');
        await db.raw(`
          CREATE TABLE growth_paths (
            path_id INT AUTO_INCREMENT PRIMARY KEY,
            path_key VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(150) NOT NULL,
            emoji VARCHAR(10) NULL,
            description VARCHAR(255) NULL,
            color_hex VARCHAR(20) DEFAULT '#6D4AFF',
            sort_order INT DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('[schema-patch] seeding growth_paths (18 learning paths, english_stories active)...');
        const paths = [
          ['english_stories', 'English Stories', '📖', 'Easy, engaging stories in simple English', 1, 1, '#6D4AFF'],
          ['daily_jokes', 'Daily Jokes', '😂', 'Short, family-friendly jokes to enjoy English', 2, 0, '#F59E0B'],
          ['daily_conversations', 'Daily Conversations', '💬', 'Real conversations for everyday situations', 3, 0, '#3B82F6'],
          ['vocabulary_builder', 'Vocabulary Builder', '🧠', 'Grow your word power every day', 4, 0, '#8B5CF6'],
          ['speaking_practice', 'Speaking Practice', '🎤', 'Practice speaking with confidence', 5, 0, '#EC4899'],
          ['moral_stories', 'Moral Stories', '❤️', 'Timeless lessons in simple English', 6, 0, '#EF4444'],
          ['world_facts', 'World Facts', '🌎', 'Interesting facts from around the world', 7, 0, '#0EA5E9'],
          ['workplace_english', 'Workplace English', '💼', 'English for the office and career', 8, 0, '#16A34A'],
          ['travel_english', 'Travel English', '✈️', 'English for travel and adventure', 9, 0, '#06B6D4'],
          ['interview_english', 'Interview English', '🎓', 'Ace your next interview in English', 10, 0, '#F97316'],
          ['grammar_journey', 'Grammar Journey', '📚', 'Grammar taught naturally, not like school', 11, 0, '#6366F1'],
          ['daily_challenge', 'Daily Challenge', '🔥', 'A fresh challenge every day', 12, 0, '#DC2626'],
          ['brain_teasers', 'Brain Teasers', '🧩', 'Puzzles to sharpen your thinking', 13, 0, '#7C3AED'],
          ['inspirational_stories', 'Inspirational Stories', '✨', 'Stories that motivate and uplift', 14, 0, '#DB2777'],
          ['communication_skills', 'Communication Skills', '🎯', 'Speak and connect with confidence', 15, 0, '#059669'],
          ['memory_challenge', 'Memory Challenge', '🧠', 'Train your memory, one round at a time', 16, 0, '#4F46E5'],
          ['life_lessons', 'Life Lessons', '💡', 'Small lessons for a better life', 17, 0, '#D97706'],
          ['success_stories', 'Success Stories', '🚀', 'Real stories of grit and success', 18, 0, '#0891B2'],
        ];
        for (const [path_key, name, emoji, description, sort_order, is_active, color_hex] of paths) {
          await db('growth_paths').insert({ path_key, name, emoji, description, sort_order, is_active, color_hex });
        }
      }

      if (!tableNamesLower.includes('growth_levels')) {
        console.log('[schema-patch] creating missing growth_levels table...');
        await db.raw(`
          CREATE TABLE growth_levels (
            level_id INT AUTO_INCREMENT PRIMARY KEY,
            path_id INT NOT NULL,
            section_title VARCHAR(255) NOT NULL,
            level_number INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            xp_reward INT NOT NULL DEFAULT 20,
            sort_order INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (path_id) REFERENCES growth_paths(path_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE UNIQUE INDEX idx_growth_levels_path_number ON growth_levels(path_id, level_number)");
        await db.raw("CREATE INDEX idx_growth_levels_sort ON growth_levels(path_id, sort_order)");
      }

      if (!tableNamesLower.includes('growth_stories')) {
        console.log('[schema-patch] creating missing growth_stories table...');
        await db.raw(`
          CREATE TABLE growth_stories (
            story_id INT AUTO_INCREMENT PRIMARY KEY,
            level_id INT NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NULL,
            reading_time_minutes INT NOT NULL DEFAULT 3,
            sentences JSON NOT NULL,
            illustration_key VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (level_id) REFERENCES growth_levels(level_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }

      if (!tableNamesLower.includes('growth_vocabulary')) {
        console.log('[schema-patch] creating missing growth_vocabulary table...');
        await db.raw(`
          CREATE TABLE growth_vocabulary (
            vocab_id INT AUTO_INCREMENT PRIMARY KEY,
            story_id INT NOT NULL,
            word VARCHAR(100) NOT NULL,
            meaning VARCHAR(500) NOT NULL,
            telugu_meaning VARCHAR(500) NULL,
            simple_meaning VARCHAR(500) NULL,
            pronunciation VARCHAR(150) NULL,
            synonyms VARCHAR(255) NULL,
            example_sentence VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (story_id) REFERENCES growth_stories(story_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE INDEX idx_growth_vocabulary_story ON growth_vocabulary(story_id)");
      } else {
        const columns: any[] = await db.raw('SHOW COLUMNS FROM growth_vocabulary');
        const columnNames = columns[0].map((c: any) => c.Field.toLowerCase());
        if (!columnNames.includes('telugu_meaning')) {
          console.log('[schema-patch] Adding telugu_meaning to growth_vocabulary');
          await db.raw('ALTER TABLE growth_vocabulary ADD COLUMN telugu_meaning VARCHAR(500) NULL');
        }
        if (!columnNames.includes('simple_meaning')) {
          console.log('[schema-patch] Adding simple_meaning to growth_vocabulary');
          await db.raw('ALTER TABLE growth_vocabulary ADD COLUMN simple_meaning VARCHAR(500) NULL');
        }
      }

      if (!tableNamesLower.includes('growth_quiz_questions')) {
        console.log('[schema-patch] creating missing growth_quiz_questions table...');
        await db.raw(`
          CREATE TABLE growth_quiz_questions (
            question_id INT AUTO_INCREMENT PRIMARY KEY,
            story_id INT NOT NULL,
            question_type VARCHAR(30) NOT NULL DEFAULT 'mcq',
            question_text VARCHAR(500) NOT NULL,
            options JSON NULL,
            correct_answer VARCHAR(255) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            FOREIGN KEY (story_id) REFERENCES growth_stories(story_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE INDEX idx_growth_quiz_story ON growth_quiz_questions(story_id)");
      }

      if (!tableNamesLower.includes('growth_user_progress')) {
        console.log('[schema-patch] creating missing growth_user_progress table...');
        await db.raw(`
          CREATE TABLE growth_user_progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            level_id INT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'locked',
            stars TINYINT NOT NULL DEFAULT 0,
            best_score INT NULL,
            attempts INT NOT NULL DEFAULT 0,
            completed_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            FOREIGN KEY (level_id) REFERENCES growth_levels(level_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE UNIQUE INDEX idx_growth_progress_uniq ON growth_user_progress(student_id, level_id)");
      }

      if (!tableNamesLower.includes('growth_activity_log')) {
        console.log('[schema-patch] creating missing growth_activity_log table...');
        await db.raw(`
          CREATE TABLE growth_activity_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            level_id INT NOT NULL,
            xp_earned INT NOT NULL DEFAULT 0,
            score INT NOT NULL DEFAULT 0,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            FOREIGN KEY (level_id) REFERENCES growth_levels(level_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE INDEX idx_growth_activity_student_date ON growth_activity_log(student_id, completed_at)");
      }

      if (!tableNamesLower.includes('growth_user_vocabulary')) {
        console.log('[schema-patch] creating missing growth_user_vocabulary table...');
        await db.raw(`
          CREATE TABLE growth_user_vocabulary (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            vocab_id INT NOT NULL,
            saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            FOREIGN KEY (vocab_id) REFERENCES growth_vocabulary(vocab_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await db.raw("CREATE UNIQUE INDEX idx_growth_user_vocab_uniq ON growth_user_vocabulary(student_id, vocab_id)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating Growth Journey tables:', e.message);
    }

    // 31. Growth Journey — activate Daily Jokes / Daily Conversations (already seeded
    // as inactive placeholders above) and add Love Stories. Idempotent: safe to run
    // on every boot against the shared prod DB.
    try {
      if (tableNamesLower.includes('growth_paths')) {
        await db('growth_paths')
          .whereIn('path_key', ['daily_jokes', 'daily_conversations', 'moral_stories'])
          .update({ is_active: 1 });

        const loveStories = await db('growth_paths').where({ path_key: 'love_stories' }).first();
        if (!loveStories) {
          console.log('[schema-patch] seeding growth_paths: love_stories...');
          await db('growth_paths').insert({
            path_key: 'love_stories',
            name: 'Love Stories',
            emoji: '💕',
            description: 'Heartfelt stories about love and relationships',
            sort_order: 19,
            is_active: 1,
            color_hex: '#F43F5E',
          });
        }

        // Seed initial growth levels & stories if growth_stories is empty
        const storiesCountRow = await db('growth_stories').count<{ count: string }[]>('* as count');
        const storiesCount = Number(storiesCountRow[0]?.count || 0);

        if (storiesCount === 0) {
          console.log('[schema-patch] seeding initial Growth Journey levels and stories...');
          const activePath = await db('growth_paths').where({ is_active: 1 }).orderBy('sort_order', 'asc').first();
          if (activePath) {
            const pathId = activePath.path_id;

            // Story 1
            const [level1Id] = await db('growth_levels').insert({
              path_id: pathId,
              section_title: 'Chapter 1: New Beginnings',
              level_number: 1,
              title: 'The New Hostel Beginning',
              xp_reward: 50,
              sort_order: 1,
            });

            const [story1Id] = await db('growth_stories').insert({
              level_id: level1Id,
              title: 'The New Hostel Beginning',
              category: 'Life Skills',
              reading_time_minutes: 3,
              sentences: JSON.stringify([
                'Moving into a new hostel is an exciting adventure.',
                'You meet new roommates and create lifelong friendships.',
                'Every day brings opportunities to learn, grow, and build independence.'
              ]),
            });

            await db('growth_vocabulary').insert([
              { story_id: story1Id, word: 'Adventure', meaning: 'An exciting or unusual experience', example_sentence: 'Moving to a new city is a great adventure.' },
              { story_id: story1Id, word: 'Independence', meaning: 'The state of being self-reliant', example_sentence: 'Hostel life teaches you true independence.' }
            ]);

            await db('growth_quiz_questions').insert({
              story_id: story1Id,
              question_type: 'mcq',
              question_text: 'What does hostel life teach you?',
              options: JSON.stringify(['Independence', 'Cooking only', 'Nothing new', 'Sleeping all day']),
              correct_answer: 'Independence',
              sort_order: 1,
            });
          }
        }

        // Always run bulk stories seeding to guarantee all full-page stories are up to date
        await seedBulkGrowthStories();
      }
    } catch (e: any) {
      console.error('[schema-patch] Error seeding Growth Journey stories:', e.message);
    }

    console.log('[schema-patch] Schema check and patch complete.');
  } catch (err: any) {
    console.error('[schema-patch] Critical error during schema patching:', err.message);
  }
}

// Test database connection
// Retries the initial connectivity check with backoff before giving up.
// A transient DB hiccup (brief connection-pool pressure, momentary network
// blip) previously crashed the process on the very first failed attempt —
// on a host like Render that immediately restarts a crashed process, that
// turns one transient blip into a restart-loop hammering the DB with fresh
// connection attempts right as it's trying to recover.
const CONNECT_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

async function connectWithRetry() {
  for (let attempt = 0; ; attempt++) {
    try {
      await db.raw('SELECT 1');
      console.log('✅ Database connected successfully');
      await patchDatabaseSchema();
      return;
    } catch (err: any) {
      if (attempt >= CONNECT_RETRY_DELAYS_MS.length) {
        console.error(`❌ Database connection failed after ${attempt + 1} attempts:`, err.message);
        process.exit(1);
      }
      const delay = CONNECT_RETRY_DELAYS_MS[attempt];
      console.error(`⚠️  Database connection attempt ${attempt + 1} failed (${err.message}) — retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

connectWithRetry();

export default db;
