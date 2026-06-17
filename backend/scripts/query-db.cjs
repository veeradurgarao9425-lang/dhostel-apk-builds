const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
    port: 11120,
    user: 'avnadmin',
    password: 'AVNS_XKhIofBUB4pR5LOtnEg',
    database: 'hostel_management',
    ssl: {
      rejectUnauthorized: false
    }
  });

  console.log('--- DATABASE DIAGNOSTIC: EXPENSES TABLE ---');
  
  const [columns] = await conn.query('DESCRIBE expenses');
  console.log('expenses columns:', columns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  const [paymentModes] = await conn.query('SELECT * FROM payment_modes');
  console.log('Payment Modes:', paymentModes);

  const [expenseCats] = await conn.query('SELECT * FROM expense_categories');
  console.log('Expense Categories:', expenseCats);

  await conn.end();
}

main().catch(console.error);
