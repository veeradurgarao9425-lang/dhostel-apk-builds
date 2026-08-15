/**
 * Growth Journey content-generation script — Anthropic-API-powered path.
 *
 * Bulk-generates stories (+ vocabulary + quiz) for a Growth Journey learning
 * path using the Anthropic API, validates the shape, and inserts into the
 * growth_* tables via the shared inserter. Run manually — this never runs on
 * the request path. Requires ANTHROPIC_API_KEY in backend/.env.
 *
 * For seeding content WITHOUT an API key, see seedGrowthStories.ts instead.
 *
 * Usage:
 *   tsx scripts/generateGrowthContent.ts --path english_stories --section "Talking About Past Activities" --category "daily-life" --count 6
 */
import Anthropic from '@anthropic-ai/sdk';
import { StoryEntry, waitForTable, isValidStory, insertStories } from './growthContentInserter.js';

function parseArgs() {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i]?.replace(/^--/, '');
    const value = process.argv[i + 1];
    if (key && value !== undefined) args[key] = value;
  }
  return {
    pathKey: args.path || 'english_stories',
    section: args.section || 'Talking About Past Activities',
    category: args.category || 'daily-life',
    count: parseInt(args.count || '6', 10),
  };
}

const STORY_TOOL = {
  name: 'submit_stories',
  description: 'Submit the generated set of English-learning stories.',
  input_schema: {
    type: 'object' as const,
    properties: {
      stories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            category: { type: 'string' },
            reading_time_minutes: { type: 'integer', minimum: 2, maximum: 5 },
            sentences: { type: 'array', items: { type: 'string' }, minItems: 6, maxItems: 20 },
            vocabulary: {
              type: 'array',
              minItems: 4,
              maxItems: 6,
              items: {
                type: 'object',
                properties: {
                  word: { type: 'string' },
                  meaning: { type: 'string' },
                  pronunciation: { type: 'string' },
                  synonyms: { type: 'string' },
                  example_sentence: { type: 'string' },
                },
                required: ['word', 'meaning', 'pronunciation', 'synonyms', 'example_sentence'],
              },
            },
            quiz: {
              type: 'array',
              minItems: 5,
              maxItems: 5,
              items: {
                type: 'object',
                properties: {
                  question_type: { type: 'string', enum: ['mcq', 'true_false', 'fill_blank', 'vocab'] },
                  question_text: { type: 'string' },
                  options: { type: ['array', 'null'], items: { type: 'string' } },
                  correct_answer: { type: 'string' },
                },
                required: ['question_type', 'question_text', 'correct_answer'],
              },
            },
          },
          required: ['title', 'category', 'reading_time_minutes', 'sentences', 'vocabulary', 'quiz'],
        },
      },
    },
    required: ['stories'],
  },
};

async function generateStories(section: string, category: string, count: number): Promise<StoryEntry[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in backend/.env — required to run content generation.');
  }
  const anthropic = new Anthropic({ apiKey });

  const prompt = `Generate ${count} short English-learning stories for hostel/college students improving their English.
Section theme: "${section}". Category: "${category}".
Each story must be:
- Easy English, simple sentences, 2-5 minute reading time (aim ~150-350 words split into 8-16 short sentences)
- Interesting, funny, emotional, or educational — daily life, friends, family, hostel, travel, technology, or success themes
- Followed by 4-6 vocabulary words that actually appear in the story, each with a simple meaning, phonetic pronunciation (e.g. "buh-NAH-nuh"), 1-2 synonyms, and a fresh example sentence
- Followed by exactly 5 quiz questions mixing question_type values "mcq" (with an "options" array of 4 choices), "true_false" (options ["True","False"]), "fill_blank" (options null, correct_answer is the missing word), and "vocab" (asks the meaning of one of the vocabulary words, options array of 4 choices)
Call the submit_stories tool with the result. Do not repeat story titles or vocabulary words across the ${count} stories.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8000,
    tools: [STORY_TOOL],
    tool_choice: { type: 'tool', name: 'submit_stories' },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolUse = response.content.find((block: any) => block.type === 'tool_use');
  if (!toolUse || !('input' in toolUse)) {
    throw new Error('Model did not return a submit_stories tool call');
  }

  const stories = (toolUse.input as any).stories as StoryEntry[];
  const valid = stories.filter(isValidStory);
  if (valid.length < stories.length) {
    console.warn(`[generateGrowthContent] Dropped ${stories.length - valid.length} malformed stories`);
  }
  return valid;
}

async function main() {
  const { pathKey, section, category, count } = parseArgs();
  console.log(`[generateGrowthContent] path=${pathKey} section="${section}" category=${category} count=${count}`);

  await waitForTable('growth_paths');
  await waitForTable('growth_stories');

  const stories = await generateStories(section, category, count);
  console.log(`[generateGrowthContent] Generated ${stories.length} valid stories, inserting...`);

  const inserted = await insertStories(pathKey, section, stories);
  console.log(`[generateGrowthContent] Done — inserted ${inserted} new levels.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[generateGrowthContent] Failed:', err.message);
  process.exit(1);
});
