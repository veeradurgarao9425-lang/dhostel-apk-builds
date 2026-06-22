import knex from 'knex';
import dotenv from 'dotenv';

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
    ssl: {
      rejectUnauthorized: false
    }
  },
  pool: {
    min: 5,
    max: 20,
  },
  acquireConnectionTimeout: 30000,
});

async function patchDatabaseSchema() {
  try {
    console.log('[schema-patch] Checking database tables...');
    const [tables] = await db.raw("SHOW TABLES");
    const tableNames = (tables as any[]).map(t => Object.values(t)[0] as string);
    const tableNamesLower = tableNames.map(t => t.toLowerCase());

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
          ('AC', 'snowflake', 'Air conditioning in room', 1),
          ('Attached Bathroom', 'bath', 'Private bathroom attached to room', 2),
          ('WiFi', 'wifi', 'High-speed wireless internet connectivity', 3),
          ('Balcony', 'home', 'Private or shared balcony', 4),
          ('Window', 'window', 'Window with natural light and ventilation', 5),
          ('Cupboard', 'box', 'Storage cupboard or wardrobe', 6),
          ('Study Table', 'table', 'Study desk and chair', 7),
          ('Chair', 'chair', 'Comfortable chair for study', 8)
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
      }
    } catch (e: any) {
      console.error('[schema-patch] Error updating students columns:', e.message);
    }

    // Ensure hostel_master columns exist
    try {
      if (tableNamesLower.includes('hostel_master')) {
        console.log('[schema-patch] Checking hostel_master columns...');
        const [columns] = await db.raw("SHOW COLUMNS FROM hostel_master");
        const columnNames = (columns as any[]).map(col => col.Field.toLowerCase());
        
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
        if (!columnNames.includes('updated_at')) {
          console.log('[schema-patch] adding updated_at to hostel_master...');
          await db.raw("ALTER TABLE hostel_master ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating hostel_master columns:', e.message);
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[schema-patch] creating indexes for notices table...');
        await db.raw("CREATE INDEX idx_notices_hostel ON notices(hostel_id)");
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/creating notices table:', e.message);
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

    // 11. Ensure otps table has a 'verified' column (used to enforce email verification on register)
    try {
      if (tableNamesLower.includes('otps')) {
        const [otpCols] = await db.raw("SHOW COLUMNS FROM otps");
        const otpColNames = (otpCols as any[]).map(c => c.Field);
        if (!otpColNames.includes('verified')) {
          console.log('[schema-patch] adding verified column to otps...');
          await db.raw("ALTER TABLE otps ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0");
        }
      }
    } catch (e: any) {
      console.error('[schema-patch] Error checking/updating otps columns:', e.message);
    }

    // 12. Make guardian fields optional on students (avoid '0000000000'/'N/A' placeholder pollution)
    try {
      if (tableNamesLower.includes('students')) {
        await db.raw("ALTER TABLE students MODIFY COLUMN guardian_phone VARCHAR(15) NULL").catch(() => {});
        await db.raw("ALTER TABLE students MODIFY COLUMN guardian_name VARCHAR(150) NULL").catch(() => {});
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

    console.log('[schema-patch] Schema check and patch complete.');
  } catch (err: any) {
    console.error('[schema-patch] Critical error during schema patching:', err.message);
  }
}

// Test database connection
db.raw('SELECT 1')
  .then(async () => {
    console.log('✅ Database connected successfully');
    await patchDatabaseSchema();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });


export default db;
