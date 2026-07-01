export const mockNotices = [
  {
    notice_id: "N1",
    title: "Scheduled Maintenance",
    content: "The water supply will be interrupted on Sunday from 10 AM to 2 PM for tank cleaning.",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    is_read: false
  },
  {
    notice_id: "N2",
    title: "Welcome Event",
    content: "Join us for a welcome gathering in the common area tonight at 8 PM. Snacks will be provided!",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: true
  }
];

export const mockFees = [
  {
    fee_id: 1,
    fee_month: "2026-07",
    monthly_rent: 5500,
    total_amount: 5500,
    total_due: 5500,
    paid_amount: 0,
    balance: 5500,
    fee_status: "Pending",
    due_date: "2026-07-05",
    payments: []
  },
  {
    fee_id: 2,
    fee_month: "2026-06",
    monthly_rent: 5500,
    total_amount: 5500,
    total_due: 5500,
    paid_amount: 5500,
    balance: 0,
    fee_status: "Fully Paid",
    due_date: "2026-06-05",
    payments: [
      {
        payment_id: 101,
        amount: 5500,
        payment_date: "2026-06-04",
        payment_mode: "UPI",
        verification_status: "Verified"
      }
    ]
  }
];

export const mockExpenses = [
  {
    expense_id: 1,
    category: "Food",
    amount: 150,
    description: "Lunch outside",
    date: new Date().toISOString(),
    paid_by: "Me",
    split_with: []
  },
  {
    expense_id: 2,
    category: "Groceries",
    amount: 450,
    description: "Snacks and essentials",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paid_by: "Me",
    split_with: []
  }
];

export const mockComplaints = [
  {
    complaint_id: "C101",
    category: "Plumbing",
    description: "The bathroom tap is leaking continuously.",
    status: "Pending",
    created_at: new Date().toISOString(),
    image_url: null
  },
  {
    complaint_id: "C102",
    category: "Electrical",
    description: "Fan regulator is not working in Room 204.",
    status: "Resolved",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    image_url: null
  }
];

export const mockGatePasses = [
  {
    pass_id: "GP-5521",
    reason: "Going home for the weekend",
    departure_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    expected_return: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Approved",
    created_at: new Date().toISOString()
  }
];

export const mockSplits = [
  {
    split_id: 1,
    title: "Weekend Trip",
    total_amount: 1200,
    your_share: 400,
    status: "Unsettled",
    members: ["You", "Rahul", "Amit"],
    date: new Date().toISOString()
  }
];

export const mockWeeklyMenu = {
  Mon: {
    breakfast: { items: 'Idli, Sambar, Chutney', time: '7:30 – 9:30 AM' },
    lunch: { items: 'Rice, Dal, Veg Curry, Salad', time: '12:30 – 2:30 PM' },
    dinner: { items: 'Chapathi, Paneer Curry, Pickle', time: '7:30 – 9:30 PM' },
  },
  Tue: {
    breakfast: { items: 'Poha, Boiled Eggs, Tea/Coffee', time: '7:30 – 9:30 AM' },
    lunch: { items: 'Curd Rice, Sambar, Papad', time: '12:30 – 2:30 PM' },
    dinner: { items: 'Roti, Dal Fry, Jeera Rice', time: '7:30 – 9:30 PM' },
  },
  Wed: {
    breakfast: { items: 'Upma, Coconut Chutney, Juice', time: '7:30 – 9:30 AM' },
    lunch: { items: 'Biryani, Raita, Papad', time: '12:30 – 2:30 PM' },
    dinner: { items: 'Puri, Aloo Sabzi, Dal', time: '7:30 – 9:30 PM' },
  },
  Thu: {
    breakfast: { items: 'Dosa, Sambar, Chutney', time: '7:30 – 9:30 AM' },
    lunch: { items: 'Rice, Rasam, Fry, Salad', time: '12:30 – 2:30 PM' },
    dinner: { items: 'Chapathi, Chana Masala, Rice', time: '7:30 – 9:30 PM' },
  },
  Fri: {
    breakfast: { items: 'Bread Toast, Omelette, Coffee', time: '7:30 – 9:30 AM' },
    lunch: { items: 'Pulao, Dal Tadka, Raita', time: '12:30 – 2:30 PM' },
    dinner: { items: 'Roti, Matar Paneer, Rice, Pickle', time: '7:30 – 9:30 PM' },
  },
  Sat: {
    breakfast: { items: 'Pongal, Vadai, Sambar', time: '7:30 – 9:30 AM' },
    lunch: { items: 'Chicken Curry, Rice, Raita', time: '12:30 – 2:30 PM' },
    dinner: { items: 'Naan, Butter Chicken / Paneer', time: '7:30 – 9:30 PM' },
  },
  Sun: {
    breakfast: { items: 'Aloo Paratha, Curd, Pickle', time: '8:00 – 10:00 AM' },
    lunch: { items: 'Special Biryani, Raita, Sweet', time: '12:30 – 2:30 PM' },
    dinner: { items: 'Chapathi, Dal Makhani, Rice', time: '7:30 – 9:30 PM' },
  },
};
