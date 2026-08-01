/**
 * Seeds the hand-authored Growth Journey story batches (seedData/*.json) into
 * the growth_* tables. This is the "no Anthropic API key available" path —
 * see generateGrowthContent.ts for the AI-powered alternative once a key exists.
 *
 * Usage: tsx scripts/seedGrowthStories.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StoryEntry, waitForTable, isValidStory, insertStories } from './growthContentInserter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// category -> roadmap section title, in the display order they should appear.
const CATEGORY_TO_SECTION: Record<string, string> = {
  'daily-life': 'Talking About Past Activities',
  friends: 'Friends & Hostel Life',
  travel: 'Travel & Adventure',
  technology: 'Technology & Modern Life',
  business: 'Workplace & Career',
  success: 'Life Lessons & Success',
};
const SECTION_ORDER = [
  'Talking About Past Activities',
  'Friends & Hostel Life',
  'Travel & Adventure',
  'Technology & Modern Life',
  'Workplace & Career',
  'Life Lessons & Success',
];

const BATCH_FILES = ['growth-stories-batch-a.json', 'growth-stories-batch-b.json', 'growth-stories-batch-c.json'];

async function main() {
  await waitForTable('growth_paths');
  await waitForTable('growth_stories');

  const byCategory = new Map<string, StoryEntry[]>();
  for (const file of BATCH_FILES) {
    const raw = fs.readFileSync(path.join(__dirname, 'seedData', file), 'utf8');
    const { stories } = JSON.parse(raw) as { stories: StoryEntry[] };
    for (const story of stories) {
      if (!isValidStory(story)) {
        console.warn(`[seedGrowthStories] Skipping malformed story "${story?.title}" from ${file}`);
        continue;
      }
      const list = byCategory.get(story.category) || [];
      list.push(story);
      byCategory.set(story.category, list);
    }
  }

  let totalInserted = 0;
  for (const section of SECTION_ORDER) {
    const category = Object.keys(CATEGORY_TO_SECTION).find((k) => CATEGORY_TO_SECTION[k] === section)!;
    const stories = byCategory.get(category) || [];
    if (!stories.length) continue;
    console.log(`[seedGrowthStories] Inserting ${stories.length} stories into section "${section}"...`);
    const inserted = await insertStories('english_stories', section, stories);
    totalInserted += inserted;
  }

  console.log(`[seedGrowthStories] Done — inserted ${totalInserted} new levels.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seedGrowthStories] Failed:', err.message);
  process.exit(1);
});
