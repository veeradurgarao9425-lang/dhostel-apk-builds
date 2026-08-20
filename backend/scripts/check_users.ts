import db from './src/config/database.js';

async function checkData() {
  try {
    const users = await db('users').select('*');
    console.log('--- DB Users ---');
    console.log(users);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await db.destroy();
  }
}

checkData();
