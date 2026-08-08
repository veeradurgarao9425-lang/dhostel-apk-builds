/**
 * intentEngine.ts
 * Maps natural language user input → structured AssistantIntent.
 * No external NLP library needed — keyword + pattern matching covers all real use cases.
 */

export type AssistantIntent =
  | { type: 'SHOW_HOME' }
  | { type: 'SHOW_STUDENTS' }
  | { type: 'SHOW_DUES'; filter?: 'overdue' | 'pending' | 'all' }
  | { type: 'SHOW_ROOMS' }
  | { type: 'SHOW_PAYMENTS' }
  | { type: 'SHOW_REPORTS' }
  | { type: 'SHOW_EXPENSES' }
  | { type: 'SHOW_INCOME' }
  | { type: 'SHOW_HOW_TO'; action: HowToAction }
  | { type: 'SHOW_NAVIGATE'; screen: string; label: string }
  | { type: 'SHOW_STAFF' }
  | { type: 'SHOW_BILLS' }
  | { type: 'SHOW_GUESTS' }
  | { type: 'SHOW_NOTICES' }
  | { type: 'UNKNOWN'; query: string };

export type HowToAction =
  | 'add_student'
  | 'add_room'
  | 'collect_rent'
  | 'assign_bed'
  | 'add_expense'
  | 'add_income'
  | 'view_reports'
  | 'view_dues'
  | 'generate_receipt'
  | 'update_student'
  | 'add_staff'
  | 'add_notice'
  | 'switch_hostel'
  | 'pre_booking';

interface Rule {
  keywords: string[];
  intent: AssistantIntent;
  priority?: number;
}

const RULES: Rule[] = [
  // ── How-to patterns (highest priority) ─────────────────────────────────────
  {
    keywords: ['how', 'add', 'student', 'tenant', 'register', 'new student'],
    intent: { type: 'SHOW_HOW_TO', action: 'add_student' },
    priority: 10,
  },
  {
    keywords: ['how', 'add', 'room', 'create room', 'new room'],
    intent: { type: 'SHOW_HOW_TO', action: 'add_room' },
    priority: 10,
  },
  {
    keywords: ['how', 'collect', 'rent', 'payment', 'fee'],
    intent: { type: 'SHOW_HOW_TO', action: 'collect_rent' },
    priority: 10,
  },
  {
    keywords: ['how', 'assign', 'bed', 'allocate bed', 'room assign'],
    intent: { type: 'SHOW_HOW_TO', action: 'assign_bed' },
    priority: 10,
  },
  {
    keywords: ['how', 'add', 'expense', 'bill', 'record expense'],
    intent: { type: 'SHOW_HOW_TO', action: 'add_expense' },
    priority: 10,
  },
  {
    keywords: ['how', 'add', 'income', 'record income'],
    intent: { type: 'SHOW_HOW_TO', action: 'add_income' },
    priority: 10,
  },
  {
    keywords: ['how', 'view', 'report', 'generate report'],
    intent: { type: 'SHOW_HOW_TO', action: 'view_reports' },
    priority: 10,
  },
  {
    keywords: ['how', 'check', 'due', 'view dues'],
    intent: { type: 'SHOW_HOW_TO', action: 'view_dues' },
    priority: 10,
  },
  {
    keywords: ['how', 'receipt', 'generate receipt', 'download receipt'],
    intent: { type: 'SHOW_HOW_TO', action: 'generate_receipt' },
    priority: 10,
  },
  {
    keywords: ['how', 'update', 'edit', 'student', 'change student'],
    intent: { type: 'SHOW_HOW_TO', action: 'update_student' },
    priority: 10,
  },
  {
    keywords: ['how', 'add', 'staff', 'create staff'],
    intent: { type: 'SHOW_HOW_TO', action: 'add_staff' },
    priority: 10,
  },
  {
    keywords: ['how', 'notice', 'add notice', 'create notice'],
    intent: { type: 'SHOW_HOW_TO', action: 'add_notice' },
    priority: 10,
  },
  {
    keywords: ['how', 'switch', 'hostel', 'change hostel', 'change pg'],
    intent: { type: 'SHOW_HOW_TO', action: 'switch_hostel' },
    priority: 10,
  },
  {
    keywords: ['how', 'pre-book', 'prebook', 'pre booking', 'book advance'],
    intent: { type: 'SHOW_HOW_TO', action: 'pre_booking' },
    priority: 10,
  },

  // ── Dues / Payments Due ────────────────────────────────────────────────────
  {
    keywords: ['overdue', 'over due', 'late payment', 'defaulter'],
    intent: { type: 'SHOW_DUES', filter: 'overdue' },
    priority: 8,
  },
  {
    keywords: ['pending due', 'pending payment', 'who hasn\'t paid', 'who has not paid', 'pending rent'],
    intent: { type: 'SHOW_DUES', filter: 'pending' },
    priority: 8,
  },
  {
    keywords: ['due', 'dues', 'unpaid', 'not paid', 'outstanding', 'owe'],
    intent: { type: 'SHOW_DUES', filter: 'all' },
    priority: 5,
  },

  // ── Students ───────────────────────────────────────────────────────────────
  {
    keywords: ['student', 'tenant', 'tenants', 'students', 'how many student', 'list student', 'show student', 'active student'],
    intent: { type: 'SHOW_STUDENTS' },
    priority: 5,
  },

  // ── Rooms / Beds / Occupancy ───────────────────────────────────────────────
  {
    keywords: ['room', 'rooms', 'bed', 'beds', 'occupancy', 'available bed', 'occupied', 'capacity'],
    intent: { type: 'SHOW_ROOMS' },
    priority: 5,
  },

  // ── Payments / Collection ──────────────────────────────────────────────────
  {
    keywords: ['payment', 'payments', 'collection', 'collected', 'received', 'how much collected', 'today collection', 'receipt'],
    intent: { type: 'SHOW_PAYMENTS' },
    priority: 5,
  },

  // ── Reports / Financial ────────────────────────────────────────────────────
  {
    keywords: ['report', 'reports', 'financial', 'profit', 'loss', 'net', 'revenue', 'summary', 'overview'],
    intent: { type: 'SHOW_REPORTS' },
    priority: 5,
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  {
    keywords: ['expense', 'expenses', 'spend', 'spent', 'cost', 'electricity', 'maintenance', 'bill'],
    intent: { type: 'SHOW_EXPENSES' },
    priority: 5,
  },

  // ── Income ────────────────────────────────────────────────────────────────
  {
    keywords: ['income', 'incomes', 'revenue', 'earning', 'earned'],
    intent: { type: 'SHOW_INCOME' },
    priority: 5,
  },

  // ── Staff ─────────────────────────────────────────────────────────────────
  {
    keywords: ['staff', 'employee', 'warden', 'worker', 'salary'],
    intent: { type: 'SHOW_STAFF' },
    priority: 5,
  },

  // ── Bills / Reminders ─────────────────────────────────────────────────────
  {
    keywords: ['bill reminders', 'reminder', 'reminders', 'utility bill', 'upcoming bill'],
    intent: { type: 'SHOW_BILLS' },
    priority: 5,
  },

  // ── Guests ────────────────────────────────────────────────────────────────
  {
    keywords: ['guest', 'guests', 'visitor', 'temporary stay', 'day pass'],
    intent: { type: 'SHOW_GUESTS' },
    priority: 5,
  },

  // ── Notices ───────────────────────────────────────────────────────────────
  {
    keywords: ['notice', 'notices', 'announcement', 'broadcast', 'message'],
    intent: { type: 'SHOW_NOTICES' },
    priority: 5,
  },
];

/**
 * Resolve a natural language query to the most relevant intent.
 * Returns the intent with the highest score across keyword matches.
 */
export function resolveIntent(query: string): AssistantIntent {
  const q = query.toLowerCase().trim();

  if (!q) return { type: 'SHOW_HOME' };

  let best: { intent: AssistantIntent; score: number } = {
    intent: { type: 'UNKNOWN', query },
    score: 0,
  };

  for (const rule of RULES) {
    let score = 0;
    const basePriority = rule.priority ?? 5;

    for (const kw of rule.keywords) {
      if (q.includes(kw)) {
        // Exact phrase match gets more weight than single word
        const wordCount = kw.split(' ').length;
        score += wordCount > 1 ? basePriority * 2 : basePriority;
      }
    }

    if (score > best.score) {
      best = { intent: rule.intent, score };
    }
  }

  return best.intent;
}

/**
 * Quick category chips for the sidebar navigation.
 * Maps to the real navigation routes.
 */
export const SIDEBAR_CATEGORIES = [
  {
    section: 'Hostel',
    items: [
      { label: 'Dashboard', icon: 'home-outline', intent: { type: 'SHOW_HOME' } as AssistantIntent },
      { label: 'Students', icon: 'people-outline', intent: { type: 'SHOW_STUDENTS' } as AssistantIntent },
      { label: 'Rooms & Beds', icon: 'business-outline', intent: { type: 'SHOW_ROOMS' } as AssistantIntent },
      { label: 'Guests', icon: 'person-outline', intent: { type: 'SHOW_GUESTS' } as AssistantIntent },
      { label: 'Staff', icon: 'briefcase-outline', intent: { type: 'SHOW_STAFF' } as AssistantIntent },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Pending Dues', icon: 'alert-circle-outline', intent: { type: 'SHOW_DUES', filter: 'all' } as AssistantIntent },
      { label: 'Payments', icon: 'wallet-outline', intent: { type: 'SHOW_PAYMENTS' } as AssistantIntent },
      { label: 'Expenses', icon: 'card-outline', intent: { type: 'SHOW_EXPENSES' } as AssistantIntent },
      { label: 'Income', icon: 'trending-up-outline', intent: { type: 'SHOW_INCOME' } as AssistantIntent },
      { label: 'Bills', icon: 'document-text-outline', intent: { type: 'SHOW_BILLS' } as AssistantIntent },
    ],
  },
  {
    section: 'Reports',
    items: [
      { label: 'Financial Overview', icon: 'bar-chart-outline', intent: { type: 'SHOW_REPORTS' } as AssistantIntent },
    ],
  },
  {
    section: 'Help',
    items: [
      { label: 'Add a Student', icon: 'person-add-outline', intent: { type: 'SHOW_HOW_TO', action: 'add_student' } as AssistantIntent },
      { label: 'Add a Room', icon: 'add-circle-outline', intent: { type: 'SHOW_HOW_TO', action: 'add_room' } as AssistantIntent },
      { label: 'Collect Rent', icon: 'cash-outline', intent: { type: 'SHOW_HOW_TO', action: 'collect_rent' } as AssistantIntent },
      { label: 'Record Expense', icon: 'receipt-outline', intent: { type: 'SHOW_HOW_TO', action: 'add_expense' } as AssistantIntent },
    ],
  },
];

/**
 * Suggested quick questions for the home screen.
 * Grouped by contextual relevance.
 */
export const QUICK_QUESTIONS = [
  'Who hasn\'t paid this month?',
  'How many students are staying?',
  'How many beds are available?',
  'What did I collect this month?',
  'Show overdue dues',
  'What are my this month\'s expenses?',
  'How do I add a student?',
  'How do I collect rent?',
  'Show financial summary',
  'What is my hostel occupancy?',
];

/**
 * How-to steps for each action — matches the real app UI flows.
 */
export const HOW_TO_STEPS: Record<HowToAction, { title: string; steps: string[]; screen?: string; screenLabel?: string }> = {
  add_student: {
    title: 'How to Add a Student / Tenant',
    steps: [
      'Go to the Students screen from the bottom tab or menu.',
      'Tap the "+" / Add Tenant button.',
      'Enter student details: Name, Phone, Gender.',
      'Select the Room and Bed to allocate.',
      'Set Monthly Rent and Joining Date.',
      'Upload ID Proof (Aadhar, PAN, etc.).',
      'Tap Save — the student is now active.',
    ],
    screen: 'AddStudent',
    screenLabel: 'Add Student Now',
  },
  add_room: {
    title: 'How to Add a Room',
    steps: [
      'Go to Rooms from the bottom tab or dashboard.',
      'Tap the "+" / Add Room button.',
      'Enter Room Number and select the Floor.',
      'Set Sharing Capacity (1 to 4 beds).',
      'Enter Monthly Rent for this room.',
      'Select amenities if applicable.',
      'Tap Save to create the room.',
    ],
    screen: 'AddRoom',
    screenLabel: 'Add Room Now',
  },
  collect_rent: {
    title: 'How to Collect Rent',
    steps: [
      'Open Pending Dues from the dashboard or bottom tab.',
      'Find the student whose rent you want to collect.',
      'Tap "Collect Payment" on their card.',
      'Enter the amount paid.',
      'Select payment mode: Cash, UPI, or Bank Transfer.',
      'Tap Confirm — a receipt is generated instantly.',
    ],
    screen: 'PendingPayments',
    screenLabel: 'View Pending Dues',
  },
  assign_bed: {
    title: 'How to Assign / Allocate a Bed',
    steps: [
      'When adding a student, select the Room first.',
      'Available beds in that room will be shown.',
      'Tap on an available bed to select it.',
      'The bed is automatically allocated when you save the student.',
      'You can also reassign from Student Details > Edit.',
    ],
    screen: 'Students',
    screenLabel: 'Go to Students',
  },
  add_expense: {
    title: 'How to Record an Expense',
    steps: [
      'Open Expenses from the dashboard or menu.',
      'Tap "Add Expense".',
      'Select the expense category (Electricity, Maintenance, Food, etc.).',
      'Enter the amount and date.',
      'Optionally add a description and attach a bill photo.',
      'Tap Save to record the expense.',
    ],
    screen: 'AddExpense',
    screenLabel: 'Add Expense Now',
  },
  add_income: {
    title: 'How to Record Income',
    steps: [
      'Open Income from the menu or dashboard.',
      'Tap "Add Income".',
      'Enter the income source and amount.',
      'Select the date of income.',
      'Add a note if needed.',
      'Tap Save.',
    ],
    screen: 'AddIncome',
    screenLabel: 'Add Income Now',
  },
  view_reports: {
    title: 'How to View Reports',
    steps: [
      'Tap "Reports" from the More menu or dashboard.',
      'Choose a date range (This Month, Last Month, Custom, etc.).',
      'View financial summary: Income, Expenses, Net Profit.',
      'Scroll to see the trend chart and collection rate.',
      'Tap Download to export as Excel or PDF.',
    ],
    screen: 'Reports',
    screenLabel: 'Open Reports',
  },
  view_dues: {
    title: 'How to View Pending Dues',
    steps: [
      'Tap "Pending Dues" from the bottom tab or dashboard.',
      'See all students with pending payments.',
      'Filter by Overdue, This Month, or Custom date.',
      'Tap a student to collect their payment.',
      'Use the Reminders button to send WhatsApp alerts.',
    ],
    screen: 'PendingPayments',
    screenLabel: 'View Pending Dues',
  },
  generate_receipt: {
    title: 'How to Generate / Download a Receipt',
    steps: [
      'After collecting rent, a receipt is auto-generated.',
      'Go to Collected Payments or the student\'s payment history.',
      'Tap on any payment entry.',
      'Tap "Download Receipt" to save or share as PDF.',
    ],
    screen: 'CollectedPayments',
    screenLabel: 'View Collected Payments',
  },
  update_student: {
    title: 'How to Update Student Details',
    steps: [
      'Go to Students and tap the student\'s name.',
      'In their profile, tap the Edit (pencil) icon.',
      'Update the required fields.',
      'Tap Save to apply changes.',
    ],
    screen: 'Students',
    screenLabel: 'Go to Students',
  },
  add_staff: {
    title: 'How to Add Staff',
    steps: [
      'Open Staff from the dashboard quick actions or menu.',
      'Tap "Add Staff".',
      'Enter Name, Role, Phone, and Salary.',
      'Tap Save.',
    ],
    screen: 'AddStaff',
    screenLabel: 'Add Staff Now',
  },
  add_notice: {
    title: 'How to Post a Notice',
    steps: [
      'Open Notice Management from the menu.',
      'Tap "Add Notice".',
      'Write your notice title and content.',
      'Tap Post — all tenants receive an instant notification.',
    ],
    screen: 'NoticesManagement',
    screenLabel: 'Manage Notices',
  },
  switch_hostel: {
    title: 'How to Switch Between Hostels',
    steps: [
      'Tap the Hostel Name in the home screen header.',
      'A list of your hostels will appear.',
      'Tap "Switch" next to the hostel you want.',
      'All data — students, rooms, finances — will reload for that hostel.',
    ],
    screen: 'Hostels',
    screenLabel: 'View My Hostels',
  },
  pre_booking: {
    title: 'How to Pre-Book a Bed',
    steps: [
      'Go to Pre-Booking from the dashboard quick actions.',
      'Enter the prospective tenant\'s name and contact.',
      'Select the Room and Bed to reserve.',
      'Collect advance payment if applicable.',
      'Tap Save — the bed is reserved until check-in.',
    ],
    screen: 'PreBooking',
    screenLabel: 'Go to Pre-Booking',
  },
};
