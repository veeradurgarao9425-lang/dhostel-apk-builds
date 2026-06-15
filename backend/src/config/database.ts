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
      }
    } catch (e: any) {
      console.error('[schema-patch] Error creating income table:', e.message);
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
