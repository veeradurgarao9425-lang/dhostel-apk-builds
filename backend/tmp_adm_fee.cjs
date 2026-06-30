const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
    port: 11120,
    user: 'avnadmin',
    password: 'AVNS_XKhIofBUB4pR5LOtnEg',
    database: 'hostel_management'
  });

  await conn.query("UPDATE students SET admission_fee = 3000.00 WHERE first_name LIKE 'DURGA %' AND hostel_id = 22");
  console.log('Updated admission fee for bulk students');
  conn.end();
}
run().catch(console.error);
