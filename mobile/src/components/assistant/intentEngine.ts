/**
 * intentEngine.ts  (v3 — Massive Question Bank)
 *
 * Key improvements over v2:
 *  1. normalizeQuery()  — typo correction + synonym expansion before matching
 *  2. 400+ keyword rules across all 9 hostel-management modules
 *  3. extractRoomNumber() / extractFloorNumber() — dynamic param extraction
 *  4. conversationContext — simple follow-up / context tracking
 *  5. 60+ QUICK_QUESTIONS chips (categorized)
 *  6. 3 new HOW_TO_STEPS (deactivate_student, qr_registration, vacate_bed,
 *     send_reminder, mark_vacated)
 *
 * NO external NLP library — pure keyword + pattern matching.
 * All existing intents + how-to guides are preserved exactly.
 */

// ─── Intent Type ─────────────────────────────────────────────────────────────
export type AssistantIntent =
  | { type: 'SHOW_HOME' }
  | { type: 'SHOW_STUDENTS'; filter?: 'active' | 'inactive' | 'prebooked' | 'qr' | 'pending' | 'unallocated' | 'joined_this_month' | 'vacated_this_month' | 'vacate_notice' | 'vacate' | 'all' }
  | { type: 'SHOW_STUDENT_LIST_INLINE'; filter?: string }

  | { type: 'SHOW_STUDENT_SEARCH'; name: string }
  | { type: 'SHOW_ROOM_DETAIL'; roomNumber: number | string }
  | { type: 'SHOW_FLOOR_DETAIL'; floorNumber: number }
  | { type: 'SHOW_PAID_STUDENTS' }
  | { type: 'SHOW_DUES'; filter?: 'overdue' | 'pending' | 'all' }
  | { type: 'SHOW_ROOMS' }
  | { type: 'SHOW_ROOM_LIST_INLINE' }
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
  | { type: 'SHOW_HOSTELS' }
  | { type: 'SHOW_APP_INFO'; topic: 'owner' | 'goal' | 'usage' }
  | { type: 'SMALL_TALK'; subtype: 'greeting' | 'time' | 'feeling' | 'who_are_you' | 'my_name' | 'app_developer' | 'thanks' | 'bye' }
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
  | 'download_receipt'
  | 'prebook_room'
  | 'update_student'
  | 'add_staff'
  | 'add_notice'
  | 'switch_hostel'
  | 'pre_booking'
  | 'deactivate_student'
  | 'qr_registration'
  | 'vacate_bed'
  | 'send_reminder'
  | 'mark_vacated'
  | 'verify_rent'
  | 'view_payments_guide';


// ─── Conversation Context ─────────────────────────────────────────────────────
// Tracks last resolved intent category so follow-up questions work correctly.
// e.g. "how many rooms?" → "how many are full?" → resolves to SHOW_ROOMS
let _lastContext: AssistantIntent['type'] | null = null;

export function getLastContext() { return _lastContext; }
export function setLastContext(t: AssistantIntent['type'] | null) { _lastContext = t; }

// ─── Normalization ────────────────────────────────────────────────────────────
/**
 * normalizeQuery: lowercase + trim + correct common spelling mistakes
 * + expand Indian-English synonyms.
 * This runs BEFORE keyword matching so rules stay clean.
 */
const TYPO_MAP: [RegExp, string][] = [
  // Common hostel/PG typing mistakes
  [/\bdeativiate\b/g, 'deactivate'],
  [/\bdeactive\b/g, 'deactivate'],
  [/\bdeactivat\b/g, 'deactivate'],
  [/\bdeactivet\b/g, 'deactivate'],
  [/\bdiplicate\b/g, 'deactivate'],
  [/\bde-activate\b/g, 'deactivate'],
  [/\bdeactivating\b/g, 'deactivate'],
  [/\bstduents?\b/g, 'student'],
  [/\bstudnts?\b/g, 'student'],
  [/\bstudents?\b/g, 'student'],       // already correct, keep normalised
  [/\bstudnt\b/g, 'student'],
  [/\bstudant\b/g, 'student'],
  [/\bstuden\b/g, 'student'],
  [/\bstunt\b/g, 'student'],
  [/\bstudet\b/g, 'student'],
  [/\btenent\b/g, 'tenant'],
  [/\btenat\b/g, 'tenant'],
  [/\bvacat\b/g, 'vacate'],
  [/\bvakate\b/g, 'vacate'],
  [/\bvacatte\b/g, 'vacate'],
  [/\bvacating\b/g, 'vacate'],
  [/\bvacated\b/g, 'vacate'],
  [/\bvacent\b/g, 'vacate'],
  [/\bvacante\b/g, 'vacate'],
  [/\bvakant\b/g, 'vacate'],
  [/\bcolect\b/g, 'collect'],
  [/\bcollectes?\b/g, 'collect'],
  [/\bcolecting\b/g, 'collect'],
  [/\bcollecting\b/g, 'collect'],
  [/\bcolection\b/g, 'collection'],
  [/\bcolecton\b/g, 'collection'],
  [/\brnt\b/g, 'rent'],
  [/\brente\b/g, 'rent'],
  [/\bhostle\b/g, 'hostel'],
  [/\bhostl\b/g, 'hostel'],
  [/\bpaymnt\b/g, 'payment'],
  [/\bpaymant\b/g, 'payment'],
  [/\brecipt\b/g, 'receipt'],
  [/\brecpt\b/g, 'receipt'],
  [/\bavailble\b/g, 'available'],
  [/\bavaialble\b/g, 'available'],
  [/\bexpnse\b/g, 'expense'],
  [/\bexpenes\b/g, 'expense'],
  [/\bsalry\b/g, 'salary'],
  [/\bremnder\b/g, 'reminder'],
  [/\bremider\b/g, 'reminder'],
  [/\bregistartion\b/g, 'registration'],
  [/\bregistrtion\b/g, 'registration'],
  [/\bregstration\b/g, 'registration'],
  [/\badmision\b/g, 'admission'],
  [/\badmssion\b/g, 'admission'],
  [/\brom\b/g, 'room'],
  [/\bflor\b/g, 'floor'],
  [/\boccupid\b/g, 'occupied'],
  [/\bpendng\b/g, 'pending'],
  [/\binactve\b/g, 'inactive'],
  [/\bprebook\b/g, 'prebooked'],
  [/\bpreboked\b/g, 'prebooked'],
  [/\boverdue\b/g, 'overdue'],
  [/\boverdues\b/g, 'overdue'],
  [/\bdefaulter\b/g, 'defaulter'],
  [/\bdefaulters\b/g, 'defaulter'],
  [/\bwarden\b/g, 'warden'],
  [/\breceipt\b/g, 'receipt'],
  // Indian English / PG slang
  [/\bpgs?\b/g, 'hostel'],
  [/\bpaying guest\b/g, 'hostel'],
  [/\bproperty\b/g, 'hostel'],
  [/\bproperties\b/g, 'hostel'],
  [/\btenants?\b/g, 'student'],
  [/\bresidents?\b/g, 'student'],
  [/\binmates?\b/g, 'student'],
  [/\bguests?\b/g, 'guest'],
  [/\bworker\b/g, 'staff'],
  [/\bemployees?\b/g, 'staff'],
  [/\bwardens?\b/g, 'warden'],
  [/\bannouncement\b/g, 'notice'],
  [/\bannouncements\b/g, 'notice'],
  [/\bbroadcast\b/g, 'notice'],
  [/\bbed\b/g, 'bed'],
  [/\bbeds\b/g, 'bed'],
  [/\bsharing\b/g, 'share'],
  [/\bprofits?\b/g, 'profit'],
  [/\bearnings?\b/g, 'income'],
  [/\brevenues?\b/g, 'income'],
  [/\bexpenditures?\b/g, 'expense'],
  [/\bspendings?\b/g, 'expense'],
  // Short/sloppy forms
  [/\bstaying\b/g, 'stay'],
  [/\bstays\b/g, 'stay'],
  [/\bhow much did i collect\b/g, 'total collection'],

  [/\bhow much have i collected\b/g, 'total collection'],
  [/\bwhat did i collect\b/g, 'total collection'],
  [/\bwho hasn.?t paid\b/g, 'unpaid student'],
  [/\bwho has not paid\b/g, 'unpaid student'],
  [/\bwho did not pay\b/g, 'unpaid student'],
  [/\bwho haven.?t paid\b/g, 'unpaid student'],
  [/\bwho owes\b/g, 'due pending'],
  [/\bwho still owes\b/g, 'due pending'],
  [/\bwho owe\b/g, 'due pending'],
  [/\bhow full\b/g, 'occupancy rate'],
  [/\bpercentage occupied\b/g, 'occupancy rate'],
  [/\bhow many people are (currently )?staying\b/g, 'active student'],
  [/\bhow many people (are )?living\b/g, 'active student'],
  [/\bdo i have any empty bed\b/g, 'vacant bed'],
  [/\bany empty bed\b/g, 'vacant bed'],
  [/\bany vacant bed\b/g, 'vacant bed'],
  [/\bfloor (one|1|first)\b/g, 'floor 1'],
  [/\bfloor (two|2|second)\b/g, 'floor 2'],
  [/\bfloor (three|3|third)\b/g, 'floor 3'],
  [/\bfloor (four|4|fourth)\b/g, 'floor 4'],
  [/\bfirst floor\b/g, 'floor 1'],
  [/\bsecond floor\b/g, 'floor 2'],
  [/\bthird floor\b/g, 'floor 3'],
  [/\bfourth floor\b/g, 'floor 4'],
  [/\bground floor\b/g, 'floor 0'],
  // Fee & Money synonyms
  [/\bfeee?s?\b/g, 'fee'],
  [/\bduess?\b/g, 'due'],
  [/\bexpen[cs]es?\b/g, 'expense'],
  [/\bmoneys?\b/g, 'money'],
  [/\boverdu\b/g, 'overdue'],
];

export function normalizeQuery(raw: string): string {
  let q = raw.toLowerCase().trim();
  // Remove trailing punctuation like ? ! .
  q = q.replace(/[?!.]+$/g, '').trim();
  for (const [pattern, replacement] of TYPO_MAP) {
    q = q.replace(pattern, replacement);
  }
  // Normalize filler words inside common how-to / query phrases
  q = q.replace(/\bhow to vacate (a|the) bed\b/g, 'how to vacate bed');
  q = q.replace(/\bhow to vacate (a|the) room\b/g, 'how to vacate room');
  q = q.replace(/\bhow to vacate (a|the) student\b/g, 'how to vacate student');
  q = q.replace(/\bhow to deactivate (a|the) student\b/g, 'how to deactivate student');
  q = q.replace(/\bhow to collect (a|the) rent\b/g, 'how to collect rent');
  q = q.replace(/\bhow to add (a|the) student\b/g, 'how to add student');
  q = q.replace(/\bhow to add (a|the) room\b/g, 'how to add room');
  q = q.replace(/\bhow to assign (a|the) bed\b/g, 'how to assign bed');
  return q;
}

// ─── Reserved Non-Room Tokens ───────────────────────────────────────────────
const NON_ROOM_TOKENS = new Set([
  'room', 'rooms', 'vacate', 'vacates', 'vacated', 'vacating', 'vacant',
  'fee', 'fees', 'expense', 'expenses', 'student', 'students', 'tenant', 'tenants',
  'due', 'dues', 'all', 'list', 'detail', 'details', 'status', 'help', 'floor', 'floors',
  'income', 'money', 'paid', 'unpaid', 'overdue', 'pending', 'report', 'reports', 'bill', 'bills',
  'staff', 'guest', 'guests', 'hostel', 'pg', 'my', 'add', 'create', 'new', 'available', 'empty',
  'full', 'occupied', 'how', 'many', 'total', 'who', 'what', 'where', 'show', 'view', 'check',
  'management', 'overview', 'summary', 'today', 'month', 'history', 'receipt', 'receipts'
]);

// ─── Dynamic Extraction ───────────────────────────────────────────────────────
/** Extract room number or alphanumeric room name, e.g. "room 101", "room 10121", "room 101test" */
export function extractRoomNumber(q: string): string | null {
  const trimmed = q.trim().toLowerCase();
  
  // 1. "room 101", "room 102A", "room-101"
  const m1 = q.match(/room\s+([a-zA-Z0-9_-]+)/i);
  if (m1) {
    const val = m1[1].trim().toLowerCase();
    if (!NON_ROOM_TOKENS.has(val) && (/\d/.test(val) || val.length <= 4)) {
      return m1[1].trim();
    }
  }

  // 2. "101 room", "102A room"
  const m2 = q.match(/([a-zA-Z0-9_-]+)\s+room/i);
  if (m2) {
    const val = m2[1].trim().toLowerCase();
    if (!NON_ROOM_TOKENS.has(val) && /\d/.test(val)) {
      return m2[1].trim();
    }
  }

  // 3. Standalone digits or alphanumeric like "101", "204B", "G1"
  const m3 = q.match(/^\s*([a-zA-Z0-9_-]{1,6})\s*$/);
  if (m3) {
    const val = m3[1].trim().toLowerCase();
    if (!NON_ROOM_TOKENS.has(val) && (/\d/.test(val) || /^([a-f]\d+|\d+[a-f]?)$/i.test(val))) {
      return m3[1].trim();
    }
  }

  return null;
}

/** Extract floor number from a query (after normalizeQuery runs floor synonyms) */
export function extractFloorNumber(q: string): number | null {
  const m = q.match(/floor\s+(\d)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Rule System ──────────────────────────────────────────────────────────────
interface Rule {
  keywords: string[];
  intent: AssistantIntent;
  priority?: number;
}

/**
 * RULES[] — the master keyword→intent lookup table.
 * Higher priority = wins when multiple rules match.
 * Phrase keywords (multiple words) score double their priority.
 *
 * ORDER within same priority: more specific rules first so they can win
 * when two rules tie on score.
 */
const RULES: Rule[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 15 — SMALL TALK (greetings, time, casual chat — highest priority)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'hi', 'hello', 'hey', 'hii', 'helo', 'hai', 'hola',
      'good morning', 'good afternoon', 'good evening', 'good night',
      'namaste', 'namaskar', 'vanakkam', 'assalamualaikum',
      'greetings', 'howdy', 'sup', "what's up", 'whats up',
    ],
    intent: { type: 'SMALL_TALK', subtype: 'greeting' },
    priority: 15,
  },
  {
    keywords: [
      'how are you', 'how r u', 'how are u', 'how r you',
      'how do you do', 'are you okay', 'are you fine',
      'how is it going', 'hows it going', 'all good',
      'you okay', 'doing well', 'how are things',
    ],
    intent: { type: 'SMALL_TALK', subtype: 'feeling' },
    priority: 15,
  },
  {
    keywords: [
      'what time is it', 'what is the time', 'current time', 'tell me time',
      'time now', 'what time', 'time please', 'whats the time',
      "what's the time", 'time kya hai', 'abhi time kya hai',
    ],
    intent: { type: 'SMALL_TALK', subtype: 'time' },
    priority: 15,
  },
  {
    keywords: [
      'who are you', 'what are you', 'what is your name', 'your name',
      'tell me about yourself', 'introduce yourself', 'you are a bot',
      'are you a bot', 'are you ai', 'are you robot', 'are you human',
      'what can you do', 'what do you do', 'what is hostix assistant',
      'hostix assistant', 'who is this', 'who am i talking to',
      'what is main use', 'what is hostix', 'main purpose', 'app use',
    ],
    intent: { type: 'SMALL_TALK', subtype: 'who_are_you' },
    priority: 15,
  },
  {
    keywords: [
      'what is my name', 'my name', 'who am i', 'tell me my name',
      'do you know my name', 'what do you call me', 'owner', 'hostel owner',
      'who is hostel owner', 'who is the owner', 'owner name', 'owner details',
      'owner information', 'owner info', 'registered name',
    ],
    intent: { type: 'SMALL_TALK', subtype: 'my_name' },
    priority: 15,
  },
  {
    keywords: [
      'what is app owner name', 'who is app owner', 'how is app owner',
      'app owner name', 'owner of this app', 'who built this app', 'who made this app',
      'who created hostix', 'hostix owner', 'developer name', 'app owner',
      'who is the developer', 'who is founder', 'who is this app owner',
      'app creator', 'contact developer', 'about developer', 'developer details',
      'veeradurgarao', 'goriparthi', 'durgarao goriparthi', 'software engineer',
    ],
    intent: { type: 'SMALL_TALK', subtype: 'app_developer' },
    priority: 15,
  },
  {
    keywords: [
      'thank you', 'thanks', 'thankyou', 'thank u', 'thx', 'ty',
      'thanks a lot', 'many thanks', 'much appreciated', 'great job',
      'awesome', 'perfect', 'wonderful', 'well done', 'nice', 'great',
      'shukriya', 'dhanyawad',
    ],
    intent: { type: 'SMALL_TALK', subtype: 'thanks' },
    priority: 15,
  },
  {
    keywords: [
      'bye', 'goodbye', 'see you', 'see ya', 'cya', 'take care',
      'good bye', 'catch you later', 'later', 'tata', 'ok bye',
      'that is all', "that's all", 'i am done', "i'm done",
    ],
    intent: { type: 'SMALL_TALK', subtype: 'bye' },
    priority: 15,
  },

  // Add Student
  {
    keywords: [
      'how to add student', 'how do i add student', 'how can i add student',
      'how to add a student', 'how do i add a student', 'add new student',
      'add student', 'add a student', 'steps to add student', 'where can i add student',
      'student adding', 'how to register student', 'student registration steps',
      'how to create student', 'how to enroll student', 'admit student',
      'add a tenant', 'add tenant', 'how to add tenant', 'new student steps',
      'student admission steps', 'process to add student',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'add_student' },
    priority: 12,
  },

  // Add Room
  {
    keywords: [
      'how to add room', 'how do i add room', 'how can i add room',
      'how to add a room', 'how do i add a room', 'add new room',
      'add room', 'add a room', 'create room', 'create a room',
      'room creation steps', 'where do i add room', 'how to create a room',
      'new room steps', 'steps to create room', 'process to add room',
      'how to make room',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'add_room' },
    priority: 12,
  },

  // Collect Rent
  {
    keywords: [
      'how to collect rent', 'how do i collect rent', 'how can i collect rent',
      'how to collect a rent', 'how do i collect a rent', 'collect rent',
      'collect a rent', 'how to collect fee', 'how to collect fees',
      'how to collect payment', 'record payment', 'record rent',
      'how to receive payment', 'mark student as paid',
      'payment collection steps', 'how to collect payment',
      'how do i take payment', 'receive rent', 'collect fee steps',
      'fee collection process', 'how to mark paid', 'rent collection',
      'how to collect',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'collect_rent' },
    priority: 12,
  },

  // Assign Bed
  {
    keywords: [
      'how to assign bed', 'how to assign a bed', 'how do i assign bed',
      'how do i assign a bed', 'assign student bed', 'assign bed',
      'assign a bed', 'allocate bed', 'allocate a bed', 'allocate room',
      'assign room to student', 'move student to room', 'how to allocate student',
      'bed assignment steps', 'room assignment steps',
      'how to give bed to student', 'bed allotment',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'assign_bed' },
    priority: 12,
  },

  // Add Expense
  {
    keywords: [
      'how to add expense', 'how do i add expense', 'add expense',
      'record expense', 'create expense', 'enter expense',
      'expense entry steps', 'how to record expense',
      'how to log expense', 'expense steps', 'new expense',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'add_expense' },
    priority: 12,
  },

  // Add Income
  {
    keywords: [
      'how to add income', 'how do i add income', 'record income',
      'add income', 'income entry steps', 'how to log income',
      'create income', 'new income entry',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'add_income' },
    priority: 12,
  },

  // View Reports
  {
    keywords: [
      'how to view report', 'how do i view report', 'how to generate report',
      'generate report steps', 'report steps', 'how to download report',
      'how to export report', 'how to see reports',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'view_reports' },
    priority: 12,
  },

  // View Dues
  {
    keywords: [
      'how to view dues', 'how do i view dues', 'how to check dues',
      'view dues steps', 'dues steps', 'how to see pending dues',
      'how to see overdue', 'how to find unpaid students',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'view_dues' },
    priority: 12,
  },

  // Generate Receipt
  {
    keywords: [
      'how to generate receipt', 'how to download receipt',
      'how do i get receipt', 'receipt download steps',
      'generate receipt steps', 'get receipt', 'print receipt',
      'save receipt', 'download payment receipt',
      'how to print receipt', 'how to share receipt',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'generate_receipt' },
    priority: 12,
  },

  // Update Student
  {
    keywords: [
      'how to edit student', 'how do i edit student',
      'edit student details', 'update student', 'modify student',
      'change student information', 'update tenant details',
      'how to update student', 'student edit steps', 'change student details',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'update_student' },
    priority: 12,
  },

  // Add Staff
  {
    keywords: [
      'how to add staff', 'how do i add staff', 'create staff',
      'add employee', 'register staff', 'staff creation steps',
      'add a staff', 'new staff steps', 'staff entry',
      'add warden', 'how to add warden',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'add_staff' },
    priority: 12,
  },

  // Add Notice
  {
    keywords: [
      'how to add notice', 'how do i add notice', 'create notice',
      'post notice', 'publish announcement', 'add announcement',
      'how to post notice', 'notice steps', 'publish notice',
      'how to send notice', 'send announcement',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'add_notice' },
    priority: 12,
  },

  // Switch Hostel
  {
    keywords: [
      'how to switch hostel', 'how do i switch hostel', 'change hostel steps',
      'switch hostel steps', 'how to change pg',
      'select another hostel', 'manage another property',
      'switch property steps', 'how to switch property',
      'change active hostel', 'how to change active pg',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'switch_hostel' },
    priority: 12,
  },

  // Pre-Booking
  {
    keywords: [
      'how to prebook room', 'how to pre book', 'prebook a bed',
      'reserve room', 'reserve bed', 'advance room booking',
      'how to reserve room', 'room reservation steps',
      'pre-booking steps', 'how to book in advance', 'book room advance',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'pre_booking' },
    priority: 12,
  },

  // Deactivate Student (NEW)
  {
    keywords: [
      'how to deactivate student', 'how to deactivate a student',
      'how do i deactivate student', 'how do i deactivate a student',
      'deactivate student', 'deactivate a student', 'disable student',
      'make student inactive', 'remove student from active list',
      'how to mark student inactive', 'deactivate tenant', 'deactivate a tenant',
      'how to deactivate tenant', 'student deactivation steps',
      'mark as left', 'how to mark student as left', 'deactivate student steps',
      'how to disable student', 'deactivate', 'deactivating student', 'make inactive',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'deactivate_student' },
    priority: 12,
  },

  // QR Registration (NEW)
  {
    keywords: [
      'how does qr registration work', 'qr registration process',
      'how to register using qr', 'student qr registration',
      'scan qr registration', 'register student through qr',
      'how does student qr work', 'qr scan steps',
      'how to use qr for registration', 'qr admission steps',
      'how qr works', 'qr signup steps',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'qr_registration' },
    priority: 12,
  },

  // Vacate Bed (NEW)
  {
    keywords: [
      'how to vacate bed', 'how to vacate a bed', 'how do i vacate bed',
      'how do i vacate a bed', 'how can i vacate bed', 'how can i vacate a bed',
      'vacate bed', 'vacate a bed', 'vacate room steps', 'free a bed', 'free bed',
      'release bed', 'remove student from bed', 'how to make bed vacant',
      'mark bed vacant', 'student checkout process', 'how to checkout student',
      'checkout process', 'bed vacate steps', 'how to vacate student',
      'how to vacate room', 'vacate room', 'how to remove student from room',
      'vacating a bed', 'vacating bed', 'vacate student',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'vacate_bed' },
    priority: 12,
  },

  // Send Reminder (NEW)
  {
    keywords: [
      'how to send reminder', 'send payment reminder steps',
      'send rent reminder steps', 'reminder steps',
      'how to notify unpaid students', 'due reminder steps',
      'how to send due reminder', 'reminder process',
      'how to remind students', 'send reminder to defaulters',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'send_reminder' },
    priority: 12,
  },

  // Mark Vacated (NEW)
  {
    keywords: [
      'how to mark student vacated', 'mark student as vacated',
      'mark as vacated', 'vacated student steps',
      'how to show student left', 'mark student moved out',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'mark_vacated' },
    priority: 12,
  },

  // Verify Rent Payment (NEW)
  {
    keywords: [
      'how to verify rent', 'rent payment verification', 'how to approve rent',
      'verify payment request', 'how to verify payment', 'reject rent payment',
      'how rent verification works', 'payment verification steps',
      'how to approve payment', 'verify rent',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'verify_rent' },
    priority: 12,
  },

  // View Payments Guide (NEW)
  {
    keywords: [
      'how to view payments', 'how to check payments', 'view payment history steps',
      'how to see collected payments', 'how to view collected rent',
    ],
    intent: { type: 'SHOW_HOW_TO', action: 'view_payments_guide' },
    priority: 12,
  },

  // Priority 11 — Direct Room / Bed / Floor counts (beats generic keywords)
  {
    keywords: [
      'how many rooms', 'how many room', 'total rooms', 'room count',
      'how many beds', 'how many bed', 'total beds', 'bed count',
      'how many floors', 'how many floor', 'total floors', 'floor count',
      'how many beds are there', 'how many rooms are there', 'how many floors are there',
      'how many vacant beds', 'how many empty beds', 'how many filled beds',
      'single sharing rooms', 'double sharing rooms', 'triple sharing rooms',
      'vacant rooms', 'full rooms',
    ],
    intent: { type: 'SHOW_ROOMS' },
    priority: 11,
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 10 — OVERDUE (specific filter — must beat generic 'dues')
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'overdue', 'over due', 'late payment', 'late rent', 'late fee',
      'overdue student', 'overdue list', 'show overdue',
      'all overdue', 'who is overdue', 'defaulter', 'defaulters',
      'payment defaulter', 'students overdue', 'overdue amount',
      'total overdue', 'overdue rent', 'overdue fees',
      'long pending', 'very pending',
    ],
    intent: { type: 'SHOW_DUES', filter: 'overdue' },
    priority: 10,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 9 — SWITCH HOSTEL (specific — beats generic hostel query)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'switch pg', 'switch hostel', 'change pg', 'change hostel',
      'my hostel', 'show hostel', 'list hostel', 'pg list', 'pgs list', 'list pgs',
      'hostel list', 'all hostel', 'all my hostel', 'all pgs', 'all pg',
      'how many hostel', 'how many hostels', 'total hostel', 'total hostels',
      'number of hostel', 'number of hostels', 'number of pgs', 'pg count', 'pgs count',
      'how many pg', 'how many pgs', 'how many properties', 'list properties',
      'which hostel', 'which pg', 'active hostel', 'active pg',
      'current hostel', 'current pg', 'selected hostel', 'selected pg',
      'hostel name', 'pg name', 'my hostel name', 'my pg name',
      'what is my hostel', 'what is my pg', 'which property',
      'which hostel is active', 'what property am i managing',
      'tell me hostel', 'show active hostel', 'manage hostel',
    ],
    intent: { type: 'SHOW_HOSTELS' },
    priority: 9,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 8 — PENDING DUES (specific filter)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'pending due', 'pending payment', 'unpaid student', 'who has not paid',
      'who hasn t paid', 'who have not paid', 'pending rent',
      'not paid this month', 'who did not pay', 'students who have not paid',
      'unpaid this month', 'not paid yet', 'zero payment',
      'students with no payment', 'fully unpaid', 'unpaid fee',
      'pending fee', 'outstanding payment', 'outstanding due',
      'outstanding rent', 'amount outstanding',
    ],
    intent: { type: 'SHOW_DUES', filter: 'pending' },
    priority: 8,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 7 — ALL DUES (generic)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'due', 'dues', 'unpaid', 'not paid', 'outstanding', 'owe',
      'total pending', 'pending amount', 'show due', 'check due',
      'partial paid', 'partial payment', 'partially paid',
      'partial fee', 'partial rent', 'who paid partially',
      'partial payment list', 'balance due', 'balance payment',
      'pending balance', 'how many paid', 'paid student',
      'fully paid', 'payment done', 'payment received',
      'who paid today', 'payment today', 'dues today',
      'due today', 'due tomorrow', 'tomorrow due',
      'how many overdue', 'overdue count',
      'send reminder', 'remind unpaid', 'rent reminder',
      'payment reminder', 'notify unpaid', 'due reminder',
      'remind defaulter', 'today collection', 'collection today',
      'what did i collect', 'how much collected today',
      'collected today', 'today income from rent',
      'monthly collection', 'collection this month',
      'this month collection', 'how much collected this month',
      'total collection this month', 'monthly revenue from fee',
      'monthly paid amount', 'what is total collection',
      'highest due', 'biggest defaulter', 'top defaulter',
      'who owes most', 'maximum pending', 'largest due',
    ],
    intent: { type: 'SHOW_DUES', filter: 'all' },
    priority: 7,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 8 — STUDENT FILTER INTENTS (beat the generic SHOW_STUDENTS)
  // ═══════════════════════════════════════════════════════════════════════════

  // Active students specifically
  {
    keywords: [
      'how many active student', 'active student count', 'students currently staying',
      'currently active student', 'students living now', 'how many are active',
      'number of active student', 'active count', 'active resident',
      'students checked in', 'total active', 'active strength',
    ],
    intent: { type: 'SHOW_STUDENTS', filter: 'active' },
    priority: 8,
  },

  // Left / vacated students specifically
  {
    keywords: [
      'how many student left', 'students who left', 'student left count',
      'how many left', 'how many vacated', 'vacated student',
      'students moved out', 'left student count', 'students who vacated',
      'how many student vacated', 'inactive student count', 'former student count',
      'students no longer staying', 'moved out count',
    ],
    intent: { type: 'SHOW_STUDENTS', filter: 'inactive' },
    priority: 8,
  },

  // Pre-booked specifically
  {
    keywords: [
      'how many prebooked', 'prebooked count', 'pre-booked student count',
      'students prebooked', 'advance booking count', 'upcoming student count',
      'reserved student count', 'how many reserved', 'pre booking count',
      'students with advance booking',
    ],
    intent: { type: 'SHOW_STUDENTS', filter: 'prebooked' },
    priority: 8,
  },

  // QR registration specifically
  {
    keywords: [
      'how many qr', 'qr registration count', 'qr registered student',
      'students via qr', 'qr signup count', 'students registered by qr',
      'how many student used qr', 'qr register count',
    ],
    intent: { type: 'SHOW_STUDENTS', filter: 'qr' },
    priority: 8,
  },

  // Pending admissions specifically
  {
    keywords: [
      'how many admission pending', 'pending admission count',
      'students waiting for admission', 'pending registration count',
      'incomplete admission', 'admissions pending', 'not admitted count',
    ],
    intent: { type: 'SHOW_STUDENTS', filter: 'pending' },
    priority: 8,
  },

  // Vacate Notice / Ready to Vacate specifically (Priority 10)
  {
    keywords: [
      'who is ready to vacate', 'ready to vacate', 'vacate notice', 'vacate notices',
      'who is vacating', 'who will vacate', 'vacating students', 'vacating student',
      'who applied for vacate', 'who applied to vacate', 'vacate list', 'vacate requests',
      'vacate request', 'vacate application', 'vacate applications', 'notice period',
      'students on notice', 'students on vacate notice', 'vacating soon', 'leaving soon',
      'who is leaving', 'upcoming vacancy', 'upcoming vacancies', 'check vacate',
    ],
    intent: { type: 'SHOW_STUDENTS', filter: 'vacate_notice' },
    priority: 10,
  },

  // Unallocated specifically
  {
    keywords: [
      'how many unallocated', 'unallocated student count', 'student without bed count',
      'students without room', 'no bed assigned count', 'not assigned count',
      'students waiting for bed', 'bed not assigned', 'how many have no bed',
    ],
    intent: { type: 'SHOW_STUDENTS', filter: 'unallocated' },
    priority: 8,
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — STUDENTS (generic — catches all remaining student queries)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      // Generic counts
      'student', 'how many student', 'total student', 'student count',
      'student strength', 'number of student', 'how many tenant',
      'total tenant', 'tenant count', 'people staying',
      'how many people', 'how many are staying', 'how many live here',
      'current resident', 'residents count', 'how many residents',
      'currently staying', 'currently living', 'living right now',
      'student statistics', 'student stats', 'show student',
      'list student', 'all student', 'student list', 'display student',
      // Active
      'active student', 'total active student', 'how many active',
      'active tenant', 'current tenant', 'students living now',
      'occupied student', 'students currently staying',
      // Inactive / vacated
      'inactive student', 'students who left', 'students who vacated',
      'student left', 'former student', 'former tenant',
      'student vacated', 'recently vacated', 'moved out',
      'how many left', 'how many vacated', 'who left',
      'show vacated', 'vacated student', 'students moved out',
      'inactive tenant', 'left student',
      // Pre-booked
      'prebooked student', 'pre-booking', 'how many prebooked',
      'upcoming student', 'reserved student', 'advance booking',
      'students with advance booking', 'pre-booked admission',
      'future admission', 'students prebooked', 'prebook',
      // QR
      'qr registration', 'how many qr', 'qr registered',
      'student registered qr', 'qr admission', 'student qr',
      'qr register', 'qr count', 'qr signup',
      // Pending admissions
      'pending admission', 'admission pending', 'how many admission pending',
      'student waiting for admission', 'pending registration',
      'incomplete admission', 'not admitted', 'waiting admission',
      'pending student registration',
      // Unallocated
      'unallocated student', 'student without bed', 'student without room',
      'no bed assigned', 'not assigned', 'not allocated',
      'who has no bed', 'who has no room', 'unassigned student',
      'student waiting for bed',
      // New joinings
      'new student this month', 'new joining', 'student joined this month',
      'recent admission', 'recent student', 'new registration',
      'new admission', 'how many joined', 'latest student',
      'students registered this month', 'newly joined',
      'students registered this month', 'newly joined',
    ],
    intent: { type: 'SHOW_STUDENTS' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — ROOMS / BEDS / OCCUPANCY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      // Generic rooms
      'room', 'how many room', 'total room', 'room count', 'number of room',
      'rooms count', 'room statistics', 'show room', 'room stats',
      'room list', 'all room', 'display room',
      // Beds
      'bed', 'how many bed', 'total bed', 'bed count', 'number of bed',
      'total capacity', 'hostel capacity', 'sleeping capacity',
      'how many bed do i have', 'bed statistics',
      // Available / vacant
      'available bed', 'vacant bed', 'empty bed', 'free bed',
      'beds available', 'remaining bed', 'open bed', 'unused bed',
      'bed availability', 'available capacity', 'bed vacant',
      'how many vacant bed', 'how many empty bed', 'any empty bed',
      'any vacant bed', 'vacant room', 'empty room',
      // Occupied
      'occupied bed', 'filled bed', 'used bed', 'beds occupied',
      'beds filled', 'current occupancy', 'occupied capacity',
      'students occupying', 'total filled',
      // Floors
      'floor', 'how many floor', 'total floor', 'number of floor',
      'floor count', 'hostel floor', 'how many floors',
      // Floor-specific (after normalization)
      'floor 0', 'floor 1', 'floor 2', 'floor 3', 'floor 4',
      'floor 5', 'floor 6', 'room on floor',
      // Room-specific (dynamic extraction handles room number)
      'room 1', 'room 2', 'room 3', 'room 4', 'room 5',
      'who is in room', 'how many people in room', 'beds in room',
      'vacancies in room', 'room occupancy', 'room student',
      'show room', 'is room full', 'is room vacant',
      'who stays in room', 'room detail', 'room info',
      // Vacancy status
      'rooms with vacancy', 'rooms with one vacancy', 'rooms with two vacancy',
      'partially occupied room', 'partially filled room',
      'fully occupied room', 'completely full room',
      'room with 1 available', 'room with 2 available',
      'rooms almost full', 'room vacancy status',
      // Sharing types
      'single room', 'single sharing', 'single occupancy',
      'double room', 'double sharing', 'twin sharing',
      'triple sharing', 'triple room', '3 sharing', '3share',
      'four sharing', '4 sharing', '4share', 'four bed room',
      '4 bed room', 'sharing type', 'room type',
      'how many single', 'how many double', 'how many triple', 'how many 4',
      // Occupancy rate
      'occupancy rate', 'occupancy percentage', 'hostel occupancy',
      'current occupancy', 'occupancy rate percent', 'bed occupancy',
      'how full is my hostel', 'how much occupied',
      'percentage of hostel filled', 'occupancy level',
    ],
    intent: { type: 'SHOW_ROOMS' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — PAYMENTS / COLLECTION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'payment', 'payments', 'collection', 'received', 'how much collected',
      'receipt', 'show receipt', 'download receipt', 'get receipt',
      'payment receipt', 'latest receipt', 'payment history',
      'collected payment', 'payment done', 'total paid',
      'amount collected', 'payment collection', 'show payment',
      'payment list', 'payment summary',
    ],
    intent: { type: 'SHOW_PAYMENTS' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — REPORTS / FINANCIAL OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'report', 'reports', 'financial', 'profit', 'net profit', 'net earning',
      'revenue', 'summary', 'overview', 'financial summary',
      'financial report', 'financial overview', 'overall summary',
      'monthly report', 'hostel report', 'show report',
      'income vs expense', 'income and expense', 'compare income expense',
      'earnings vs spending', 'revenue vs expense',
      'monthly income expense', 'financial comparison',
      'income expense chart', 'last 6 month', 'six month trend',
      'monthly trend', 'financial trend', 'income trend',
      'expense trend', 'profit trend', 'yearly trend',
      'financial history', 'previous month performance',
      'collection rate', 'payment collection rate', 'fee collection percentage',
      'rent collection percentage', 'how much percentage collected',
      'collection efficiency', 'how much profit', 'earnings after expense',
      'income minus expense', 'net earning', 'profit this year',
      'profit this month', 'monthly profit',
      'tell me about my hostel', 'give me a summary', 'quick overview',
      'show current situation', 'what is pending', 'what needs attention',
      'give me today summary', 'today numbers', 'today dashboard',
      'what is important today', 'hostel status', 'everything okay',
      'how are things', 'what is happening', 'show dashboard',
    ],
    intent: { type: 'SHOW_REPORTS' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — EXPENSES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'expense', 'spend', 'spent', 'spending', 'cost', 'expenditure',
      'total expense', 'expense this month', 'monthly expense',
      'how much did i spend', 'how much spent', 'expense amount',
      'expense breakdown', 'expense category', 'expense list',
      'show expense', 'electricity expense', 'electricity bill',
      'power bill', 'maintenance expense', 'maintenance cost',
      'food expense', 'grocery expense', 'water bill',
      'internet bill', 'repair expense', 'cleaning expense',
      'miscellaneous expense', 'other expense',
      'yearly expense', 'expense this year', 'annual expense',
    ],
    intent: { type: 'SHOW_EXPENSES' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — INCOME
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'income', 'earning', 'earned', 'revenue', 'monthly income',
      'income this month', 'how much did i earn', 'total income',
      'income generated', 'yearly income', 'income this year',
      'annual income', 'show income', 'income summary',
      'income details', 'view income',
    ],
    intent: { type: 'SHOW_INCOME' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — STAFF
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'staff', 'employee', 'workers', 'total staff', 'staff count',
      'active staff', 'inactive staff', 'staff list', 'show staff',
      'employee list', 'total employee', 'staff roles', 'staff details',
      'employee details', 'staff salary', 'salary this month',
      'total salary', 'monthly salary', 'payroll',
      'salary expense', 'how many staff', 'staff members',
    ],
    intent: { type: 'SHOW_STAFF' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — BILLS / REMINDERS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'bill reminder', 'utility bill', 'upcoming bill', 'bill due',
      'bill reminders', 'scheduled bill', 'monthly bill',
    ],
    intent: { type: 'SHOW_BILLS' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — GUESTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'guest', 'total guest', 'guest count', 'how many guest',
      'current guest', 'guest list', 'show guest', 'guest detail',
      'who is staying as guest', 'guest check-in', 'guest checkin',
      'today check-in', 'guest fee', 'guest charge', 'guest collection',
      'guest payment', 'guest revenue', 'guest history',
      'checked-in guest', 'checked-out guest', 'guests staying',
    ],
    intent: { type: 'SHOW_GUESTS' },
    priority: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 6 — NOTICES / ANNOUNCEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    keywords: [
      'notice', 'notices', 'latest notice', 'recent notice',
      'hostel notice', 'announcement', 'show announcement',
      'add notice', 'create notice', 'new notice', 'publish notice',
      'post announcement', 'add announcement',
    ],
    intent: { type: 'SHOW_NOTICES' },
    priority: 6,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 9 — APP INFO & OWNER / FOUNDER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    keywords: [
      'app owner of this app', 'who built this app',
      'who created this app', 'who is developer', 'who is the developer',
      'who is founder', 'veeradurgarao', 'goriparthi', 'durgarao goriparthi',
      'contact developer', 'about developer', 'developer details',
      'app owner', 'app creator', 'who made this app',
    ],
    intent: { type: 'SHOW_APP_INFO', topic: 'owner' },
    priority: 9,
  },
  {
    keywords: [
      'main goal', 'main goal of app', 'main goal of this app', 'goal of this app',
      'purpose of app', 'purpose of this app', 'what is goal', 'why this app',
      'what is hostix', 'about hostix', 'app goal', 'app purpose',
      'what is the main goal', 'what is the goal',
    ],
    intent: { type: 'SHOW_APP_INFO', topic: 'goal' },
    priority: 9,
  },
  {
    keywords: [
      'how to use this app', 'how app works', 'how does this app work',
      'how to use hostix', 'app guide', 'getting started with app',
      'how to start', 'guide for app', 'how to run app',
    ],
    intent: { type: 'SHOW_APP_INFO', topic: 'usage' },
    priority: 9,
  },
];

/** Extract student search name from a query like "give student durgarao details" or "who is durgarao" */
export function extractStudentSearchName(rawQuery: string): string | null {
  const q = rawQuery.trim();
  const patterns = [
    /(?:student|tenant)\s+([a-zA-Z]{3,20})\s+(?:details|info|profile|list|room|bed|joining|phone|mobile|rent)/i,
    /what\s+is\s+([a-zA-Z]{3,20})\s+student\s+(?:details|info|room|bed|joining|phone|mobile|rent|status)/i,
    /give\s+(?:me\s+)?(?:student|tenant\s+)?([a-zA-Z]{3,20})\s+(?:details|info|room|phone|joining)/i,
    /who\s+is\s+([a-zA-Z]{3,20})/i,
    /search\s+(?:student|tenant\s+)?([a-zA-Z]{3,20})/i,
    /find\s+(?:student|tenant\s+)?([a-zA-Z]{3,20})/i,
    /where\s+is\s+([a-zA-Z]{3,20})/i,
  ];

  const nonNames = [
    'room', 'rooms', 'floor', 'floors', 'bed', 'beds', 'hostel', 'dues', 'active', 'left', 'vacated',
    'vacate', 'vacating', 'deactivate', 'deactivating', 'deactive', 'assign', 'allocate',
    'collect', 'colect', 'paid', 'unpaid', 'income', 'expense', 'staff', 'guest',
    'notice', 'list', 'stats', 'all', 'prebooked', 'joining', 'admission', 'overdue',
    'today', 'this', 'main', 'goal', 'owner', 'developer', 'founder', 'hostix', 'app',
    'what', 'where', 'when', 'how', 'who', 'why', 'give', 'show', 'tell', 'available',
    'vacant', 'occupied', 'empty', 'free', 'single', 'double', 'triple', 'sharing',
    'total', 'count', 'number', 'pending', 'check', 'checkout', 'receipt', 'payment'
  ];

  for (const p of patterns) {
    const m = q.match(p);
    if (m && m[1]) {
      const name = m[1].toLowerCase();
      if (!nonNames.includes(name)) {
        return m[1];
      }
    }
  }
  return null;
}


// ─── Core Resolve Function ────────────────────────────────────────────────────

/**
 * resolveIntent — main public API.
 * 1. Check for specific room / floor / student list queries first.
 * 2. Normalize input (typos + synonyms).
 * 3. Direct matching for core system keywords (fees, vacate, rooms, expenses).
 * 4. Apply context for follow-up questions.
 * 5. Score all rules against normalized query.
 * 6. Fall back to student name search if query looks like a person's name.
 */
export function resolveIntent(rawQuery: string): AssistantIntent {
  if (!rawQuery.trim()) return { type: 'SHOW_HOME' };

  const rawLower = rawQuery.toLowerCase().trim();

  // ── 1. Specific Room Detail Query (e.g. "room 101", "show me 101 room", "beds in room 101", "201") ──
  const roomNum = extractRoomNumber(rawQuery);
  if (roomNum !== null && (rawLower.includes('room') || rawQuery.match(/\b\d{1,4}\b/))) {
    return { type: 'SHOW_ROOM_DETAIL', roomNumber: roomNum };
  }

  // ── 2. Specific Floor Detail Query (e.g. "floor 1 how many rooms", "2nd floor rooms") ──
  const floorNum = extractFloorNumber(rawQuery);
  if (floorNum !== null && rawLower.includes('floor')) {
    return { type: 'SHOW_FLOOR_DETAIL', floorNumber: floorNum };
  }

  // ── 3. Direct Fast Path for Common Core Inquiries ──
  const cleanQ = rawLower.replace(/[?!.,]+$/g, '').trim();

  if (cleanQ.includes('paid student list') || cleanQ.includes('list of paid student') || cleanQ.includes('who paid') || cleanQ.includes('paid fee') || cleanQ.includes('paid money') || cleanQ.includes('money received')) {
    return { type: 'SHOW_PAID_STUDENTS' };
  }
  if (cleanQ.includes('joined this month') || cleanQ.includes('joined in this month') || cleanQ.includes('new admission this month')) {
    return { type: 'SHOW_STUDENTS', filter: 'joined_this_month' };
  }
  if (cleanQ.includes('vacate this month') || cleanQ.includes('vacated this month') || cleanQ.includes('left this month')) {
    return { type: 'SHOW_STUDENTS', filter: 'vacated_this_month' };
  }
  if (cleanQ === 'fees vacate' || cleanQ === 'vacate fees' || cleanQ === 'vacate dues' || cleanQ === 'vacated dues') {
    return { type: 'SHOW_DUES', filter: 'all' };
  }
  if (cleanQ === 'vacate rooms' || cleanQ === 'vacate room' || cleanQ === 'vacant rooms' || cleanQ === 'vacant room' || cleanQ === 'empty rooms' || cleanQ === 'available rooms' || cleanQ === 'room' || cleanQ === 'rooms' || cleanQ === 'all rooms') {
    return { type: 'SHOW_ROOMS' };
  }
  if (cleanQ === 'fees' || cleanQ === 'fee' || cleanQ === 'today fee' || cleanQ === 'today dues' || cleanQ === 'this month dues' || cleanQ === 'fee management' || cleanQ === 'dues' || cleanQ === 'due' || cleanQ === 'money' || cleanQ === 'due money' || cleanQ === 'pending money') {
    return { type: 'SHOW_DUES', filter: 'all' };
  }
  if (cleanQ === 'overdue' || cleanQ === 'overdue fee' || cleanQ === 'overdue dues' || cleanQ === 'overdue money' || cleanQ === 'late fee' || cleanQ === 'late rent' || cleanQ === 'overdue only') {
    return { type: 'SHOW_DUES', filter: 'overdue' };
  }
  if (cleanQ === 'expense' || cleanQ === 'expenses' || cleanQ === 'spending' || cleanQ === 'spends' || cleanQ === 'expenditure') {
    return { type: 'SHOW_EXPENSES' };
  }
  if (cleanQ === 'vacate' || cleanQ === 'ready to vacate' || cleanQ === 'vacate notice' || cleanQ === 'vacate list' || cleanQ === 'vacate applied' || cleanQ === 'who is vacating' || cleanQ === 'who is ready to vacate' || cleanQ === 'vacate requests' || cleanQ === 'vacating' || cleanQ.includes('ready to vacate') || cleanQ.includes('vacate notice') || cleanQ.includes('who is vacating') || cleanQ.includes('who is ready to vacate') || cleanQ === 'check vacate') {
    return { type: 'SHOW_STUDENTS', filter: 'vacate_notice' };
  }
  if (cleanQ === 'vacated' || cleanQ === 'past vacated' || cleanQ === 'vacated students' || cleanQ === 'left students' || cleanQ === 'who left') {
    return { type: 'SHOW_STUDENTS', filter: 'inactive' };
  }


  const q = normalizeQuery(rawQuery);
  if (!q) return { type: 'SHOW_HOME' };

  // ── Context-aware follow-ups ────────────────────────────────────────────
  const SHORT_THRESHOLD = 20;
  if (q.length <= SHORT_THRESHOLD && _lastContext) {
    const CONTEXT_CLUES: Record<string, string[]> = {
      SHOW_STUDENTS: [
        'active', 'inactive', 'how many', 'count', 'total',
        'left', 'vacated', 'prebooked', 'qr', 'new', 'list',
        'unallocated', 'pending',
      ],
      SHOW_ROOMS: [
        'full', 'empty', 'occupied', 'available', 'vacant', 'how many',
        'count', 'total', 'single', 'double', 'triple', '4',
      ],
      SHOW_DUES: [
        'overdue', 'paid', 'partial', 'pending', 'how many',
        'total', 'amount', 'who', 'list', 'today', 'tomorrow',
      ],
      SHOW_REPORTS: ['last month', 'this year', 'previous', 'trend', 'compare'],
    };
    const clues = CONTEXT_CLUES[_lastContext];
    if (clues && clues.some(c => q.includes(c))) {
      const existingIntent = RULES.find(r => r.intent.type === _lastContext);
      if (existingIntent) return existingIntent.intent;
    }
  }

  // ── 4. Scoring RULES ──
  let best: { intent: AssistantIntent; score: number } = {
    intent: { type: 'UNKNOWN', query: rawQuery },
    score: 0,
  };

  for (const rule of RULES) {
    let score = 0;
    const basePriority = rule.priority ?? 6;

    for (const kw of rule.keywords) {
      if (q === kw) {
        // Exact match gets massive boost
        score += basePriority * 4;
      } else if (q.includes(kw)) {
        const wordCount = kw.split(' ').length;
        score += wordCount > 1 ? basePriority * 2 : basePriority;
      }
    }

    if (score > best.score) {
      best = { intent: rule.intent, score };
    }
  }

  if (best.intent.type !== 'UNKNOWN' && best.score >= 6) {
    _lastContext = best.intent.type;
    return best.intent;
  }

  // ── 5. Intelligent Fallback for Generic Tokens ──
  if (NON_ROOM_TOKENS.has(rawLower) || NON_ROOM_TOKENS.has(q)) {
    if (q.includes('fee') || q.includes('due') || q.includes('money') || q.includes('pay')) {
      return { type: 'SHOW_DUES', filter: 'all' };
    }
    if (q.includes('room') || q.includes('bed')) {
      return { type: 'SHOW_ROOMS' };
    }
    if (q.includes('expense') || q.includes('spend')) {
      return { type: 'SHOW_EXPENSES' };
    }
    if (q.includes('vacat')) {
      return { type: 'SHOW_STUDENTS', filter: 'inactive' };
    }
    if (q.includes('student') || q.includes('tenant')) {
      return { type: 'SHOW_STUDENTS', filter: 'all' };
    }
  }

  // ── 6. Student Search by Name (Only if it looks like a person's name) ──
  if (rawQuery.trim().length >= 2 && rawQuery.trim().length <= 35 && !NON_ROOM_TOKENS.has(rawLower)) {
    return { type: 'SHOW_STUDENT_SEARCH', name: rawQuery.trim() };
  }

  return { type: 'UNKNOWN', query: rawQuery };
}


// ─── Sidebar Categories ───────────────────────────────────────────────────────
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

// ─── Quick Questions — DATA / STATS chips ─────────────────────────────────────
/**
 * INFO_QUESTIONS: Concise action-oriented phrases for the quick chips panel.
 * These map to data queries — shown as scrollable chips at the bottom.
 */
export const INFO_QUESTIONS: string[] = [
  // Students
  'Total students count',
  'Active students now',
  'Students left this month',
  'New admissions this month',
  'Prebooked students',
  'Unallocated students',
  // Rooms & Beds
  'Bed availability',
  'Room occupancy rate',
  'Vacant beds now',
  'Full rooms',
  'Total rooms',
  // Finance
  'Pending dues today',
  'Collection this month',
  'Expenses this month',
  'Profit this month',
  'Overdue students',
  'Income vs expenses',
  // Staff & Guests
  'Staff list',
  'Total guests today',
  // Notices
  'Active notices',
  // Hostel
  'My hostels',
];

// ─── Quick Questions — HOW-TO / GUIDE chips ───────────────────────────────────
/**
 * GUIDE_QUESTIONS: Instruction/how-to questions shown in the "Guides" scroller.
 * Every question here maps to a step-by-step guide response.
 */
export const GUIDE_QUESTIONS: string[] = [
  'How to add a student?',
  'How to add a room?',
  'How to collect rent?',
  'How to deactivate a student?',
  'How does QR registration work?',
  'How to vacate a bed?',
  'How to prebook a room?',
  'How to send a reminder?',
  'How to download a receipt?',
  'How to add an expense?',
  'How to add staff?',
  'How to switch hostel?',
  'How to post a notice?',
  'How to edit student details?',
  'How to assign a bed?',
  'How to view reports?',
  'How to mark student as vacated?',
  'How to register via QR?',
  'How to view pending dues?',
];

/** Combined export for backward compatibility */
export const QUICK_QUESTIONS: string[] = [...INFO_QUESTIONS, ...GUIDE_QUESTIONS];

// ─── How-To Steps ─────────────────────────────────────────────────────────────

export const HOW_TO_STEPS: Record<HowToAction, { title: string; steps: string[]; screen?: string; screenLabel?: string }> = {

  // ── Existing guides (preserved exactly) ──────────────────────────────────
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
      "Go to Collected Payments or the student's payment history.",
      'Tap on any payment entry.',
      'Tap "Download Receipt" to save or share as PDF.',
    ],
    screen: 'CollectedPayments',
    screenLabel: 'View Collected Payments',
  },
  update_student: {
    title: 'How to Update Student Details',
    steps: [
      "Go to Students and tap the student's name.",
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
      "Enter the prospective tenant's name and contact.",
      'Select the Room and Bed to reserve.',
      'Collect advance payment if applicable.',
      'Tap Save — the bed is reserved until check-in.',
    ],
    screen: 'PreBooking',
    screenLabel: 'Go to Pre-Booking',
  },

  // ── NEW guides ────────────────────────────────────────────────────────────
  deactivate_student: {
    title: 'How to Deactivate / Mark a Student as Left',
    steps: [
      'Go to the Students screen.',
      "Tap the student's name to open their profile.",
      'Tap the Edit (pencil) icon.',
      'Change the Status to "Inactive" or "Left".',
      'Enter the vacating date.',
      'Tap Save — the student is now deactivated and the bed is freed.',
    ],
    screen: 'Students',
    screenLabel: 'Go to Students',
  },
  qr_registration: {
    title: 'How QR Registration Works',
    steps: [
      'Go to Settings and find your hostel QR code.',
      'Share the QR code with a prospective student.',
      'The student scans the QR using any camera or QR app.',
      'They fill in their basic details in the self-registration form.',
      'The submission appears in your Pending Admissions list.',
      'You review and approve the registration — the student becomes active.',
    ],
    screen: 'QRSignup',
    screenLabel: 'View QR Settings',
  },
  vacate_bed: {
    title: 'How to Vacate a Bed / Room',
    steps: [
      'Go to Students and find the student who is leaving.',
      "Open the student's profile.",
      'Tap the Edit icon and change Status to "Vacated".',
      'Enter the vacating / check-out date.',
      'Tap Save — the bed is immediately freed and shows as Available.',
      'The student moves to the Inactive section.',
    ],
    screen: 'Students',
    screenLabel: 'Go to Students',
  },
  send_reminder: {
    title: 'How to Send a Payment Reminder',
    steps: [
      'Open Pending Dues or the Reminders section.',
      'You will see a list of students with pending payments.',
      'Tap the "Send Reminder" button.',
      'Choose students to remind (all or selected).',
      'A WhatsApp / notification message is sent to each student.',
      'You can also type a custom message before sending.',
    ],
    screen: 'Reminders',
    screenLabel: 'Go to Reminders',
  },
  mark_vacated: {
    title: 'How to Mark a Student as Vacated',
    steps: [
      'Go to the Students screen (3rd tab in bottom menu).',
      "Tap the student's name to view profile.",
      'Tap Edit and set Status to "Vacated".',
      'Enter the date they left.',
      'Tap Save — the record is updated and the bed is freed.',
      'You can view vacated students under the "Left" filter in Students.',
    ],
    screen: 'Students',
    screenLabel: 'Go to Students',
  },
  verify_rent: {
    title: 'How Rent Payment Verification Works',
    steps: [
      'When a student pays online or uploads payment proof, a request is sent to your dashboard.',
      'Tap "Quick Actions (+)" on Home OR open Pending Payments (Money Tab).',
      'Tap "Payment Verification Requests" to see all pending student payment proofs.',
      'Review transaction details, student name, and screenshot.',
      'Tap "Approve / Verify" to credit rent — a receipt is instantly generated.',
      'Or tap "Reject" with a reason. The student is notified and can resend the payment proof!',
    ],
    screen: 'PendingPayments',
    screenLabel: 'View Payment Requests',
  },
  view_payments_guide: {
    title: 'How to View Collected Payments',
    steps: [
      'Go to Payments or Financial Reports from the menu.',
      'Tap "Collected Payments" to view all completed rent receipts.',
      'Filter payments by date range, month, or payment mode (UPI, Cash, Bank).',
      'Tap any payment row to view or download PDF receipt.',
    ],
    screen: 'CollectedPayments',
    screenLabel: 'Go to Collected Payments',
  },
  download_receipt: {
    title: 'How to Download / Share a Receipt',
    steps: [
      'Navigate to Collected Payments or find the student in Students list.',
      'Tap on the payment transaction to open the receipt preview.',
      'Tap "Download PDF" or "Share on WhatsApp" to send to tenant.',
    ],
    screen: 'CollectedPayments',
    screenLabel: 'View Receipts',
  },
  prebook_room: {
    title: 'How to Pre-Book a Room or Bed',
    steps: [
      'Go to Pre-Booking from dashboard quick actions.',
      'Enter prospective tenant information and check-in date.',
      'Select hostel room and bed.',
      'Record token/advance fee and tap Confirm Booking.',
    ],
    screen: 'PreBooking',
    screenLabel: 'Open Pre-Booking',
  },
};

