import db from '../src/config/database.js';

async function run() {
  try {
    const users = await db('users').select('user_id', 'email', 'role_id', 'hostel_id', 'full_name');
    console.log('--- USERS ---');
    console.log(users);

    const hostels = await db('hostel_master').select('hostel_id', 'hostel_name', 'owner_id', 'is_active');
    console.log('--- HOSTELS ---');
    console.log(hostels);
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await db.destroy();
  }
}

run();
