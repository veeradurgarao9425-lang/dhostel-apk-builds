import db from './config/database.js';

export async function seedBulkGrowthStories() {
  console.log('[BulkSeed] Starting full-page bulk growth stories seeding...');

  try {
    // 1. Ensure path 'daily_conversations' exists
    let convPath = await db('growth_paths').where({ path_key: 'daily_conversations' }).first();
    if (!convPath) {
      const [id] = await db('growth_paths').insert({
        path_key: 'daily_conversations',
        name: 'Daily Conversations',
        emoji: '🗣️',
        description: 'Practice everyday spoken English dialogues with Durgarao & Bhanu',
        sort_order: 1,
        is_active: 1,
        color_hex: '#3B82F6',
      });
      convPath = { path_id: id };
    } else {
      await db('growth_paths').where({ path_id: convPath.path_id }).update({ is_active: 1, name: 'Daily Conversations' });
    }

    // 2. Ensure path 'love_stories' exists
    let lovePath = await db('growth_paths').where({ path_key: 'love_stories' }).first();
    if (!lovePath) {
      const [id] = await db('growth_paths').insert({
        path_key: 'love_stories',
        name: 'Love Stories',
        emoji: '💕',
        description: 'Heartfelt, sweet full-page stories in simple English',
        sort_order: 2,
        is_active: 1,
        color_hex: '#F43F5E',
      });
      lovePath = { path_id: id };
    } else {
      await db('growth_paths').where({ path_id: lovePath.path_id }).update({ is_active: 1 });
    }

    const conversationsData = [
      {
        level: 1,
        title: 'Morning Greetings & Checking In',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Hi Hello, how are you Bhanu?',
          'Bhanu: I am good Durga! What about you?',
          'Durgarao: I am doing great today. Did you sleep well last night?',
          'Bhanu: Yes Durga, the room was very peaceful. Did you have your breakfast?',
          'Durgarao: Not yet Bhanu! What was cooked in the hostel mess today?',
          'Bhanu: They prepared hot idli, vada, and coconut chutney today. It was very delicious!',
          'Durgarao: That sounds delicious! Let us go to the dining hall together.',
          'Bhanu: Sure Durga, I will join you while you eat. We have our first class at 9 AM.',
          'Durgarao: Thanks Bhanu! After class, let us practice our Spoken English lessons.',
          'Bhanu: Great idea Durga! Daily conversation practice builds our confidence.',
          'Durgarao: Absolutely Bhanu, practicing every morning makes us fluent quickly.',
          'Bhanu: Let us head out to college now Durga!'
        ],
        vocab: [
          { word: 'Greeting', meaning: 'A polite word or sign of welcome', example_sentence: 'A warm greeting starts the day well.' },
          { word: 'Delicious', meaning: 'Highly pleasant to the taste', example_sentence: 'The hostel breakfast was delicious.' },
          { word: 'Confidence', meaning: 'A feeling of self-assurance arising from appreciation of abilities', example_sentence: 'Daily practice builds confidence.' }
        ],
        quiz: {
          question: 'What was cooked in the hostel mess for breakfast?',
          options: ['Idli, vada, and coconut chutney', 'Puri and curry', 'Dosa and sambar', 'Bread and butter'],
          answer: 'Idli, vada, and coconut chutney'
        }
      },
      {
        level: 2,
        title: 'Ordering Food at a Restaurant',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, what would you like to order for dinner tonight?',
          'Bhanu: I am feeling like eating butter paneer and garlic naan!',
          'Durgarao: Great choice! Waiter, please bring two plates of paneer butter masala and four garlic naans.',
          'Bhanu: Also bring two cold sweet mango lassis for us please!',
          'Durgarao: How long will it take to prepare the order?',
          'Bhanu: The waiter said it will take about 15 minutes, Durga.',
          'Durgarao: Perfect. The ambience of this restaurant is really nice and relaxing.',
          'Bhanu: Yes Durga, the music and lighting are wonderful.',
          'Durgarao: Here comes our hot paneer masala and fresh garlic naans!',
          'Bhanu: Smell how aromatic it is! Let us start eating Durga.',
          'Durgarao: The food tastes incredible, Bhanu!',
          'Bhanu: Indeed Durga, we must visit this restaurant again next week.'
        ],
        vocab: [
          { word: 'Ambience', meaning: 'The character and atmosphere of a place', example_sentence: 'The restaurant has a relaxing ambience.' },
          { word: 'Aromatic', meaning: 'Having a pleasant and distinctive smell', example_sentence: 'The garlic naan was very aromatic.' }
        ],
        quiz: {
          question: 'What drink did Bhanu order at the restaurant?',
          options: ['Cold sweet mango lassi', 'Iced tea', 'Fruit juice', 'Cold coffee'],
          answer: 'Cold sweet mango lassi'
        }
      },
      {
        level: 3,
        title: 'Booking a Hotel Room',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Hello Bhanu, we need to book a hotel room for our upcoming weekend trip.',
          'Bhanu: Yes Durga! Let us check a clean and highly-rated hotel near the beach.',
          'Durgarao: I found one on the mobile app with free high-speed WiFi and complimentary breakfast.',
          'Bhanu: That sounds perfect! Are the room reviews positive?',
          'Durgarao: Yes, guest reviews mention spacious rooms, AC, and 24/7 room service.',
          'Bhanu: Excellent! Please confirm the room booking right away, Durga.',
          'Durgarao: I just completed the online payment for 2 nights.',
          'Bhanu: Did you receive the booking confirmation details on your email?',
          'Durgarao: Yes Durga! The hotel manager sent the confirmation voucher code.',
          'Bhanu: Fantastic! Our weekend trip is completely planned now.',
          'Durgarao: I am super excited for our beach vacation Bhanu!',
          'Bhanu: Me too Durga, it is going to be unforgettable!'
        ],
        vocab: [
          { word: 'Complimentary', meaning: 'Given free of charge as a courtesy', example_sentence: 'The hotel offers complimentary breakfast.' },
          { word: 'Confirmation', meaning: 'Written verification of a reservation', example_sentence: 'I received the hotel room confirmation code.' }
        ],
        quiz: {
          question: 'How many nights did Durgarao book the hotel room for?',
          options: ['2 nights', '1 night', '5 nights', '7 nights'],
          answer: '2 nights'
        }
      },
      {
        level: 4,
        title: 'Planning a Weekend Movie Outing',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Hey Bhanu, are you free this Sunday evening for an outing?',
          'Bhanu: Yes Durga, I do not have any classes or exams. What is the plan?',
          'Durgarao: Let us go watch the new blockbuster action movie at the city multiplex!',
          'Bhanu: Awesome! I heard the visual effects and songs are mind-blowing.',
          'Durgarao: Should we book executive seats or recliner chairs?',
          'Bhanu: Let us select recliner chairs for maximum comfort Durga!',
          'Durgarao: Great, please check seat availability for the 6 PM show.',
          'Bhanu: Middle row seats are available! I am booking two tickets right now.',
          'Durgarao: Perfect! Let us also get large popcorn and Pepsi during intermission.',
          'Bhanu: Popcorn is a must-have for any movie experience Durga!',
          'Durgarao: Let us leave the hostel by 5:15 PM so we do not miss the trailers.',
          'Bhanu: Agreed Durga, see you at the hostel entrance!'
        ],
        vocab: [
          { word: 'Blockbuster', meaning: 'A thing of great power or popularity, especially a movie', example_sentence: 'They went to watch a blockbuster movie.' },
          { word: 'Intermission', meaning: 'A pause or break between parts of a movie or performance', example_sentence: 'We bought popcorn during the intermission.' }
        ],
        quiz: {
          question: 'What time is the movie show they booked tickets for?',
          options: ['6 PM', '9 AM', '3 PM', '10 PM'],
          answer: '6 PM'
        }
      },
      {
        level: 5,
        title: 'Hostel Rent & Payment Proof Upload',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, did you pay the monthly hostel rent fee for this month?',
          'Bhanu: Not yet Durga, today is the due date. I will transfer it through UPI right now.',
          'Durgarao: Okay good. Make sure to download the UPI payment receipt screenshot!',
          'Bhanu: Why is the screenshot needed Durga?',
          'Durgarao: You need to upload the payment proof inside our Hostix hostel app.',
          'Bhanu: How do I upload the proof inside the app Durga?',
          'Durgarao: Go to the Payment section, tap Upload Proof, attach the image, and submit.',
          'Bhanu: Okay Durga! I just completed the UPI transfer and attached the proof screenshot.',
          'Durgarao: Excellent! The owner gets an instant real-time notification on their phone.',
          'Bhanu: That is so convenient Durga! Online verification saves paper receipts.',
          'Durgarao: Yes Bhanu, Hostix app makes hostel living so smooth and transparent.',
          'Bhanu: Thanks for guiding me Durga!'
        ],
        vocab: [
          { word: 'Screenshot', meaning: 'An image of the data displayed on a screen', example_sentence: 'Attach the payment screenshot as proof.' },
          { word: 'Transparent', meaning: 'Easy to perceive or detect; clear', example_sentence: 'Digital record keeping keeps fees transparent.' }
        ],
        quiz: {
          question: 'What app do tenants use to upload rent payment proof?',
          options: ['Hostix app', 'WhatsApp', 'Email', 'Browser search'],
          answer: 'Hostix app'
        }
      },
      {
        level: 6,
        title: 'Asking for Directions in Town',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Excuse me Bhanu, do you know where the central bus terminal is located?',
          'Bhanu: Yes Durga! Walk straight along this main road for 200 meters.',
          'Durgarao: What landmark should I look for after 200 meters?',
          'Bhanu: You will see a tall clock tower. Take a left turn right at the clock tower.',
          'Durgarao: Is the bus terminal walkable or should I take an auto-rickshaw?',
          'Bhanu: It is very close Durga, you can easily reach there on foot in 5 minutes!',
          'Durgarao: Are express buses to Vijayawada available from platform number 3?',
          'Bhanu: Yes Durga, Vijayawada buses depart every 15 minutes from platform 3.',
          'Durgarao: Thank you so much Bhanu for the clear directions!',
          'Bhanu: You are welcome Durga! Have a safe travel.',
          'Durgarao: I will call you once I reach my destination.',
          'Bhanu: Sure Durga, take care!'
        ],
        vocab: [
          { word: 'Landmark', meaning: 'An easily recognizable feature of a landscape', example_sentence: 'The clock tower is a famous city landmark.' },
          { word: 'Destination', meaning: 'The place to which someone or something is going', example_sentence: 'He reached his destination safely.' }
        ],
        quiz: {
          question: 'Which platform do express buses to Vijayawada depart from?',
          options: ['Platform 3', 'Platform 1', 'Platform 10', 'Platform 7'],
          answer: 'Platform 3'
        }
      },
      {
        level: 7,
        title: 'Job Interview Preparation',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, I have a big job interview with a multinational company tomorrow morning!',
          'Bhanu: Wow, congratulations Durga! That is a fantastic opportunity.',
          'Durgarao: I am feeling a bit nervous about the technical round.',
          'Bhanu: Stay calm Durga! Practice answering common questions with confidence.',
          'Durgarao: What clothes should I wear for the interview Bhanu?',
          'Bhanu: Wear a crisp formal shirt, dark trousers, and polished black shoes.',
          'Durgarao: Should I wear a blazer as well?',
          'Bhanu: Yes Durga, formal attire creates a highly professional impression.',
          'Durgarao: How should I introduce myself during the initial greeting?',
          'Bhanu: Smile, maintain eye contact, give a firm handshake, and speak clearly Durga.',
          'Durgarao: Thank you for your invaluable tips and encouragement Bhanu!',
          'Bhanu: All the best Durga, I know you will crack the interview!'
        ],
        vocab: [
          { word: 'Opportunity', meaning: 'A set of circumstances that makes it possible to do something', example_sentence: 'This interview is a great career opportunity.' },
          { word: 'Professional', meaning: 'Relating to or connected with a profession', example_sentence: 'Formal attire gives a professional look.' }
        ],
        quiz: {
          question: 'What shoe color did Bhanu recommend for the interview?',
          options: ['Polished black shoes', 'White sneakers', 'Red shoes', 'Sandals'],
          answer: 'Polished black shoes'
        }
      },
      {
        level: 8,
        title: 'Shopping for New Clothes',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, look at this navy blue casual jacket! How does it look on me?',
          'Bhanu: It looks super stylish on you Durga! The color and fit suit you perfectly.',
          'Durgarao: Thanks Bhanu! Let me check the price tag before making a decision.',
          'Bhanu: The tag says 2000 rupees, but look at the banner above!',
          'Durgarao: What does the banner say Bhanu?',
          'Bhanu: There is a special 25 percent weekend discount on all men jackets today!',
          'Durgarao: That means the price drops to 1500 rupees! What a great deal.',
          'Bhanu: You should also try matching denim jeans Durga.',
          'Durgarao: Good idea! I will try these dark blue jeans in the fitting room.',
          'Bhanu: The combination looks top notch Durga!',
          'Durgarao: Let us proceed to the billing counter to pay.',
          'Bhanu: Shopping during sale discount season is always smart Durga!'
        ],
        vocab: [
          { word: 'Discount', meaning: 'A deduction from the usual cost of something', example_sentence: 'We bought the jacket at a 25 percent discount.' },
          { word: 'Combination', meaning: 'A joining or merging of different parts', example_sentence: 'The shirt and jacket combination looks great.' }
        ],
        quiz: {
          question: 'What was the discounted price of the navy blue jacket?',
          options: ['1500 rupees', '2000 rupees', '3000 rupees', '500 rupees'],
          answer: '1500 rupees'
        }
      },
      {
        level: 9,
        title: 'Fitness & Morning Routine',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, do you go to the gym every single morning?',
          'Bhanu: Yes Durga! I exercise for one hour daily to stay healthy and energetic.',
          'Durgarao: What exercises do you perform during your morning workout?',
          'Bhanu: I start with 15 minutes of cardio, followed by weight training and stretching.',
          'Durgarao: That is so inspiring! I want to join you from tomorrow morning.',
          'Bhanu: You are most welcome Durga! Morning workouts give fantastic energy for the whole day.',
          'Durgarao: What time do you wake up every day Bhanu?',
          'Bhanu: I wake up at 5:30 AM, drink a glass of warm water, and reach the gym by 6:00 AM.',
          'Durgarao: Setting a discipline routine is truly transformational.',
          'Bhanu: Absolutely Durga! Physical fitness keeps your mind sharp and active.',
          'Durgarao: Set your alarm for 5:30 AM Durga, I will knock on your door!',
          'Bhanu: Deal Durga! See you tomorrow morning at 6:00 AM.'
        ],
        vocab: [
          { word: 'Discipline', meaning: 'The practice of training oneself to obey rules or code of behavior', example_sentence: 'Daily discipline leads to long-term success.' },
          { word: 'Transformational', meaning: 'Causing a marked change in form, nature, or appearance', example_sentence: 'Regular exercise is transformational.' }
        ],
        quiz: {
          question: 'What time does Bhanu wake up every morning?',
          options: ['5:30 AM', '8:00 AM', '10:00 AM', '4:00 AM'],
          answer: '5:30 AM'
        }
      },
      {
        level: 10,
        title: 'Planning a Birthday Surprise',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, tomorrow is our hostel roommate Ramesh birthday!',
          'Bhanu: Yes Durga! We must organize a grand surprise birthday celebration for him.',
          'Durgarao: What type of cake should we order from the bakery?',
          'Bhanu: Ramesh loves dark chocolate fudge cake! Let us order a 2 kg chocolate cake.',
          'Durgarao: I will decorate the hostel common room with colorful balloons and party lights.',
          'Bhanu: Should we invite all our hostel friends for the midnight cake cutting?',
          'Durgarao: Yes Durga, everyone in our floor wants to celebrate Ramesh special day.',
          'Bhanu: Let us collect small contributions from everyone to buy him a wrist watch gift.',
          'Durgarao: That is a wonderful gift idea Bhanu! He will love a stylish watch.',
          'Bhanu: Keep everything confidential until the clock strikes 12 midnight!',
          'Durgarao: Don not worry Durga, Ramesh has no clue about the surprise party!',
          'Bhanu: It is going to be an unforgettable birthday night Durga!'
        ],
        vocab: [
          { word: 'Confidential', meaning: 'Intended to be kept secret', example_sentence: 'Keep the surprise party details confidential.' },
          { word: 'Contribution', meaning: 'A gift or payment to a common fund', example_sentence: 'Everyone made a small contribution for the gift.' }
        ],
        quiz: {
          question: 'What gift did Durgarao and Bhanu plan to buy for Ramesh?',
          options: ['A wrist watch', 'A mobile phone', 'A pair of shoes', 'A book'],
          answer: 'A wrist watch'
        }
      },
      {
        level: 11,
        title: 'Study & Exam Discussion',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, can you explain this difficult computer science algorithm to me?',
          'Bhanu: Sure Durga! It looks complex initially, but it becomes simple once you grasp the core logic.',
          'Durgarao: How does the algorithm process data step-by-step?',
          'Bhanu: First, it splits the input data into smaller parts, sorts them, and merges them back together.',
          'Durgarao: Ah, I see! That is why it is called a Divide and Conquer technique.',
          'Bhanu: Exactly Durga! You understood the key concept quickly.',
          'Durgarao: Thanks a lot Bhanu, your step-by-step explanation made it so clear.',
          'Bhanu: Practice solving 3 coding problems on this topic tonight Durga.',
          'Durgarao: Yes Bhanu, hands-on practice builds solid memory.',
          'Bhanu: If you face any doubts while coding, feel free to ask me.',
          'Durgarao: You are a great study partner Bhanu!',
          'Bhanu: Helping each other makes us both excel in exams Durga!'
        ],
        vocab: [
          { word: 'Algorithm', meaning: 'A process or set of rules to be followed in calculations', example_sentence: 'The computer science algorithm runs efficiently.' },
          { word: 'Excel', meaning: 'Be exceptionally good at an activity or subject', example_sentence: 'Group study helps students excel in exams.' }
        ],
        quiz: {
          question: 'What problem-solving technique did Bhanu explain to Durgarao?',
          options: ['Divide and Conquer technique', 'Random guessing', 'Linear search only', 'Manual counting'],
          answer: 'Divide and Conquer technique'
        }
      },
      {
        level: 12,
        title: 'Monsoon Rain & Hot Tea',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Look outside the window Bhanu, heavy monsoon rain has started!',
          'Bhanu: Wow Durga, the cool breeze and smell of wet earth feel so peaceful.',
          'Durgarao: Rain weather always makes me crave hot drinks and snacks.',
          'Bhanu: Let us prepare freshly brewed ginger tea and crispy onion pakoras!',
          'Durgarao: That is the ultimate monsoon combination Bhanu! I will crush fresh ginger.',
          'Bhanu: And I will slice onions and mix chickpea flour for pakoras.',
          'Durgarao: The kitchen aroma is already mouth-watering Durga!',
          'Bhanu: Here is your steaming cup of ginger tea Durga, enjoy!',
          'Durgarao: Ah, this hot tea tastes heavenly in this rainy weather Bhanu.',
          'Bhanu: Sitting near the balcony watching rain while sipping tea is pure bliss.',
          'Durgarao: Simple pleasures of life bring the greatest joy Durga.',
          'Bhanu: True words Bhanu, monsoon days are truly magical!'
        ],
        vocab: [
          { word: 'Soothing', meaning: 'Having a gently calming effect', example_sentence: 'The rain sounds are very soothing.' },
          { word: 'Combination', meaning: 'The joining or merging of different parts', example_sentence: 'Tea and pakoras are a great monsoon combination.' }
        ],
        quiz: {
          question: 'What snacks did Bhanu prepare during the monsoon rain?',
          options: ['Crispy onion pakoras', 'Potato chips', 'French fries', 'Biscuits'],
          answer: 'Crispy onion pakoras'
        }
      },
      {
        level: 13,
        title: 'Health & Doctor Consultation',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, I have been feeling a mild headache and tiredness since morning.',
          'Bhanu: Oh Durga, please take rest and drink plenty of warm fluids.',
          'Durgarao: I think working continuously on laptop screen caused eye strain.',
          'Bhanu: You should follow the 20-20-20 rule while working on digital screens Durga.',
          'Durgarao: What is the 20-20-20 rule Bhanu?',
          'Bhanu: Every 20 minutes, look at an object 20 feet away for 20 seconds to relax your eyes.',
          'Durgarao: That is a brilliant health tip Bhanu! I will start following it.',
          'Bhanu: If your headache persists till evening, we should visit the campus doctor.',
          'Durgarao: Yes, health should always be our top priority.',
          'Bhanu: Take a 30-minute power nap now Durga, you will feel refreshed.',
          'Durgarao: Thanks for caring about my health Bhanu!',
          'Bhanu: Get well soon Durga, take good care!'
        ],
        vocab: [
          { word: 'Continuously', meaning: 'Without interruption or cessation', example_sentence: 'Avoid working continuously without breaks.' },
          { word: 'Priority', meaning: 'A thing that is regarded as more important than another', example_sentence: 'Health is our highest priority.' }
        ],
        quiz: {
          question: 'What is the 20-20-20 rule used for?',
          options: ['Relaxing eye strain from digital screens', 'Weight loss', 'Cooking food', 'Running speed'],
          answer: 'Relaxing eye strain from digital screens'
        }
      },
      {
        level: 14,
        title: 'Festival Shopping & Diya Lighting',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, Diwali festival of lights is arriving next week!',
          'Bhanu: Yes Durga! The entire atmosphere is filled with joy and excitement.',
          'Durgarao: What traditional clothes are you planning to wear for Diwali?',
          'Bhanu: I am wearing a silk kurta pyjama for the evening puja, Durga.',
          'Durgarao: We should decorate our hostel main entrance with flower garlands and oil lamps.',
          'Bhanu: Yes! Lighting traditional earthen diyas brings warmth and positive energy.',
          'Durgarao: Let us also buy sweet boxes of kaju katli and gulab jamun for our friends.',
          'Bhanu: Sharing sweets with everyone doubles the festival happiness Durga.',
          'Durgarao: We will also make colorful rangoli designs at our doorway.',
          'Bhanu: Festival celebrations bring people together with unity and love.',
          'Durgarao: Wishing you and your family a bright and prosperous Diwali Bhanu in advance!',
          'Bhanu: Happy Diwali Durga! May this festival bring success and happiness.'
        ],
        vocab: [
          { word: 'Prosperous', meaning: 'Bringing wealth, success, or good fortune', example_sentence: 'We wish you a prosperous New Year.' },
          { word: 'Garland', meaning: 'A wreath of flowers and leaves worn or hung as decoration', example_sentence: 'They decorated the doorway with flower garlands.' }
        ],
        quiz: {
          question: 'What sweet did Bhanu plan to buy for Diwali?',
          options: ['Kaju katli and gulab jamun', 'Chocolate bar', 'Ice cream', 'Cake'],
          answer: 'Kaju katli and gulab jamun'
        }
      },
      {
        level: 15,
        title: 'Smartphones & App Development',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, look at this new hostel management mobile application!',
          'Bhanu: Wow Durga, the design is sleek and the response time is super fast!',
          'Durgarao: What features do you like the most in the app Bhanu?',
          'Bhanu: I love how tenants can track monthly dues, raise maintenance complaints, and view mess menus instantly.',
          'Durgarao: Owners also receive instant push notifications whenever a tenant uploads payment proof.',
          'Bhanu: That eliminates manual record-keeping and saves hours of administrative work.',
          'Durgarao: Software technology simplifies complex daily tasks effortlessly.',
          'Bhanu: Are you learning mobile app development in your college course Durga?',
          'Bhanu: Yes Durga! Learning React Native and Node.js enables building cross-platform apps.',
          'Durgarao: Developing practical apps that solve real-world problems is amazing.',
          'Bhanu: Keep building innovative projects Durga, tech skills are in high demand!',
          'Durgarao: Thanks for the encouragement Bhanu!'
        ],
        vocab: [
          { word: 'Cross-platform', meaning: 'Able to run on different operating systems e.g. Android and iOS', example_sentence: 'React Native builds cross-platform mobile apps.' },
          { word: 'Administrative', meaning: 'Relating to the running of a business or organization', example_sentence: 'Digital tools reduce administrative workload.' }
        ],
        quiz: {
          question: 'What mobile technology framework enables cross-platform app development?',
          options: ['React Native', 'Photoshop', 'MS Excel', 'Notepad'],
          answer: 'React Native'
        }
      },
      {
        level: 16,
        title: 'Train Journey Ticket Booking',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, did you check our train ticket confirmation status for hometown trip?',
          'Bhanu: Yes Durga! Both our train reservations got confirmed in AC 3-Tier coach!',
          'Durgarao: That is fantastic news! What time does the express train depart from platform 1?',
          'Bhanu: The train leaves at 9:30 PM tonight and reaches our destination by 6:00 AM tomorrow.',
          'Durgarao: Over-night sleeper train journeys are always so comfortable and relaxing.',
          'Bhanu: I will pack my travelling bag with clothes, charger, and water bottle.',
          'Durgarao: Should we pack home-made dinner boxes for the train journey?',
          'Bhanu: Yes Durga, eating fresh food on the train is better than pantry food.',
          'Durgarao: Let us reach the railway station 45 minutes before departure time.',
          'Bhanu: Arriving early prevents last-minute rush and stress Durga.',
          'Durgarao: Have a safe and happy journey Bhanu!',
          'Bhanu: Safe journey to you too Durga!'
        ],
        vocab: [
          { word: 'Reservation', meaning: 'An arrangement to have something kept for one use', example_sentence: 'Our train seat reservation is confirmed.' },
          { word: 'Departure', meaning: 'The action of leaving, especially to start a journey', example_sentence: 'Reach the station before train departure.' }
        ],
        quiz: {
          question: 'What time does the express train depart from the station?',
          options: ['9:30 PM', '6:00 AM', '12:00 PM', '4:00 PM'],
          answer: '9:30 PM'
        }
      },
      {
        level: 17,
        title: 'Spoken English Practice Tips',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, how do you speak Spoken English so fluently and naturally?',
          'Bhanu: I practice reading short stories out loud for 15 minutes every single day Durga!',
          'Durgarao: Does reading out loud help improve pronunciation and vocabulary?',
          'Bhanu: Yes Durga! Reading aloud trains your vocal muscles and builds natural speaking flow.',
          'Durgarao: What else do you do to practice English daily Bhanu?',
          'Bhanu: Whenever I learn a new vocabulary word, I immediately use it in a sentence while talking.',
          'Durgarao: That is a practical and effective learning strategy!',
          'Bhanu: Do not fear making small grammar mistakes while speaking Durga.',
          'Durgarao: Making mistakes is a natural part of the learning process.',
          'Bhanu: Exactly! Confidence grows through continuous speaking practice.',
          'Durgarao: I will dedicate 15 minutes every morning to English story reading.',
          'Bhanu: Consistency will make you a fluent speaker within weeks Durga!'
        ],
        vocab: [
          { word: 'Pronunciation', meaning: 'The way in which a word is pronounced', example_sentence: 'Reading out loud improves word pronunciation.' },
          { word: 'Consistency', meaning: 'The quality of always performing to a high standard', example_sentence: 'Consistency brings remarkable results.' }
        ],
        quiz: {
          question: 'What benefit does reading out loud provide?',
          options: ['Improves pronunciation and speaking flow', 'Improves sleeping', 'Helps cooking', 'Reduces memory'],
          answer: 'Improves pronunciation and speaking flow'
        }
      },
      {
        level: 18,
        title: 'Hostel Room Cleaning Day',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, let us clean and organize our hostel room together this weekend.',
          'Bhanu: Great initiative Durga! A clean room creates a peaceful environment for studying.',
          'Durgarao: How should we divide the room cleaning tasks between us?',
          'Bhanu: I will sweep and mop the floor while you dust the study desks and bookshelf.',
          'Durgarao: Perfect division of work! I will also change our bedsheets and pillow covers.',
          'Bhanu: Let us open the balcony windows to let fresh air and sunlight inside.',
          'Durgarao: Sunlight eliminates dust mites and keeps the room smelling fresh.',
          'Bhanu: I will also arrange all our shoes neatly on the shoe rack.',
          'Durgarao: Look at our room now Bhanu, it looks sparkling clean and organized!',
          'Bhanu: Teamwork makes big tasks look effortless Durga.',
          'Durgarao: A clean space keeps our mind organized and calm.',
          'Bhanu: Well done Durga, high five for great teamwork!'
        ],
        vocab: [
          { word: 'Initiative', meaning: 'The power or opportunity to act or take charge before others', example_sentence: 'Cleaning the room was a great initiative.' },
          { word: 'Effortless', meaning: 'Requiring no physical or mental exertion', example_sentence: 'Teamwork makes cleaning effortless.' }
        ],
        quiz: {
          question: 'What task did Durgarao handle during room cleaning?',
          options: ['Dusting study desks, bookshelf & changing bedsheets', 'Mopping the floor', 'Washing clothes', 'Cooking'],
          answer: 'Dusting study desks, bookshelf & changing bedsheets'
        }
      },
      {
        level: 19,
        title: 'Career Goals & Aspirations',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, what are your ultimate long-term career aspirations?',
          'Bhanu: I aspire to become a successful technology entrepreneur Durga!',
          'Durgarao: What kind of technology business do you plan to build Bhanu?',
          'Bhanu: I want to build software solutions that solve everyday challenges for students and hostels.',
          'Durgarao: That is a noble and high-impact vision Bhanu!',
          'Bhanu: What about your career goals Durga?',
          'Durgarao: I want to master Full-Stack Software Engineering and lead innovative engineering teams.',
          'Bhanu: You have great analytical skills Durga, you will excel as a Lead Engineer.',
          'Durgarao: Continuous learning and persistence are essential for achieving big goals.',
          'Bhanu: Hard work, dedication, and right mindset open every door of success.',
          'Durgarao: Let us keep inspiring each other toward excellence Bhanu!',
          'Bhanu: Always Durga! Success belongs to those who prepare today.'
        ],
        vocab: [
          { word: 'Aspiration', meaning: 'A hope or ambition of achieving something', example_sentence: 'Her career aspiration is to become an entrepreneur.' },
          { word: 'Persistence', meaning: 'Firm or obstinate continuance in a course of action', example_sentence: 'Persistence overcomes every obstacle.' }
        ],
        quiz: {
          question: 'What career role does Durgarao want to achieve?',
          options: ['Full-Stack Software Engineer', 'Doctor', 'Pilot', 'Civil Engineer'],
          answer: 'Full-Stack Software Engineer'
        }
      },
      {
        level: 20,
        title: 'Hostel Memories & Lifelong Friendship',
        category: 'Conversation',
        dialogue: [
          'Durgarao: Bhanu, hostel life has given me the most precious memories of my life with you.',
          'Bhanu: Me too Durga! Shared laughter, late-night study sessions, and tea talks created bond for life.',
          'Durgarao: Distance may separate us after college, but true friendship remains unchanged.',
          'Bhanu: True friends made during hostel days stay in our hearts forever Durga.',
          'Durgarao: Thank you for being such a supportive, kind, and inspiring roommate Bhanu.',
          'Bhanu: The pleasure is mine Durga, having a brotherly friend like you is a blessing.',
          'Durgarao: Let us promise to stay connected no matter where our careers take us.',
          'Bhanu: Promise Durga! We will catch up every week without fail.',
          'Durgarao: Good night my dear friend Bhanu, sleep well.',
          'Bhanu: Good night Durga! Sweet dreams and see you tomorrow morning.',
          'Durgarao: Good night Bhanu!',
          'Bhanu: Good night Durga!'
        ],
        vocab: [
          { word: 'Precious', meaning: 'Of great value; not to be wasted or treated carelessly', example_sentence: 'Hostel memories are precious.' },
          { word: 'Lifelong', meaning: 'Lasting through a person whole life', example_sentence: 'True friends share a lifelong connection.' }
        ],
        quiz: {
          question: 'What did Durgarao and Bhanu promise to each other?',
          options: ['To stay connected every week no matter where careers take them', 'To never talk again', 'To move to another country', 'To sell their books'],
          answer: 'To stay connected every week no matter where careers take them'
        }
      }
    ];

    const loveStoriesData = [
      {
        level: 1,
        title: 'The Cafe Window Note',
        category: 'Love Story',
        sentences: [
          'Every single afternoon at 5 PM, Rahul sat near the quiet corner window of the local cafe, immersed in reading classic literature novels.',
          'A young woman named Ananya with a gentle smile visited the cafe every day to purchase a hot cappuccino.',
          'Rahul never gathered the courage to speak to her directly, but her radiant smile brightened his entire day.',
          'One rainy Tuesday evening, as she got up to leave, she subtly left a small yellow napkin note on his table.',
          'When Rahul unfolded the napkin, he read a neatly written line: "I love your choice of books! Mind if I join your table tomorrow at 5 PM?"',
          'That simple napkin note marked the beginning of a sweet, lifelong love story.',
          'The next day, Rahul arrived 15 minutes early and waited anxiously near the window table.',
          'At exactly 5 PM, Ananya walked in wearing a soft blue cardigan, holding two cups of warm cappuccino.',
          'They sat together for hours, talking about poetry, childhood memories, and favorite places in the city.',
          'From that day on, 5 PM at the cafe became their sacred daily routine.',
          'Years passed, but every single afternoon at 5 PM, they still sat together by the window, sharing coffee and love.'
        ],
        vocab: [
          { word: 'Radiant', meaning: 'Sending out light or glowing with joy', example_sentence: 'Her radiant smile filled the room with warmth.' },
          { word: 'Subtly', meaning: 'In a delicate or understated manner', example_sentence: 'She subtly left a handwritten note on the table.' }
        ],
        quiz: {
          question: 'What was written on the yellow napkin note left by Ananya?',
          options: ['I love your choice of books! Mind if I join your table tomorrow at 5 PM?', 'Goodbye forever', 'Where is the exit?', 'Please pay for my coffee'],
          answer: 'I love your choice of books! Mind if I join your table tomorrow at 5 PM?'
        }
      },
      {
        level: 2,
        title: 'The Bus Stand Rain',
        category: 'Love Story',
        sentences: [
          'Standing under the crowded bus shelter during an unexpected heavy monsoon downpour, Arjun realized he had forgotten his umbrella in office.',
          'Raindrops splashed heavily around the glass shelter while cold wind blew across the street.',
          'Suddenly, a kind-hearted girl named Meera stepped closer and shared her large pink umbrella with him.',
          'They stood side-by-side waiting for the bus for 20 minutes, chatting about the soothing sound of rainfall, warm tea, and favorite monsoon memories.',
          'Meera mentioned how much she loved listening to rain while sipping hot chai.',
          'Arjun smiled and confessed that he always loved rainy days because they brought quiet peace to the busy city.',
          'By the time their bus arrived, shyness melted into happy laughter.',
          'Before boarding the bus, they exchanged contact numbers with warm promises to meet again for coffee.',
          'That rainy afternoon turned a simple bus wait into the most beautiful encounter of Arjun life.'
        ],
        vocab: [
          { word: 'Downpour', meaning: 'A heavy and sudden fall of rain', example_sentence: 'They stood under shelter during the monsoon downpour.' },
          { word: 'Soothing', meaning: 'Having a gently calming effect', example_sentence: 'The sound of raindrops is deeply soothing.' }
        ],
        quiz: {
          question: 'What color was Meera umbrella that she shared with Arjun?',
          options: ['Pink', 'Black', 'Blue', 'Green'],
          answer: 'Pink'
        }
      },
      {
        level: 3,
        title: 'Train Journey Eye Contact',
        category: 'Love Story',
        sentences: [
          'On an overnight train journey from Hyderabad to Vizag, two young travelers sat opposite each other near the window.',
          'As the train glided smoothly through green valley landscapes and golden sunset skies, their gazes met multiple times with quiet smiles.',
          'Neither spoke for hours, but a gentle unsaid connection filled the compartment.',
          'She was sketching scenery in her leather notebook, while he was listening to acoustic guitar melodies.',
          'When the train crossed a long bridge over a sparkling river, she showed him her sketch of the sunset.',
          'His eyes lit up with admiration as he complimented her beautiful artistic talent.',
          'Just as the train approached the final station platform, he gathered courage to say "Have a safe trip."',
          'She smiled shyly and handed him a small paper slip containing her phone number.',
          'Their quiet train journey became the start of an extraordinary bond.'
        ],
        vocab: [
          { word: 'Scenic', meaning: 'Providing picturesque natural scenery', example_sentence: 'The train journey offered scenic views of green valleys.' },
          { word: 'Compartment', meaning: 'A separate division or section of a railway car', example_sentence: 'They sat opposite each other in the train compartment.' }
        ],
        quiz: {
          question: 'Where was the train traveling to?',
          options: ['Vizag', 'Delhi', 'Bangalore', 'Chennai'],
          answer: 'Vizag'
        }
      },
      {
        level: 4,
        title: 'The Office Desk Rose',
        category: 'Love Story',
        text: 'Vikram worked diligently at the corner desk of a fast-paced software office. Every morning at 9 AM, a colleague named Sneha placed a colorful sticky note containing an inspiring motivational quote on his computer monitor. Vikram preserved every single sticky note inside his personal journal. On Valentine Day, when Sneha arrived at her desk, she found a single fresh red rose resting beside a handwritten letter from Vikram that read: "Your morning notes brightened my entire year. Thank you for being my light."',
        vocab: [
          { word: 'Diligently', meaning: 'In a way that shows care and conscientiousness in work', example_sentence: 'He worked diligently at his desk.' },
          { word: 'Preserved', meaning: 'Maintained in original state or kept safe', example_sentence: 'He preserved all her handwritten sticky notes.' }
        ],
        quiz: {
          question: 'What gift did Vikram leave on Sneha desk on Valentine Day?',
          options: ['A single fresh red rose with a letter', 'A box of dark chocolates', 'A wrist watch', 'A coffee mug'],
          answer: 'A single fresh red rose with a letter'
        }
      },
      {
        level: 5,
        title: 'Library Bookmark',
        category: 'Love Story',
        text: 'In the quiet reference aisle of the city library, two avid readers kept borrowing the exact same vintage poetry book week after week. One afternoon, while turning the pages, Varun discovered a delicate pressed wildflower bookmark inside with a handwritten note reading: "Page 42 contains my favorite love stanza." He immediately flipped to page 42 and looked across the wooden study tables to see Riya watching him with a gentle, hopeful smile.',
        vocab: [
          { word: 'Vintage', meaning: 'Denoting something of high quality from the past', example_sentence: 'They borrowed a vintage poetry book.' },
          { word: 'Delicate', meaning: 'Very fine or fragile in structure', example_sentence: 'She left a delicate pressed flower bookmark.' }
        ],
        quiz: {
          question: 'Which page contained the favorite love stanza written on the bookmark?',
          options: ['Page 42', 'Page 15', 'Page 88', 'Page 100'],
          answer: 'Page 42'
        }
      },
      {
        level: 6,
        title: 'Campus Canteen Coffee Spill',
        category: 'Love Story',
        text: 'During a bustling afternoon at the college canteen, Priya accidentally bumped into Kabir, spilling cold iced coffee onto his crisp white shirt. Extremely embarrassed and apologetic, Priya insisted on buying him a hot coffee and getting his shirt cleaned. What began as a clumsy accident turned into a two-hour conversation about music, dreams, and life. That single coffee spill marked the spark of a four-year campus romance that ended in a happy wedding.',
        vocab: [
          { word: 'Bustling', meaning: 'Full of activity and energy', example_sentence: 'The college canteen was bustling with students.' },
          { word: 'Apologetic', meaning: 'Expressing or showing regret', example_sentence: 'She felt very apologetic about the coffee spill.' }
        ],
        quiz: {
          question: 'What drink was accidentally spilled on Kabir shirt?',
          options: ['Cold iced coffee', 'Hot tea', 'Fruit juice', 'Water'],
          answer: 'Cold iced coffee'
        }
      },
      {
        level: 7,
        title: 'Sunset Beach Walk',
        category: 'Love Story',
        text: 'As the fiery golden sun slowly dipped beneath the ocean horizon, Sagar and Ananya walked barefoot along the wet seashore. Ocean waves gently washed over their feet as cool sea breeze played with her hair. Walking hand-in-hand in peaceful silence without needing words, they both realized that true love is not about grand speeches—it is about finding someone who feels like home.',
        vocab: [
          { word: 'Horizon', meaning: 'The line at which the earth surface and sky appear to meet', example_sentence: 'The sun set gracefully over the ocean horizon.' },
          { word: 'Peaceful', meaning: 'Free from disturbance; tranquil', example_sentence: 'They enjoyed a peaceful walk on the beach.' }
        ],
        quiz: {
          question: 'Where were Sagar and Ananya walking at sunset?',
          options: ['Barefoot along the wet seashore', 'In a shopping mall', 'Along a mountain highway', 'In a crowded park'],
          answer: 'Barefoot along the wet seashore'
        }
      },
      {
        level: 8,
        title: 'Rooftop Cafe Date',
        category: 'Love Story',
        text: 'Nervous and filled with excitement, Aditya arrived 20 minutes early for his first date with Kavya at a breezy rooftop cafe overlooking the illuminated city skyline. When Kavya stepped out in an elegant yellow dress, his heart skipped a beat. They talked effortlessly about childhood memories, favorite songs, and travel dreams for three hours straight, completely unaware that their coffee cups had gone cold.',
        vocab: [
          { word: 'Illuminated', meaning: 'Lit up with bright lights', example_sentence: 'The rooftop offered a view of the illuminated city.' },
          { word: 'Effortlessly', meaning: 'In a manner requiring no apparent effort', example_sentence: 'They conversed effortlessly for hours.' }
        ],
        quiz: {
          question: 'How long did Aditya and Kavya talk during their rooftop date?',
          options: ['Three hours straight', '15 minutes', 'One hour', 'Five hours'],
          answer: 'Three hours straight'
        }
      },
      {
        level: 9,
        title: 'The College Fest Duet',
        category: 'Love Story',
        text: 'At the annual inter-college cultural festival, Siddharth stood on stage with his acoustic guitar, searching for a vocalist for the final acoustic round. Ananya stepped up from the crowd, picked up the microphone, and harmonized flawlessly with his guitar chords. The audience erupted in loud applause as their unexpected duet won first place and sparked a deep musical romance.',
        vocab: [
          { word: 'Harmonized', meaning: 'Sang or played in melodic agreement', example_sentence: 'Her voice harmonized perfectly with his guitar.' },
          { word: 'Applause', meaning: 'Approval expressed by clapping', example_sentence: 'The audience gave a standing applause.' }
        ],
        quiz: {
          question: 'What musical instrument was Siddharth playing on stage?',
          options: ['Acoustic guitar', 'Keyboard', 'Violin', 'Drums'],
          answer: 'Acoustic guitar'
        }
      },
      {
        level: 10,
        title: 'Letters Under the Banyan Tree',
        category: 'Love Story',
        text: 'Under the ancient banyan tree at the edge of their childhood village, Dev and Ishani placed handwritten letters inside a hollow trunk every summer vacation. As years passed and life took them to different cities for higher studies, their written letters remained a secret sanctuary of true emotions. When they reunited years later under the same banyan tree, they realized true love never fades with time—it grows deeper with every passing season.',
        vocab: [
          { word: 'Sanctuary', meaning: 'A place of safety, quiet, and refuge', example_sentence: 'The banyan tree was their secret sanctuary.' },
          { word: 'Reunited', meaning: 'Come together again after a period of separation', example_sentence: 'They reunited under the old banyan tree.' }
        ],
        quiz: {
          question: 'Where did Dev and Ishani leave their handwritten letters?',
          options: ['Inside the hollow trunk of an ancient banyan tree', 'Inside a post box', 'Under a desk', 'In a book'],
          answer: 'Inside the hollow trunk of an ancient banyan tree'
        }
      }
    ];

    // Seed Daily Conversations
    for (const item of conversationsData) {
      let existingLevel = await db('growth_levels')
        .where({ path_id: convPath.path_id, level_number: item.level })
        .first();

      let levelId: number;
      if (existingLevel) {
        levelId = existingLevel.level_id;
        await db('growth_levels').where({ level_id: levelId }).update({
          title: item.title,
          section_title: 'Spoken English Conversations',
          xp_reward: 50,
          sort_order: item.level,
        });
      } else {
        const [id] = await db('growth_levels').insert({
          path_id: convPath.path_id,
          section_title: 'Spoken English Conversations',
          level_number: item.level,
          title: item.title,
          xp_reward: 50,
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
          reading_time_minutes: 4,
          sentences: JSON.stringify(item.dialogue),
        });
      } else {
        const [id] = await db('growth_stories').insert({
          level_id: levelId,
          title: item.title,
          category: item.category,
          reading_time_minutes: 4,
          sentences: JSON.stringify(item.dialogue),
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
    console.log(`[BulkSeed] ✅ Successfully seeded ${conversationsData.length} full-page Daily Conversation levels (Durgarao & Bhanu)!`);

    // Seed Love Stories
    for (const item of loveStoriesData) {
      let existingLevel = await db('growth_levels')
        .where({ path_id: lovePath.path_id, level_number: item.level })
        .first();

      let levelId: number;
      if (existingLevel) {
        levelId = existingLevel.level_id;
        await db('growth_levels').where({ level_id: levelId }).update({
          title: item.title,
          section_title: 'Romantic Short Stories',
          xp_reward: 50,
          sort_order: item.level,
        });
      } else {
        const [id] = await db('growth_levels').insert({
          path_id: lovePath.path_id,
          section_title: 'Romantic Short Stories',
          level_number: item.level,
          title: item.title,
          xp_reward: 50,
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
          reading_time_minutes: 4,
          sentences: JSON.stringify(item.sentences || [(item as any).text]),
        });
      } else {
        const [id] = await db('growth_stories').insert({
          level_id: levelId,
          title: item.title,
          category: item.category,
          reading_time_minutes: 4,
          sentences: JSON.stringify(item.sentences || [(item as any).text]),
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
    console.log(`[BulkSeed] ✅ Successfully seeded ${loveStoriesData.length} full-page Love Story levels!`);

  } catch (err: any) {
    console.error('[BulkSeed] Error during full-page story seeding:', err.message);
  }
}
