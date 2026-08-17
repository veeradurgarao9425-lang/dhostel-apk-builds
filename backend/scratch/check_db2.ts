import db from '../src/config/database.js';
db.raw('DESCRIBE students').then(r => console.log(r[0].filter((c: any) => c.Field === "id_proof_type"))).finally(() => process.exit(0));
