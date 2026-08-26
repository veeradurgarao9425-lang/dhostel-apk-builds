import bcrypt from 'bcryptjs';
import { db } from './config/database.js';

async function seedDefaultUser() {
  try {
    console.log('🌱 Checking default owner credentials in database...');

    const userCount = await db('users').count('* as count').first();
    const count = Number(userCount?.count || 0);

    const hashedPassword = await bcrypt.hash('Demo123', 10);

    if (count === 0) {
      console.log('Seeding default hostel and owner account...');

      // Insert hostel
      const [hostelId] = await db('hostel_master').insert({
        hostel_name: 'Hostix Luxury PG & Coliving',
        address: 'Plot 42, Silicon Valley Road, Madhapur, Hitech City',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        contact_number: '9876543210',
        total_floors: 6,
        admission_fee: 1000.00,
        hostel_code: 'HSTX01'
      });

      // Insert default owner account
      const [userId] = await db('users').insert({
        full_name: 'Hostix Owner',
        email: 'demo@test.com',
        phone: '9876543210',
        password: hashedPassword,
        password_hash: hashedPassword,
        role: 'OWNER',
        role_id: 2,
        hostel_id: hostelId
      });

      await db('hostel_master').where({ hostel_id: hostelId }).update({ owner_id: userId });

      console.log('✅ Created default hostel "Hostix Luxury PG & Coliving" (ID: ' + hostelId + ')');
      console.log('✅ Created user: demo@test.com / Demo123');
    } else {
      console.log(`✅ Database already has ${count} user(s).`);

      // Ensure demo@test.com exists
      const existingUser = await db('users').where({ email: 'demo@test.com' }).first();
      if (!existingUser) {
        const hostel = await db('hostel_master').first();
        await db('users').insert({
          username: 'demo',
          full_name: 'Hostix Owner',
          email: 'demo@test.com',
          phone: '9876543210',
          password: hashedPassword,
          password_hash: hashedPassword,
          role: 'OWNER',
          role_id: 2,
          hostel_id: hostel?.hostel_id || 1
        });
        console.log('✅ Added user demo@test.com / password: Demo123');
      }
    }
  } catch (e: any) {
    console.error('Error seeding default user:', e.message);
  } finally {
    process.exit(0);
  }
}

seedDefaultUser();
