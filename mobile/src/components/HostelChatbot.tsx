import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  DeviceEventEmitter,
  Animated,
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
import * as Haptics from 'expo-haptics';

const TypeWriterText = ({ text, style }: { text: string; style?: any }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const words = text.split(' ');

    const interval = setInterval(() => {
      setDisplayedText(words.slice(0, index + 1).join(' '));
      index++;
      if (index >= words.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [text]);

  return <Text style={style}>{displayedText}</Text>;
};

const BouncingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: -5, duration: 300, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true })
        ])
      );
    };

    animateDot(dot1, 0).start();
    animateDot(dot2, 150).start();
    animateDot(dot3, 300).start();
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', marginHorizontal: 3,
    transform: [{ translateY: anim }]
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
};


export const HostelChatbot: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFaq, setActiveFaq] = useState<FAQItem | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);
  const { user } = useAuth();
  const [isTourActive, setIsTourActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const isOwner = useMemo(() => {
    return user?.role !== 'TENANT' && user?.role?.toLowerCase() !== 'tenant';
  }, [user?.role]);

  const menuItems = useMemo(() => {
    const isTenant = user?.role?.toLowerCase() === 'tenant';
    if (isTenant) {
      return [
        { label: 'Pay Rent', path: 'Payments', icon: 'cash-outline', color: '#16A34A', bg: '#F0FDF4' },
        { label: 'My Expenses', path: 'Expenses', icon: 'receipt-outline', color: '#DC2626', bg: '#FEF2F2' },
        { label: 'Raise Complaint', path: 'Complaints', icon: 'alert-circle-outline', color: '#EA580C', bg: '#FFF7ED' },
        { label: 'Room Info', path: 'RoomInfo', icon: 'bed-outline', color: '#059669', bg: '#ECFDF5' },
        { label: 'Visitor Pass', path: 'VisitorPass', icon: 'card-outline', color: '#4F46E5', bg: '#EEF2FF' },
        { label: 'Growth Journey', path: 'GrowthHome', icon: 'trending-up-outline', color: '#DB2777', bg: '#FDF2F8' },
      ];
    }
    
    return [
      { label: 'Add Student', path: 'AddStudent', icon: 'person-add-outline', color: '#4F46E5', bg: '#EEF2FF' },
      { label: 'Add Room', path: 'AddRoom', icon: 'bed-outline', color: '#059669', bg: '#ECFDF5' },
      { label: 'Add Staff', path: 'AddStaff', icon: 'people-outline', color: '#DB2777', bg: '#FDF2F8' },
      { label: 'Add Expense', path: 'AddExpense', icon: 'receipt-outline', color: '#DC2626', bg: '#FEF2F2' },
      { label: 'Add Notice', path: 'AddNotice', icon: 'megaphone-outline', color: '#EA580C', bg: '#FFF7ED' },
    ];
  }, [user]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TOUR_STATE_CHANGE', (isActive) => {
      setIsTourActive(isActive);
    });
    return () => sub.remove();
  }, []);

  const faqList = useMemo(() => {
    const baseList = i18n.language === 'te' ? FAQ_DATA_TE : FAQ_DATA_EN;
    const role = user?.role?.toLowerCase() === 'tenant' ? 'tenant' : 'owner';
    return baseList.filter(faq => faq.role === 'both' || faq.role === role);
  }, [i18n.language, user?.role]);

  useEffect(() => {
    const updateRouteName = () => {
      if (RootNavigation.navigationRef.isReady()) {
        const route = RootNavigation.navigationRef.getCurrentRoute();
        setCurrentRoute(route?.name || null);
      }
    };

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

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.full_name ? user.full_name.split(' ')[0] : '';
    const greeting = name ? `, ${name}` : '';

    if (hour < 12) return `Good morning${greeting}! How can I help you today?`;
    if (hour < 18) return `Good afternoon${greeting}! Need any assistance?`;
    return `Good evening${greeting}! How can I help you tonight?`;
  };

  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; link?: { path: string; label: string }; steps?: string[]; isNew?: boolean }>>([]);

  useEffect(() => {
    if (isOpen && chatMessages.length === 0) {
      setChatMessages([
        { sender: 'bot', text: getTimeGreeting() }
      ]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
  }, [isOpen]);

  const categories = useMemo(() => [
    { id: 'all', label: 'All Topics' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'tenants', label: 'Tenants' },
    { id: 'financials', label: 'Financials' },
    { id: 'staff', label: 'Staff' },
    { id: 'notices', label: 'Notices' },
    { id: 'guests', label: 'Guests' },
    { id: 'mess', label: 'Mess Menu' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'reports', label: 'Reports' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'profile', label: 'Profile' }
  ], []);

  const quickPrompts = useMemo(() => {
    if (user?.role === 'tenant') {
      return ["How do I pay my rent?", "Where are my receipts?", "How do I raise a complaint?"];
    }
    if (currentRoute === 'Students' || currentRoute === 'AddStudent') {
      return ["How to add a tenant?", "How to vacate a bed?", "How to collect rent?"];
    }
    if (currentRoute === 'Rooms' || currentRoute === 'AddRoom') {
      return ["How to create a room?", "What is pre-booking?", "How to vacate a bed?"];
    }
    if (currentRoute === 'Expense' || currentRoute === 'InCome' || currentRoute === 'Reports') {
      return ["Where are my bills?", "How do Reports work?", "What is Incomes?"];
    }
    return ["How to switch hostels?", "How to collect rent?", "How to add a room?"];
  }, [currentRoute, user]);


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
  }, [selectedCategory, searchQuery, faqList]);

  const sendBotReply = (faq: FAQItem | null, fallbackText?: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      if (faq) {
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: faq.answer,
            steps: faq.steps,
            link: faq.routePath ? { path: faq.routePath, label: faq.routeLabel || 'Go to Page' } : undefined,
            isNew: true
          }
        ]);
        setActiveFaq(faq);
      } else if (fallbackText) {
        setChatMessages(prev => [
          ...prev,
          { sender: 'bot', text: fallbackText, isNew: true }
        ]);
      }
    }, 1200);
  };

  const handleQuestionSelect = (faq: FAQItem) => {
    Haptics.selectionAsync().catch(() => { });
    setActiveFaq(faq);
  };

  const handleCustomQuestionSubmit = (queryText?: string) => {
    const textToSubmit = typeof queryText === 'string' ? queryText : searchQuery;
    if (!textToSubmit.trim()) return;

    Haptics.selectionAsync().catch(() => { });
    setSearchQuery('');

    const query = textToSubmit.toLowerCase().trim();
    let bestMatch: FAQItem | null = null;
    let maxMatchCount = 0;

    faqList.forEach(faq => {
      let score = 0;
      if (faq.question.toLowerCase().includes(query)) score += 10;
      faq.keywords.forEach(kw => {
        const kwWords = kw.toLowerCase().split(' ');
        if (kwWords.every(word => query.includes(word))) score += 5;
      });
      if (faq.answer.toLowerCase().includes(query)) score += 2;

      if (score > maxMatchCount) {
        maxMatchCount = score;
        bestMatch = score >= 5 ? faq : null;
      }
    });

    if (bestMatch) {
      setActiveFaq(bestMatch);
    } else {
      setChatMessages(prev => [
        ...prev.map(m => ({ ...m, isNew: false })),
        { sender: 'user', text: textToSubmit },
        { sender: 'bot', text: t('chatbot.notFound', { query: textToSubmit }), isNew: true }
      ]);
    }
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
      { sender: 'bot', text: getTimeGreeting() }
    ]);
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, isTyping]);


  if (!user || isTourActive) return null;

  return (
    <>
      {!isOpen && !isFormPage && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
            setIsOpen(true);
          }}
          style={[s.fab, chatbotPosition]}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={s.modalContainer} edges={['top']}>
          <KeyboardAvoidingView
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
            style={s.modalWrapper}
          >
            {/* Header */}
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.header}>
              <View style={s.headerInfoRow}>
                <View style={s.avatarContainer}>
                  <View style={[s.avatar, { backgroundColor: 'transparent' }]}>
                    <Image source={require('../../assets/durgarao-bot.jpeg')}
                      style={{ width: '100%', height: '100%', transform: [{ scale: 1.8 }, { translateY: 4 }] }}
                      resizeMode="cover" />
                  </View>
                  <View style={s.pulseDot} />
                </View>
                <View>
                  <View style={titleRowStyle().titleRow}>
                    <Text style={s.headerTitle}>HOSTIX</Text>
                  </View>
                  <Text style={s.headerSubtitle}>Always here to help</Text>
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

            {/* Quick Prompts */}
            {!activeFaq && (
              <View style={{ backgroundColor: '#F8FAFC', paddingVertical: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
                  {quickPrompts.map((prompt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={s.quickPromptChip}
                      onPress={() => handleCustomQuestionSubmit(prompt)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="sparkles" size={14} color="#4F46E5" style={{ marginRight: 6 }} />
                      <Text style={s.quickPromptText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Search Section */}
            <View style={s.searchSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity 
                  onPress={() => setIsAddMenuOpen(true)}
                  style={s.addMenuBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="menu-outline" size={28} color="#4F46E5" />
                </TouchableOpacity>
                <View style={[s.searchInputContainer, { flex: 1 }]}>
                  <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                  <TextInput
                    style={s.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={() => handleCustomQuestionSubmit()}
                    placeholder="Search for help..."
                    placeholderTextColor="#94A3B8"
                    returnKeyType="send"
                    autoCorrect={false}
                    autoCapitalize="none"
                    underlineColorAndroid="transparent"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginTop: 10, paddingBottom: 4 }}
              >
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => { });
                      setSelectedCategory(cat.id);
                      setActiveFaq(null);
                    }}
                    style={[
                      s.categoryPill,
                      selectedCategory === cat.id && s.categoryPillActive
                    ]}
                    activeOpacity={0.7}
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
              ref={scrollViewRef}
              style={s.chatArea}
              contentContainerStyle={s.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {activeFaq ? (
                <View style={s.faqDetailContainer}>
                  <TouchableOpacity
                    onPress={() => setActiveFaq(null)}
                    style={s.backBtn}
                  >
                    <Ionicons name="arrow-back" size={16} color="#4F46E5" />
                    <Text style={s.backBtnText}>Back to chat</Text>
                  </TouchableOpacity>

                  <View style={s.faqCard}>
                    <Text style={s.faqQuestion}>{activeFaq.question}</Text>
                    <View style={s.faqDivider} />
                    <TypeWriterText style={s.faqAnswer} text={activeFaq.answer} />

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
                        style={s.actionBtn} 
                        onPress={() => handleLinkClick(activeFaq.routePath!)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.actionBtnText}>{activeFaq.routeLabel || 'Go to Page'}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {searchQuery || selectedCategory !== 'all' ? (
                    <View style={{ gap: 10 }}>
                      <Text style={s.sectionHeader}>
                        Suggested Topics
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
                            Try asking something else.
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 16 }}>
                      {/* Welcome banner card at the top of the chat area */}
                      <View style={s.welcomeCard}>
                        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.welcomeBanner}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.welcomeTitle}>Hostix AI Assistant</Text>
                              <Text style={s.welcomeSubtitle}>{getTimeGreeting()}</Text>
                            </View>
                            <Image 
                              source={require('../../assets/durgarao-bot.jpeg')} 
                              style={s.welcomeBotImg} 
                              resizeMode="cover" 
                            />
                          </View>
                        </LinearGradient>
                        <View style={s.welcomeContent}>
                          <Text style={s.welcomeContentText}>
                            Here is the information you are looking for. Select one of the regular options below or type in the search bar:
                          </Text>
                          
                          <View style={s.welcomeButtonsContainer}>
                            <TouchableOpacity 
                              style={s.outlinePillBtn}
                              onPress={() => handleCustomQuestionSubmit("How to collect rent?")}
                              activeOpacity={0.7}
                            >
                              <Text style={s.outlinePillBtnText}>How to collect rent?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={s.outlinePillBtn}
                              onPress={() => handleCustomQuestionSubmit("How to add a tenant?")}
                              activeOpacity={0.7}
                            >
                              <Text style={s.outlinePillBtnText}>How to add a tenant?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={s.outlinePillBtn}
                              onPress={() => handleCustomQuestionSubmit("How to create a room?")}
                              activeOpacity={0.7}
                            >
                              <Text style={s.outlinePillBtnText}>How to create a room?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={s.outlinePillBtn}
                              onPress={() => handleCustomQuestionSubmit("How to vacate a bed?")}
                              activeOpacity={0.7}
                            >
                              <Text style={s.outlinePillBtnText}>How to vacate a bed?</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {chatMessages.map((msg, index) => (
                        <View
                          key={index}
                          style={[
                            s.messageBubbleRow,
                            msg.sender === 'user' ? s.messageUserRow : s.messageBotRow
                          ]}
                        >
                          <View
                            style={[
                              s.messageBubble,
                              msg.sender === 'user' ? s.messageUserBubble : s.messageBotBubble
                            ]}
                          >
                            {msg.sender === 'bot' && msg.isNew ? (
                              <TypeWriterText style={[s.messageText, s.messageBotText]} text={msg.text} />
                            ) : (
                              <Text
                                style={[
                                  s.messageText,
                                  msg.sender === 'user' ? s.messageUserText : s.messageBotText
                                ]}
                              >
                                {msg.text}
                              </Text>
                            )}

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
                                style={s.actionBtn} 
                                onPress={() => handleLinkClick(msg.link!.path)}
                                activeOpacity={0.8}
                              >
                                <Text style={s.actionBtnText}>{msg.link.label}</Text>
                                <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}

                      {isTyping && (
                        <View style={[s.messageBubbleRow, s.messageBotRow]}>
                          <View style={[s.messageBubble, s.messageBotBubble, { paddingVertical: 8, paddingHorizontal: 12 }]}>
                            <BouncingDots />
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Footer removed per request */}

          </KeyboardAvoidingView>

          {/* Add Menu Pop-up Overlay */}
          {isAddMenuOpen && (
            <TouchableOpacity
              style={s.overlayBackground}
              activeOpacity={1}
              onPress={() => setIsAddMenuOpen(false)}
            >
              <View style={s.popupMenuCard}>
                <Text style={s.popupMenuTitle}>Quick Actions</Text>
                <View style={s.popupMenuGrid}>
                  {menuItems.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={s.popupMenuItem}
                      onPress={() => {
                        setIsAddMenuOpen(false);
                        handleLinkClick(item.path);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.popupMenuIconContainer, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon as any} size={22} color={item.color} />
                      </View>
                      <Text style={s.popupMenuItemText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={s.popupMenuCloseBtn}
                  onPress={() => setIsAddMenuOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={s.popupMenuCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

        </SafeAreaView>
      </Modal>
    </>
  );
};

function titleRowStyle() {
  return StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center' }
  });
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 140,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden'
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: '#FCFCFD',
    marginTop: 0,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 }
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  pulseDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerSubtitle: {
    color: '#E0E7FF',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 4,
  },
  quickPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  quickPromptText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  searchSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFF',
    zIndex: 10,
    elevation: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    height: 48,
    includeFontPadding: false,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: 'bold',
  },
  categoryTextActive: {
    color: '#4F46E5',
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
    gap: 10,
    alignItems: 'flex-start',
  },
  messageUserRow: {
    justifyContent: 'flex-end',
  },
  messageBotRow: {
    justifyContent: 'flex-start',
  },
  botBubbleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 2,
    backgroundColor: '#FFF',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
    maxWidth: '82%',
  },
  messageUserBubble: {
    backgroundColor: '#4F46E5',
    borderTopRightRadius: 4,
  },
  messageBotBubble: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageUserText: {
    color: '#FFF',
  },
  messageBotText: {
    color: '#334155',
  },
  bubbleStepText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  bubbleLink: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bubbleLinkText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  faqItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  faqItemQuestion: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    opacity: 0.7
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 10
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4
  },
  faqDetailContainer: {
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  faqCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  stepsContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 14,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FCFCFD',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  addMenuBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  popupMenuCard: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  popupMenuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  popupMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  popupMenuItem: {
    width: '47%',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  popupMenuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  popupMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  popupMenuCloseBtn: {
    marginTop: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  popupMenuCloseText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  welcomeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  welcomeBanner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    color: '#E0E7FF',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  welcomeBotImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFF',
    marginLeft: 12,
  },
  welcomeContent: {
    padding: 16,
    backgroundColor: '#FCFCFD',
  },
  welcomeContentText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  welcomeButtonsContainer: {
    gap: 8,
  },
  outlinePillBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinePillBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  }
});
