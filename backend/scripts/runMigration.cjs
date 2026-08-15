const fs = require('fs');
const path = require('path');
const db = require('../dist/config/database.js').default;

async function runMigration(migrationName) {
  try {
    const filePath = path.join(__dirname, migrationName);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());

    console.log(`🔄 Running migration: ${migrationName}`);

    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement.length > 0) {
        await db.raw(trimmedStatement);
        console.log(`✅ Executed: ${trimmedStatement.substring(0, 60)}...`);
      }
    }

    console.log(`✨ Migration completed successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
    });
    process.exit(1);
  }
}

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('❌ Please provide a migration file name');
  console.error('Usage: node runMigration.cjs <migration-file-name.sql>');
  process.exit(1);
}

runMigration(migrationName);
