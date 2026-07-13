require('dotenv').config();
const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  }
});

async function run() {
  try {
    const hasCol = await db.schema.hasColumn('users', 'password_reset_otp');
    if (!hasCol) {
      await db.schema.alterTable('users', table => {
        table.string('password_reset_otp', 10).nullable();
      });
      console.log('Added password_reset_otp column to users table.');
    } else {
      console.log('Column already exists.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await db.destroy();
  }
}
run();
