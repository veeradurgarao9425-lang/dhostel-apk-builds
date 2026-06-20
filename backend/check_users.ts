import pool from './src/config/database';

async function checkUsers() {
  try {
    const [rows] = await pool.query('SELECT user_id, email, full_name, role_id FROM users');
    console.log('Users in DB:');
    console.log(rows);
  } catch (e) {
    console.log('Error:', e);
  } finally {
    pool.end();
  }
}

checkUsers();
