const mysql = require('mysql2/promise');

const passwords = [
  'AVNS_XKhIofBUB4pR5L0tnEg', // Original guess
  'AVNS_XKhIofBUB4pR5LOtnEg', // Zero replaced by capital O
  'AVNS_XKhlofBUB4pR5L0tnEg', // Capital I replaced by lowercase l
  'AVNS_XKhlofBUB4pR5LOtnEg', // Both replacements
  'AVNS_XKhIofBUB4pR5L0tnEg',
  'AVNS_XKhIofBUB4pR5LOtnEg'
];
const databases = ['hostel_management', 'defaultdb'];

async function testConnections() {
  console.log('Testing MySQL connections with SSL...');
  for (const password of passwords) {
    for (const dbName of databases) {
      try {
        console.log(`Trying password="${password}" with SSL on database="${dbName}"...`);
        const conn = await mysql.createConnection({
          host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
          port: 11120,
          user: 'avnadmin',
          password: password,
          database: dbName,
          ssl: {
            rejectUnauthorized: false
          }
        });
        console.log(`✅ SUCCESS: Connected with database="${dbName}" using password="${password}"`);
        await conn.end();
        return;
      } catch (err) {
        console.log(`Error: ${err.code} - ${err.message}`);
        AVNS_XKhIofBUB4pR5LOtnEg
      }
    }
  }
  console.log('❌ All connection attempts failed.');
}

testConnections().catch(console.error);
