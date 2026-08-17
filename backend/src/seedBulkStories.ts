import db from './config/database.js';

interface VocabItem {
  word: string;
  meaning: string;
  teluguMeaning?: string;
  simpleMeaning?: string;
  example_sentence: string;
}

interface QuizItem {
  question: string;
  options: string[];
  answer: string;
}

interface StoryLevelData {
  level: number;
  section: string;
  title: string;
  category: string;
  readingTime: number;
  sentences: string[];
  vocab: VocabItem[];
  quiz: QuizItem;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENGLISH STORIES (15 Full-Page Levels)
// ─────────────────────────────────────────────────────────────────────────────
import { englishStoriesData as importedEnglishStoriesData } from './data/englishStoriesData.js';
const englishStoriesData = importedEnglishStoriesData;

// ─────────────────────────────────────────────────────────────────────────────
// 2. MORAL STORIES (15 Full-Page Levels)
// ─────────────────────────────────────────────────────────────────────────────
const moralStoriesData: StoryLevelData[] = [
  {
    level: 1,
    section: 'Chapter 1: Foundations of Wisdom',
    title: 'The Two Wolves Within Us',
    category: 'Moral Story',
    readingTime: 3,
    sentences: [
      'An old grandfather sat with his young grandson by the warmth of an evening campfire beneath a star-filled sky.',
      'The grandson had come home from school furious because a classmate had treated him unfairly during a game.',
      'The grandfather looked deeply into the boy\'s eyes and said, "A terrible fight goes on inside every human being."',
      '"It is a battle between two fierce wolves that live inside our minds and hearts."',
      '"One wolf is full of anger, envy, greed, resentment, arrogance, self-pity, and deceit."',
      '"The other wolf is full of joy, peace, love, hope, serenity, humility, kindness, empathy, and truth."',
      'The grandson sat quietly for a long moment, thinking deeply about the two wolves battling inside himself.',
      'He looked up at his grandfather and asked eagerly, "Which wolf wins the fight, Grandpa?"',
      'The wise grandfather smiled gently and replied with timeless clarity: "The one you feed."'
    ],
    vocab: [
      { word: 'Resentment', meaning: 'Bitter indignation at having been treated unfairly', example_sentence: 'Holding resentment only harms the person carrying it.' },
      { word: 'Serenity', meaning: 'The state of being calm, peaceful, and untroubled', example_sentence: 'Meditation brings inner peace and serenity.' },
      { word: 'Deceit', meaning: 'The action or practice of deceiving someone by concealing truth', example_sentence: 'Honesty always overcomes deceit.' }
    ],
    quiz: {
      question: 'According to the grandfather, which wolf wins the inner battle?',
      options: ['The one you choose to feed with your thoughts and actions', 'The angry wolf always wins', 'Neither wolf ever survives', 'The wolf that runs fastest'],
      answer: 'The one you choose to feed with your thoughts and actions'
    }
  },
  {
    level: 2,
    section: 'Chapter 1: Foundations of Wisdom',
    title: 'The Weight of the Glass of Water',
    category: 'Moral Story',
    readingTime: 4,
    sentences: [
      'A psychology professor walked around a lecture hall while explaining stress management principles to her university students.',
      'As she raised a half-full glass of clear water in her right hand, everyone expected the classic "half empty or half full" question.',
      'Instead, with a gentle smile, she asked, "How heavy is this glass of water that I am holding?"',
      'Students called out answers ranging from two hundred grams to five hundred grams.',
      'The professor replied, "The absolute weight does not matter. It depends entirely on how long I hold it."',
      '"If I hold it for a minute, it is light and easy. If I hold it for an hour, my arm begins to ache."',
      '"If I hold it for an entire day without putting it down, my arm will feel completely numb and paralyzed."',
      '"The weight of the water never changes, but the longer I hold it, the heavier it becomes."',
      '"Our stresses, worries, and grudges in life are exactly like this glass of water. Put them down and rest before they paralyze you."'
    ],
    vocab: [
      { word: 'Paralyze', meaning: 'To render motionless, unable to move or function', example_sentence: 'Holding on to worry will paralyze your progress.' },
      { word: 'Grudge', meaning: 'A persistent feeling of ill will or resentment resulting from past insult', example_sentence: 'Forgiveness frees you from carrying a heavy grudge.' },
      { word: 'Absolute', meaning: 'Not qualified or diminished in any way; total', example_sentence: 'Focus on growth rather than absolute perfection.' }
    ],
    quiz: {
      question: 'What happens to the glass of water the longer you hold it?',
      options: ['It feels increasingly heavy and causes your arm to ache and become numb', 'It gets lighter over time', 'The water turns cold', 'The glass evaporates'],
      answer: 'It feels increasingly heavy and causes your arm to ache and become numb'
    }
  },
  {
    level: 3,
    section: 'Chapter 1: Foundations of Wisdom',
    title: 'The Golden Coins and the Beggar',
    category: 'Moral Story',
    readingTime: 4,
    sentences: [
      'A wealthy merchant who measured his worth solely by the contents of his treasure chests walked through the bustling city marketplace.',
      'Sitting at the stone entrance of a temple was an impoverished beggar wearing tattered clothes and holding an empty wooden bowl.',
      'Feeling an urge to display his immense generosity in front of the crowd, the merchant dramatically dropped three shiny gold coins into the bowl.',
      'To the merchant\'s surprise, the beggar did not bow down in servile gratitude; he simply nodded calmly and thanked him with dignity.',
      'Offended by the beggar\'s calm demeanor, the merchant scoffed, "Do you have any idea how much those gold coins are worth? You could live like a prince for a month!"',
      'The beggar smiled peacefully and replied, "To you, those coins are a tiny fraction of your surplus, given to purchase the applause of strangers."',
      '"To a poor child shivering in the alley behind this temple, they will provide warm milk, bread, and blankets tonight."',
      '"The value of gold is not in possessing it, but in the relief it brings to those who suffer."',
      'The merchant walked away in silence, realizing that real wealth is measured by what you give from the heart, not what you hoard.'
    ],
    vocab: [
      { word: 'Impoverished', meaning: 'Made very poor; lacking basic necessities', example_sentence: 'The charity provided hot meals to impoverished families.' },
      { word: 'Demeanor', meaning: 'Outward behavior or bearing', example_sentence: 'She maintained a calm and graceful demeanor under pressure.' },
      { word: 'Surplus', meaning: 'An amount of something left over when requirements have been met', example_sentence: 'He donated his surplus books to the village library.' }
    ],
    quiz: {
      question: 'What did the beggar teach the wealthy merchant about the true value of wealth?',
      options: ['True value is in the relief and kindness it brings to those who suffer', 'Gold should always be buried underground', 'Money is evil and should be thrown away', 'Rich people should never give charity'],
      answer: 'True value is in the relief and kindness it brings to those who suffer'
    }
  },
  {
    level: 4,
    section: 'Chapter 1: Foundations of Wisdom',
    title: 'The Echo of the Valley',
    category: 'Moral Story',
    readingTime: 4,
    sentences: [
      'A father and his seven-year-old son were walking along a high trail in the mountain valley.',
      'The boy tripped over a loose stone, scraped his knee on the ground, and screamed in pain: "AAAHHH!"',
      'To his immense surprise, a voice echoed back clearly from across the mountain: "AAAHHH!"',
      'Curious and startled, the boy shouted loudly: "Who are you?"',
      'The voice answered back immediately: "Who are you?"',
      'Angered by the imitation, the boy yelled with all his might: "I hate you! You are a coward!"',
      'The mountain valley echoed back faithfully: "I hate you! You are a coward!"',
      'The father knelt down beside his son, smiled warmly, and shouted towards the canyon: "You are wonderful! I love you!"',
      'The valley reverberated with joyful sweetness: "You are wonderful! I love you!"',
      'The father hugged his son and said, "People call this an echo, but in reality, it is life. Life gives you back exactly what you put into it."'
    ],
    vocab: [
      { word: 'Reverberate', meaning: 'To be repeated several times as an echo', example_sentence: 'His joyful laughter reverberated through the hall.' },
      { word: 'Coward', meaning: 'A person who lacks courage in facing danger or pain', example_sentence: 'True heroes face difficulty without acting like a coward.' },
      { word: 'Imitation', meaning: 'The action of using someone or something as a model', example_sentence: 'The echo produced a faithful imitation of his words.' }
    ],
    quiz: {
      question: 'What moral lesson did the father teach his son using the mountain echo?',
      options: ['Life gives back to you whatever energy, words, and kindness you put out into the world', 'Mountains are dangerous places to walk', 'Echoes only happen in cold weather', 'You should never scream in the forest'],
      answer: 'Life gives back to you whatever energy, words, and kindness you put out into the world'
    }
  },
  {
    level: 5,
    section: 'Chapter 1: Foundations of Wisdom',
    title: 'The Black Dot on the White Paper',
    category: 'Moral Story',
    readingTime: 4,
    sentences: [
      'One morning, a beloved high school teacher walked into his classroom and placed a surprise test paper face down on every student\'s desk.',
      'When he gave the signal to turn the papers over, the students were baffled to find no questions or instructions written anywhere.',
      'In the exact center of the pristine white sheet of paper was a tiny black dot drawn with ink.',
      'The teacher instructed them: "Please write an essay describing what you see on this paper."',
      'For thirty minutes, the students wrote earnestly, describing the size, color, geometry, and placement of the black dot.',
      'When the teacher collected the papers, he read their essays and smiled thoughtfully.',
      '"Every single one of you focused entirely on the tiny black dot in the center," the teacher said gently.',
      '"Not one of you wrote a single sentence about the vast, beautiful white paper that surrounds the dot."',
      '"This is exactly how we live life: we obsess over small problems, disappointments, and health issues, while ignoring the countless blessings of life surrounding us."'
    ],
    vocab: [
      { word: 'Pristine', meaning: 'In its original condition; unspoiled and clean', example_sentence: 'The pristine sheet of white paper had only one mark.' },
      { word: 'Baffled', meaning: 'Totally bewildered or perplexed', example_sentence: 'The students were baffled by the unusual exam.' },
      { word: 'Obsess', meaning: 'To preoccupy or fill the mind continually and excessively', example_sentence: 'Do not obsess over minor setbacks.' }
    ],
    quiz: {
      question: 'What did the students overlook when writing about the paper with the black dot?',
      options: ['The vast white space that covered 99% of the paper', 'The ink color', 'The desk surface', 'The teacher\'s instructions'],
      answer: 'The vast white space that covered 99% of the paper'
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. DAILY JOKES & HUMOR STORIES (15 Full-Page Levels)
// ─────────────────────────────────────────────────────────────────────────────
const dailyJokesData: StoryLevelData[] = [
  {
    level: 1,
    section: 'Chapter 1: Campus Chuckles',
    title: 'The Great WiFi Password Mystery',
    category: 'Daily Jokes',
    readingTime: 3,
    sentences: [
      'Suresh walked into a newly opened trendy cafe near his hostel, took a corner seat, and pulled out his smartphone.',
      'He noticed a lightning-fast WiFi network named "Free_HighSpeed_Campus_5G", but it was locked with a secure password.',
      'He walked up to the coffee counter where a cheerful young barista was grinding fresh espresso beans.',
      '"Excuse me, could you please tell me what the WiFi password is?" Suresh asked politely with a broad smile.',
      'The barista looked him straight in the eye and said firmly: "You have to buy a coffee first."',
      'Suresh nodded understandingly, reached into his wallet, and said, "Fair enough! Please give me one large iced caramel latte."',
      'He paid two hundred rupees, received his cold beverage, and took a refreshing sip.',
      'He smiled and asked again: "Now that I bought the coffee, what is the WiFi password?"',
      'The barista smiled cheerfully and replied: "YouHaveToBuyACoffeeFirst — all one word, all lowercase!"'
    ],
    vocab: [
      { word: 'Barista', meaning: 'A person whose job involves preparing and serving different types of coffee', example_sentence: 'The barista made a wonderful cappuccino.' },
      { word: 'Beverage', meaning: 'A drink, especially one other than water', example_sentence: 'Coffee is a popular morning beverage.' },
      { word: 'Politely', meaning: 'In a respectful and considerate manner', example_sentence: 'He asked for directions politely.' }
    ],
    quiz: {
      question: 'What was the actual WiFi password in the cafe?',
      options: ['YouHaveToBuyACoffeeFirst (all one word, lowercase)', 'FreeCoffee123', 'CampusHostel2026', 'There was no password'],
      answer: 'YouHaveToBuyACoffeeFirst (all one word, lowercase)'
    }
  },
  {
    level: 2,
    section: 'Chapter 1: Campus Chuckles',
    title: 'The Exam Question That Broke the Class',
    category: 'Daily Jokes',
    readingTime: 3,
    sentences: [
      'Four college roommates overslept on Monday morning after playing online multiplayer games until four in the morning.',
      'They arrived at their engineering department two hours late for their final semester Physics exam.',
      'Panicking, they smeared engine grease on their shirts, tore their sleeves slightly, and ran into the professor\'s office.',
      '"Professor, we are so sorry! On the way to college, our car had a terrible flat tire and we had to push it three kilometers in the hot sun!" they gasped.',
      'The professor looked at their dirty clothes with great sympathy and said, "Do not worry, boys. I believe in second chances."',
      '"Come back tomorrow morning at nine o\'clock, and I will administer a special re-test just for you four."',
      'The roommates celebrated all night, convinced that their clever excuse had saved them from failing.',
      'The next morning, the professor seated the four students in four separate classrooms so they could not see each other.',
      'The test paper contained only two questions worth one hundred points total.',
      'Question 1 (2 points): What is Newton\'s First Law of Motion?',
      'Question 2 (98 points): Which of the four tires on your car went flat yesterday?'
    ],
    vocab: [
      { word: 'Administer', meaning: 'To manage or conduct the execution of an exam or task', example_sentence: 'The teacher will administer the quiz at 10 AM.' },
      { word: 'Sympathy', meaning: 'Feelings of pity and sorrow for someone else\'s misfortune', example_sentence: 'The professor listened with apparent sympathy.' },
      { word: 'Multiply', meaning: 'To increase greatly in number or quantity', example_sentence: 'His worries began to multiply when he saw the exam.' }
    ],
    quiz: {
      question: 'What was the 98-point question on the professor\'s surprise re-test?',
      options: ['Which of the four tires on your car went flat yesterday?', 'Calculate the speed of light', 'Define gravity in space', 'Draw a diagram of an engine'],
      answer: 'Which of the four tires on your car went flat yesterday?'
    }
  },
  {
    level: 3,
    section: 'Chapter 1: Campus Chuckles',
    title: 'The World\'s Smartest Dog at the Cinema',
    category: 'Daily Jokes',
    readingTime: 3,
    sentences: [
      'Ravi went to the cinema on a Friday evening to watch a newly released comedy blockbuster.',
      'He settled into his seat in row F and was stunned to see a man sitting in row E with a golden retriever sitting right beside him.',
      'As the movie started playing, Ravi watched the golden retriever in utter disbelief.',
      'Whenever there was a funny dialogue on screen, the dog wagged its tail enthusiastically and let out a joyful pant.',
      'When the emotional sad scene played, the dog rested its head on its paws with a sorrowful whimper.',
      'And when the thrilling climax unfolded, the dog sat upright on the edge of its seat with focused intensity.',
      'After the movie ended and the lights came up, Ravi tapped the owner on the shoulder in sheer amazement.',
      '"Sir, that is the most incredible thing I have ever witnessed! Your dog seemed to genuinely understand and enjoy the entire film!" Ravi exclaimed.',
      'The owner sighed, shook his head, and replied: "To be honest, I am surprised as well... he absolutely hated the book!"'
    ],
    vocab: [
      { word: 'Enthusiastically', meaning: 'In a way that shows intense and eager enjoyment or interest', example_sentence: 'The crowd cheered enthusiastically for the team.' },
      { word: 'Climax', meaning: 'The most intense, exciting, or important point of something', example_sentence: 'The movie reached a thrilling climax.' },
      { word: 'Disbelief', meaning: 'Inability or refusal to accept that something is true or real', example_sentence: 'He stared at the magical trick in total disbelief.' }
    ],
    quiz: {
      question: 'Why was the dog owner surprised that his dog enjoyed the movie?',
      options: ['Because the dog had hated the book version', 'Because the dog was blind', 'Because the movie was boring', 'Because the cinema was too loud'],
      answer: 'Because the dog had hated the book version'
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SEEDING LOGIC
// ─────────────────────────────────────────────────────────────────────────────
async function seedCategoryLevels(
  pathKey: string,
  pathName: string,
  emoji: string,
  colorHex: string,
  desc: string,
  levelsData: StoryLevelData[]
) {
  let path = await db('growth_paths').where({ path_key: pathKey }).first();
  if (!path) {
    const [id] = await db('growth_paths').insert({
      path_key: pathKey,
      name: pathName,
      emoji: emoji,
      description: desc,
      sort_order: 1,
      is_active: 1,
      color_hex: colorHex,
    });
    path = { path_id: id };
  } else {
    await db('growth_paths').where({ path_id: path.path_id }).update({
      is_active: 1,
      name: pathName,
      color_hex: colorHex,
      emoji: emoji,
    });
  }

  for (const item of levelsData) {
    let existingLevel = await db('growth_levels')
      .where({ path_id: path.path_id, level_number: item.level })
      .first();

    let levelId: number;
    if (existingLevel) {
      levelId = existingLevel.level_id;
      await db('growth_levels').where({ level_id: levelId }).update({
        title: item.title,
        section_title: item.section,
        xp_reward: 50 + item.level * 2,
        sort_order: item.level,
      });
    } else {
      const [id] = await db('growth_levels').insert({
        path_id: path.path_id,
        section_title: item.section,
        level_number: item.level,
        title: item.title,
        xp_reward: 50 + item.level * 2,
        sort_order: item.level,
      });
      levelId = id;
    }

    let existingStory = await db('growth_stories').where({ level_id: levelId }).first();
    let storyId: number;
    if (existingStory) {
      storyId = existingStory.story_id;
      await db('growth_stories').where({ story_id: storyId }).update({
        title: item.title,
        category: item.category,
        reading_time_minutes: item.readingTime,
        sentences: JSON.stringify(item.sentences),
      });
    } else {
      const [id] = await db('growth_stories').insert({
        level_id: levelId,
        title: item.title,
        category: item.category,
        reading_time_minutes: item.readingTime,
        sentences: JSON.stringify(item.sentences),
      });
      storyId = id;
    }

    await db('growth_vocabulary').where({ story_id: storyId }).del();
    for (const v of item.vocab) {
      await db('growth_vocabulary').insert({
        story_id: storyId,
        word: v.word,
        meaning: v.meaning,
        telugu_meaning: (v as any).teluguMeaning || null,
        simple_meaning: (v as any).simpleMeaning || null,
        example_sentence: v.example_sentence,
      });
    }

    await db('growth_quiz_questions').where({ story_id: storyId }).del();
    await db('growth_quiz_questions').insert({
      story_id: storyId,
      question_type: 'mcq',
      question_text: item.quiz.question,
      options: JSON.stringify(item.quiz.options),
      correct_answer: item.quiz.answer,
      sort_order: 1,
    });
  }

  console.log(`[BulkSeed] ✅ Seeded ${levelsData.length} full-page stories for path: ${pathKey} (${pathName})`);
}

export async function seedBulkGrowthStories() {
  console.log('[BulkSeed] Starting comprehensive multi-page bulk growth stories seeding...');

  try {
    // 1. Seed English Stories (15 Full-page levels)
    await seedCategoryLevels(
      'english_stories',
      'English Stories',
      '📚',
      '#6D4AFF',
      'Engaging full-page stories to expand vocabulary and comprehension',
      englishStoriesData
    );

    // 2. Seed Moral Stories (5+ Full-page levels)
    await seedCategoryLevels(
      'moral_stories',
      'Moral Stories',
      '💡',
      '#16A34A',
      'Timeless wisdom and inspiring life lessons in rich English',
      moralStoriesData
    );

    // 3. Seed Daily Jokes (3+ Full-page levels)
    await seedCategoryLevels(
      'daily_jokes',
      'Daily Jokes',
      '😄',
      '#D97706',
      'Witty, family-friendly humor and funny campus scenarios',
      dailyJokesData
    );

    console.log('[BulkSeed] 🎉 All bulk growth story categories successfully seeded with full-page content!');
  } catch (err: any) {
    console.error('[BulkSeed] Error during full-page story seeding:', err.message);
  }
}
