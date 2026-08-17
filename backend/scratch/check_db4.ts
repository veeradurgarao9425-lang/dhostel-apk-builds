import db from '../src/config/database.js';
(async () => {
  try {
    const table = 'growth_vocabulary';
    const result = await db.raw(`DESCRIBE ??`, [table]);
    console.log(result[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
