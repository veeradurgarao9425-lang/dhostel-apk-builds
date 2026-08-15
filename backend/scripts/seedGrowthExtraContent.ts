/**
 * Seeds the extra Growth Journey content categories added alongside the
 * jokes/conversations/love-stories/moral-stories launch — daily_jokes,
 * daily_conversations, love_stories, and moral_stories. Each file maps to
 * exactly one path and one roadmap section, unlike seedGrowthStories.ts
 * which groups english_stories by per-story category.
 *
 * Usage: tsx scripts/seedGrowthExtraContent.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StoryEntry, waitForTable, isValidStory, insertStories } from './growthContentInserter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BATCHES: { pathKey: string; section: string; file: string }[] = [
  { pathKey: 'daily_jokes', section: 'Laugh & Learn', file: 'growth-stories-jokes.json' },
  { pathKey: 'daily_conversations', section: 'Everyday Conversations', file: 'growth-stories-conversations.json' },
  { pathKey: 'love_stories', section: 'Stories of the Heart', file: 'growth-stories-love.json' },
  { pathKey: 'moral_stories', section: 'Timeless Lessons', file: 'growth-stories-moral.json' },
];

async function main() {
  await waitForTable('growth_paths');
  await waitForTable('growth_stories');

  let totalInserted = 0;
  for (const { pathKey, section, file } of BATCHES) {
    const raw = fs.readFileSync(path.join(__dirname, 'seedData', file), 'utf8');
    const { stories } = JSON.parse(raw) as { stories: StoryEntry[] };

    const valid = stories.filter((s) => {
      if (!isValidStory(s)) {
        console.warn(`[seedGrowthExtraContent] Skipping malformed story "${s?.title}" from ${file}`);
        return false;
      }
      return true;
    });

    console.log(`[seedGrowthExtraContent] Inserting ${valid.length} stories into "${pathKey}" / "${section}"...`);
    const inserted = await insertStories(pathKey, section, valid);
    totalInserted += inserted;
  }

  console.log(`[seedGrowthExtraContent] Done — inserted ${totalInserted} new levels.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seedGrowthExtraContent] Failed:', err.message);
  process.exit(1);
});
