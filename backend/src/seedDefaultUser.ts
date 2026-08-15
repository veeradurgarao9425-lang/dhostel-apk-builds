import bcrypt from 'bcryptjs';
import { db } from './config/database.js';

async function seedDefaultUser() {
  try {
    console.log('🌱 Checking default owner/admin credentials in database...');

    const userCount = await db('users').count('* as count').first();
    const count = Number(userCount?.count || 0);

    if (count === 0) {
      console.log('Seeding default hostel and owner account...');

      // Insert hostel
      const [hostelId] = await db('hostel_master').insert({
        hostel_name: 'Hostix Demo PG',
        address: 'Main Road, Jubilee Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500033',
        contact_number: '9797949646',
        admission_fee: 1000.00,
        hostel_code: 'HSTX01'
      });

      // Password hash for password123 and 123456
      const hashedPassword = await bcrypt.hash('password123', 10);
      const hashedPassword2 = await bcrypt.hash('123456', 10);

      // Insert default owner accounts
      await db('users').insert([
        {
          full_name: 'Hostix Admin',
          email: 'admin@d.com',
          phone: '9797949646',
          password: hashedPassword,
          role: 'OWNER',
          role_id: 2,
          hostel_id: hostelId
        },
        {
          full_name: 'Veera Durgarao',
          email: 'veeradurgarao840@gmail.com',
          phone: '8408408408',
          password: hashedPassword2,
          role: 'OWNER',
          role_id: 2,
          hostel_id: hostelId
        }
      ]);

      // Link hostel owner_id to user
      const user = await db('users').where({ email: 'veeradurgarao840@gmail.com' }).first();
      if (user) {
        await db('hostel_master').where({ hostel_id: hostelId }).update({ owner_id: user.user_id });
      }

      console.log('✅ Created default hostel "Hostix Demo PG" (ID: ' + hostelId + ')');
      console.log('✅ Created user: veeradurgarao840@gmail.com / 123456');
      console.log('✅ Created user: admin@d.com / password123');
    } else {
      console.log(`✅ Database already has ${count} user(s).`);

      // Ensure veeradurgarao840@gmail.com exists
      const existingUser = await db('users').where('email', 'like', '%veeradurgarao%').first();
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        const hostel = await db('hostel_master').first();
        await db('users').insert({
          full_name: 'Veera Durgarao',
          email: 'veeradurgarao840@gmail.com',
          phone: '8408408408',
          password: hashedPassword,
          role: 'OWNER',
          role_id: 2,
          hostel_id: hostel?.hostel_id || 1
        });
        console.log('✅ Added user veeradurgarao840@gmail.com / password: 123456');
      }
    }
  } catch (e: any) {
    console.error('Error seeding default user:', e.message);
  } finally {
    process.exit(0);
  }
}

seedDefaultUser();
