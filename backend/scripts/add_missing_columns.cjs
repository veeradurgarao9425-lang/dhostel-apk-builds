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
    const hasToken = await db.schema.hasColumn('users', 'password_reset_token');
    const hasExpires = await db.schema.hasColumn('users', 'password_reset_expires_at');
    
    await db.schema.alterTable('users', table => {
      if (!hasToken) {
        table.string('password_reset_token', 255).nullable();
        console.log('Added password_reset_token');
      }
      if (!hasExpires) {
        table.datetime('password_reset_expires_at').nullable();
        console.log('Added password_reset_expires_at');
      }
    });
    console.log('Done modifying users table.');
  } catch (e) {
    console.error(e);
  } finally {
    await db.destroy();
  }
}
run();
