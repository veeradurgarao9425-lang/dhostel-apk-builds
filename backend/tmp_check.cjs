const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
    port: 11120,
    user: 'avnadmin',
    password: 'AVNS_XKhIofBUB4pR5LOtnEg',
    database: 'hostel_management'
  });
  
  const [fees] = await conn.query("SELECT due_date FROM monthly_fees WHERE notes = 'Auto-created bulk' LIMIT 1");
  console.log('Due date in DB:', fees[0]?.due_date);

  const [hostel] = await conn.query("SELECT due_date_day FROM hostel_master WHERE hostel_id = 22");
  console.log('Hostel due_date_day:', hostel[0]?.due_date_day);

  conn.end();
}
run().catch(console.error);
