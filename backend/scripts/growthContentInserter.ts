/**
 * Shared insertion logic for Growth Journey content — used by both the
 * Anthropic-powered generator (generateGrowthContent.ts) and the hand-authored
 * seed script (seedGrowthStories.ts). Keeping this in one place means both
 * paths write identical, schema-consistent rows into growth_levels /
 * growth_stories / growth_vocabulary / growth_quiz_questions.
 */
import db from '../src/config/database.js';

export interface QuizQuestion {
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'vocab';
  question_text: string;
  options: string[] | null;
  correct_answer: string;
}

export interface VocabEntry {
  word: string;
  meaning: string;
  pronunciation: string;
  synonyms: string;
  example_sentence: string;
}

export interface StoryEntry {
  title: string;
  category: string;
  reading_time_minutes: number;
  sentences: string[];
  vocabulary: VocabEntry[];
  quiz: QuizQuestion[];
}

export async function waitForTable(tableName: string, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const [tables] = await db.raw('SHOW TABLES');
    const names = (tables as any[]).map((t) => (Object.values(t)[0] as string).toLowerCase());
    if (names.includes(tableName)) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for table "${tableName}" to exist (schema patcher may have failed)`);
}

export function isValidStory(s: any): s is StoryEntry {
  return (
    s &&
    typeof s.title === 'string' &&
    typeof s.reading_time_minutes === 'number' &&
    Array.isArray(s.sentences) &&
    s.sentences.length >= 3 &&
    Array.isArray(s.vocabulary) &&
    s.vocabulary.length >= 3 &&
    Array.isArray(s.quiz) &&
    s.quiz.length === 5 &&
    s.quiz.every((q: any) => q.question_text && q.correct_answer && q.question_type)
  );
}

export async function insertStories(pathKey: string, section: string, stories: StoryEntry[]) {
  const path = await db('growth_paths').where({ path_key: pathKey }).first();
  if (!path) throw new Error(`Unknown path_key "${pathKey}" — seed it in growth_paths first`);

  const existingTitles = new Set(
    (
      await db('growth_stories as gs')
        .join('growth_levels as gl', 'gs.level_id', 'gl.level_id')
        .where('gl.path_id', path.path_id)
        .select('gs.title')
    ).map((r: any) => r.title.toLowerCase())
  );

  const [{ maxLevel }] = await db('growth_levels')
    .where({ path_id: path.path_id })
    .max('level_number as maxLevel');
  let nextLevelNumber = (maxLevel || 0) + 1;

  let inserted = 0;
  for (const story of stories) {
    if (existingTitles.has(story.title.toLowerCase())) {
      console.log(`[growthContentInserter] Skipping duplicate title "${story.title}"`);
      continue;
    }

    const xpReward = 20 + story.reading_time_minutes * 5;
    const [levelId] = await db('growth_levels').insert({
      path_id: path.path_id,
      section_title: section,
      level_number: nextLevelNumber,
      title: story.title,
      xp_reward: xpReward,
      sort_order: nextLevelNumber,
    });

    const [story_id] = await db('growth_stories').insert({
      level_id: levelId,
      title: story.title,
      category: story.category,
      reading_time_minutes: story.reading_time_minutes,
      sentences: JSON.stringify(story.sentences.map((text, order) => ({ order, text }))),
      illustration_key: `${story.category || 'general'}-${((nextLevelNumber - 1) % 6) + 1}`,
    });

    for (const v of story.vocabulary) {
      await db('growth_vocabulary').insert({
        story_id,
        word: v.word,
        meaning: v.meaning,
        pronunciation: v.pronunciation,
        synonyms: v.synonyms,
        example_sentence: v.example_sentence,
      });
    }

    for (const [i, q] of story.quiz.entries()) {
      await db('growth_quiz_questions').insert({
        story_id,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        sort_order: i,
      });
    }

    console.log(`[growthContentInserter] Inserted level ${nextLevelNumber}: "${story.title}"`);
    nextLevelNumber += 1;
    inserted += 1;
  }

  return inserted;
}
