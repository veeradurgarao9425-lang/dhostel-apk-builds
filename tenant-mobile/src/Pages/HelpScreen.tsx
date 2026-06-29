import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID = '#4A5568';
const BG = '#F8FAFC';
const BORDER = '#E2E8F0';

const FAQ_DATA = [
  {
    id: '1',
    category: 'payments',
    question: 'How do I pay my rent?',
    answer: 'You can pay your rent through the "Dues" tab. Select any pending due and tap "Pay Now" to choose your preferred payment method.'
  },
  {
    id: '2',
    category: 'complaints',
    question: 'How do I raise a complaint?',
    answer: 'Go to the "Home" or "More" tab, select "Complaints", and tap the "+" icon. Fill in the details and submit. Management will be notified immediately.'
  },
  {
    id: '3',
    category: 'general',
    question: 'Where can I find the Hostel Key?',
    answer: 'Your unique Hostel Portal Key is provided by your hostel owner or manager. If you haven\'t received it, please contact them directly.'
  },
  {
    id: '4',
    category: 'general',
    question: 'How do I view my uploaded documents?',
    answer: 'Navigate to the "More" tab and select "Documents". There you can view all your uploaded ID proofs and address details.'
  },
  {
    id: '5',
    category: 'payments',
    question: 'Can I view my previous payment history?',
    answer: 'Yes! Go to the "Expenses" or "Dues" tab and look for the "History" or "Paid" section to see a record of all your past transactions.'
  }
];

export default function HelpScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeFaq, setActiveFaq] = useState<any>(null);
  
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Hi there! 👋 I am here to help you. Ask me a question or choose a topic below.' }
  ]);

  const categories = [
    { id: 'all', label: 'All Topics' },
    { id: 'general', label: 'General' },
    { id: 'payments', label: 'Payments & Dues' },
    { id: 'complaints', label: 'Complaints' }
  ];

  const filteredFAQs = useMemo(() => {
    let result = FAQ_DATA;
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectedCategory, searchQuery]);

  const handleSelectFaq = (faq: any) => {
    setActiveFaq(faq);
    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: faq.question },
      { sender: 'bot', text: faq.answer }
    ]);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setActiveFaq(null);
    setChatMessages([{ sender: 'bot', text: 'How else can I help you today?' }]);
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={WHITE} />
          </TouchableOpacity>
          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>Need Help?</Text>
            <Text style={s.headerSub}>Support & FAQ</Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={s.rightBtn} activeOpacity={0.7}>
            <Ionicons name="refresh" size={22} color={WHITE} />
          </TouchableOpacity>
        </View>

        {/* Search & Categories */}
        <View style={s.searchSection}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" style={{ marginLeft: 12 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search for help..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catPill, selectedCategory === cat.id && s.catPillActive]}
                onPress={() => { setSelectedCategory(cat.id); setActiveFaq(null); }}
              >
                <Text style={[s.catText, selectedCategory === cat.id && s.catTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Area */}
        <ScrollView style={s.chatArea} contentContainerStyle={s.chatContent} showsVerticalScrollIndicator={false}>
          {activeFaq ? (
            <View style={s.faqDetail}>
              <TouchableOpacity onPress={() => setActiveFaq(null)} style={s.backToTopics}>
                <Ionicons name="arrow-back" size={16} color={BLUE} />
                <Text style={s.backToTopicsText}>Back to Topics</Text>
              </TouchableOpacity>
              <View style={s.faqCard}>
                <Text style={s.faqQuestion}>{activeFaq.question}</Text>
                <View style={s.divider} />
                <Text style={s.faqAnswer}>{activeFaq.answer}</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Chat Messages */}
              {!searchQuery && selectedCategory === 'all' && chatMessages.map((msg, i) => (
                <View key={i} style={[s.msgRow, msg.sender === 'user' ? s.msgUserRow : s.msgBotRow]}>
                  {msg.sender === 'bot' && (
                    <View style={s.botIcon}>
                      <Ionicons name="headset" size={16} color={BLUE} />
                    </View>
                  )}
                  <View style={[s.msgBubble, msg.sender === 'user' ? s.msgUserBubble : s.msgBotBubble]}>
                    <Text style={[s.msgText, msg.sender === 'user' ? s.msgUserText : s.msgBotText]}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}

              {/* FAQs List */}
              <View style={s.faqListWrap}>
                <Text style={s.chooseTopic}>
                  {filteredFAQs.length > 0 ? `Suggested Topics (${filteredFAQs.length})` : 'No results found'}
                </Text>
                {filteredFAQs.map(faq => (
                  <TouchableOpacity
                    key={faq.id}
                    style={s.faqListItem}
                    activeOpacity={0.7}
                    onPress={() => handleSelectFaq(faq)}
                  >
                    <Text style={s.faqListItemText}>{faq.question}</Text>
                    <Ionicons name="chevron-forward" size={16} color={BLUE} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BLUE },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10, backgroundColor: BLUE
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  rightBtn: { padding: 8, marginLeft: 8 },
  
  searchSection: { backgroundColor: WHITE, padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: BG,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, height: 44,
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: TEXT_DARK },
  catScroll: { gap: 8, marginTop: 12 },
  catPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  catPillActive: { backgroundColor: BLUE, borderColor: BLUE },
  catText: { fontSize: 12, fontWeight: '600', color: TEXT_MID },
  catTextActive: { color: WHITE },

  chatArea: { flex: 1, backgroundColor: BG },
  chatContent: { padding: 16, paddingBottom: 40 },
  
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
  msgUserRow: { justifyContent: 'flex-end' },
  msgBotRow: { justifyContent: 'flex-start' },
  botIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E7FF' },
  msgBubble: { padding: 12, borderRadius: 16, maxWidth: '80%' },
  msgUserBubble: { backgroundColor: BLUE, borderBottomRightRadius: 4 },
  msgBotBubble: { backgroundColor: WHITE, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: BORDER },
  msgText: { fontSize: 13, lineHeight: 18 },
  msgUserText: { color: WHITE },
  msgBotText: { color: TEXT_DARK },

  faqListWrap: { marginTop: 10, gap: 10 },
  chooseTopic: { fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 4 },
  faqListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: WHITE, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  faqListItemText: { flex: 1, fontSize: 13, fontWeight: '500', color: TEXT_DARK },

  faqDetail: { gap: 16 },
  backToTopics: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backToTopicsText: { color: BLUE, fontWeight: '700', fontSize: 13 },
  faqCard: { backgroundColor: WHITE, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: BORDER },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  divider: { height: 1, backgroundColor: BORDER, my: 12, marginVertical: 12 },
  faqAnswer: { fontSize: 13, color: TEXT_MID, lineHeight: 20 }
});
