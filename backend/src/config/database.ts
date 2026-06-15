import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables for database
const validateDatabaseConfig = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter(key => !process.env[key]);

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

    // 1. Ensure fee_history exists
    if (!tableNames.includes('fee_history')) {
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

    // 2. Ensure fee_payments columns exist
    if (tableNames.includes('fee_payments')) {
      console.log('[schema-patch] Checking fee_payments columns...');
      const [columns] = await db.raw("SHOW COLUMNS FROM fee_payments");
      const columnNames = (columns as any[]).map(col => col.Field);
      
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
    }
    console.log('[schema-patch] Schema check and patch complete.');
  } catch (err: any) {
    console.error('[schema-patch] Error patching database schema:', err.message);
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
