const mysql = require('mysql2/promise');
async function run() {
    const conn = await mysql.createConnection({
        host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
        port: 11120,
        user: 'avnadmin',
        password: 'AVNS_XKhIofBUB4pR5LOtnEg',
        database: 'hostel_management'
    });
    const [fees] = await conn.query('SELECT fee_id, total_amount FROM monthly_fees LIMIT 100');
    console.log('Found ' + fees.length + ' fees');
    let full = 0; let partial = 0;
    for(let i = 0; i < fees.length; i++) {
        if (i < 60) {
            await conn.query('UPDATE monthly_fees SET amount_paid = total_amount, fee_status = \'paid\' WHERE fee_id = ?', [fees[i].fee_id]);
            full++;
        } else if (i < 100) {
            const partialAmount = Math.floor(fees[i].total_amount / 2);
            await conn.query('UPDATE monthly_fees SET amount_paid = ?, fee_status = \'pending\' WHERE fee_id = ?', [partialAmount, fees[i].fee_id]);
            partial++;
        }
    }
    console.log('Updated ' + full + ' to full, ' + partial + ' to partial.');
    await conn.end();
}
run().catch(console.error);
