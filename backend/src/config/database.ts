import knex from 'knex';
import dotenv from 'dotenv';
import { seedBulkGrowthStories } from '../seedBulkStories.js';

dotenv.config();

// Validate required environment variables for database
const validateDatabaseConfig = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const missing = required.filter(key => process.env[key] === undefined || process.env[key] === '');

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set these variables before starting the server');
    process.exit(1);
  }
};

validateDatabaseConfig();

export const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === 'false' ? false : {
      rejectUnauthorized: false
    }
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    createTimeoutMillis: 5000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
  },
  acquireConnectionTimeout: 30000,
});

export { patchDatabaseSchema } from './schemaPatcher.js';
import { patchDatabaseSchema } from './schemaPatcher.js';

// Test database connection
// Retries the initial connectivity check with backoff before giving up.
// A transient DB hiccup (brief connection-pool pressure, momentary network
// blip) previously crashed the process on the very first failed attempt —
// on a host like Render that immediately restarts a crashed process, that
// turns one transient blip into a restart-loop hammering the DB with fresh
// connection attempts right as it's trying to recover.
const CONNECT_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

async function connectWithRetry() {
  for (let attempt = 0; ; attempt++) {
    try {
      await db.raw('SELECT 1');
      console.log('✅ Database connected successfully');
      await patchDatabaseSchema();
      return;
    } catch (err: any) {
      if (attempt >= CONNECT_RETRY_DELAYS_MS.length) {
        console.error(`❌ Database connection failed after ${attempt + 1} attempts:`, err.message);
        process.exit(1);
      }
      const delay = CONNECT_RETRY_DELAYS_MS[attempt];
      console.error(`⚠️  Database connection attempt ${attempt + 1} failed (${err.message}) — retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

connectWithRetry();

export default db;
