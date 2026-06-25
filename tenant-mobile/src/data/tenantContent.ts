/**
 * Placeholder content for the tenant modules that don't yet have a backend
 * endpoint (notices, complaints, services, documents, notifications, expenses).
 *
 * These are intentionally typed and centralized so each screen renders a
 * realistic, polished UI today and can be swapped for a real API call later.
 * Live data (room, dues) still comes from /auth/tenant/me via AuthContext.
 */

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type Notice = {
  id: string;
  title: string;
  body: string;
  category: 'General' | 'Maintenance' | 'Food' | 'Important';
  date: string; // ISO
  pinned?: boolean;
};

export type Complaint = {
  id: string;
  title: string;
  category: 'Electrical' | 'Plumbing' | 'WiFi' | 'Cleaning' | 'Furniture' | 'Other';
  status: 'Open' | 'In Progress' | 'Resolved';
  date: string; // ISO
  note?: string;
};

export type NotificationItem = {
  id: string;
  type: 'due' | 'notice' | 'complaint' | 'system';
  title: string;
  body: string;
  date: string; // ISO
  read?: boolean;
};

export type PaymentRecord = {
  id: string;
  month: string;
  amount: number;
  paidOn: string; // ISO
  method: string;
  status: 'Paid' | 'Partial' | 'Pending';
  dueDate?: string;
};

export type ExpenseCategory = 'Food' | 'Travel' | 'Shopping' | 'Other' | 'Medical' | 'Utilities';

export type ExpenseRecord = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // ISO date
  time: string; // e.g. "08:30 AM"
  note?: string;
};

export type MessMenuItem = {
  meal: 'Breakfast' | 'Lunch' | 'Dinner';
  items: string;
  time: string;
};

export type ServiceItem = {
  id: string;
  name: string;
  detail: string;
};

export type TenantDocument = {
  id: string;
  name: string;
  type: 'Agreement' | 'Receipt' | 'KYC' | 'Other';
  date: string; // ISO
  sizeKb?: number;
};

export type MessageItem = {
  id: string;
  from: string;
  fromType: 'Admin' | 'Support' | 'System';
  title: string;
  body: string;
  date: string; // ISO
  time: string;
  read: boolean;
  avatarColor: string;
};

// ── Sample content ────────────────────────────────────────────────────────────

export const sampleNotices: Notice[] = [
  {
    id: 'n1',
    title: 'WiFi Maintenance',
    body: 'WiFi will not be available on 10 Jun from 12 AM to 6 AM.',
    category: 'Important',
    date: '2025-06-09',
    pinned: true,
  },
  {
    id: 'n2',
    title: 'Water Supply Interruption',
    body: 'Water supply will be interrupted on 10 Jun, 2025 between 10 AM - 2 PM.',
    category: 'Maintenance',
    date: '2025-06-09',
  },
  {
    id: 'n3',
    title: 'Mess Timings Update',
    body: 'New mess timings will be effective from 12 Jun, 2025.',
    category: 'General',
    date: '2025-06-08',
  },
  {
    id: 'n4',
    title: 'Special Menu on Sunday',
    body: 'We are serving special biryani on Sunday (15 Jun).',
    category: 'Food',
    date: '2025-06-07',
  },
];

export const sampleComplaints: Complaint[] = [
  {
    id: 'c1',
    title: 'Bathroom tap leaking',
    category: 'Plumbing',
    status: 'In Progress',
    date: '2025-06-08',
    note: 'Plumber scheduled for tomorrow morning.',
  },
  {
    id: 'c2',
    title: 'Tube light flickering',
    category: 'Electrical',
    status: 'Resolved',
    date: '2025-06-03',
    note: 'Replaced on 4 Jun.',
  },
];

export const sampleNotifications: NotificationItem[] = [
  {
    id: 'a1',
    type: 'due',
    title: 'Rent due soon',
    body: 'Your rent of ₹6,500 is due on 5 Jun. Tap to pay now.',
    date: '2025-06-09',
    read: false,
  },
  {
    id: 'a2',
    type: 'notice',
    title: 'New notice: Water maintenance',
    body: 'Water supply will be interrupted on 10 Jun between 10 AM - 2 PM.',
    date: '2025-06-09',
    read: false,
  },
  {
    id: 'a3',
    type: 'complaint',
    title: 'Complaint update',
    body: 'Your "Bathroom tap leaking" complaint is now In Progress.',
    date: '2025-06-08',
    read: true,
  },
];

export const samplePayments: PaymentRecord[] = [
  {
    id: 'p0',
    month: 'June 2025',
    amount: 6500,
    paidOn: '',
    method: '',
    status: 'Pending',
    dueDate: '2025-06-05',
  },
  {
    id: 'p1',
    month: 'May 2025',
    amount: 6500,
    paidOn: '2025-05-05',
    method: 'UPI',
    status: 'Paid',
    dueDate: '2025-05-05',
  },
  {
    id: 'p2',
    month: 'April 2025',
    amount: 6500,
    paidOn: '2025-04-05',
    method: 'UPI',
    status: 'Paid',
    dueDate: '2025-04-05',
  },
  {
    id: 'p3',
    month: 'March 2025',
    amount: 6500,
    paidOn: '2025-03-04',
    method: 'Cash',
    status: 'Paid',
    dueDate: '2025-03-05',
  },
];

// ── Expense data ─────────────────────────────────────────────────────────────

export const sampleExpenses: ExpenseRecord[] = [
  { id: 'e1', title: 'Breakfast', category: 'Food', amount: 50, date: '2025-06-09', time: '08:30 AM' },
  { id: 'e2', title: 'Auto Ride', category: 'Travel', amount: 80, date: '2025-06-09', time: '09:15 AM' },
  { id: 'e3', title: 'Lunch', category: 'Food', amount: 120, date: '2025-06-09', time: '01:30 PM' },
  { id: 'e4', title: 'Snacks', category: 'Food', amount: 30, date: '2025-06-09', time: '05:00 PM' },
  { id: 'e5', title: 'Other', category: 'Other', amount: 40, date: '2025-06-09', time: '08:00 PM' },
  { id: 'e6', title: 'Breakfast', category: 'Food', amount: 45, date: '2025-06-08', time: '08:00 AM' },
  { id: 'e7', title: 'Bus Ticket', category: 'Travel', amount: 25, date: '2025-06-08', time: '10:00 AM' },
  { id: 'e8', title: 'Medicines', category: 'Medical', amount: 180, date: '2025-06-08', time: '06:00 PM' },
  { id: 'e9', title: 'Grocery', category: 'Shopping', amount: 350, date: '2025-06-07', time: '11:00 AM' },
  { id: 'e10', title: 'Dinner', category: 'Food', amount: 95, date: '2025-06-07', time: '08:30 PM' },
];

// Monthly expense summary by category for June 2025
export const monthlyExpenseSummary = {
  month: 'June 2025',
  total: 4320,
  prevTotal: 3890,
  categories: [
    { name: 'Food' as ExpenseCategory, amount: 2150, color: '#6366F1' },
    { name: 'Travel' as ExpenseCategory, amount: 890, color: '#F59E0B' },
    { name: 'Shopping' as ExpenseCategory, amount: 780, color: '#10B981' },
    { name: 'Other' as ExpenseCategory, amount: 500, color: '#EF4444' },
  ],
  weeklyData: [820, 1100, 1200, 1200], // week 1-4
};

// ── Today's Mess Menu ────────────────────────────────────────────────────────

export const todayMenu: MessMenuItem[] = [
  { meal: 'Breakfast', items: 'Idli, Sambar, Chutney', time: '7:30 – 9:30 AM' },
  { meal: 'Lunch', items: 'Rice, Dal, Veg Curry, Salad', time: '12:30 – 2:30 PM' },
  { meal: 'Dinner', items: 'Chapathi, Paneer Curry, Pickle', time: '7:30 – 9:30 PM' },
];

// ── Messages ─────────────────────────────────────────────────────────────────

export const sampleMessages: MessageItem[] = [
  {
    id: 'm1',
    from: 'Admin',
    fromType: 'Admin',
    title: 'Rent Reminder',
    body: 'Rent for June 2025 is due on 05 Jun, 2025.',
    date: '2025-06-09',
    time: '2h ago',
    read: false,
    avatarColor: '#6366F1',
  },
  {
    id: 'm2',
    from: 'Admin',
    fromType: 'Admin',
    title: 'Mess Announcement',
    body: 'Special Biryani on Sunday (15 Jun).',
    date: '2025-06-09',
    time: '5h ago',
    read: true,
    avatarColor: '#10B981',
  },
  {
    id: 'm3',
    from: 'Maintenance',
    fromType: 'Admin',
    title: 'Maintenance Notice',
    body: 'Lift service will be down on 11 Jun.',
    date: '2025-06-08',
    time: '1d ago',
    read: true,
    avatarColor: '#F59E0B',
  },
  {
    id: 'm4',
    from: 'Support',
    fromType: 'Support',
    title: 'Support Response',
    body: 'Your maintenance request has been resolved.',
    date: '2025-06-07',
    time: '2d ago',
    read: true,
    avatarColor: '#3B82F6',
  },
  {
    id: 'm5',
    from: 'System',
    fromType: 'System',
    title: 'General Announcement',
    body: 'Community meeting on 15 Jun at 6 PM.',
    date: '2025-06-05',
    time: '2d ago',
    read: false,
    avatarColor: '#8B5CF6',
  },
];

export const sampleServices: { category: string; items: ServiceItem[] }[] = [
  {
    category: "Mess menu — today",
    items: [
      { id: 's1', name: 'Breakfast', detail: 'Idli, Sambar, Chutney · 7:30–9:30am' },
      { id: 's2', name: 'Lunch', detail: 'Rice, Dal, Veg Curry, Salad · 12:30–2:30pm' },
      { id: 's3', name: 'Dinner', detail: 'Chapathi, Paneer Curry, Pickle · 7:30–9:30pm' },
    ],
  },
  {
    category: "Facilities",
    items: [
      { id: 's4', name: 'Laundry', detail: 'Pickup Mon & Thu · returned next day' },
      { id: 's5', name: 'Housekeeping', detail: 'Room cleaning daily 10–11am' },
      { id: 's6', name: 'Visitor pass', detail: 'Request a guest entry pass from front desk' },
    ],
  },
];

export const sampleDocuments: TenantDocument[] = [
  { id: 'd1', name: 'Rent Agreement 2025', type: 'Agreement', date: '2025-01-01', sizeKb: 480 },
  { id: 'd2', name: 'May 2025 Receipt', type: 'Receipt', date: '2025-05-05', sizeKb: 96 },
  { id: 'd3', name: 'Apr 2025 Receipt', type: 'Receipt', date: '2025-04-05', sizeKb: 94 },
  { id: 'd4', name: 'ID Proof (Aadhaar)', type: 'KYC', date: '2025-01-01', sizeKb: 220 },
];
