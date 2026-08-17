import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { seedBulkGrowthStories } from '../seedBulkStories.js';

// ── Constants ──────────────────────────────────────────────────────────────
const WEEKLY_GOAL_LEVELS = 5;
const MONTHLY_GOAL_LEVELS = 20;
const XP_PER_LEVEL = 500; // account level = floor(xp / XP_PER_LEVEL) + 1

const QUOTES = [
  "Today is another chance to improve yourself.",
  "Small steps every day lead to big change.",
  "Your future self is built by what you do today.",
  "Progress, not perfection.",
  "Every word you learn opens a new door.",
  "Confidence is built one lesson at a time.",
  "The best investment you can make is in yourself.",
  "Consistency beats intensity — show up today.",
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// ── Helpers ────────────────────────────────────────────────────────────────
async function ensureProfile(studentId: number) {
  let profile = await db('growth_profiles').where({ student_id: studentId }).first();
  if (!profile) {
    await db('growth_profiles').insert({ student_id: studentId }).catch(() => {});
    profile = await db('growth_profiles').where({ student_id: studentId }).first();
  }
  return profile;
}

// Displayed streak — corrects for missed days without needing a cron job.
function displayedStreak(profile: any): number {
  if (!profile?.last_activity_date) return 0;
  const lastDate = new Date(profile.last_activity_date).toISOString().slice(0, 10);
  if (lastDate === todayStr() || lastDate === yesterdayStr()) return profile.current_streak;
  return 0;
}

function starsForScore(scorePct: number): number {
  if (scorePct >= 90) return 3;
  if (scorePct >= 70) return 2;
  if (scorePct >= 50) return 1;
  return 0;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const profile = await ensureProfile(studentId);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [weeklyRow] = await db('growth_activity_log')
      .where('student_id', studentId)
      .where('completed_at', '>=', weekAgo)
      .count<{ count: string }[]>('* as count');
    const [monthlyRow] = await db('growth_activity_log')
      .where('student_id', studentId)
      .whereRaw('MONTH(completed_at) = MONTH(CURDATE()) AND YEAR(completed_at) = YEAR(CURDATE())')
      .count<{ count: string }[]>('* as count');
    const [readingRow] = await db('growth_activity_log as gal')
      .join('growth_levels as gl', 'gal.level_id', 'gl.level_id')
      .join('growth_stories as gs', 'gl.level_id', 'gs.level_id')
      .where('gal.student_id', studentId)
      .sum<{ total: string }[]>('gs.reading_time_minutes as total');

    // Today's challenge: nudge toward the next unlocked-but-incomplete level.
    const nextLevel = await db('growth_user_progress as gup')
      .join('growth_levels as gl', 'gup.level_id', 'gl.level_id')
      .where('gup.student_id', studentId)
      .where('gup.status', 'unlocked')
      .orderBy('gl.sort_order', 'asc')
      .first('gl.title', 'gl.level_id');

    let recentlyRead = await db('growth_user_progress as gup')
      .join('growth_levels as gl', 'gup.level_id', 'gl.level_id')
      .join('growth_stories as gs', 'gl.level_id', 'gs.level_id')
      .where('gup.student_id', studentId)
      .whereIn('gup.status', ['unlocked', 'completed'])
      .select(
        'gl.level_id',
        'gl.title',
        'gs.category',
        'gs.reading_time_minutes as readingTime',
        'gup.status'
      )
      .orderBy('gup.updated_at', 'desc')
      .limit(10);

    if (!recentlyRead.length) {
      recentlyRead = await db('growth_levels as gl')
        .join('growth_stories as gs', 'gl.level_id', 'gs.level_id')
        .leftJoin('growth_user_progress as gup', function () {
          this.on('gup.level_id', '=', 'gl.level_id').andOn('gup.student_id', '=', db.raw('?', [studentId]));
        })
        .select(
          'gl.level_id',
          'gl.title',
          'gs.category',
          'gs.reading_time_minutes as readingTime',
          db.raw("COALESCE(gup.status, 'locked') as status")
        )
        .orderBy('gl.level_id', 'asc')
        .limit(10);
    }

    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    );

    res.json({
      success: true,
      data: {
        level: profile.level,
        xp: profile.xp,
        xpForNextLevel: profile.level * XP_PER_LEVEL,
        coins: profile.coins,
        currentStreak: displayedStreak(profile),
        longestStreak: profile.longest_streak,
        readingMinutes: Number(readingRow?.total || 0),
        weeklyGoal: WEEKLY_GOAL_LEVELS,
        weeklyProgress: Number(weeklyRow?.count || 0),
        monthlyGoal: MONTHLY_GOAL_LEVELS,
        monthlyProgress: Number(monthlyRow?.count || 0),
        todaysChallenge: nextLevel
          ? { title: `Finish: ${nextLevel.title}`, levelId: nextLevel.level_id, category: nextLevel.category }
          : { title: 'Start your next lesson!', levelId: null, category: null },
        recentlyAdded: recentlyRead.map((r: any) => ({
          levelId: r.level_id,
          title: r.title,
          category: r.category,
          readingTime: r.readingTime,
          status: r.status,
        })),
        quote: QUOTES[dayOfYear % QUOTES.length],
      },
    });
  } catch (error: any) {
    console.error('Get growth dashboard error:', error?.message || error);
    res.json({
      success: true,
      data: {
        level: 1,
        xp: 0,
        xpForNextLevel: 500,
        coins: 0,
        currentStreak: 0,
        longestStreak: 0,
        readingMinutes: 0,
        weeklyGoal: WEEKLY_GOAL_LEVELS,
        weeklyProgress: 0,
        monthlyGoal: MONTHLY_GOAL_LEVELS,
        monthlyProgress: 0,
        todaysChallenge: { title: 'Start your next lesson!', levelId: null, category: null },
        recentlyAdded: [],
        quote: QUOTES[0],
      },
    });
  }
};

// ── Paths ──────────────────────────────────────────────────────────────────
export const getPaths = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const paths = await db('growth_paths').where('is_active', 1).orderBy('sort_order', 'asc');

    const progress = await db('growth_levels as gl')
      .join('growth_user_progress as gup', function () {
        this.on('gup.level_id', '=', 'gl.level_id').andOn('gup.student_id', '=', db.raw('?', [studentId]));
      })
      .where('gup.status', 'completed')
      .groupBy('gl.path_id')
      .select('gl.path_id')
      .count<{ path_id: number; count: string }[]>('* as count');

    const totals = await db('growth_levels').groupBy('path_id').select('path_id').count<{ path_id: number; count: string }[]>('* as count');
    const totalByPath = new Map(totals.map((t: any) => [t.path_id, Number(t.count)]));

    const completedByPath = new Map(progress.map((p: any) => [p.path_id, Number(p.count)]));
    // If english_stories has fewer than 15 levels, automatically trigger bulk seeding
    const engTotal = totalByPath.get(1) || 0;
    if (engTotal < 15) {
      await seedBulkGrowthStories().catch((e) => console.error('[growth] Auto-seed error:', e?.message));
      const freshTotals = await db('growth_levels').groupBy('path_id').select('path_id').count<{ path_id: number; count: string }[]>('* as count');
      freshTotals.forEach((t: any) => totalByPath.set(t.path_id, Number(t.count)));
    }

    // Only ever show paths that actually have seeded content
    const withContent = paths
      .map((p: any) => ({
        ...p,
        completedLevels: completedByPath.get(p.path_id) || 0,
        totalLevels: totalByPath.get(p.path_id) || 0,
      }))
      .filter((p: any) => p.totalLevels > 0);

    res.json({ success: true, data: withContent });
  } catch (error: any) {
    console.error('Get growth paths error:', error);
    res.status(500).json({ success: false, error: 'Failed to load learning paths' });
  }
};

// ── Roadmap (levels within a path) ─────────────────────────────────────────
export const getPathLevels = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const { pathKey } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = 30;

    const path = await db('growth_paths').where({ path_key: pathKey }).first();
    if (!path) {
      return res.status(404).json({ success: false, error: 'Learning path not found' });
    }
    if (!path.is_active) {
      return res.status(403).json({ success: false, error: 'This learning path is coming soon' });
    }

    const levels = await db('growth_levels')
      .where('path_id', path.path_id)
      .orderBy('sort_order', 'asc')
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const levelIds = levels.map((l: any) => l.level_id);
    const progressRows = levelIds.length
      ? await db('growth_user_progress').where('student_id', studentId).whereIn('level_id', levelIds)
      : [];
    const progressByLevel = new Map(progressRows.map((p: any) => [p.level_id, p]));

    const data = levels.map((level: any) => {
      const prog = progressByLevel.get(level.level_id);
      const status = prog?.status || (level.level_number === 1 ? 'unlocked' : 'locked');
      return {
        levelId: level.level_id,
        sectionTitle: level.section_title,
        levelNumber: level.level_number,
        title: level.title,
        xpReward: level.xp_reward,
        status,
        stars: prog?.stars || 0,
      };
    });

    const [{ count: totalCount }] = await db('growth_levels').where('path_id', path.path_id).count<{ count: string }[]>('* as count');

    res.json({
      success: true,
      data,
      pagination: { page, pageSize, total: Number(totalCount), hasMore: page * pageSize < Number(totalCount) },
    });
  } catch (error: any) {
    console.error('Get path levels error:', error);
    res.status(500).json({ success: false, error: 'Failed to load roadmap' });
  }
};

// ── Level detail (story + vocab + quiz meta) ────────────────────────────────
export const getLevelDetail = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const { levelId } = req.params;

    const level = await db('growth_levels').where({ level_id: levelId }).first();
    if (!level) return res.status(404).json({ success: false, error: 'Level not found' });

    const story = await db('growth_stories').where({ level_id: levelId }).first();
    if (!story) return res.status(404).json({ success: false, error: 'Story not found for this level' });

    // Gate: a level must be unlocked or completed for this student to open it.
    const prog = await db('growth_user_progress').where({ student_id: studentId, level_id: levelId }).first();
    const status = prog?.status || (level.level_number === 1 ? 'unlocked' : 'locked');
    if (status === 'locked') {
      return res.status(403).json({ success: false, error: 'Complete the previous level first' });
    }

    const vocabulary = await db('growth_vocabulary').where({ story_id: story.story_id });
    const questions = await db('growth_quiz_questions')
      .where({ story_id: story.story_id })
      .orderBy('sort_order', 'asc')
      .select('question_id', 'question_type', 'question_text', 'options', 'correct_answer');

    res.json({
      success: true,
      data: {
        levelId: level.level_id,
        title: level.title,
        xpReward: level.xp_reward,
        story: {
          storyId: story.story_id,
          title: story.title,
          category: story.category,
          readingTimeMinutes: story.reading_time_minutes,
          sentences: typeof story.sentences === 'string' ? JSON.parse(story.sentences) : story.sentences,
          illustrationKey: story.illustration_key,
        },
        vocabulary,
        questions: questions.map((q: any) => ({
          ...q,
          options: q.options && typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get level detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to load lesson' });
  }
};

// ── Complete a level (server-authoritative scoring) ─────────────────────────
export const completeLevel = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const { levelId } = req.params;
    const { answers, direct } = req.body as { answers?: Record<string, string>; direct?: boolean };

    const level = await db('growth_levels').where({ level_id: levelId }).first();
    if (!level) return res.status(404).json({ success: false, error: 'Level not found' });

    const story = await db('growth_stories').where({ level_id: levelId }).first();
    const questions = await db('growth_quiz_questions').where({ story_id: story.story_id });

    let scorePct = 100;
    let correctCount = questions.length;

    if (!direct) {
      correctCount = 0;
      for (const q of questions) {
        const given = String(answers?.[q.question_id] ?? '').trim().toLowerCase();
        const correct = String(q.correct_answer ?? '').trim().toLowerCase();
        if (given && given === correct) correctCount += 1;
      }
      scorePct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    }
    const stars = direct ? 3 : starsForScore(scorePct);

    const existing = await db('growth_user_progress').where({ student_id: studentId, level_id: levelId }).first();
    const now = new Date();
    if (existing) {
      await db('growth_user_progress')
        .where({ student_id: studentId, level_id: levelId })
        .update({
          status: 'completed',
          stars: Math.max(stars, existing.stars || 0),
          best_score: Math.max(scorePct, existing.best_score || 0),
          attempts: (existing.attempts || 0) + 1,
          completed_at: now,
        });
    } else {
      await db('growth_user_progress').insert({
        student_id: studentId,
        level_id: levelId,
        status: 'completed',
        stars,
        best_score: scorePct,
        attempts: 1,
        completed_at: now,
      });
    }

    // Unlock the next level in this path, if not already unlocked/completed.
    const nextLevel = await db('growth_levels')
      .where({ path_id: level.path_id })
      .where('level_number', level.level_number + 1)
      .first();
    if (nextLevel) {
      const nextProgress = await db('growth_user_progress')
        .where({ student_id: studentId, level_id: nextLevel.level_id })
        .first();
      if (!nextProgress) {
        await db('growth_user_progress').insert({
          student_id: studentId,
          level_id: nextLevel.level_id,
          status: 'unlocked',
        });
      }
    }

    // First-time completion only awards XP/coins — retries don't farm rewards.
    const isFirstCompletion = !existing || existing.status !== 'completed';
    let xpEarned = 0;
    let leveledUp = false;
    let streak = 0;

    const profile = await ensureProfile(studentId);
    if (isFirstCompletion) {
      xpEarned = level.xp_reward;
      const coinsEarned = Math.round(xpEarned / 4);
      const newXp = profile.xp + xpEarned;
      const oldLevel = profile.level;
      const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
      leveledUp = newLevel > oldLevel;

      const lastDate = profile.last_activity_date
        ? new Date(profile.last_activity_date).toISOString().slice(0, 10)
        : null;
      let newStreak = profile.current_streak;
      if (lastDate === todayStr()) {
        newStreak = profile.current_streak;
      } else if (lastDate === yesterdayStr()) {
        newStreak = profile.current_streak + 1;
      } else {
        newStreak = 1;
      }
      const newLongest = Math.max(profile.longest_streak, newStreak);
      streak = newStreak;

      await db('growth_profiles').where({ student_id: studentId }).update({
        xp: newXp,
        level: newLevel,
        coins: profile.coins + coinsEarned,
        current_streak: newStreak,
        longest_streak: newLongest,
        last_activity_date: todayStr(),
      });

      await db('growth_activity_log').insert({
        student_id: studentId,
        level_id: levelId,
        xp_earned: xpEarned,
        score: scorePct,
      });
    } else {
      streak = displayedStreak(profile);
    }

    res.json({
      success: true,
      data: { score: scorePct, stars, xpEarned, leveledUp, streak, correctCount, totalQuestions: questions.length },
    });
  } catch (error: any) {
    console.error('Complete level error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit lesson' });
  }
};

// ── Vocabulary ─────────────────────────────────────────────────────────────
export const saveVocabulary = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const { vocabId } = req.params;

    const word = await db('growth_vocabulary').where({ vocab_id: vocabId }).first();
    if (!word) return res.status(404).json({ success: false, error: 'Word not found' });

    try {
      await db('growth_user_vocabulary').insert({ student_id: studentId, vocab_id: vocabId });
    } catch (insertErr: any) {
      if (insertErr?.code !== 'ER_DUP_ENTRY') throw insertErr;
      // already saved — treat as success (idempotent)
    }

    res.json({ success: true, message: 'Saved to My Vocabulary' });
  } catch (error: any) {
    console.error('Save vocabulary error:', error);
    res.status(500).json({ success: false, error: 'Failed to save word' });
  }
};

export const getSavedVocabulary = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const words = await db('growth_user_vocabulary as guv')
      .join('growth_vocabulary as gv', 'guv.vocab_id', 'gv.vocab_id')
      .where('guv.student_id', studentId)
      .orderBy('guv.saved_at', 'desc')
      .select('gv.*', 'guv.saved_at');

    res.json({ success: true, data: words });
  } catch (error: any) {
    console.error('Get saved vocabulary error:', error);
    res.status(500).json({ success: false, error: 'Failed to load saved words' });
  }
};

// ── Stats ──────────────────────────────────────────────────────────────────
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const profile = await ensureProfile(studentId);

    const [storiesRow] = await db('growth_activity_log').where('student_id', studentId).count<{ count: string }[]>('* as count');
    const [readingRow] = await db('growth_activity_log as gal')
      .join('growth_stories as gs', 'gal.level_id', 'gs.level_id')
      .where('gal.student_id', studentId)
      .sum<{ total: string }[]>('gs.reading_time_minutes as total');
    const [vocabRow] = await db('growth_user_vocabulary').where('student_id', studentId).count<{ count: string }[]>('* as count');
    const [weeklyRow] = await db('growth_activity_log')
      .where('student_id', studentId)
      .whereRaw('YEARWEEK(completed_at, 1) = YEARWEEK(CURDATE(), 1)')
      .count<{ count: string }[]>('* as count');
    const [monthlyRow] = await db('growth_activity_log')
      .where('student_id', studentId)
      .whereRaw('MONTH(completed_at) = MONTH(CURDATE()) AND YEAR(completed_at) = YEAR(CURDATE())')
      .count<{ count: string }[]>('* as count');
    const [yearlyRow] = await db('growth_activity_log')
      .where('student_id', studentId)
      .whereRaw('YEAR(completed_at) = YEAR(CURDATE())')
      .count<{ count: string }[]>('* as count');

    res.json({
      success: true,
      data: {
        readingMinutes: Number(readingRow?.total || 0),
        storiesCompleted: Number(storiesRow?.count || 0),
        wordsLearned: Number(vocabRow?.count || 0),
        currentStreak: displayedStreak(profile),
        longestStreak: profile.longest_streak,
        currentLevel: profile.level,
        weeklyProgress: Number(weeklyRow?.count || 0),
        weeklyGoal: WEEKLY_GOAL_LEVELS,
        monthlyProgress: Number(monthlyRow?.count || 0),
        monthlyGoal: MONTHLY_GOAL_LEVELS,
        yearlyProgress: Number(yearlyRow?.count || 0),
      },
    });
  } catch (error: any) {
    console.error('Get growth stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to load stats' });
  }
};

export const getLevelsByIds = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.user_id;
    const ids = req.query.ids ? String(req.query.ids).split(',').map(Number).filter(Boolean) : [];
    if (!ids.length) {
      return res.json({ success: true, data: [] });
    }
    const levels = await db('growth_levels as gl')
      .join('growth_stories as gs', 'gl.level_id', 'gs.level_id')
      .leftJoin('growth_user_progress as gup', function () {
        this.on('gup.level_id', '=', 'gl.level_id').andOn('gup.student_id', '=', db.raw('?', [studentId]));
      })
      .whereIn('gl.level_id', ids)
      .select(
        'gl.level_id',
        'gl.title',
        'gl.category',
        'gs.reading_time_minutes as readingTime',
        db.raw("COALESCE(gup.status, 'locked') as status")
      );
    res.json({ success: true, data: levels });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
