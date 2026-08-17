import db from '../src/config/database.js';
db.raw('DESCRIBE students').then(r => console.log(r[0])).finally(() => process.exit(0));
