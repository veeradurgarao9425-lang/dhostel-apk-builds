import { db } from './src/config/database.js';

async function run() {
  try {
    const hasColumn = await db.schema.hasColumn('students', 'bed_number');
    if (!hasColumn) {
      await db.schema.alterTable('students', (t) => {
        t.string('bed_number', 10).nullable();
      });
      console.log('Successfully added bed_number column to students table');
    } else {
      console.log('bed_number column already exists');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
