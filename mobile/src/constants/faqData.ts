export interface FAQItem {
  id: string;
  category: 'dashboard' | 'rooms' | 'tenants' | 'financials' | 'alerts';
  question: string;
  answer: string;
  steps?: string[];
  keywords: string[];
  routePath?: string;
  routeLabel?: string;
}

export const FAQ_DATA_EN: FAQItem[] = [
  // ==================== 📊 DASHBOARD / MULTIPLE PGs ====================
  {
    id: 'dash-greeting',
    category: 'dashboard',
    question: '👋 What is on the Home Screen Header?',
    answer: 'The Home page top header contains:\n\n• Greeting: Says Good Morning/Afternoon based on time.\n• Owner Name: Displays your full name.\n• Hostel Name: Displays your active hostel.\n• Notifications Bell: Located at the top right. Shows a yellow warning dot if there are unread alerts.',
    keywords: ['greeting', 'owner name', 'hostel name', 'bell', 'alert dot', 'notification', 'header'],
    routePath: 'Main',
    routeLabel: 'Go to Home Screen'
  },
  {
    id: 'dash-pg-creation',
    category: 'dashboard',
    question: '🏢 How many PGs can I create (PG Creation)?',
    answer: 'As an owner, you can create UNLIMITED PGs (Hostels) under your single account!\n\n1. Go to "More" (or the Hostels screen).\n2. Tap "Add Hostel".\n3. Enter the new PG details.\n4. You can manage multiple buildings, boys/girls hostels, or branches seamlessly from one app.',
    keywords: ['pg creation', 'create hostel', 'unlimited pg', 'multiple hostels', 'add hostel'],
    routePath: 'AddHostel',
    routeLabel: 'Create New PG'
  },
  {
    id: 'dash-switch',
    category: 'dashboard',
    question: '🔄 What does "Switch" mean?',
    answer: '"Switch" allows you to instantly jump between the different PGs you own.\n\n• Go to "More" > "My Hostels".\n• Tap "Switch" next to the hostel name.\n• The entire dashboard, rooms, students, and financials will immediately change to show the data for the selected PG.',
    keywords: ['switch', 'switch hostel', 'change pg', 'multiple hostels'],
    routePath: 'Hostels',
    routeLabel: 'Switch Hostels'
  },
  {
    id: 'dash-bulk-delete',
    category: 'dashboard',
    question: '🗑️ What does Bulk Delete mean?',
    answer: 'Bulk Delete is a master admin feature.\n\n• It allows you to safely clear out old dummy data, old tenants, or reset entire hostels if you are starting fresh.\n• WARNING: This action cannot be undone, so use it carefully!',
    keywords: ['bulk delete', 'delete data', 'clear data', 'reset pg'],
    routePath: 'BulkDelete',
    routeLabel: 'Bulk Delete Data'
  },

  // ==================== 🚪 ROOMS & BEDS FEATURES ====================
  {
    id: 'rooms-add',
    category: 'rooms',
    question: '🚪 How do I Add a New Room (Room Creation)?',
    answer: 'To add a new room to your hostel:\n\n1. Tap the Add Room (Home icon) on the Dashboard.\n2. Type the Room Number and select the Floor (it must not exceed the maximum floors set in Hostel Settings).\n3. Select the Sharing Capacity (1 to 4 beds).\n4. Set the monthly rent price.\n5. Select amenities and tap Save.',
    keywords: ['add room', 'room creation', 'create room', 'sharing capacity', 'floor limit'],
    routePath: 'AddRoom',
    routeLabel: 'Add Room Screen'
  },
  {
    id: 'rooms-prebook',
    category: 'rooms',
    question: '📅 How does Pre-Booking work?',
    answer: 'Pre-Booking allows you to reserve a bed in advance:\n\n1. Open Pre-Booking from the Home Quick Management menu.\n2. Enter the tenant details and advance payment.\n3. **Mandatory Step**: You must allocate a specific room and bed for the booking.\n4. Once saved, the bed is reserved. You can Check In the student when they actually move in.',
    keywords: ['pre-booking', 'prebook', 'book advance', 'reserve room', 'mandatory allocation'],
    routePath: 'PreBooking',
    routeLabel: 'Go to Pre-Booking'
  },
  {
    id: 'rooms-vacate',
    category: 'rooms',
    question: '🧳 How do I Vacate a Bed?',
    answer: 'When a student leaves the hostel, you need to vacate their bed:\n\n1. Go to "Tenants" and tap on the student\'s name.\n2. Scroll down and tap "Vacate".\n3. This will mark the student as "Left", free up their bed in the Rooms list, and stop generating monthly rent dues for them.',
    keywords: ['vacate beds', 'vacate student', 'remove student', 'free bed'],
    routePath: 'Students',
    routeLabel: 'Go to Tenants'
  },

  // ==================== 👥 TENANTS, STAFF & GUESTS ====================
  {
    id: 'tenants-inside',
    category: 'tenants',
    question: '👤 What is "Students Inside" (Adding Tenants)?',
    answer: 'The Tenants (Students) screen shows everyone inside your PG.\n\n• To add someone: Tap "Add Tenant", select an empty room/bed, and upload their ID proof.\n• Active vs Inactive: You can filter the list to see who is currently staying vs who has vacated.\n• Tapping any student shows their full profile, dues, and payment history.',
    keywords: ['students inside', 'add tenant', 'add student', 'register student', 'id proof'],
    routePath: 'Students',
    routeLabel: 'Manage Students'
  },
  {
    id: 'tenants-guest',
    category: 'tenants',
    question: '🚶 How does the Guest feature work?',
    answer: 'The Guest feature lets you register temporary visitors or day-passes:\n\n1. Go to "Guests" in the Home Quick Management menu.\n2. Tap "Add Guest" to register their details and ID proof.\n3. You can log how many days they are staying and collect a daily/temporary guest fee.',
    keywords: ['guest', 'visitors', 'day pass', 'temporary stay', 'add guest'],
    routePath: 'Guests',
    routeLabel: 'Manage Guests'
  },
  {
    id: 'tenants-staff',
    category: 'tenants',
    question: '👷 How do I Manage Staff?',
    answer: 'You can manage your hostel workers (wardens, cleaners, security) from the Staff page:\n\n1. Tap "Staff" in the Home Quick Management menu.\n2. Tap "Add Staff" to register a new employee.\n3. You can log their salary payments and track their active status.',
    keywords: ['staff', 'employee', 'worker', 'cleaner', 'warden', 'security guard'],
    routePath: 'Staff',
    routeLabel: 'Manage Hostel Staff'
  },
  {
    id: 'tenants-requests',
    category: 'tenants',
    question: '✋ How do I handle Tenant Requests?',
    answer: 'Tenants can submit requests via their Tenant App (e.g., late entry pass, room change request).\n\n• You will see these in the "Requests" screen.\n• You can review the reason and tap "Approve" or "Reject". The student will be instantly notified.',
    keywords: ['requests', 'tenant requests', 'late pass', 'room change', 'approve request'],
    routePath: 'RequestsManagement',
    routeLabel: 'Manage Requests'
  },

  // ==================== 📱 TENANT APP INTEGRATION ====================
  {
    id: 'app-login',
    category: 'tenants',
    question: '📲 How does the Tenant App Login work?',
    answer: 'Your students have their own dedicated app! Here is how it works:\n\n1. Once you "Add" them in your Owner App, their phone number is registered.\n2. They download the DHostel Tenant App.\n3. They login using their registered Phone Number and receive an OTP.\n4. Once logged in, they see their rent dues, receipts, notice board, and mess menu directly linked to your PG!',
    keywords: ['tenant app login', 'how tenant app works', 'student login', 'tenant app'],
    routePath: 'Main',
    routeLabel: 'Home Screen'
  },
  {
    id: 'app-complaints',
    category: 'tenants',
    question: '🛠️ How do Complaints work?',
    answer: 'Students can raise issues (like a broken fan or plumbing issue) from their Tenant App.\n\n• Go to "Complaints" on your Owner dashboard.\n• You will see a list of all issues.\n• Once you fix the issue, you can mark it as "Resolved", which updates the student\'s app.',
    keywords: ['complaints', 'issues', 'maintenance', 'resolve complaint'],
    routePath: 'ComplaintsManagement',
    routeLabel: 'Manage Complaints'
  },
  {
    id: 'app-mess-menu',
    category: 'tenants',
    question: '🍽️ What is Mess Menu and Stars?',
    answer: 'You can publish your weekly food menu to the Tenant App!\n\n• Mess Menu: Use "Mess Menu" to set what is for Breakfast, Lunch, and Dinner each day.\n• Stars (Ratings): Students can view the menu in their app and give "Star Ratings" (1 to 5 stars) for the food quality. You can see these ratings in the Ratings Management screen to improve your kitchen!',
    keywords: ['mess menu', 'food menu', 'stars', 'ratings', 'food rating'],
    routePath: 'MessMenuManagement',
    routeLabel: 'Manage Mess Menu'
  },

  // ==================== 💵 FINANCIALS FEATURES ====================
  {
    id: 'fin-collect',
    category: 'financials',
    question: '💰 How does Collect Rent work?',
    answer: 'To collect monthly rent from a student:\n\n1. Go to the Financial Hub and tap "Due Report" or tap a student in the Tenants list.\n2. Tap "Collect Payment".\n3. Enter the amount paid and select the payment mode (Cash, UPI, Bank).\n4. A digital receipt is generated instantly.',
    keywords: ['collect rent', 'take payment', 'rent money', 'upi', 'cash'],
    routePath: 'PendingPayments',
    routeLabel: 'Collect Due Rents'
  },
  {
    id: 'fin-verify',
    category: 'financials',
    question: '✅ How does Verify Rent work?',
    answer: 'If a student pays rent online via the Tenant App or uploads a UPI screenshot:\n\n1. The payment comes to you as "Pending Verification".\n2. Open "Payment Verification" (or Tenant Transactions).\n3. Check their screenshot to confirm the money hit your bank account.\n4. Tap "Verify" to officially mark their rent as Paid.',
    keywords: ['verify rent', 'approve payment', 'verify screenshot', 'pending payment'],
    routePath: 'PaymentVerification',
    routeLabel: 'Verify Payments'
  },
  {
    id: 'fin-receipts',
    category: 'financials',
    question: '🧾 Where are Payment Receipts (Download Receipts)?',
    answer: 'All verified payments are logged in the "Collected Payments" screen.\n\n• Tap on any transaction to view the digital receipt.\n• You can use "Download Receipts" to generate a PDF of the receipt to share on WhatsApp or print.',
    keywords: ['receipts history', 'download receipts', 'pdf receipt', 'print receipt'],
    routePath: 'CollectedPayments',
    routeLabel: 'Check Receipts History'
  },
  {
    id: 'fin-expenses',
    category: 'financials',
    question: '💡 Where are Expenses and Bills?',
    answer: 'Use the "Bills" or "Expenses" feature to record your hostel\'s operating costs.\n\n1. Go to "Expenses" on the Home page.\n2. Tap "Add Expense" to log electricity, water, groceries, or maintenance bills.\n3. You can attach a photo of the physical bill and mark it as Paid/Pending to keep accurate records.',
    keywords: ['expenses', 'bills', 'utility bills', 'electricity', 'water bill', 'operating costs'],
    routePath: 'Expense',
    routeLabel: 'Manage Expenses'
  },
  {
    id: 'fin-incomes',
    category: 'financials',
    question: '💵 What is Incomes?',
    answer: 'Incomes are used to track extra money made outside of standard bed rent.\n\n• Examples: Washing machine coin collections, late fee fines, or visitor day-passes.\n• Log these under the "Incomes" tab so they are added to your total monthly revenue.',
    keywords: ['incomes', 'extra income', 'fines', 'washing machine', 'other income'],
    routePath: 'InCome',
    routeLabel: 'Manage Incomes'
  },
  {
    id: 'fin-reports',
    category: 'financials',
    question: '📊 How do Reports work?',
    answer: 'The Reports screen gives you a complete financial breakdown:\n\n• It calculates your Total Rent Collected + Extra Incomes minus your Total Expenses.\n• This helps you understand your exact Profit/Loss and cash flow for any given month.',
    keywords: ['reports', 'profit loss', 'cash flow', 'financial reports', 'revenue'],
    routePath: 'Reports',
    routeLabel: 'View Reports'
  },

  // ==================== 🔔 ALERTS & MORE FEATURES ====================
  {
    id: 'alerts-notices',
    category: 'alerts',
    question: '📢 What is the Notice Board meaning?',
    answer: 'The Notice Board is a broadcast system.\n\n1. You write a message (e.g. "Water shortage tomorrow from 10 AM").\n2. You publish it.\n3. It instantly alerts every active student in their Tenant App so you don\'t have to message them individually.',
    keywords: ['notices', 'notice board', 'announcement', 'publish message', 'broadcast'],
    routePath: 'NoticesManagement',
    routeLabel: 'Manage Notices'
  },
  {
    id: 'alerts-reminders',
    category: 'alerts',
    question: '🔔 What is the Reminders use case?',
    answer: 'Reminders are used specifically for pending dues.\n\n• Use Case: On the 5th of the month, open the Reminders (or Pending Dues) screen.\n• Tap the WhatsApp icon next to a defaulter\'s name.\n• It automatically drafts a polite message with their exact due amount and sends it to their phone.',
    keywords: ['reminder', 'use case', 'whatsapp reminder', 'pending dues alert'],
    routePath: 'Reminders',
    routeLabel: 'Send Reminders'
  },
  {
    id: 'alerts-logout',
    category: 'alerts',
    question: '🔒 How do I Log Out?',
    answer: 'To log out of the DHostel app safely:\n\n1. Tap your Profile avatar at the top right of the Home screen.\n2. A dropdown menu will appear.\n3. Tap "Sign Out". Your session will be cleared and you will be returned to the Login screen.',
    keywords: ['log out', 'sign out', 'exit', 'profile menu'],
    routePath: 'Main',
    routeLabel: 'Go to Home'
  }
];

export const FAQ_DATA_TE: FAQItem[] = FAQ_DATA_EN.map(faq => ({
  ...faq,
  question: faq.question + ' (Telugu Translation Pending)',
  answer: faq.answer + '\n\n(Telugu translation will be updated automatically in the next sync.)'
}));
