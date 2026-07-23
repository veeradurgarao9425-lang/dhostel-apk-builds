import db from '../src/config/database.js';

async function main() {
  // 1. Every column named payment_mode_id, in any table
  const columns = await db.raw(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'payment_mode_id'
    ORDER BY TABLE_NAME
  `);
  console.log('=== Columns named payment_mode_id ===');
  console.log(columns[0]);

  // 2. FK relationships for those columns (if any)
  const fks = await db.raw(`
    SELECT
      kcu.TABLE_NAME,
      kcu.COLUMN_NAME,
      kcu.REFERENCED_TABLE_NAME,
      kcu.REFERENCED_COLUMN_NAME,
      kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.COLUMN_NAME = 'payment_mode_id'
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY kcu.TABLE_NAME
  `);
  console.log('\n=== FK constraints on payment_mode_id ===');
  console.log(fks[0]);

  process.exit(0);
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
