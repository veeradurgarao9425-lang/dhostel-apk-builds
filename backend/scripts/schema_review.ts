import db from '../src/config/database.js';

async function main() {
  const allTables = await db.raw(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  console.log('=== ALL TABLES ===');
  console.log(allTables[0].map((t: any) => t.TABLE_NAME).join(', '));

  const enumCols = await db.raw(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND DATA_TYPE = 'enum'
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);
  console.log('\n=== ENUM COLUMNS ===');
  for (const c of enumCols[0]) {
    console.log(`${c.TABLE_NAME}.${c.COLUMN_NAME}  ${c.COLUMN_TYPE}  nullable=${c.IS_NULLABLE} default=${c.COLUMN_DEFAULT}`);
  }

  const masterTables = allTables[0]
    .map((t: any) => t.TABLE_NAME)
    .filter((n: string) => n.endsWith('_master'));
  console.log('\n=== EXISTING *_master TABLES ===');
  console.log(masterTables);

  const allFks = await db.raw(`
    SELECT
      kcu.TABLE_NAME,
      kcu.COLUMN_NAME,
      kcu.REFERENCED_TABLE_NAME,
      kcu.REFERENCED_COLUMN_NAME,
      kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME
  `);
  console.log('\n=== ALL FOREIGN KEYS ===');
  for (const f of allFks[0]) {
    console.log(`${f.TABLE_NAME}.${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME}  (${f.CONSTRAINT_NAME})`);
  }

  // Heuristic: varchar/char columns whose name suggests a lookup/status/type/category value
  const suspectCols = await db.raw(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND DATA_TYPE IN ('varchar','char')
      AND (
        COLUMN_NAME LIKE '%status%' OR
        COLUMN_NAME LIKE '%type%' OR
        COLUMN_NAME LIKE '%category%' OR
        COLUMN_NAME LIKE '%gender%' OR
        COLUMN_NAME LIKE '%mode%' OR
        COLUMN_NAME LIKE '%role%'
      )
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);
  console.log('\n=== VARCHAR/CHAR columns that look like status/type/category/lookup values ===');
  for (const c of suspectCols[0]) {
    console.log(`${c.TABLE_NAME}.${c.COLUMN_NAME}  ${c.COLUMN_TYPE}  nullable=${c.IS_NULLABLE} default=${c.COLUMN_DEFAULT}`);
  }

  // For each of those, sample distinct values actually present
  console.log('\n=== DISTINCT VALUES for suspect VARCHAR/CHAR columns ===');
  for (const c of suspectCols[0]) {
    try {
      const distinct = await db(c.TABLE_NAME).distinct(c.COLUMN_NAME).limit(15);
      const vals = distinct.map((r: any) => r[c.COLUMN_NAME]).filter((v: any) => v !== null);
      console.log(`${c.TABLE_NAME}.${c.COLUMN_NAME}: [${vals.join(', ')}]`);
    } catch (e: any) {
      console.log(`${c.TABLE_NAME}.${c.COLUMN_NAME}: ERROR ${e.message}`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
