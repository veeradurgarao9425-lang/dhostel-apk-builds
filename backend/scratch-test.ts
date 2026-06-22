import db from './src/config/database.js';

async function run() {
  try {
    const resolvedUsername = `test_user_${Date.now()}`;
    const resolvedEmail = `test_${Date.now()}@dhostel.com`;
    const full_name = 'Test User';
    const password_hash = 'dummyhash';
    const phone = '1234567890';
    
    console.log('Inserting user...');
    const [user_id] = await db('users').insert({
        username: resolvedUsername,
        email: resolvedEmail,
        phone: phone || null,
        full_name,
        password_hash,
        role_id: 2,
        is_active: true,
    });
    console.log('User inserted with ID:', user_id);

    let hostel_id: number | null = null;
    const hostel_name = 'Test Hostel';
    
    console.log('Inserting hostel...');
    [hostel_id] = await db('hostel_master').insert({
        hostel_name: hostel_name,
        owner_id: user_id,
        address: '',
        is_active: 1,
        created_at: new Date(),
    });
    console.log('Hostel inserted with ID:', hostel_id);
    
    console.log('Updating user...');
    await db('users').where('user_id', user_id).update({ hostel_id });
    console.log('User updated');
    
  } catch (err: any) {
    console.error('ERROR OCCURRED:', err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

run();
