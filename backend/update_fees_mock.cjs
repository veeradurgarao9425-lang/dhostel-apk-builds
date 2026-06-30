const mysql = require('mysql2/promise');
async function run() {
    const conn = await mysql.createConnection({
        host: 'mysql-1a300d6c-veeradurgarao840-0853.c.aivencloud.com',
        port: 11120,
        user: 'avnadmin',
        password: 'AVNS_XKhIofBUB4pR5LOtnEg',
        database: 'hostel_management'
    });
    const [fees] = await conn.query('SELECT fee_id, total_due FROM monthly_fees WHERE fee_status = \'Pending\' LIMIT 100');
    console.log('Found ' + fees.length + ' pending fees');
    let full = 0; let partial = 0;
    for(let i = 0; i < fees.length; i++) {
        const total = parseFloat(fees[i].total_due) || 0;
        if (i < 60) {
            await conn.query('UPDATE monthly_fees SET paid_amount = ?, balance = 0, fee_status = \'Paid\' WHERE fee_id = ?', [total, fees[i].fee_id]);
            full++;
        } else if (i < 100) {
            const partialAmount = Math.floor(total / 2);
            const balance = total - partialAmount;
            await conn.query('UPDATE monthly_fees SET paid_amount = ?, balance = ?, fee_status = \'Pending\' WHERE fee_id = ?', [partialAmount, balance, fees[i].fee_id]);
            partial++;
        }
    }
    console.log('Updated ' + full + ' to full, ' + partial + ' to partial.');
    await conn.end();
}
run().catch(console.error);
