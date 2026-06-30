const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
    port: 11120,
    user: 'avnadmin',
    password: 'AVNS_XKhIofBUB4pR5LOtnEg',
    database: 'hostel_management'
  });

  await conn.query("UPDATE monthly_fees SET due_date = DATE_ADD(CURDATE(), INTERVAL 5 DAY) WHERE notes = 'Auto-created bulk' AND fee_status = 'Pending'");
  console.log('Updated due dates to 5 days from now');
  conn.end();
}
run().catch(console.error);
