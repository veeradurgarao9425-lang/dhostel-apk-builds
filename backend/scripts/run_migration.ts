import pool from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const sqlPath = path.join(__dirname, '../migrations/add_hostel_code.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration: add_hostel_code.sql');
    
    // Split statements
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

    for (const stmt of statements) {
      console.log(`Executing: ${stmt.trim()}`);
      await pool.query(stmt);
    }
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
