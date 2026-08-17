import { seedBulkGrowthStories } from '../src/seedBulkStories.js';
import db from '../src/config/database.js';

async function main() {
  console.log('[Script] Starting seedBulkGrowthStories...');
  await seedBulkGrowthStories();
  console.log('[Script] Completed successfully!');
  await db.destroy();
  process.exit(0);
}

main().catch((e) => {
  console.error('[Script] Error:', e);
  process.exit(1);
});
