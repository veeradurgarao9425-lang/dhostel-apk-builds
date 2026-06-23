import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as RootNavigation from '../navigation/navigationRef';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../theme/index';

interface FAQItem {
  id: string;
  category: 'home' | 'pending' | 'overview' | 'more';
  question: string;
  answer: string;
  steps?: string[];
  keywords: string[];
  routePath?: string;
  routeLabel?: string;
}

const FAQ_DATA: FAQItem[] = [
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

export const HostelChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFaq, setActiveFaq] = useState<FAQItem | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const updateRouteName = () => {
      if (RootNavigation.navigationRef.isReady()) {
        const route = RootNavigation.navigationRef.getCurrentRoute();
        setCurrentRoute(route?.name || null);
      }
    };

    // Initialize
    const timer = setTimeout(() => {
      updateRouteName();
    }, 500);

    const unsubscribe = RootNavigation.navigationRef.addListener('state', updateRouteName);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const isFormPage = useMemo(() => {
    if (!currentRoute) return false;
    return (
      currentRoute.startsWith('Add') ||
      currentRoute.includes('Details') ||
      currentRoute === 'Settings' ||
      currentRoute === 'Profile' ||
      currentRoute === 'QRSignup' ||
      currentRoute === 'PreBooking'
    );
  }, [currentRoute]);

  const chatbotPosition = useMemo(() => {
    const listPagesWithFAB = [
      'Students', 'Rooms', 'Expenses', 'Staff', 'Guests',
      'StaffPayments', 'Reminders', 'IncomeDetails', 'Hostels'
    ];
    if (currentRoute && listPagesWithFAB.includes(currentRoute)) {
      return { bottom: 110, right: 24 };
    }
    return { bottom: 140, right: 24 };
  }, [currentRoute]);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; link?: { path: string; label: string }; steps?: string[] }>>([
    { sender: 'bot', text: 'Hi! My name is Durgarao. How can I help you today? You can ask me any question about managing your hostels, rooms, students, fees, or utility expenses!' }
  ]);

  const categories = [
    { id: 'all', label: 'History' },
    { id: 'home', label: 'Home Page' },
    { id: 'pending', label: 'Pending Tab' },
    { id: 'overview', label: 'Overview Page' },
    { id: 'more', label: 'More Options' }
  ];

  // Perform search / category filtration
  const filteredFAQs = useMemo(() => {
    let result = FAQ_DATA;

    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        return (
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query) ||
          item.keywords.some(kw => kw.toLowerCase().includes(query)) ||
          (item.steps && item.steps.some(step => step.toLowerCase().includes(query)))
        );
      });
    }

    return result;
  }, [selectedCategory, searchQuery]);

  const handleQuestionSelect = (faq: FAQItem) => {
    setActiveFaq(faq);
    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: faq.question },
      {
        sender: 'bot',
        text: faq.answer,
        steps: faq.steps,
        link: faq.routePath ? { path: faq.routePath, label: faq.routeLabel || 'Go to Page' } : undefined
      }
    ]);
  };

  const handleCustomQuestionSubmit = () => {
    if (!searchQuery.trim()) return;

    const userText = searchQuery;
    setSearchQuery('');

    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);

    const query = userText.toLowerCase().trim();
    let bestMatch: FAQItem | null = null;
    let maxMatchCount = 0;

    FAQ_DATA.forEach(faq => {
      let score = 0;
      if (faq.question.toLowerCase().includes(query)) score += 10;
      faq.keywords.forEach(kw => {
        if (query.includes(kw.toLowerCase())) score += 5;
      });
      if (faq.answer.toLowerCase().includes(query)) score += 2;

      if (score > maxMatchCount) {
        maxMatchCount = score;
        bestMatch = faq;
      }
    });

    setTimeout(() => {
      if (bestMatch && maxMatchCount > 0) {
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: bestMatch!.answer,
            steps: bestMatch!.steps,
            link: bestMatch!.routePath ? { path: bestMatch!.routePath, label: bestMatch!.routeLabel || 'Go to Page' } : undefined
          }
        ]);
        setActiveFaq(bestMatch);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `I couldn't find an exact answer for "${userText}". Try searching using simple terms like 'beds', 'room', 'rent', 'prebook', 'bill', or 'unpaid'.`
          }
        ]);
      }
    }, 400);
  };

  const handleLinkClick = (path: string) => {
    RootNavigation.navigate(path);
    setIsOpen(false);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setActiveFaq(null);
    setChatMessages([
      { sender: 'bot', text: 'Hi! My name is Durgarao. How can I help you today? You can ask me any question about managing your hostels, rooms, students, fees, or utility expenses!' }
    ]);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && !isFormPage && (
        <TouchableOpacity
          onPress={() => setIsOpen(true)}
          style={[s.fab, chatbotPosition]}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Chat dialog modal overlay */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.modalWrapper}
          >
            {/* Header */}
            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={s.header}>
              <View style={s.headerInfoRow}>
                <View style={s.avatarContainer}>
                  <View style={s.avatar}>
                    <Image source={require('../../assets/durgarao-bot.jpeg')} style={s.avatarImage} />
                  </View>
                  <View style={s.pulseDot} />
                </View>
                <View>
                  <View style={titleRowStyle().titleRow}>
                    <Text style={s.headerTitle}>Durgarao</Text>
                    <Ionicons name="sparkles" size={14} color="#FDE047" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={s.headerSubtitle}>Hostel Support Bot • Active</Text>
                </View>
              </View>

              <View style={s.headerActions}>
                <TouchableOpacity onPress={handleReset} style={s.headerIconBtn}>
                  <Ionicons name="refresh-outline" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={s.headerIconBtn}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Search Section */}
            <View style={s.searchSection}>
              <View style={s.searchInputContainer}>
                <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput
                  style={s.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleCustomQuestionSubmit}
                  placeholder="Type word (e.g. room, student, rent, bill)..."
                  placeholderTextColor="#94A3B8"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.categoryScroll}
                contentContainerStyle={s.categoryContent}
              >
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setActiveFaq(null);
                    }}
                    style={[
                      s.categoryPill,
                      selectedCategory === cat.id && s.categoryPillActive
                    ]}
                  >
                    <Text
                      style={[
                        s.categoryText,
                        selectedCategory === cat.id && s.categoryTextActive
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Chat conversation area */}
            <ScrollView
              style={s.chatArea}
              contentContainerStyle={s.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {activeFaq ? (
                // Detailed FAQ Answer View
                <View style={s.faqDetailContainer}>
                  <TouchableOpacity
                    onPress={() => setActiveFaq(null)}
                    style={s.backBtn}
                  >
                    <Ionicons name="arrow-back" size={16} color="#4F46E5" />
                    <Text style={s.backBtnText}>Back to topics</Text>
                  </TouchableOpacity>

                  <View style={s.faqCard}>
                    <Text style={s.faqQuestion}>{activeFaq.question}</Text>
                    <View style={s.faqDivider} />
                    <Text style={s.faqAnswer}>{activeFaq.answer}</Text>

                    {activeFaq.steps && (
                      <View style={s.stepsContainer}>
                        {activeFaq.steps.map((step, idx) => (
                          <View key={idx} style={s.stepRow}>
                            <Text style={s.stepNum}>{idx + 1}.</Text>
                            <Text style={s.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {activeFaq.routePath && (
                      <TouchableOpacity
                        onPress={() => handleLinkClick(activeFaq.routePath!)}
                        style={s.actionBtn}
                      >
                        <Text style={s.actionBtnText}>
                          {activeFaq.routeLabel || 'Go to Page'}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFF" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                // Messages & Grouped FAQ lists
                <View style={{ gap: 16 }}>
                  {searchQuery || selectedCategory !== 'all' ? (
                    // Filtered FAQ lists (Matched topics list)
                    <View style={{ gap: 10 }}>
                      <Text style={s.sectionHeader}>
                        Tap to choose what you want to know ({filteredFAQs.length})
                      </Text>
                      {filteredFAQs.length > 0 ? (
                        filteredFAQs.map(faq => (
                          <TouchableOpacity
                            key={faq.id}
                            onPress={() => handleQuestionSelect(faq)}
                            style={s.faqItemBtn}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={s.faqItemQuestion}>{faq.question}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={s.emptyState}>
                          <Ionicons name="help-circle-outline" size={40} color="#CBD5E1" />
                          <Text style={s.emptyStateTitle}>No results found</Text>
                          <Text style={s.emptyStateText}>
                            Try searching for 'beds', 'room', 'student', 'rent', or 'bill'.
                          </Text>
                          <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
                            <Text style={s.resetBtnText}>Show All FAQs</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    // Default view: Welcome message + Grouped FAQs in a single tab-less page
                    <View style={{ gap: 16 }}>
                      {chatMessages.map((msg, index) => (
                        <View
                          key={index}
                          style={[
                            s.messageBubbleRow,
                            msg.sender === 'user' ? s.messageUserRow : s.messageBotRow
                          ]}
                        >
                          {msg.sender === 'bot' && (
                            <View style={s.botBubbleIcon}>
                              <Image source={require('../../assets/durgarao-bot.jpeg')} style={s.botBubbleImage} />
                            </View>
                          )}
                          <View
                            style={[
                              s.messageBubble,
                              msg.sender === 'user' ? s.messageUserBubble : s.messageBotBubble
                            ]}
                          >
                            <Text
                              style={[
                                s.messageText,
                                msg.sender === 'user' ? s.messageUserText : s.messageBotText
                              ]}
                            >
                              {msg.text}
                            </Text>

                            {msg.steps && (
                              <View style={{ marginTop: 8, gap: 4 }}>
                                {msg.steps.map((st, i) => (
                                  <Text key={i} style={s.bubbleStepText}>
                                    • {st}
                                  </Text>
                                ))}
                              </View>
                            )}

                            {msg.link && (
                              <TouchableOpacity
                                onPress={() => handleLinkClick(msg.link!.path)}
                                style={s.bubbleLink}
                              >
                                <Text style={s.bubbleLinkText}>{msg.link.label}</Text>
                                <Ionicons name="arrow-forward" size={12} color="#4F46E5" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}


                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>Stivo Helper • 100% Free & Secure</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

// Helper function to satisfy TypeScript and keep style rules clean
function titleRowStyle() {
  return StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    }
  });
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 140,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 30,
    marginTop: 20,
  },
  avatarText: {
    color: '#FDE047',
    fontWeight: 'bold',
    fontSize: 14,
  },
  botBubbleImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginTop: 20,
  },
  fabImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  fabPulseDot: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  pulseDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
    borderWidth: 1.5,
    borderColor: '#3730A3',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 6,
  },
  searchSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  categoryScroll: {
    maxHeight: 32,
  },
  categoryContent: {
    gap: 6,
    paddingRight: 16,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
  },
  categoryTextActive: {
    color: '#FFF',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#FCFCFD',
  },
  chatContent: {
    padding: 16,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  messageUserRow: {
    justifyContent: 'flex-end',
  },
  messageBotRow: {
    justifyContent: 'flex-start',
  },
  botBubbleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  botBubbleIconText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '82%',
  },
  messageUserBubble: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 0,
  },
  messageBotBubble: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageText: {
    fontSize: 12,
    lineHeight: 18,
  },
  messageUserText: {
    color: '#FFF',
  },
  messageBotText: {
    color: '#334155',
  },
  bubbleStepText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  bubbleLink: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bubbleLinkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  faqListBlock: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    gap: 20,
  },
  faqSection: {
    gap: 8,
  },
  faqSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  faqSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  commonQuestionsHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quickFaqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
  },
  quickFaqBtnText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  faqDetailContainer: {
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  faqCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  faqAnswer: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  stepsContainer: {
    gap: 8,
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  faqItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  faqItemCategory: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  faqItemQuestion: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  resetBtn: {
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  footer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});

