export interface FAQItem {
  id: string;
  category: 'dashboard' | 'rooms' | 'tenants' | 'financials' | 'alerts' | 'profile' | 'staff' | 'notices' | 'guests' | 'mess' | 'complaints' | 'reports';
  role: 'owner' | 'tenant' | 'both';
  question: string;
  answer: string;
  steps?: string[];
  keywords: string[];
  routePath?: string;
  routeLabel?: string;
}

export const FAQ_DATA_EN: FAQItem[] = [
  // ==================== 📊 DASHBOARD / MULTIPLE PGs (Owner) ====================
  {
    id: 'dash-greeting', category: 'dashboard', role: 'owner',
    question: '👋 What is on the Home Screen Header?',
    answer: 'The Home page top header contains:\n\n• Greeting: Says Good Morning/Afternoon based on time.\n• Owner Name: Displays your full name.\n• Hostel Name: Displays your active hostel.\n• Notifications Bell: Located at the top right. Shows a yellow warning dot if there are unread alerts.',
    keywords: ['greeting', 'owner name', 'hostel name', 'bell', 'alert dot', 'notification', 'header'],
    routePath: 'Main', routeLabel: 'Go to Home Screen'
  },
  {
    id: 'dash-pg-creation', category: 'dashboard', role: 'owner',
    question: '🏢 How many PGs can I create (PG Creation)?',
    answer: 'As an owner, you can create UNLIMITED PGs (Hostels) under your single account!\n\n1. Go to "More" (or the Hostels screen).\n2. Tap "Add Hostel".\n3. Enter the new PG details.\n4. You can manage multiple buildings, boys/girls hostels, or branches seamlessly from one app.',
    keywords: ['pg creation', 'create hostel', 'unlimited pg', 'multiple hostels', 'add hostel'],
    routePath: 'AddHostel', routeLabel: 'Create New PG'
  },
  {
    id: 'dash-switch', category: 'dashboard', role: 'owner',
    question: '🔄 What does "Switch" mean?',
    answer: '"Switch" allows you to instantly jump between the different PGs you own.\n\n• Go to "More" > "My Hostels".\n• Tap "Switch" next to the hostel name.\n• The entire dashboard, rooms, students, and financials will immediately change to show the data for the selected PG.',
    keywords: ['switch', 'switch hostel', 'change pg', 'multiple hostels'],
    routePath: 'Hostels', routeLabel: 'Switch Hostels'
  },
  {
    id: 'dash-bulk-delete', category: 'dashboard', role: 'owner',
    question: '🗑️ What does Bulk Delete mean?',
    answer: 'Bulk Delete is a master admin feature.\n\n• It allows you to safely clear out old dummy data, old tenants, or reset entire hostels if you are starting fresh.\n• WARNING: This action cannot be undone, so use it carefully!',
    keywords: ['bulk delete', 'delete data', 'clear data', 'reset pg'],
    routePath: 'BulkDelete', routeLabel: 'Bulk Delete Data'
  },

  // ==================== 🚪 ROOMS & BEDS FEATURES (Owner) ====================
  {
    id: 'rooms-add', category: 'rooms', role: 'owner',
    question: '🚪 How do I Add a New Room (Room Creation)?',
    answer: 'To add a new room to your hostel:\n\n1. Tap the Add Room (Home icon) on the Dashboard.\n2. Type the Room Number and select the Floor (it must not exceed the maximum floors set in Hostel Settings).\n3. Select the Sharing Capacity (1 to 4 beds).\n4. Set the monthly rent price.\n5. Select amenities and tap Save.',
    keywords: ['add room', 'room creation', 'create room', 'sharing capacity', 'floor limit'],
    routePath: 'AddRoom', routeLabel: 'Add Room Screen'
  },
  {
    id: 'rooms-prebook', category: 'rooms', role: 'owner',
    question: '📅 How does Pre-Booking work?',
    answer: 'Pre-Booking allows you to reserve a bed in advance:\n\n1. Open Pre-Booking from the Home Quick Management menu.\n2. Enter the tenant details and advance payment.\n3. **Mandatory Step**: You must allocate a specific room and bed for the booking.\n4. Once saved, the bed is reserved. You can Check In the student when they actually move in.',
    keywords: ['pre-booking', 'prebook', 'book advance', 'reserve room', 'mandatory allocation'],
    routePath: 'PreBooking', routeLabel: 'Go to Pre-Booking'
  },
  {
    id: 'rooms-vacate', category: 'rooms', role: 'owner',
    question: '🧳 How do I Vacate a Bed?',
    answer: 'When a student leaves the hostel, you need to vacate their bed:\n\n1. Go to "Tenants" and tap on the student\'s name.\n2. Scroll down and tap "Vacate".\n3. This will mark the student as "Left", free up their bed in the Rooms list, and stop generating monthly rent dues for them.',
    keywords: ['vacate beds', 'vacate student', 'remove student', 'free bed'],
    routePath: 'Students', routeLabel: 'Go to Tenants'
  },

  // ==================== 👥 TENANTS, STAFF & GUESTS (Owner) ====================
  {
    id: 'tenants-inside', category: 'tenants', role: 'owner',
    question: '👤 What is "Students Inside" (Adding Tenants)?',
    answer: 'The Tenants (Students) screen shows everyone inside your PG.\n\n• To add someone: Tap "Add Tenant", select an empty room/bed, and upload their ID proof.\n• Active vs Inactive: You can filter the list to see who is currently staying vs who has vacated.\n• Tapping any student shows their full profile, dues, and payment history.',
    keywords: ['students inside', 'add tenant', 'add student', 'register student', 'id proof'],
    routePath: 'Students', routeLabel: 'Manage Students'
  },
  {
    id: 'tenants-guest', category: 'tenants', role: 'owner',
    question: '🚶 How does the Guest feature work?',
    answer: 'The Guest feature lets you register temporary visitors or day-passes:\n\n1. Go to "Guests" in the Home Quick Management menu.\n2. Tap "Add Guest" to register their details and ID proof.\n3. You can log how many days they are staying and collect a daily/temporary guest fee.',
    keywords: ['guest', 'visitors', 'day pass', 'temporary stay', 'add guest'],
    routePath: 'Guests', routeLabel: 'Manage Guests'
  },
  {
    id: 'tenants-staff', category: 'tenants', role: 'owner',
    question: '👷 How do I Manage Staff?',
    answer: 'You can manage your hostel workers (wardens, cleaners, security) from the Staff page:\n\n1. Tap "Staff" in the Home Quick Management menu.\n2. Tap "Add Staff" to register a new employee.\n3. You can log their salary payments and track their active status.',
    keywords: ['staff', 'employee', 'worker', 'cleaner', 'warden', 'security guard'],
    routePath: 'Staff', routeLabel: 'Manage Hostel Staff'
  },
  {
    id: 'tenants-requests', category: 'tenants', role: 'owner',
    question: '✋ How do I handle Tenant Requests?',
    answer: 'Tenants can submit requests via their Tenant App (e.g., late entry pass, room change request).\n\n• You will see these in the "Requests" screen.\n• You can review the reason and tap "Approve" or "Reject". The student will be instantly notified.',
    keywords: ['requests', 'tenant requests', 'late pass', 'room change', 'approve request'],
    routePath: 'RequestsManagement', routeLabel: 'Manage Requests'
  },

  // ==================== 💵 FINANCIALS FEATURES (Owner) ====================
  {
    id: 'fin-collect', category: 'financials', role: 'owner',
    question: '💰 How does Collect Rent work?',
    answer: 'To collect monthly rent from a student:\n\n1. Go to the Financial Hub and tap "Due Report" or tap a student in the Tenants list.\n2. Tap "Collect Payment".\n3. Enter the amount paid and select the payment mode (Cash, UPI, Bank).\n4. A digital receipt is generated instantly.',
    keywords: ['collect rent', 'take payment', 'rent money', 'upi', 'cash'],
    routePath: 'PendingPayments', routeLabel: 'Collect Due Rents'
  },
  {
    id: 'fin-verify', category: 'financials', role: 'owner',
    question: '✅ How does Verify Rent work?',
    answer: 'If a student pays rent online via the Tenant App or uploads a UPI screenshot:\n\n1. The payment comes to you as "Pending Verification".\n2. Open "Payment Verification" (or Tenant Transactions).\n3. Check their screenshot to confirm the money hit your bank account.\n4. Tap "Verify" to officially mark their rent as Paid.',
    keywords: ['verify rent', 'approve payment', 'verify screenshot', 'pending payment'],
    routePath: 'PaymentVerification', routeLabel: 'Verify Payments'
  },
  {
    id: 'fin-receipts', category: 'financials', role: 'owner',
    question: '🧾 Where are Payment Receipts (Download Receipts)?',
    answer: 'All verified payments are logged in the "Collected Payments" screen.\n\n• Tap on any transaction to view the digital receipt.\n• You can use "Download Receipts" to generate a PDF of the receipt to share on WhatsApp or print.',
    keywords: ['receipts history', 'download receipts', 'pdf receipt', 'print receipt'],
    routePath: 'CollectedPayments', routeLabel: 'Check Receipts History'
  },
  {
    id: 'fin-expenses', category: 'financials', role: 'owner',
    question: '💡 Where are Expenses and Bills?',
    answer: 'Use the "Bills" or "Expenses" feature to record your hostel\'s operating costs.\n\n1. Go to "Expenses" on the Home page.\n2. Tap "Add Expense" to log electricity, water, groceries, or maintenance bills.\n3. You can attach a photo of the physical bill and mark it as Paid/Pending to keep accurate records.',
    keywords: ['expenses', 'bills', 'utility bills', 'electricity', 'water bill', 'operating costs'],
    routePath: 'Expenses', routeLabel: 'Manage Expenses'
  },
  {
    id: 'fin-reports', category: 'financials', role: 'owner',
    question: '📊 How do Reports work?',
    answer: 'The Reports screen gives you a complete financial breakdown:\n\n• It calculates your Total Rent Collected + Extra Incomes minus your Total Expenses.\n• This helps you understand your exact Profit/Loss and cash flow for any given month.',
    keywords: ['reports', 'profit loss', 'cash flow', 'financial reports', 'revenue'],
    routePath: 'Reports', routeLabel: 'View Reports'
  },

  // ==================== 🔔 ALERTS & MORE FEATURES (Owner) ====================
  {
    id: 'alerts-notices', category: 'alerts', role: 'owner',
    question: '📢 What is the Notice Board meaning?',
    answer: 'The Notice Board is a broadcast system.\n\n1. You write a message (e.g. "Water shortage tomorrow from 10 AM").\n2. You publish it.\n3. It instantly alerts every active student in their Tenant App so you don\'t have to message them individually.',
    keywords: ['notices', 'notice board', 'announcement', 'publish message', 'broadcast'],
    routePath: 'NoticesManagement', routeLabel: 'Manage Notices'
  },
  {
    id: 'alerts-reminders', category: 'alerts', role: 'owner',
    question: '🔔 What is the Reminders use case?',
    answer: 'Reminders are used specifically for pending dues.\n\n• Use Case: On the 5th of the month, open the Reminders (or Pending Dues) screen.\n• Tap the WhatsApp icon next to a defaulter\'s name.\n• It automatically drafts a polite message with their exact due amount and sends it to their phone.',
    keywords: ['reminder', 'use case', 'whatsapp reminder', 'pending dues alert'],
    routePath: 'Reminders', routeLabel: 'Send Reminders'
  },

  // ==================== 👔 TENANT SPECIFIC FAQs (Tenant) ====================
  {
    id: 'tenant-dues-pay', category: 'financials', role: 'tenant',
    question: '💳 How do I pay my rent?',
    answer: 'Paying rent is easy!\n\n1. Go to your Dashboard or Dues section.\n2. Tap on "Pay Now" next to your pending amount.\n3. You can use UPI or upload a screenshot of your payment.\n4. Your payment will be verified by the owner.',
    keywords: ['pay rent', 'rent', 'upi', 'payment', 'due', 'pay now'],
    routePath: 'Payments', routeLabel: 'Pay Rent'
  },
  {
    id: 'tenant-dues-receipt', category: 'financials', role: 'tenant',
    question: '🧾 Where can I find my payment receipts?',
    answer: 'Once your payment is verified by the owner, a digital receipt is generated.\n\nYou can find all your past receipts in the Dues screen under the "History" or "Receipts" tab.',
    keywords: ['receipt', 'payment receipt', 'download receipt', 'history'],
    routePath: 'PaymentReceipt', routeLabel: 'View Receipts'
  },
  {
    id: 'tenant-complaints', category: 'alerts', role: 'tenant',
    question: '🛠️ How do I raise a complaint?',
    answer: 'Got a broken fan or a plumbing issue?\n\n1. Go to the "Complaints" section.\n2. Tap "Raise Complaint".\n3. Describe the issue and submit.\n4. You will be notified once the owner resolves it.',
    keywords: ['complaint', 'broken', 'issue', 'repair', 'maintenance'],
    routePath: 'Complaints', routeLabel: 'Raise Complaint'
  },
  {
    id: 'tenant-requests-pass', category: 'alerts', role: 'tenant',
    question: '✋ How do I request a late pass or room change?',
    answer: 'You can submit requests to your hostel owner directly from the app.\n\nGo to the "Requests" screen and select the type of request (Late Pass, Room Change, etc.). The owner will approve or reject it.',
    keywords: ['late pass', 'room change', 'request pass', 'permission'],
    routePath: 'VisitorPass', routeLabel: 'Submit Request'
  },
  {
    id: 'tenant-menu', category: 'dashboard', role: 'tenant',
    question: '🍽️ Where can I see the food menu?',
    answer: 'You can view the daily and weekly Mess Menu right from your Home screen or the Full Menu page. You can even rate the food (1 to 5 stars) to give feedback to your owner!',
    keywords: ['food menu', 'mess menu', 'breakfast', 'dinner', 'rating'],
    routePath: 'FullMenu', routeLabel: 'View Mess Menu'
  },
  
  // ==================== 🌐 GENERAL FAQs (Both) ====================
  {
    id: 'general-logout', category: 'profile', role: 'both',
    question: '🔒 How do I Log Out?',
    answer: 'To log out of the DHostel app safely:\n\n1. Go to your Profile settings.\n2. Scroll down and tap "Sign Out". Your session will be cleared and you will be returned to the Login screen.',
    keywords: ['log out', 'sign out', 'exit', 'profile menu'],
    routePath: 'Profile', routeLabel: 'Go to Profile'
  },
  // ==================== NEW FEATURES ====================
  {
    id: 'feat-staff', category: 'staff', role: 'owner',
    question: '🧑‍💼 How to manage Staff?',
    answer: 'You can add and manage your hostel staff (wardens, cleaners, etc.) in the Staff section. Tap the button below to view Staff Management.',
    keywords: ['staff', 'manage staff', 'add staff', 'employees', 'warden'],
    routePath: 'Staff', routeLabel: 'Go to Staff'
  },
  {
    id: 'feat-notices', category: 'notices', role: 'both',
    question: '📢 How to view or create Notices?',
    answer: 'Notices are broadcast messages for your tenants. Owners can create them, and tenants can view them on their dashboard.',
    keywords: ['notice', 'notices', 'announcement', 'message'],
    routePath: 'Notices', routeLabel: 'Go to Notices'
  },
  {
    id: 'feat-guests', category: 'guests', role: 'owner',
    question: '👥 How to add Guests?',
    answer: 'Guest Management allows you to track temporary visitors. You can add their details and checkout dates.',
    keywords: ['guest', 'guests', 'visitor', 'add guest'],
    routePath: 'Guests', routeLabel: 'Go to Guests'
  },
  {
    id: 'feat-mess', category: 'mess', role: 'owner',
    question: '🍽️ How to update Mess Menu?',
    answer: 'The Mess Menu feature lets you define the daily food schedule (Breakfast, Lunch, Dinner) so tenants know what is being served.',
    keywords: ['mess', 'food', 'menu', 'lunch', 'dinner', 'breakfast'],
    routePath: 'MessMenuManagement', routeLabel: 'Go to Mess Menu'
  },
  {
    id: 'feat-complaints', category: 'complaints', role: 'both',
    question: '⚠️ How to handle Complaints?',
    answer: 'Tenants can raise maintenance or service complaints, and owners can track and resolve them through the Complaints Management screen.',
    keywords: ['complaint', 'complaints', 'issue', 'maintenance', 'fix'],
    routePath: 'ComplaintsManagement', routeLabel: 'Go to Complaints'
  },
  {
    id: 'feat-reports', category: 'reports', role: 'owner',
    question: '📄 How to view Reports?',
    answer: 'The Reports section provides detailed analytics and downloadable summaries of your hostel financials, tenant attendance, and more.',
    keywords: ['report', 'reports', 'analytics', 'download data'],
    routePath: 'Reports', routeLabel: 'Go to Reports'
  }
];

export const FAQ_DATA_TE: FAQItem[] = FAQ_DATA_EN.map(faq => ({
  ...faq,
  question: faq.question + ' (Telugu Translation Pending)',
  answer: faq.answer + '\n\n(Telugu translation will be updated automatically in the next sync.)'
}));
