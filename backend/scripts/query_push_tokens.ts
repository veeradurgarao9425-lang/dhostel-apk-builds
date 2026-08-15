import db from './src/config/database.js';
async function run() {
    const tokens = await db('user_push_tokens').select('*');
    console.log(tokens);
    process.exit(0);
}
run();
