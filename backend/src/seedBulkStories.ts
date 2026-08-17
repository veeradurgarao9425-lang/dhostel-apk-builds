import db from './config/database.js';

interface VocabItem {
  word: string;
  meaning: string;
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
const englishStoriesData: StoryLevelData[] = [
  {
    level: 1,
    section: 'Chapter 1: New Beginnings',
    title: 'The First Morning in the City',
    category: 'English Story',
    readingTime: 3,
    sentences: [
      'The morning sun peered gently through the hostel window, casting a warm golden glow across Rahul\'s desk.',
      'It was his very first week living away from his hometown, surrounded by towering city buildings and endless streams of traffic.',
      'Taking a deep breath of the fresh morning breeze, he felt a thrilling wave of independence wash over him.',
      'He laced up his walking shoes and walked down the quiet corridor to greet the security guard with a friendly smile.',
      'At the local tea stall nearby, the steaming aroma of freshly brewed ginger tea and warm cardamom filled the cool air.',
      'The tea vendor handed him a clay cup with a warm nod, wishing him the best of luck for his college classes.',
      'Sipping the sweet, spicy tea, Rahul realized that every great journey in life starts with small, courageous steps.',
      'He opened his notebook, wrote down three positive goals for the day, and set off towards his campus with high spirits.'
    ],
    vocab: [
      { word: 'Courageous', meaning: 'Brave and willing to face new challenges', example_sentence: 'Taking the first step into the city was a courageous decision.' },
      { word: 'Independence', meaning: 'Freedom from control or reliance on others', example_sentence: 'Living in a hostel fosters true personal independence.' },
      { word: 'Spirits', meaning: 'A person\'s mood or emotional attitude', example_sentence: 'He walked toward his new college in high spirits.' }
    ],
    quiz: {
      question: 'What gave Rahul a feeling of independence on his first morning?',
      options: ['Taking a deep breath of the fresh morning breeze in the new city', 'Drinking cold coffee', 'Staying asleep all morning', 'Watching movies on his phone'],
      answer: 'Taking a deep breath of the fresh morning breeze in the new city'
    }
  },
  {
    level: 2,
    section: 'Chapter 1: New Beginnings',
    title: 'The Hidden Power of Quiet Consistency',
    category: 'English Story',
    readingTime: 4,
    sentences: [
      'In the quiet corner of the college library, Ananya sat surrounded by tall wooden bookshelves and ancient volumes.',
      'Many of her classmates believed that talent alone was the only ticket to winning academic and career success.',
      'However, Ananya believed firmly in the gentle power of showing up every single day without making excuses.',
      'While others procrastinated and waited until the final week before exams, she dedicated forty-five focused minutes each evening to reading.',
      'She highlighted new English words, noted down complex grammar patterns, and practiced writing clear summaries in her journal.',
      'Months went by without any immediate fanfare or dramatic breakthroughs, yet her grasp of the language was steadily expanding.',
      'When the national essay competition was announced, Ananya wrote with effortless clarity, rich expression, and deep conviction.',
      'To everyone\'s delight, her essay was awarded first place, proving that quiet consistency always triumphs over loud intentions.'
    ],
    vocab: [
      { word: 'Consistency', meaning: 'Continuous and dependable effort over time', example_sentence: 'Daily consistency leads to incredible mastery.' },
      { word: 'Conviction', meaning: 'A firmly held belief or opinion', example_sentence: 'She spoke with deep conviction during the presentation.' },
      { word: 'Procrastinate', meaning: 'To delay or postpone action unnecessarily', example_sentence: 'Do not procrastinate when building your future.' }
    ],
    quiz: {
      question: 'What habit helped Ananya win first place in the national competition?',
      options: ['Dedicating 45 minutes every evening to focused study', 'Studying only on the final night', 'Skipping all her classes', 'Borrowing notes from friends at the last minute'],
      answer: 'Dedicating 45 minutes every evening to focused study'
    }
  },
  {
    level: 3,
    section: 'Chapter 1: New Beginnings',
    title: 'The Lantern on the Mountain Trail',
    category: 'English Story',
    readingTime: 4,
    sentences: [
      'Deep in the mist-covered valleys of the Western Ghats, a young trekker named Vikram set out on a rugged mountain hike.',
      'As twilight began to fade into a velvet night sky, thick fog rolled down the steep hillsides, obscuring the rocky footpath.',
      'Doubt and hesitation began to creep into Vikram\'s mind as shadows stretched long across the dense wilderness.',
      'Just when he considered turning back in despair, he noticed a soft, steady lantern flickering from a small wooden shelter ahead.',
      'An elderly guide stepped out with a warm woolen blanket, welcoming Vikram into the safety of the firelit hearth.',
      'The guide told him, "When the path ahead looks dark and uncertain, do not try to see the summit; simply take the single step illuminated before you."',
      'Those simple words gave Vikram a profound sense of clarity and restored his fading confidence.',
      'The next morning, when the dawn sun burned away the fog, Vikram reached the mountain peak with renewed vigor and gratitude.'
    ],
    vocab: [
      { word: 'Obscure', meaning: 'To hide or make difficult to see', example_sentence: 'Thick fog obscured the rocky path ahead.' },
      { word: 'Illuminated', meaning: 'Lit up and made clearly visible', example_sentence: 'The lantern illuminated the narrow path.' },
      { word: 'Profound', meaning: 'Very great, intense, or deeply meaningful', example_sentence: 'The guide\'s advice had a profound effect on his mindset.' }
    ],
    quiz: {
      question: 'What advice did the elderly guide give to Vikram?',
      options: ['Focus on the single step illuminated before you rather than the distant summit', 'Run as fast as you can in the dark', 'Give up whenever you face difficulty', 'Wait for someone else to carry you up'],
      answer: 'Focus on the single step illuminated before you rather than the distant summit'
    }
  },
  {
    level: 4,
    section: 'Chapter 1: New Beginnings',
    title: 'The Seedling That Cracked the Stone',
    category: 'English Story',
    readingTime: 4,
    sentences: [
      'In an old courtyard paved with heavy grey flagstones, a tiny green banyan seedling began to sprout in a microscopic crack.',
      'The surrounding stones were thick, immovable, and cold, having stood untouched through decades of harsh weather.',
      'Passersby stepped over the fragile green leaf every day, never imagining that something so delicate could survive.',
      'Yet, with every drop of morning dew and every ray of sunlight that pierced the canopy, the seedling pushed its roots deeper.',
      'Week by week, the tender roots expanded silently, applying patient, steady pressure against the rigid granite.',
      'Months later, a faint fracture echoed through the quiet courtyard as the mighty stone slab parted to make way for the growing tree.',
      'What seemed impossible for brute force to shatter was achieved by gentle, persistent life seeking the open sky.',
      'The flourishing banyan tree now stands as an inspiring monument to the power of patience, grit, and unstoppable growth.'
    ],
    vocab: [
      { word: 'Persistent', meaning: 'Continuing firmly in a course of action despite difficulty', example_sentence: 'Her persistent efforts finally bore sweet fruit.' },
      { word: 'Fragile', meaning: 'Easily broken or delicate', example_sentence: 'Though fragile at first, the seedling grew into a mighty tree.' },
      { word: 'Flourishing', meaning: 'Growing rapidly and thriving successfully', example_sentence: 'The hostel community is flourishing with new energy.' }
    ],
    quiz: {
      question: 'How did the tiny seedling break through the heavy stone?',
      options: ['Through patient, persistent growth of its roots over time', 'Someone broke the stone with an iron hammer', 'A heavy storm moved the stone', 'The stone dissolved in water'],
      answer: 'Through patient, persistent growth of its roots over time'
    }
  },
  {
    level: 5,
    section: 'Chapter 1: New Beginnings',
    title: 'The Art of Listening with the Heart',
    category: 'English Story',
    readingTime: 4,
    sentences: [
      'Master Kavi was known throughout his village not just for his eloquence, but for his extraordinary ability to listen.',
      'One afternoon, a troubled student came to him, overwhelmed by worries about examinations, expectations, and future careers.',
      'The student spoke rapidly for over twenty minutes, pouring out his fears, frustrations, and deep insecurities.',
      'Throughout the entire outpouring, Master Kavi did not interrupt once, neither offering hasty advice nor passing judgment.',
      'Instead, he maintained warm eye contact, nodded with genuine empathy, and provided a safe haven for the young man\'s thoughts.',
      'When the student finally paused, he noticed a sudden calmness wash over his mind, as if a heavy boulder had been lifted from his chest.',
      '"You have not said a single word, Master, yet I already feel healed and confident," the young student whispered with gratitude.',
      'Master Kavi smiled gently and replied, "Most people do not seek clever answers; they simply long to be truly heard and understood."'
    ],
    vocab: [
      { word: 'Eloquence', meaning: 'Fluent or persuasive speaking or writing', example_sentence: 'His speech was full of grace and eloquence.' },
      { word: 'Empathy', meaning: 'The ability to understand and share the feelings of another', example_sentence: 'True leaders listen with deep empathy.' },
      { word: 'Haven', meaning: 'A place of safety, comfort, or refuge', example_sentence: 'A good friend is a haven during stressful times.' }
    ],
    quiz: {
      question: 'What lesson did Master Kavi teach about human communication?',
      options: ['People often just need to be heard and understood with empathy', 'You should always interrupt with quick advice', 'Talking more is always better than listening', 'Silence means you do not care'],
      answer: 'People often just need to be heard and understood with empathy'
    }
  },
  {
    level: 6,
    section: 'Chapter 2: Expansion & Courage',
    title: 'The Bridge Over Troubled Waters',
    category: 'English Story',
    readingTime: 5,
    sentences: [
      'Two neighboring farmers who had lived side by side in harmony for over twenty years had an unfortunate misunderstanding over a boundary fence.',
      'What began as a minor disagreement soon spiraled into bitter silence, angry glances, and months of complete alienation.',
      'One bright morning, an itinerant carpenter carrying a wooden toolbox knocked on the elder farmer\'s door looking for work.',
      'The elder farmer pointed across the wide stream dividing the two properties and said, "Look at my neighbor\'s field. I want you to build an eight-foot wooden wall so I never have to look at him again."',
      'The carpenter nodded quietly, measured the timber, and worked diligently from dawn until the evening sun began to dip behind the hills.',
      'When the farmer returned from town at sunset, his jaw dropped in astonishment; there was no wall standing between the properties.',
      'Instead, the carpenter had crafted a magnificent wooden footbridge arching gracefully over the rushing creek with smooth handrails.',
      'At that exact moment, the younger neighbor walked across the bridge with outstretched hands and tears in his eyes, saying, "You built a bridge after all I said! Forgive me, my friend."',
      'The two neighbors embraced warmly, realizing that building bridges of reconciliation is infinitely greater than erecting walls of pride.'
    ],
    vocab: [
      { word: 'Alienation', meaning: 'The state of feeling isolated or estranged from friends or family', example_sentence: 'Misunderstandings often create needless alienation.' },
      { word: 'Reconciliation', meaning: 'The restoration of friendly relations and harmony', example_sentence: 'The bridge brought about a heartfelt reconciliation.' },
      { word: 'Astonishment', meaning: 'Great surprise or immense wonder', example_sentence: 'He looked at the masterpiece in pure astonishment.' }
    ],
    quiz: {
      question: 'What did the carpenter build instead of the tall wall requested by the farmer?',
      options: ['A beautiful wooden footbridge connecting both farms', 'A brick fence', 'A watchtower', 'A deep trench'],
      answer: 'A beautiful wooden footbridge connecting both farms'
    }
  },
  {
    level: 7,
    section: 'Chapter 2: Expansion & Courage',
    title: 'The Potter and the Broken Vase',
    category: 'English Story',
    readingTime: 5,
    sentences: [
      'In a quiet workshop filled with spinning wheels and moist clay, an artisan named Dev devoted his life to crafting exquisite pottery.',
      'One afternoon, while setting a delicate blue vase on the upper drying shelf, his elbow slipped, sending the vessel crashing onto the stone floor.',
      'His young apprentice gasped in dismay and hurried to sweep the ceramic shards into the waste bin.',
      'Dev gently raised his hand to stop the apprentice and said, "Wait, my child. In our craft, a break is not the end of beauty; it is an invitation for rebirth."',
      'Dev carefully collected every fractured piece, prepared a shimmering adhesive mixed with pulverized gold powder, and began mending the vase piece by piece.',
      'For three days he worked with patient precision, highlighting every jagged crack with glittering golden veins.',
      'When the restored vase was finally fired in the kiln, the golden scars shone brilliantly, creating a visual masterpiece far more breathtaking than the original flawless piece.',
      'Dev handed the vase to his student and said, "Our human mistakes and struggles are like these cracks. When healed with resilience and love, they make us uniquely resilient and beautiful."'
    ],
    vocab: [
      { word: 'Exquisite', meaning: 'Extremely beautiful and delicate in workmanship', example_sentence: 'The potter created exquisite porcelain cups.' },
      { word: 'Resilience', meaning: 'The capacity to recover quickly from difficulties and trauma', example_sentence: 'True resilience transforms adversity into strength.' },
      { word: 'Pulverized', meaning: 'Reduced to fine particles or powder', example_sentence: 'He mixed pulverized gold into the lacquer.' }
    ],
    quiz: {
      question: 'How did the potter mend the broken ceramic vase?',
      options: ['Using a special adhesive infused with shimmering gold powder', 'He threw it in the trash', 'He glued it with cheap tape', 'He hid it in a dark closet'],
      answer: 'Using a special adhesive infused with shimmering gold powder'
    }
  },
  {
    level: 8,
    section: 'Chapter 2: Expansion & Courage',
    title: 'The Courage to Speak Your Truth',
    category: 'English Story',
    readingTime: 5,
    sentences: [
      'Siddharth was a brilliant engineering student, but public speaking filled his throat with paralyzing dread and made his hands tremble.',
      'Whenever the professor asked for volunteers to present seminar topics, Siddharth would stare intently at his desk, wishing to be invisible.',
      'One semester, his college announced a flagship campus innovation contest where the winner would receive funding to launch a green energy startup.',
      'Siddharth had spent two years designing an ultra-efficient solar irrigation pump that could help rural farmers save thousands of rupees.',
      'He knew that if he allowed his stage fright to hold him back, his breakthrough invention would remain locked inside his laptop forever.',
      'For two weeks, he stood before the mirror every morning, practicing his pitch sentence by sentence, controlling his breathing, and speaking with clarity.',
      'When his name was called in the packed auditorium, his heart pounded violently, but he stepped firmly up to the podium and looked the audience in the eye.',
      'As he began explaining how his solar pump could transform farmers\' lives, his passion overpowered his fear, and his voice rang out with powerful resonance.',
      'The auditorium erupted in thunderous applause, and Siddharth learned that real courage is not the absence of fear, but taking action in spite of it.'
    ],
    vocab: [
      { word: 'Paralyzing', meaning: 'Causing an inability to act or function due to extreme fear', example_sentence: 'He overcame his paralyzing stage fright with dedicated practice.' },
      { word: 'Resonance', meaning: 'The quality of being loud, clear, and deeply echoing', example_sentence: 'Her inspiring words had great resonance with the team.' },
      { word: 'Innovation', meaning: 'The introduction of something new and transformative', example_sentence: 'Clean solar innovation is vital for the planet.' }
    ],
    quiz: {
      question: 'How did Siddharth overcome his fear of public speaking?',
      options: ['By practicing in front of a mirror daily and focusing on his passion to help farmers', 'By asking a friend to speak on his behalf', 'By running away from the auditorium', 'By cancelling his project presentation'],
      answer: 'By practicing in front of a mirror daily and focusing on his passion to help farmers'
    }
  },
  {
    level: 9,
    section: 'Chapter 2: Expansion & Courage',
    title: 'The Wisdom of the Empty Teacup',
    category: 'English Story',
    readingTime: 5,
    sentences: [
      'A distinguished professor from an elite university traveled to a remote monastery to interview an enlightened Zen master.',
      'As soon as the professor sat down, he began boasting about his numerous publications, academic degrees, and intricate philosophies.',
      'The Zen master listened patiently, smiled warmly, and offered to prepare a hot kettle of green tea for their conversation.',
      'He placed a ceramic teacup before the professor and began pouring the steaming liquid from the clay teapot.',
      'The tea filled the cup to the brim, but the master continued pouring steadily without pause.',
      'The hot tea spilled over the edges, pouring across the saucer, soaking the wooden table, and dripping onto the professor\'s trousers.',
      '"Stop pouring! The cup is completely full; no more can possibly go in!" the exasperated professor cried out.',
      'The Zen master set the teapot down and said calmly, "Like this teacup, your mind is overflowing with your own opinions and pride. How can I offer you wisdom unless you first empty your cup?"',
      'The professor bowed in humble realization, understanding that true learning begins with the humility to admit what you do not know.'
    ],
    vocab: [
      { word: 'Distinguished', meaning: 'Recognized for excellence and high achievement', example_sentence: 'A distinguished scholar visited the campus yesterday.' },
      { word: 'Exasperated', meaning: 'Intensely irritated and frustrated', example_sentence: 'He gave an exasperated sigh when the tea spilled.' },
      { word: 'Humility', meaning: 'A modest or low view of one\'s own importance; freedom from pride', example_sentence: 'True mastery is always accompanied by humility.' }
    ],
    quiz: {
      question: 'What did the overflowing teacup symbolize in the Zen master\'s demonstration?',
      options: ['A mind too full of its own pride and preconceptions to learn anything new', 'A careless tea server', 'The high price of green tea', 'A broken teacup that needed repair'],
      answer: 'A mind too full of its own pride and preconceptions to learn anything new'
    }
  },
  {
    level: 10,
    section: 'Chapter 2: Expansion & Courage',
    title: 'The Symphony of the Forest Birds',
    category: 'English Story',
    readingTime: 5,
    sentences: [
      'Deep inside the sanctuary of a lush tropical rainforest, hundreds of different bird species lived in harmonious coexistence.',
      'One spring morning, a young nightingale felt deeply discouraged because its plumage was plain brown, unlike the dazzling peacock or the emerald parrot.',
      '"Why was I born with such drab feathers? Nobody stops to admire my appearance," the nightingale lamented to an old owl perched in the oak tree.',
      'The wise owl blinked his golden eyes and answered softly, "The peacock paints the sky with color, but the forest awaits your melody to greet the dawn."',
      'Encouraged by the owl\'s counsel, the nightingale flew to the highest branch as the first golden rays of sunlight broke over the horizon.',
      'The little bird opened its throat and poured out a cascade of sweet, crystalline notes that echoed through the emerald canopy.',
      'The deer stopped grazing, the rushing river seemed to soften its roar, and every creature in the forest listened in spellbound wonder.',
      'The nightingale realized that true worth is not found in competing with others\' gifts, but in joyfully sharing your own unique voice with the world.'
    ],
    vocab: [
      { word: 'Plumage', meaning: 'A bird\'s feathers collectively', example_sentence: 'The peacock showed off its iridescent plumage.' },
      { word: 'Spellbound', meaning: 'Holding someone\'s complete attention as if by magic', example_sentence: 'The audience sat spellbound by the performance.' },
      { word: 'Harmonious', meaning: 'Forming a pleasing or consistent whole; free from conflict', example_sentence: 'They lived together in harmonious peace.' }
    ],
    quiz: {
      question: 'What unique gift did the little nightingale possess?',
      options: ['A breathtakingly sweet, crystalline singing voice', 'Bright colorful feathers', 'Great flying speed', 'The ability to swim underwater'],
      answer: 'A breathtakingly sweet, crystalline singing voice'
    }
  },
  {
    level: 11,
    section: 'Chapter 3: Mastery & Triumph',
    title: 'The Great Marathon of Life',
    category: 'English Story',
    readingTime: 6,
    sentences: [
      'Forty-two kilometers of unforgiving asphalt stretched ahead under the blistering heat of the morning sun in the International Marathon.',
      'Karan had trained rigorously for six grueling months, waking up at 4:30 AM every day regardless of rain, exhaustion, or cold weather.',
      'By the thirty-second kilometer mark, a notorious barrier known among marathoners as "The Wall," Karan\'s legs burned with intense lactic acid.',
      'Every muscle in his body screamed for him to stop, sit down on the curb, and surrender to the overwhelming physical pain.',
      'Beside him, another runner stumbled and fell to his knees on the pavement, clutching his cramped calf in anguish.',
      'Karan paused for a split second, fought through his own agonizing exhaustion, and reached down to pull his fallen competitor to his feet.',
      '"We are finishing this together, brother. One step at a time," Karan whispered through clenched teeth.',
      'Supporting each other with locked arms, the two runners pushed forward stride by stride past roaring crowds of cheering spectators.',
      'When they crossed the finish line side by side, Karan did not set a world record, but he earned the deepest medal of honor: human compassion.',
      'He realized that true champions are not measured solely by how fast they cross the finish line, but by how many others they help along the way.'
    ],
    vocab: [
      { word: 'Grueling', meaning: 'Extremely tiring and demanding', example_sentence: 'Marathon training is a grueling physical test.' },
      { word: 'Anguish', meaning: 'Severe mental or physical pain or suffering', example_sentence: 'He cried out in anguish when his leg cramped.' },
      { word: 'Compassion', meaning: 'Sympathetic pity and concern for the sufferings of others', example_sentence: 'Acts of compassion define our true humanity.' }
    ],
    quiz: {
      question: 'What did Karan do when his fellow competitor collapsed during the marathon?',
      options: ['He stopped and helped his competitor finish the race together', 'He ran past him to win first place', 'He sat down and quit the race', 'He called a taxi to take them home'],
      answer: 'He stopped and helped his competitor finish the race together'
    }
  },
  {
    level: 12,
    section: 'Chapter 3: Mastery & Triumph',
    title: 'The Architect of Unshakable Dreams',
    category: 'English Story',
    readingTime: 6,
    sentences: [
      'Growing up in a modest village where electricity arrived only three hours a night, Priya dreamed of designing sustainable cities.',
      'People in her neighborhood scoffed at her sketches, telling her that girls from small towns should aim for safe, ordinary jobs.',
      'Priya refused to let their limited imaginations define the boundaries of her future destiny.',
      'She studied by the flickering glow of kerosene lamps, worked part-time as a tutor to pay for her college tuition, and submitted blueprint after blueprint.',
      'Her initial architecture proposals were rejected by five top engineering firms, with feedback calling her eco-friendly designs "unrealistic".',
      'Instead of succumbing to bitter disappointment, Priya meticulously analyzed every critique, refined her mathematical models, and improved her structural formulas.',
      'Two years later, she entered a global competition to design a zero-carbon, disaster-resilient community housing project.',
      'Her revolutionary design not only claimed first prize globally, but was chosen to be built for thousands of families in flood-prone coastal regions.',
      'Standing at the groundbreaking ceremony of her project, Priya looked at the rising foundations with tears of quiet joy.',
      'She told the young girls gathered in the audience: "Never shrink your dreams to fit someone else\'s small mind; build a foundation strong enough to carry your vision."'
    ],
    vocab: [
      { word: 'Sustainable', meaning: 'Able to be maintained at a certain rate without depleting natural resources', example_sentence: 'Solar and wind energy provide sustainable power.' },
      { word: 'Meticulously', meaning: 'In a way that shows great attention to detail; very thoroughly', example_sentence: 'She meticulously reviewed every single line of code.' },
      { word: 'Resilient', meaning: 'Able to withstand or recover quickly from difficult conditions', example_sentence: 'The new buildings are resilient against natural disasters.' }
    ],
    quiz: {
      question: 'What was Priya\'s award-winning architectural achievement?',
      options: ['A zero-carbon, disaster-resilient community housing project', 'A luxury shopping mall', 'A private palace for kings', 'A gold-plated bridge'],
      answer: 'A zero-carbon, disaster-resilient community housing project'
    }
  },
  {
    level: 13,
    section: 'Chapter 3: Mastery & Triumph',
    title: 'The Silent Melody of the Deaf Violinist',
    category: 'English Story',
    readingTime: 6,
    sentences: [
      'At the age of eleven, Tara suffered an acute viral infection that permanently destroyed her physical hearing.',
      'For a girl whose entire heart was wrapped in classical violin music, the silence felt like an endless, suffocating darkness.',
      'Doctors gently advised her family to help her transition away from music, believing it was impossible for a deaf person to play an instrument.',
      'Tara refused to accept that her musical journey was over; she removed her shoes and stood barefoot on the wooden stage floor.',
      'She discovered that although her ears could no longer process sound waves, her entire body could feel the acoustic vibrations traveling through the floorboards.',
      'She felt the deep, resonant thrum of the G-string in her chest, and the sharp, bright pulse of the E-string in the soles of her feet.',
      'For eight years she practiced ten hours a day, calibrating her fingers with flawless muscle memory and absolute sensory intuition.',
      'When she made her debut as the solo violinist with the Royal Philharmonic Orchestra, the hall stood in stunned, breathless reverence.',
      'Her violin wept, soared, and sang with an emotional depth that transcended ordinary sound, bringing the entire audience to a standing ovation.',
      'Tara proved to the world that true music does not originate in the ears, but resonates from the boundless depths of the human spirit.'
    ],
    vocab: [
      { word: 'Acoustic', meaning: 'Relating to sound or the sense of hearing', example_sentence: 'The concert hall had superior acoustic qualities.' },
      { word: 'Intuition', meaning: 'The ability to understand something instinctively without conscious reasoning', example_sentence: 'Her sensory intuition guided her violin bow.' },
      { word: 'Transcended', meaning: 'Surpassed or went beyond the limits of something', example_sentence: 'Her breathtaking performance transcended all boundaries.' }
    ],
    quiz: {
      question: 'How did Tara play the violin with flawless precision without hearing?',
      options: ['By feeling the acoustic vibrations through the wooden floorboards with her bare feet', 'By reading subtitles on a screen', 'By having someone signal her with lights', 'She used automatic playback'],
      answer: 'By feeling the acoustic vibrations through the wooden floorboards with her bare feet'
    }
  },
  {
    level: 14,
    section: 'Chapter 3: Mastery & Triumph',
    title: 'The Spark That Ignited the Stars',
    category: 'English Story',
    readingTime: 6,
    sentences: [
      'Far in the arid heartland of rural Rajasthan, a drought-stricken village struggled with dwindling groundwater and barren fields.',
      'Young engineer Rajesh returned to his ancestral home after completing his master\'s degree in water management.',
      'The village elders were skeptical of modern machinery, convinced that ancestral rituals were the only remedy for rainfall.',
      'Rather than arguing with their beliefs, Rajesh respectfully invited the village youth to participate in a communal experiment.',
      'Together, they built check dams across the seasonal dry gullies, planted thousands of deep-rooted native vetiver grass plants, and dug recharge wells.',
      'When the monsoon rains finally arrived in July, the water did not wash away the fertile topsoil as it usually did.',
      'Instead, the check dams slowed the rushing torrents, allowing billions of liters of pristine rainwater to seep deep into the underground aquifers.',
      'By October, the dry village wells were brimming with sweet, clean water, and the barren fields transformed into lush green pastures.',
      'The elders gathered to thank Rajesh, declaring him not just an engineer, but a true protector of their heritage and land.',
      'Rajesh smiled and said, "Science and tradition are not enemies; when combined with love for your people, they can turn deserts into gardens."'
    ],
    vocab: [
      { word: 'Aquifer', meaning: 'A body of permeable rock that can contain or transmit groundwater', example_sentence: 'The rainwater recharged the underground aquifer.' },
      { word: 'Skeptical', meaning: 'Not easily convinced; having doubts or reservations', example_sentence: 'The elders were skeptical of new technology at first.' },
      { word: 'Communal', meaning: 'Shared by all members of a community for common use', example_sentence: 'They organized a communal tree-planting campaign.' }
    ],
    quiz: {
      question: 'How did Rajesh restore groundwater in his drought-stricken village?',
      options: ['By building check dams, planting vetiver grass, and creating rainwater recharge wells', 'By buying bottled water from the city', 'By asking everyone to move to another state', 'By drilling oil wells'],
      answer: 'By building check dams, planting vetiver grass, and creating rainwater recharge wells'
    }
  },
  {
    level: 15,
    section: 'Chapter 3: Mastery & Triumph',
    title: 'The Eternal Flame of Knowledge',
    category: 'English Story',
    readingTime: 7,
    sentences: [
      'In a world increasingly driven by fleeting social media trends and rapid distractions, an elderly professor delivered his farewell lecture.',
      'Hundreds of alumni, scholars, and eager young students packed the grand wood-paneled hall to hear his final words of wisdom.',
      'The professor walked to the center of the stage holding a single lit candle in an ornate silver holder.',
      '"Many of you came to this university seeking degrees, lucrative careers, and worldly titles," the professor began in his resonant voice.',
      '"These achievements are commendable, but they are like transient shadows that fade when the sun sets."',
      'He invited ten students to the stage, each holding an unlit candle, and touched his flame to each of their wicks one by one.',
      'Within seconds, the entire auditorium glowed brightly with the warmth of eleven dancing golden flames.',
      '"Notice that my candle lost none of its brilliance by sharing its light with others; instead, our collective room became ten times brighter."',
      '"Knowledge, kindness, and truth operate on this exact spiritual law: the more you share, the richer the world becomes."',
      '"Go forth into your careers not merely to acquire wealth, but to be lanterns of hope, integrity, and progress in a world that deeply needs your light."',
      'The auditorium rose in unanimous standing ovation, carrying the eternal flame of knowledge forward into the future.'
    ],
    vocab: [
      { word: 'Transient', meaning: 'Lasting only for a short time; impermanent', example_sentence: 'Material fame is transient, but good character lasts forever.' },
      { word: 'Commendable', meaning: 'Deserving praise and admiration', example_sentence: 'Her dedication to social service is truly commendable.' },
      { word: 'Unanimous', meaning: 'Fully in agreement or held by everyone', example_sentence: 'The proposal received a unanimous vote of approval.' }
    ],
    quiz: {
      question: 'What lesson did the professor demonstrate with the candle flame?',
      options: ['Sharing knowledge and kindness never diminishes your own light; it illuminates the whole world', 'Candles are better than electric lights', 'Only one person can hold the light at a time', 'You should keep your knowledge secret from others'],
      answer: 'Sharing knowledge and kindness never diminishes your own light; it illuminates the whole world'
    }
  }
];

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
