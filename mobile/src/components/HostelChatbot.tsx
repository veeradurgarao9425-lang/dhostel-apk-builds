import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as RootNavigation from '../navigation/navigationRef';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../theme/index';
import { FAQItem, FAQ_DATA_EN, FAQ_DATA_TE } from '../constants/faqData';


export const HostelChatbot: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFaq, setActiveFaq] = useState<FAQItem | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);
  const { user } = useAuth();

  const faqList = useMemo(() => {
    return i18n.language === 'te' ? FAQ_DATA_TE : FAQ_DATA_EN;
  }, [i18n.language]);


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
      'StaffPayments', 'Reminders', 'IncomeDetails', 'Hostels', 'Notices',
      'NoticesManagement', 'InCome'
    ];
    if (currentRoute && listPagesWithFAB.includes(currentRoute)) {
      return { bottom: 110, right: 24 };
    }
    return { bottom: 140, right: 24 };
  }, [currentRoute]);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; link?: { path: string; label: string }; steps?: string[] }>>([]);

  useEffect(() => {
    setChatMessages([
      { sender: 'bot', text: t('chatbot.welcome') }
    ]);
  }, [i18n.language]);

  const categories = useMemo(() => [
    { id: 'all', label: 'All Features' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'rooms', label: 'Rooms & Beds' },
    { id: 'tenants', label: 'Tenants & Staff' },
    { id: 'financials', label: 'Financials' },
    { id: 'alerts', label: 'Settings & Alerts' }
  ], []);


  // Perform search / category filtration
  const filteredFAQs = useMemo(() => {
    let result = faqList;


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

    faqList.forEach(faq => {
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
            text: t('chatbot.notFound', { query: userText })
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
      { sender: 'bot', text: t('chatbot.welcome') }
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
        <SafeAreaView style={s.modalContainer} edges={['top']}>
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
                    <Text style={s.headerTitle}>{t('chatbot.title')}</Text>
                    <Ionicons name="sparkles" size={14} color="#FDE047" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={s.headerSubtitle}>{t('chatbot.subtitle')}</Text>
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
                  placeholder={t('chatbot.placeholder')}

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
              {/* Category Pills Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setActiveFaq(null);
                    }}
                    style={[
                      s.categoryPill,
                      { marginBottom: 4, marginRight: 4 }, // Fallback for older react-native gap support
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
              </View>
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
                    <Text style={s.backBtnText}>{t('chatbot.backToTopics')}</Text>
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
                        {t('chatbot.chooseTopic', { count: filteredFAQs.length })}
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
                          <Text style={s.emptyStateTitle}>{t('chatbot.noResults')}</Text>
                          <Text style={s.emptyStateText}>
                            {t('chatbot.trySearching')}
                          </Text>
                          <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
                            <Text style={s.resetBtnText}>{t('chatbot.showAll')}</Text>
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
              <Text style={s.footerText}>{t('chatbot.footer')}</Text>
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

