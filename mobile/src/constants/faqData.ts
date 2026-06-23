export interface FAQItem {
  id: string;
  category: 'home' | 'pending' | 'overview' | 'more';
  question: string;
  answer: string;
  steps?: string[];
  keywords: string[];
  routePath?: string;
  routeLabel?: string;
}

export const FAQ_DATA_EN: FAQItem[] = [
  // ==================== 🏠 HOME SCREEN FEATURES ====================
  {
    id: 'home-header',
    category: 'home',
    question: '👋 What is on the Home Screen Header?',
    answer: 'The Home page top header contains these details:\n\n• Greeting: Says Good Morning, Good Afternoon, or Good Evening depending on the current time.\n\n• Owner Name: Displays your full name.\n\n• Hostel Name: Displays the name of your active hostel (e.g. My Hostel).\n\n• Notifications Bell (Alerts): Located at the top right. It shows a yellow warning dot if students have pending dues. Tap it to see late rent alerts.\n\n• Profile Icon: Located on the top right. Tap it to see your profile details or log out of the application.',
    keywords: ['greeting', 'owner name', 'hostel name', 'bell', 'alert dot', 'notification', 'profile icon', 'header', 'logout'],
    routePath: 'Main',
    routeLabel: 'Go to Home Screen'
  },
  {
    id: 'home-beds-overview',
    category: 'home',
    question: '🛏️ What is Beds & Occupancy Overview?',
    answer: 'This section at the top of the Home page shows your bed space status:\n\n• Total Beds (Shown on top right): The total number of beds across all your rooms.\n\n• Occupancy Rate (Progress Bar): A purple progress bar showing the percentage of filled beds (e.g., 75% occupied).\n\n• Available (Green Card): The count of empty beds that are free. Tap it to view a list of vacant rooms to easily place new students.\n\n• Occupied (Red Card): The count of filled beds with students inside. Tap it to view a list of fully occupied rooms.\n\n• Notices (Orange Card): The count of active notice board messages. Tap it to write announcements for students.',
    keywords: ['beds', 'occupancy rate', 'available beds', 'occupied beds', 'notices', 'total beds', 'empty beds', 'filled beds'],
    routePath: 'Rooms',
    routeLabel: 'Check Room Beds'
  },
  {
    id: 'home-add-tenant',
    category: 'home',
    question: '👤 What is Add Tenant?',
    answer: 'Use this button in the Quick Management block to register a new student or employee:\n\n1. Name & Contact: Fill in the student\'s name, phone, and parent\'s phone number.\n\n2. Select Room: Choose a room from the list. It only shows rooms with available beds.\n\n3. Dates: Select their joining date and monthly rent cycle.\n\n4. ID Proof: Choose their ID card type (like Aadhaar, PAN, Voter ID), upload a photo of the card, and tap Save.',
    keywords: ['add tenant', 'add student', 'register student', 'new student', 'join student', 'id proof'],
    routePath: 'AddStudent',
    routeLabel: 'Register New Student'
  },
  {
    id: 'home-add-room',
    category: 'home',
    question: '🚪 What is Add Room (Home Icon)?',
    answer: 'This button has a Home icon in Quick Management. Use it to add new rooms to your hostel:\n\n1. Room Details: Type the Room Number and select the Floor (Ground, 1st Floor, etc.).\n\n2. Sharing Capacity: Select how many beds are in this room (Single, 2-Sharing, 3-Sharing, or 4-Sharing).\n\n3. Bed Rent: Set the monthly rent price for a single bed in this room.\n\n4. Amenities: Select available features (AC, Wi-Fi, Food, attached bathroom) and tap Save.',
    keywords: ['add room', 'add home', 'new room', 'create room', 'sharing capacity', 'rent price', 'amenities'],
    routePath: 'AddRoom',
    routeLabel: 'Add Room Screen'
  },
  {
    id: 'home-pre-book',
    category: 'home',
    question: '📅 What is Pre-Book?',
    answer: 'Pre-Booking is for booking a bed in advance before the student actually moves in:\n\n• Goal: Block a bed so no other student can rent it.\n\n• Advance Money: The student pays a booking advance to secure the bed.\n\n• Reservation: The app flags the bed as reserved.\n\n• Check In: When the student arrives, open the Pre-Booking page and tap "Check In" to make them an active tenant.',
    keywords: ['pre-booking', 'prebook', 'book advance', 'reserve room', 'advance money', 'check in'],
    routePath: 'PreBooking',
    routeLabel: 'Go to Pre-Booking'
  },
  {
    id: 'home-bills',
    category: 'home',
    question: '💡 What is Bills in Quick Management?',
    answer: 'Bills helps you record utility expenses for your hostel:\n\n• Type of Bills: Log electricity (current bill), water supplier bills, internet packages, or cleaner salaries.\n\n• Tracking: Record whether the bill is Paid or Pending to keep track of monthly operating costs.',
    keywords: ['bills', 'utility bills', 'current bill', 'electricity', 'water bill', 'internet bill', 'cleaner wages'],
    routePath: 'BillReminders',
    routeLabel: 'Manage Utility Bills'
  },
  {
    id: 'home-reminder',
    category: 'home',
    question: '🔔 What is Reminder in Quick Management?',
    answer: 'Use this feature to send fee reminders to students:\n\n• Due List: View all students who have pending dues.\n\n• Send Alerts: Tap the WhatsApp or Message icon next to a student\'s name to send a direct notification alert to their mobile phone.',
    keywords: ['reminder', 'fee alert', 'send message', 'notify student', 'unpaid alert', 'due date alerts'],
    routePath: 'Reminders',
    routeLabel: 'Send Dues Reminders'
  },
  {
    id: 'home-staff',
    category: 'home',
    question: '👥 What is Staff in Quick Management?',
    answer: 'Use this screen to register and manage your hostel workers:\n\n• Manage Roles: Add wardens, security guards, cleaners, cooks, or supervisors.\n\n• Save Details: Save their contact numbers, duty timings, and monthly salary details.',
    keywords: ['staff', 'employee', 'worker', 'cleaner', 'warden', 'security guard', 'cook'],
    routePath: 'Staff',
    routeLabel: 'Manage Hostel Staff'
  },
  {
    id: 'home-stats-left',
    category: 'home',
    question: '👤 What is Left Tenants under Statistics?',
    answer: 'This box counts the total number of students who vacated (left) your hostel:\n\n• Logs: Shows inactive history of past tenants.\n\n• Click Action: Tapping this card takes you to the Vacated Students list under the Tenants screen to check their history.',
    keywords: ['left tenants', 'vacated students', 'inactive students', 'statistics left', 'left student'],
    routePath: 'Students',
    routeLabel: 'View Left Tenants'
  },
  {
    id: 'home-stats-pending',
    category: 'home',
    question: '⚠️ What is Pending Dues under Statistics?',
    answer: 'This shows the total unpaid rent amount for the current month:\n\n• Dues Calculation: Automatically sums up what students still owe you.\n\n• Click Action: Tapping this card takes you directly to the Pending tab list so you can see who has not paid.',
    keywords: ['pending dues stats', 'unpaid rent amount', 'due money', 'statistics dues'],
    routePath: 'PendingPayments',
    routeLabel: 'Check Pending Dues'
  },
  {
    id: 'home-stats-collected',
    category: 'home',
    question: '💵 What is Collected under Statistics?',
    answer: 'This shows the total rent money you successfully collected this month:\n\n• Payment Logs: Sums up all payments made via UPI, Cash, or Cards.\n\n• Click Action: Tapping this card opens the Collected Payments page (Receipts History) to view detailed collection logs.',
    keywords: ['collected stats', 'collected amount', 'collected money', 'rent collected'],
    routePath: 'CollectedPayments',
    routeLabel: 'Check Collected Payments'
  },
  {
    id: 'home-financial-hub',
    category: 'home',
    question: '💼 What is the Financial Hub?',
    answer: 'The Financial Hub is a quick access dashboard for your money reports:\n\n• Due Report Card: Lists all students who owe rent, showing their room number, due date, and amount. Tap to collect or send alerts.\n\n• Receipts & History Card: Lists all payment logs. Tap to see when and how a student paid rent.',
    keywords: ['financial hub', 'due report', 'receipts history', 'money reports', 'collections report'],
    routePath: 'Main',
    routeLabel: 'Go to Home Screen'
  },
  {
    id: 'home-receipts-history',
    category: 'home',
    question: '🧾 What is the Receipts History Use Case?',
    answer: 'Receipts History lists all payments collected this month:\n\n• Use Case: When a student claims they already paid rent, search their name here to verify the exact payment date, amount, and mode (Cash, UPI/GPay, Bank Transfer).',
    keywords: ['receipts history use case', 'payment history', 'verify payments', 'collected payments'],
    routePath: 'CollectedPayments',
    routeLabel: 'Check Receipts History'
  },
  {
    id: 'home-due-report',
    category: 'home',
    question: '📊 What is the Due Report Use Case?',
    answer: 'Due Report lists all pending unpaid rents:\n\n• Use Case: Open this report at the end of the month to check how much rent money is missing, who the defaulters are, and how many days late they are, so you can call them or share the list with your accountant.',
    keywords: ['due report use case', 'unpaid report', 'defaulters report', 'dues report'],
    routePath: 'PendingPayments',
    routeLabel: 'Check Due Report'
  },
  {
    id: 'home-revenue-overview',
    category: 'home',
    question: '📈 What is Revenue Overview?',
    answer: 'This is a monthly collection bar chart at the bottom of the Home page:\n\n• Comparison: It displays monthly earnings comparison for the last 6 months.\n\n• Accumulation: As you record payments month after month, the chart bars grow automatically to show your business growth.',
    keywords: ['revenue overview', 'revenue chart', 'collection chart', 'monthly earnings'],
    routePath: 'Main',
    routeLabel: 'Go to Home Screen'
  },

  // ==================== 📋 PENDING PAYMENTS FEATURES ====================
  {
    id: 'pending-top-cards',
    category: 'pending',
    question: '💳 What do the Pending Tab Top Cards show?',
    answer: 'At the top of the Pending Tab (Second Tab), we show two summary cards:\n\n• Card 1: Total Dues - Sums up all unpaid room rents for the current month.\n\n• Card 2: Defaulters / Unpaid Students - The count of active students who have not cleared their dues.',
    keywords: ['pending tab top cards', 'total dues amount', 'defaulters', 'unpaid students count'],
    routePath: 'PendingPayments',
    routeLabel: 'Go to Pending Tab'
  },
  {
    id: 'pending-list-below',
    category: 'pending',
    question: '📋 What is shown in the list below the cards in the Pending Tab?',
    answer: 'Below the counts, the tab lists every student who owes rent. For each student, it shows:\n\n• Name & Room Number\n\n• Outstanding Rent Balance\n\n• Phone Number\n\n• Quick buttons: Collect and Remind.',
    keywords: ['pending list below', 'unpaid list', 'defaulters list', 'due list details'],
    routePath: 'PendingPayments',
    routeLabel: 'Go to Pending Tab'
  },
  {
    id: 'pending-collect-remind',
    category: 'pending',
    question: '💰 How do Collect and Remind work in the Pending Tab?',
    answer: 'Inside the Pending list, every student card has action buttons:\n\n• Collect (Pay Button): Click this when a student pays you. A modal opens. Verify the rent amount, select payment mode (Cash, UPI, GPay, Card, Net Banking), and click Save to mark them as Paid. This updates your Statistics and moves them to Receipts History.\n\n• Remind (Notification Button): Click this to send a quick warning message directly to the student\'s phone reminding them to pay their rent.',
    keywords: ['collect and remind', 'pay button', 'whatsapp reminder', 'collect rent', 'alert button'],
    routePath: 'PendingPayments',
    routeLabel: 'Go to Pending Tab'
  },

  // ==================== 📈 FINANCE OVERVIEW FEATURES ====================
  {
    id: 'overview-top-cards',
    category: 'overview',
    question: '💵 What do the Finance Overview Top Cards show?',
    answer: 'At the top of the Finance Overview page (Third Tab), we show three cards:\n\n• Total Income: Sum of all room rents collected + extra income sources.\n\n• Total Expenses: Sum of all utility bills and staff wages paid.\n\n• Net Profit / Loss: Money left in your hand after paying all expenses (Income minus Expenses).',
    keywords: ['finance overview top cards', 'total income', 'total expenses', 'net profit', 'net loss'],
    routePath: 'Overview',
    routeLabel: 'Go to Overview Screen'
  },
  {
    id: 'overview-progress-bar',
    category: 'overview',
    question: '📊 What is Rent Collection Progress?',
    answer: 'This is a filled meter showing your rent collection progress:\n\n• It displays what percentage of your monthly rent target you have collected so far. For example, if your total due is ₹1,00,000 and you collected ₹80,000, the bar fills up to 80%.',
    keywords: ['rent collection progress', 'collection progress bar', 'rent meter'],
    routePath: 'Overview',
    routeLabel: 'Go to Overview Screen'
  },
  {
    id: 'overview-expense-breakdown',
    category: 'overview',
    question: '🧾 What is Expense Breakdown?',
    answer: 'This section lists your expenses grouped by category:\n\n• It shows what percentage of your total expenses is spent on electricity, water, internet, cleaning, maintenance, or staff salaries, helping you see where you spend the most money.',
    keywords: ['expense breakdown', 'expense categories', 'spent details', 'finance breakdown'],
    routePath: 'Overview',
    routeLabel: 'Go to Overview Screen'
  },

  // ==================== ⚙️ MORE OPTIONS SCREEN ====================
  {
    id: 'more-qr-signup',
    category: 'more',
    question: '📲 What is QR Signup in the More Screen?',
    answer: 'QR Signup saves your typing time!\n\n1. Show QR Code: Open the QR Signup screen on your phone.\n\n2. Student Scan: The student scans the QR code using their mobile phone.\n\n3. Fill Form: They type their name, phone, parent details, and date of birth on their own phone and submit.\n\n4. Approval: You receive their application in the app. Just select a room and click Approve to check them in!',
    keywords: ['qr signup', 'scan qr', 'self register', 'registration form', 'approve tenant'],
    routePath: 'QRSignup',
    routeLabel: 'Generate QR Code'
  },
  {
    id: 'more-expenses',
    category: 'more',
    question: '💳 What is Expenses in the More Screen?',
    answer: 'Use this tool to track daily hostel spendings:\n\n• Log Daily Spending: Enter groceries cost, cleaner wages, repairs cost, or fuel bills.\n\n• Save Details: Type the amount, select category, select date, and tap Save.',
    keywords: ['expenses', 'track expenses', 'log spending', 'expense list'],
    routePath: 'Expenses',
    routeLabel: 'Manage Expenses'
  },
  {
    id: 'more-tenants-rooms',
    category: 'more',
    question: '👥 What are Tenants & Rooms under More Screen?',
    answer: 'These options give you quick management lists:\n\n• Tenants: Opens a list of all active students staying in your hostel.\n\n• Rooms: Opens a room roster where you can check room status, capacities, and sharing details.',
    keywords: ['tenants option', 'rooms option', 'manage students list', 'rooms roster'],
    routePath: 'Students',
    routeLabel: 'View All Tenants'
  },
  {
    id: 'more-vacate-notices',
    category: 'more',
    question: '📢 What are Vacate Notices under More Screen?',
    answer: 'When a student wants to leave the hostel, they register a vacate date:\n\n• Scheduled Vacates: View a list of students scheduled to leave, helping you prepare room cleaning and book new students in advance.',
    keywords: ['vacate notices', 'vacating students', 'planned vacates', 'move out list'],
    routePath: 'Notices',
    routeLabel: 'Check Vacate Notices'
  },
  {
    id: 'more-reports',
    category: 'more',
    question: '📊 What is Reports & Analytics under More Screen?',
    answer: 'This is where you download Excel sheets of your hostel data:\n\n• Export Sheets: Export lists of unpaid dues, collection records, and expense sheets directly to your phone.\n\n• Use Case: Excel files are useful to share with your accountant or store for annual financial records.',
    keywords: ['reports analytics', 'excel sheet download', 'export data', 'excel reports'],
    routePath: 'Reports',
    routeLabel: 'Download Excel Reports'
  },
  {
    id: 'more-profile-settings',
    category: 'more',
    question: '⚙️ What are Profile & Settings under More Screen?',
    answer: 'These options let you configure your account:\n\n• Profile: Edit your name, phone number, and hostel name.\n\n• Settings: Adjust preferences and select dark or light theme colors for the application.',
    keywords: ['profile options', 'settings options', 'change theme', 'edit profile'],
    routePath: 'Profile',
    routeLabel: 'Go to Profile Screen'
  }
];

export const FAQ_DATA_TE: FAQItem[] = [
  // ==================== 🏠 HOME SCREEN FEATURES ====================
  {
    id: 'home-header',
    category: 'home',
    question: '👋 హోమ్ స్క్రీన్ హెడర్‌లో ఏముంది?',
    answer: 'హోమ్ పేజీ టాప్ హెడర్‌లో ఈ వివరాలు ఉన్నాయి:\n\n• గ్రీటింగ్: ప్రస్తుత సమయాన్ని బట్టి గుడ్ మార్నింగ్, గుడ్ ఆఫ్టర్నూన్ లేదా గుడ్ ఈవెనింగ్ అని చెబుతుంది.\n\n• యజమాని పేరు: మీ పూర్తి పేరును ప్రదర్శిస్తుంది.\n\n• హాస్టల్ పేరు: మీ యాక్టివ్ హాస్టల్ పేరును ప్రదర్శిస్తుంది (ఉదా. నా హాస్టల్).\n\n• నోటిఫికేషన్ల గంట (అలర్ట్లు): కుడి వైపున పైన ఉంటుంది. విద్యార్థుల అద్దె పెండింగ్ ఉంటే పసుపు రంగు చుక్క చూపిస్తుంది. ఆలస్యమైన అద్దె అలర్ట్లను చూడటానికి దీన్ని నొక్కండి.\n\n• ప్రొఫైల్ చిహ్నం: కుడి వైపున పైన ఉంటుంది. మీ ప్రొఫైల్ వివరాలను చూడటానికి లేదా లాగ్అవుట్ చేయడానికి దీన్ని నొక్కండి.',
    keywords: ['greeting', 'owner name', 'hostel name', 'bell', 'alert dot', 'notification', 'profile icon', 'header', 'logout', 'యజమాని పేరు', 'గ్రీటింగ్', 'హాస్టల్', 'నోటిఫికేషన్'],
    routePath: 'Main',
    routeLabel: 'హోమ్ స్క్రీన్‌కి వెళ్ళండి'
  },
  {
    id: 'home-beds-overview',
    category: 'home',
    question: '🛏️ బెడ్స్ & ఆక్యుపెన్సీ ఓవర్‌వ్యూ అంటే ఏమిటి?',
    answer: 'ఈ విభాగం హోమ్ పేజీ పైన ఉంటుంది మరియు మీ బెడ్ స్పేస్ స్థితిని చూపుతుంది:\n\n• మొత్తం బెడ్‌లు (కుడి వైపున పైన చూపుతుంది): మీ అన్ని గదులలోని మొత్తం బెడ్‌ల సంఖ్య.\n\n• ఆక్యుపెన్సీ రేటు (ప్రోగ్రెస్ బార్): నిండిన బెడ్‌ల శాతాన్ని చూపే ఊదా రంగు బార్ (ఉదా. 75% నిండినది).\n\n• అందుబాటులో ఉన్నాయి (ఆకుపచ్చ కార్డ్): ఖాళీగా ఉన్న బెడ్‌ల సంఖ్య. కొత్త విద్యార్థులను సులభంగా చేర్చడానికి ఖాళీ గదుల జాబితాను చూడటానికి దీన్ని నొక్కండి.\n\n• నిండినవి (ఎరుపు కార్డ్): విద్యార్థులతో నిండిన బెడ్‌ల సంఖ్య. పూర్తిగా నిండిన గదుల జాబితాను చూడటానికి దీన్ని నొక్కండి.\n\n• నోటీసులు (నారింజ కార్డ్): యాక్టివ్ నోటీస్ బోర్డ్ సందేశాల సంఖ్య. విద్యార్థుల కోసం ప్రకటనలు రాయడానికి దీన్ని నొక్కండి.',
    keywords: ['beds', 'occupancy rate', 'available beds', 'occupied beds', 'notices', 'total beds', 'empty beds', 'filled beds', 'బెడ్', 'ఆక్యుపెన్సీ', 'ఖాళీ', 'నిండినవి'],
    routePath: 'Rooms',
    routeLabel: 'రూమ్ బెడ్స్ తనిఖీ చేయండి'
  },
  {
    id: 'home-add-tenant',
    category: 'home',
    question: '👤 అద్దెదారుని జోడించడం (Add Tenant) అంటే ఏమిటి?',
    answer: 'కొత్త విద్యార్థి లేదా ఉద్యోగిని నమోదు చేయడానికి క్విక్ మేనేజ్‌మెంట్ బ్లాక్‌లోని ఈ బటన్‌ను ఉపయోగించండి:\n\n1. పేరు & సంప్రదింపులు: విద్యార్థి పేరు, ఫోన్ మరియు తల్లిదండ్రుల ఫోన్ నంబర్‌ను నింపండి.\n\n2. గదిని ఎంచుకోండి: జాబితా నుండి గదిని ఎంచుకోండి. ఇది ఖాళీ బెడ్‌లు ఉన్న గదులను మాత్రమే చూపుతుంది.\n\n3. తేదీలు: వారు చేరే తేదీ మరియు నెలవారీ అద్దె చక్రాన్ని ఎంచుకోండి.\n\n4. ID రుజువు: వారి ID కార్డ్ రకాన్ని (ఆధార్, పాన్, ఓటర్ ID వంటివి) ఎంచుకుని, కార్డ్ ఫోటోను అప్‌లోడ్ చేసి, సేవ్ చేయి నొక్కండి.',
    keywords: ['add tenant', 'add student', 'register student', 'new student', 'join student', 'id proof', 'అద్దెదారుడు', 'విద్యార్థి', 'నమోదు'],
    routePath: 'AddStudent',
    routeLabel: 'కొత్త విద్యార్థిని నమోదు చేయండి'
  },
  {
    id: 'home-add-room',
    category: 'home',
    question: '🚪 గదిని జోడించడం (Add Room) అంటే ఏమిటి?',
    answer: 'క్విక్ మేనేజ్‌మెంట్‌లో ఈ బటన్ హోమ్ చిహ్నాన్ని కలిగి ఉంటుంది. మీ హాస్టల్‌కు కొత్త గదులను జోడించడానికి దీన్ని ఉపయోగించండి:\n\n1. గది వివరాలు: గది సంఖ్యను టైప్ చేసి, అంతస్తును (గ్రౌండ్, 1వ అంతస్తు, మొదలైనవి) ఎంచుకోండి.\n\n2. షేరింగ్ సామర్థ్యం: ఈ గదిలో ఎన్ని బెడ్‌లు ఉన్నాయో ఎంచుకోండి (సింగిల్, 2-షేరింగ్, 3-షేరింగ్ లేదా 4-షేరింగ్).\n\n3. బెడ్ అద్దె: ఈ గదిలో ఒక బెడ్‌కు నెలవారీ అద్దె ధరను నిర్ణయించండి.\n\n4. సౌకర్యాలు: అందుబాటులో ఉన్న సౌకర్యాలను (AC, Wi-Fi, భోజనం, అటాచ్డ్ బాత్రూమ్) ఎంచుకుని, సేవ్ చేయి నొక్కండి.',
    keywords: ['add room', 'add home', 'new room', 'create room', 'sharing capacity', 'rent price', 'amenities', 'గది', 'జోడించు', 'అద్దె'],
    routePath: 'AddRoom',
    routeLabel: 'గదిని జోడించే స్క్రీన్'
  },
  {
    id: 'home-pre-book',
    category: 'home',
    question: '📅 ప్రీ-బుక్ (Pre-Book) అంటే ఏమిటి?',
    answer: 'విద్యార్థి నిజంగా హాస్టల్‌కు రాకముందే బెడ్‌ను ముందుగానే బుక్ చేసుకోవడానికి ప్రీ-బుకింగ్ ఉపయోగపడుతుంది:\n\n• లక్ష్యం: మరే ఇతర విద్యార్థి ఆ బెడ్‌ను తీసుకోకుండా బ్లాక్ చేయడం.\n\n• అడ్వాన్స్ డబ్బు: బెడ్‌ను రిజర్వ్ చేసుకోవడానికి విద్యార్థి బుకింగ్ అడ్వాన్స్ చెల్లిస్తారు.\n\n• రిజర్వేషన్: యాప్ ఆ బెడ్‌ను రిజర్వ్ చేసినట్లుగా చూపిస్తుంది.\n\n• చెక్ ఇన్: విద్యార్థి వచ్చినప్పుడు, ప్రీ-బుకింగ్ పేజీని తెరిచి, వారిని యాక్టివ్ అద్దెదారుగా చేయడానికి "చెక్ ఇన్" నొక్కండి.',
    keywords: ['pre-booking', 'prebook', 'book advance', 'reserve room', 'advance money', 'check in', 'బుకింగ్', 'ప్రీ బుక్', 'అడ్వాన్స్'],
    routePath: 'PreBooking',
    routeLabel: 'ప్రీ-బుకింగ్‌కు వెళ్ళండి'
  },
  {
    id: 'home-bills',
    category: 'home',
    question: '💡 క్విక్ మేనేజ్‌మెంట్‌లో బిల్లులు (Bills) అంటే ఏమిటి?',
    answer: 'బిల్లులు మీ హాస్టల్ ఖర్చులను రికార్డ్ చేయడానికి సహాయపడతాయి:\n\n• బిల్లుల రకాలు: కరెంట్ బిల్లు, వాటర్ బిల్లు, ఇంటర్నెట్ ప్యాకేజీలు లేదా క్లీనర్ జీతాలను నమోదు చేయండి.\n\n• ట్రాకింగ్: నెలవారీ నిర్వహణ ఖర్చులను ట్రాక్ చేయడానికి బిల్లు చెల్లించబడిందా లేదా పెండింగ్‌లో ఉందా అని రికార్డ్ చేయండి.',
    keywords: ['bills', 'utility bills', 'current bill', 'electricity', 'water bill', 'internet bill', 'cleaner wages', 'బిల్లులు', 'కరెంట్ బిల్లు', 'నీరు'],
    routePath: 'BillReminders',
    routeLabel: 'బిల్లులను నిర్వహించండి'
  },
  {
    id: 'home-reminder',
    category: 'home',
    question: '🔔 క్విక్ మేనేజ్‌మెంట్‌లో రిమైండర్ (Reminder) అంటే ఏమిటి?',
    answer: 'విద్యార్థులకు ఫీజు రిమైండర్‌లను పంపడానికి ఈ ఫీచర్‌ను ఉపయోగించండి:\n\n• బకాయిల జాబితా: అద్దె బకాయిలు ఉన్న విద్యార్థులందరినీ చూడండి.\n\n• అలర్ట్లు పంపండి: విద్యార్థి మొబైల్‌కు నేరుగా నోటిఫికేషన్ అలర్ట్ పంపడానికి వారి పేరు పక్కన ఉన్న వాట్సాప్ లేదా మెసేజ్ చిహ్నాన్ని నొక్కండి.',
    keywords: ['reminder', 'fee alert', 'send message', 'notify student', 'unpaid alert', 'due date alerts', 'రిమైండర్', 'మెసేజ్', 'బకాయి'],
    routePath: 'Reminders',
    routeLabel: 'బకాయిల రిమైండర్‌లను పంపండి'
  },
  {
    id: 'home-staff',
    category: 'home',
    question: '👥 క్విక్ మేనేజ్‌మెంట్‌లో సిబ్బంది (Staff) అంటే ఏమిటి?',
    answer: 'మీ హాస్టల్ సిబ్బందిని నమోదు చేయడానికి మరియు నిర్వహించడానికి ఈ స్క్రీన్‌ను ఉపయోగించండి:\n\n• పాత్రల నిర్వహణ: వార్డెన్లు, సెక్యూరిటీ గార్డులు, క్లీనర్లు, వంటమనుషులు లేదా సూపర్‌వైజర్లను జోడించండి.\n\n• వివరాలను సేవ్ చేయండి: వారి సంప్రదింపు సంఖ్యలు, డ్యూటీ సమయాలు మరియు నెలవారీ జీతం వివరాలను సేవ్ చేయండి.',
    keywords: ['staff', 'employee', 'worker', 'cleaner', 'warden', 'security guard', 'cook', 'సిబ్బంది', 'జీతం', 'పనివారు'],
    routePath: 'Staff',
    routeLabel: 'హాస్టల్ సిబ్బందిని నిర్వహించండి'
  },
  {
    id: 'home-stats-left',
    category: 'home',
    question: '👤 గణాంకాలలో వెళ్ళిపోయిన అద్దెదారులు (Left Tenants) అంటే ఏమిటి?',
    answer: 'ఈ బాక్స్ మీ హాస్టల్ నుండి వెళ్ళిపోయిన మొత్తం విద్యార్థుల సంఖ్యను లెక్కిస్తుంది:\n\n• లాగ్‌లు: గత అద్దెదారుల హిస్టరీని చూపుతుంది.\n\n• క్లిక్ యాక్షన్: ఈ కార్డ్‌ను నొక్కితే వారి చరిత్రను తనిఖీ చేయడానికి టెనెంట్స్ స్క్రీన్ క్రింద ఉన్న ఖాళీ చేసిన విద్యార్థుల జాబితాకు తీసుకువెళుతుంది.',
    keywords: ['left tenants', 'vacated students', 'inactive students', 'statistics left', 'left student', 'వెళ్ళిపోయిన', 'ఖాళీ చేసిన'],
    routePath: 'Students',
    routeLabel: 'వెళ్ళిపోయిన అద్దెదారులను చూడండి'
  },
  {
    id: 'home-stats-pending',
    category: 'home',
    question: '⚠️ గణాంకాలలో పెండింగ్ బకాయిలు (Pending Dues) అంటే ఏమిటి?',
    answer: 'ఇది ప్రస్తుత నెలకు సంబంధించిన మొత్తం చెల్లించని అద్దె మొత్తాన్ని చూపుతుంది:\n\n• బకాయిల లెక్కింపు: విద్యార్థులు మీకు ఇంకా ఎంత చెల్లించాలో స్వయంచాలకంగా లెక్కిస్తుంది.\n\n• క్లిక్ యాక్షన్: ఈ కార్డ్‌ను నొక్కితే నేరుగా పెండింగ్ లిస్ట్‌కి తీసుకువెళుతుంది, తద్వారా ఎవరు చెల్లించలేదో చూడవచ్చు.',
    keywords: ['pending dues stats', 'unpaid rent amount', 'due money', 'statistics dues', 'పెండింగ్', 'బకాయిలు', 'డబ్బు'],
    routePath: 'PendingPayments',
    routeLabel: 'పెండింగ్ బకాయిలను తనిఖీ చేయండి'
  },
  {
    id: 'home-stats-collected',
    category: 'home',
    question: '💵 గణాంకాలలో సేకరించినవి (Collected) అంటే ఏమిటి?',
    answer: 'ఇది ఈ నెలలో మీరు విజయవంతంగా సేకరించిన మొత్తం అద్దె డబ్బును చూపుతుంది:\n\n• చెల్లింపు లాగ్‌లు: UPI, నగదు లేదా కార్డుల ద్వారా చేసిన అన్ని చెల్లింపులను లెక్కిస్తుంది.\n\n• క్లిక్ యాక్షన్: ఈ కార్డ్‌ను నొక్కితే సేకరించిన వివరాలను చూడటానికి కలెక్టెడ్ పేమెంట్స్ పేజీని తెరుస్తుంది.',
    keywords: ['collected stats', 'collected amount', 'collected money', 'rent collected', 'సేకరించిన', 'డబ్బులు', 'అద్దె'],
    routePath: 'CollectedPayments',
    routeLabel: 'సేకరించిన చెల్లింపులను తనిఖీ చేయండి'
  },
  {
    id: 'home-financial-hub',
    category: 'home',
    question: '💼 ఫైనాన్షియల్ హబ్ (Financial Hub) అంటే ఏమిటి?',
    answer: 'ఫైనాన్షియల్ హబ్ అనేది మీ డబ్బు నివేదికల కోసం ఒక క్విక్ యాక్సెస్ డ్యాష్‌బోర్డ్:\n\n• బకాయిల రిపోర్ట్ కార్డ్: అద్దె బకాయి ఉన్న విద్యార్థులందరినీ, వారి గది సంఖ్య, గడువు తేదీ మరియు మొత్తాన్ని చూపుతుంది.\n\n• రశీదులు & హిస్టరీ కార్డ్: అన్ని చెల్లింపు లాగ్‌లను చూపుతుంది. విద్యార్థి ఎప్పుడు మరియు ఎలా అద్దె చెల్లించారో చూడటానికి నొక్కండి.',
    keywords: ['financial hub', 'due report', 'receipts history', 'money reports', 'collections report', 'డబ్బు', 'ఆదాయం', 'రిపోర్ట్'],
    routePath: 'Main',
    routeLabel: 'హోమ్ స్క్రీన్‌కి వెళ్ళండి'
  },
  {
    id: 'home-receipts-history',
    category: 'home',
    question: '🧾 రశీదుల హిస్టరీ ఉపయోగం ఏమిటి?',
    answer: 'రశీదుల హిస్టరీ ఈ నెలలో సేకరించిన అన్ని చెల్లింపులను చూపుతుంది:\n\n• ఉపయోగం: ఒక విద్యార్థి తాము ఇప్పటికే అద్దె చెల్లించామని చెప్పినప్పుడు, ఖచ్చితమైన చెల్లింపు తేదీ, మొత్తం మరియు విధానాన్ని (నగదు, UPI, బ్యాంక్ బదిలీ) ధృవీకరించడానికి వారి పేరును ఇక్కడ శోధించండి.',
    keywords: ['receipts history use case', 'payment history', 'verify payments', 'collected payments', 'రశీదు', 'చెల్లింపు', 'ధృవీకరణ'],
    routePath: 'CollectedPayments',
    routeLabel: 'సేకరించిన చెల్లింపులను తనిఖీ చేయండి'
  },
  {
    id: 'home-due-report',
    category: 'home',
    question: '📊 బకాయిల రిపోర్ట్ ఉపయోగం ఏమిటి?',
    answer: 'బకాయిల రిపోర్ట్ పెండింగ్‌లో ఉన్న అన్ని చెల్లించని అద్దెలను చూపుతుంది:\n\n• ఉపయోగం: నెల చివరలో ఎంత అద్దె డబ్బు రాలేదో, ఎవరు చెల్లించాలో మరియు ఎన్ని రోజులు ఆలస్యం అయిందో తెలుసుకోవడానికి ఈ నివేదికను చూడండి.',
    keywords: ['due report use case', 'unpaid report', 'defaulters report', 'dues report', 'రిపోర్ట్', 'బకాయి', 'ఆలస్యం'],
    routePath: 'PendingPayments',
    routeLabel: 'బకాయిల రిపోర్టును తనిఖీ చేయండి'
  },
  {
    id: 'home-revenue-overview',
    category: 'home',
    question: '📈 రెవెన్యూ ఓవర్‌వ్యూ (Revenue Overview) అంటే ఏమిటి?',
    answer: 'ఇది హోమ్ పేజీ దిగువన ఉన్న నెలవారీ సేకరణ బార్ చార్ట్:\n\n• పోలిక: ఇది గత 6 నెలల నెలవారీ ఆదాయాల పోలికను చూపుతుంది.\n\n• వృద్ధి: మీరు నెలవారీ చెల్లింపులను రికార్డ్ చేస్తున్నప్పుడు, వ్యాపార వృద్ధిని చూపించడానికి చార్ట్ బార్‌లు స్వయంచాలకంగా పెరుగుతాయి.',
    keywords: ['revenue overview', 'revenue chart', 'collection chart', 'monthly earnings', 'ఆదాయం', 'చార్ట్', 'పోలిక'],
    routePath: 'Main',
    routeLabel: 'హోమ్ స్క్రీన్‌కి వెళ్ళండి'
  },

  // ==================== 📋 PENDING PAYMENTS FEATURES ====================
  {
    id: 'pending-top-cards',
    category: 'pending',
    question: '💳 పెండింగ్ ట్యాబ్ టాప్ కార్డ్‌లు ఏమి చూపుతాయి?',
    answer: 'పెండింగ్ ట్యాబ్ (రెండవ ట్యాబ్) పైన, మేము రెండు సారాంశం కార్డ్‌లను చూపుతాము:\n\n• కార్డ్ 1: మొత్తం బకాయిలు - ప్రస్తుత నెలకు సంబంధించిన అన్ని చెల్లించని గది అద్దెలను లెక్కిస్తుంది.\n\n• కార్డ్ 2: డిఫాల్టర్లు - తమ బకాయిలను క్లియర్ చేయని యాక్టివ్ విద్యార్థుల సంఖ్య.',
    keywords: ['pending tab top cards', 'total dues amount', 'defaulters', 'unpaid students count', 'పెండింగ్', 'కార్డ్', 'బకాయిలు'],
    routePath: 'PendingPayments',
    routeLabel: 'పెండింగ్ ట్యాబ్‌కి వెళ్ళండి'
  },
  {
    id: 'pending-list-below',
    category: 'pending',
    question: '📋 పెండింగ్ ట్యాబ్‌లోని కార్డ్‌ల క్రింద ఉన్న జాబితాలో ఏమి చూపుతుంది?',
    answer: 'లెక్కింపుల క్రింద, అద్దె బకాయి ఉన్న ప్రతి విద్యార్థి జాబితా ఉంటుంది. ప్రతి విద్యార్థి కోసం ఇది చూపుతుంది:\n\n• పేరు & గది సంఖ్య\n\n• బకాయి ఉన్న అద్దె నిల్వ\n\n• ఫోన్ నంబర్\n\n• శీఘ్ర బటన్లు: సేకరించండి మరియు గుర్తు చేయండి.',
    keywords: ['pending list below', 'unpaid list', 'defaulters list', 'due list details', 'జాబితా', 'వివరాలు', 'గది'],
    routePath: 'PendingPayments',
    routeLabel: 'పెండింగ్ ట్యాబ్‌కి వెళ్ళండి'
  },
  {
    id: 'pending-collect-remind',
    category: 'pending',
    question: '💰 పెండింగ్ ట్యాబ్‌లో సేకరించడం మరియు గుర్తు చేయడం ఎలా పని చేస్తాయి?',
    answer: 'పెండింగ్ జాబితాలో, ప్రతి విద్యార్థి కార్డ్ చర్య బటన్లను కలిగి ఉంటుంది:\n\n• సేకరించండి (చెల్లింపు బటన్): విద్యార్థి మీకు చెల్లించినప్పుడు దీన్ని క్లిక్ చేయండి. ఒక మోడల్ తెరుచుకుంటుంది. అద్దె మొత్తాన్ని ధృవీకరించి, చెల్లింపు విధానాన్ని (నగదు, UPI, కార్డ్) ఎంచుకుని, సేవ్ చేయి క్లిక్ చేయండి.\n\n• గుర్తు చేయి (నోటిఫికేషన్ బటన్): విద్యార్థి ఫోన్‌కు నేరుగా రిమైండర్ సందేశాన్ని పంపడానికి దీన్ని క్లిక్ చేయండి.',
    keywords: ['collect and remind', 'pay button', 'whatsapp reminder', 'collect rent', 'alert button', 'సేకరించు', 'గుర్తు చేయి', 'వాట్సాప్'],
    routePath: 'PendingPayments',
    routeLabel: 'పెండింగ్ ట్యాబ్‌కి వెళ్ళండి'
  },

  // ==================== 📈 FINANCE OVERVIEW FEATURES ====================
  {
    id: 'overview-top-cards',
    category: 'overview',
    question: '💵 ఫైనాన్స్ ఓవర్‌వ్యూ టాప్ కార్డ్‌లు ఏమి చూపుతాయి?',
    answer: 'ఫైనాన్స్ ఓవర్‌వ్యూ పేజీ (మూడవ ట్యాబ్) పైన, మేము మూడు కార్డ్‌లను చూపుతాము:\n\n• మొత్తం ఆదాయం: సేకరించిన అన్ని గది అద్దెలు + అదనపు ఆదాయ వనరుల మొత్తం.\n\n• మొత్తం ఖర్చులు: చెల్లించిన అన్ని యుటిలిటీ బిల్లులు మరియు సిబ్బంది వేతనాల మొత్తం.\n\n• నికర లాభం/నష్టం: అన్ని ఖర్చులు పోను మీ చేతిలో మిగిలిన డబ్బు (ఆదాయం మైనస్ ఖర్చులు).',
    keywords: ['finance overview top cards', 'total income', 'total expenses', 'net profit', 'net loss', 'లాభం', 'నష్టం', 'ఖర్చులు'],
    routePath: 'Overview',
    routeLabel: 'ఓవర్‌వ్యూ స్క్రీన్‌కి వెళ్ళండి'
  },
  {
    id: 'overview-progress-bar',
    category: 'overview',
    question: '📊 అద్దె సేకరణ ప్రగతి అంటే ఏమిటి?',
    answer: 'ఇది మీ అద్దె సేకరణ పురోగతిని చూపే మీటర్:\n\n• ఇది మీ నెలవారీ అద్దె లక్ష్యంలో మీరు ఇప్పటివరకు ఎంత శాతం సేకరించారో చూపుతుంది. ఉదాహరణకు, మీ మొత్తం బకాయి ₹1,00,000 మరియు మీరు ₹80,000 సేకరిస్తే, బార్ 80% నిండుతుంది.',
    keywords: ['rent collection progress', 'collection progress bar', 'rent meter', 'అద్దె', 'సేకరణ', 'ప్రగతి'],
    routePath: 'Overview',
    routeLabel: 'ఓవర్‌వ్యూ స్క్రీన్‌కి వెళ్ళండి'
  },
  {
    id: 'overview-expense-breakdown',
    category: 'overview',
    question: '🧾 ఖర్చుల విభజన (Expense Breakdown) అంటే ఏమిటి?',
    answer: 'ఈ విభాగం వర్గం ఆధారంగా వర్గీకరించబడిన మీ ఖర్చులను చూపుతుంది:\n\n• కరెంట్, నీరు, ఇంటర్నెట్, క్లీనింగ్, మెయింటెనెన్స్ లేదా సిబ్బంది జీతాల కోసం మీ మొత్తం ఖర్చులలో ఎంత శాతం ఖర్చు అవుతుందో ఇది చూపుతుంది.',
    keywords: ['expense breakdown', 'expense categories', 'spent details', 'finance breakdown', 'ఖర్చులు', 'కరెంట్', 'విభజన'],
    routePath: 'Overview',
    routeLabel: 'ఓవర్‌వ్యూ స్క్రీన్‌కి వెళ్ళండి'
  },

  // ==================== ⚙️ MORE OPTIONS SCREEN ====================
  {
    id: 'more-qr-signup',
    category: 'more',
    question: '📲 మరిన్ని స్క్రీన్‌లోని QR సైన్అప్ అంటే ఏమిటి?',
    answer: 'QR సైన్అప్ మీ టైపింగ్ సమయాన్ని ఆదా చేస్తుంది!\n\n1. QR కోడ్ చూపించు: మీ ఫోన్‌లో QR సైన్అప్ స్క్రీన్ తెరవండి.\n\n2. విద్యార్థి స్కాన్: విద్యార్థి తన మొబైల్ ఫోన్ ఉపయోగించి QR కోడ్‌ను స్కాన్ చేస్తారు.\n\n3. ఫారమ్ నింపండి: వారు వారి స్వంత ఫోన్‌లో వారి పేరు, ఫోన్ మరియు వివరాలను టైప్ చేసి సమర్పిస్తారు.\n\n4. ఆమోదం: మీరు యాప్‌లో వారి దరఖాస్తును అందుకుంటారు. గదిని ఎంచుకుని, చెక్ ఇన్ చేయడానికి ఆమోదించు క్లిక్ చేయండి!',
    keywords: ['qr signup', 'scan qr', 'self register', 'registration form', 'approve tenant', 'సైన్అప్', 'స్కాన్', 'రిజిస్ట్రేషన్'],
    routePath: 'QRSignup',
    routeLabel: 'QR కోడ్‌ను జనరేట్ చేయండి'
  },
  {
    id: 'more-expenses',
    category: 'more',
    question: '💳 మరిన్ని స్క్రీన్‌లోని ఖర్చులు అంటే ఏమిటి?',
    answer: 'రోజువారీ హాస్టల్ ఖర్చులను ట్రాక్ చేయడానికి ఈ సాధనాన్ని ఉపయోగించండి:\n\n• రోజువారీ ఖర్చులను నమోదు చేయండి: కిరాణా వస్తువులు, క్లీనర్ వేతనాలు, మరమ్మతులు లేదా ఇంధన బిల్లుల ఖర్చును నమోదు చేయండి.\n\n• వివరాలను సేవ్ చేయండి: మొత్తాన్ని నమోదు చేసి, వర్గాన్ని, తేదీని ఎంచుకుని, సేవ్ చేయి నొక్కండి.',
    keywords: ['expenses', 'track expenses', 'log spending', 'expense list', 'ఖర్చులు', 'రోజువారీ', 'ట్రాక్'],
    routePath: 'Expenses',
    routeLabel: 'ఖర్చులను నిర్వహించండి'
  },
  {
    id: 'more-tenants-rooms',
    category: 'more',
    question: '👥 మరిన్ని స్క్రీన్ క్రింద ఉన్న అద్దెదారులు & గదులు ఏమిటి?',
    answer: 'ఈ ఎంపికలు మీకు శీఘ్ర నిర్వహణ జాబితాలను ఇస్తాయి:\n\n• అద్దెదారులు: మీ హాస్టల్‌లో ఉంటున్న యాక్టివ్ విద్యార్థుల జాబితాను తెరుస్తుంది.\n\n• గదులు: గది స్థితి, సామర్థ్యం మరియు షేరింగ్ వివరాలను తనిఖీ చేయడానికి రూమ్ రోస్టర్‌ను తెరుస్తుంది.',
    keywords: ['tenants option', 'rooms option', 'manage students list', 'rooms roster', 'గదులు', 'అద్దెదారులు', 'జాబితా'],
    routePath: 'Students',
    routeLabel: 'అద్దెదారులందరినీ చూడండి'
  },
  {
    id: 'more-vacate-notices',
    category: 'more',
    question: '📢 మరిన్ని స్క్రీన్ క్రింద ఉన్న ఖాళీ చేసే నోటీసులు ఏమిటి?',
    answer: 'ఒక విద్యార్థి హాస్టల్ నుండి వెళ్ళిపోవాలనుకున్నప్పుడు, వారు ఖాళీ చేసే తేదీని నమోదు చేస్తారు:\n\n• షెడ్యూల్డ్ ఖాళీలు: వెళ్ళిపోవడానికి షెడ్యూల్ చేయబడిన విద్యార్థుల జాబితాను చూడండి, ఇది గది శుభ్రపరచడం మరియు ముందుగానే బుక్ చేసుకోవడానికి సహాయపడుతుంది.',
    keywords: ['vacate notices', 'vacating students', 'planned vacates', 'move out list', 'ఖాళీ', 'నోటీసు', 'తేదీ'],
    routePath: 'Notices',
    routeLabel: 'ఖాళీ చేసే నోటీసులను తనిఖీ చేయండి'
  },
  {
    id: 'more-reports',
    category: 'more',
    question: '📊 మరిన్ని స్క్రీన్‌లోని రిపోర్ట్స్ & అనలిటిక్స్ అంటే ఏమిటి?',
    answer: 'ఇక్కడే మీరు మీ హాస్టల్ డేటా యొక్క ఎక్సెల్ షీట్లను డౌన్‌లోడ్ చేసుకుంటారు:\n\n• ఎక్సెల్ ఎగుమతి: చెల్లించని బకాయిలు, సేకరణ రికార్డులు మరియు ఖర్చుల షీట్ల జాబితాను నేరుగా మీ ఫోన్‌కు డౌన్‌లోడ్ చేసుకోండి.\n\n• ఉపయోగం: మీ అకౌంటెంట్‌తో పంచుకోవడానికి ఎక్సెల్ ఫైల్‌లు ఉపయోగపడతాయి.',
    keywords: ['reports analytics', 'excel sheet download', 'export data', 'excel reports', 'ఎక్సెల్', 'డౌన్‌లోడ్', 'రిపోర్ట్స్'],
    routePath: 'Reports',
    routeLabel: 'ఎక్సెల్ రిపోర్టులను డౌన్‌లోడ్ చేయండి'
  },
  {
    id: 'more-profile-settings',
    category: 'more',
    question: '⚙️ మరిన్ని స్క్రీన్ క్రింద ఉన్న ప్రొఫైల్ & సెట్టింగ్స్ ఏమిటి?',
    answer: 'ఈ ఎంపికలు మీ ఖాతాను కాన్ఫిగర్ చేయడానికి అనుమతిస్తాయి:\n\n• ప్రొఫైల్: మీ పేరు, ఫోన్ నంబర్ మరియు హాస్టల్ పేరును సవరించండి.\n\n• సెట్టింగ్స్: అప్లికేషన్ కోసం డార్క్ లేదా లైట్ థీమ్ రంగులను ఎంచుకోండి.',
    keywords: ['profile options', 'settings options', 'change theme', 'edit profile', 'సెట్టింగ్స్', 'ప్రొఫైల్', 'ఖాతా'],
    routePath: 'Profile',
    routeLabel: 'ప్రొఫైల్ స్క్రీన్‌కి వెళ్ళండి'
  }
];
