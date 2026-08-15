import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Animated, Dimensions, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import api from '../services/api';

const RZP_KEY = 'rzp_test_SWMGlUfAqZEvOA'; // Razorpay test key
const TRIAL_DAYS = 30;

// ── Build the inline HTML page that loads Razorpay checkout.js ──────────────
const buildRazorpayHtml = ({
    amount, name, email, phone, planLabel, primaryColor,
}: {
    amount: number; name: string; email: string;
    phone: string; planLabel: string; primaryColor: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { margin: 0; background: #0a0f1e; }
    .loading-wrap { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .loading { color: #fff; font-family: sans-serif; font-size: 16px; text-align: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.2);
      border-top-color: ${primaryColor}; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loading-wrap">
    <div class="loading">
      <div class="spinner"></div>
      Opening Razorpay...
    </div>
  </div>
  <script>
    window.onload = function() {
      var options = {
        key: '${RZP_KEY}',
        amount: ${amount},
        currency: 'INR',
        name: 'Hostex Premium',
        description: '${planLabel} Subscription',
        prefill: { name: '${name}', email: '${email}', contact: '${phone}' },
        theme: { color: '${primaryColor}' },
        handler: function(response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_SUCCESS',
            paymentId: response.razorpay_payment_id,
          }));
        },
        modal: {
          ondismiss: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_DISMISSED' }));
          }
        }
      };
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PAYMENT_FAILED',
          error: resp.error && resp.error.description ? resp.error.description : 'Payment failed',
        }));
      });
      rzp.open();
    };
  </script>
</body>
</html>
`;

const { width } = Dimensions.get('window');
const RATE = 10; // Rs 10 per student per month

const FEATURES = [
    { icon: 'notifications',    bg: '#FEF3C7', color: '#D97706', title: 'Smart Bill Reminders',  desc: 'Auto WhatsApp & SMS reminders to tenants for pending dues' },
    { icon: 'stats-chart',      bg: '#DCFCE7', color: '#059669', title: 'Advanced Reports',      desc: 'Monthly income, expense & occupancy reports with export' },
    { icon: 'receipt',          bg: '#E0F2FE', color: '#0284C7', title: 'Digital Receipts',      desc: 'Branded PDF receipts sent instantly on every payment' },
    { icon: 'cloud-download',   bg: '#EDE9FE', color: '#7C3AED', title: 'Data Backup & Export',  desc: 'Unlimited cloud backup and Excel/PDF data export anytime' },
    { icon: 'people',           bg: '#FCE7F3', color: '#DB2777', title: 'Unlimited Students',    desc: 'No cap on tenants — manage as many students as you need' },
    { icon: 'shield-checkmark', bg: '#D1FAE5', color: '#10B981', title: 'Priority Support',      desc: '24/7 dedicated support with 2-hour response guarantee' },
    { icon: 'qr-code',          bg: '#CFFAFE', color: '#0891B2', title: 'QR Payments',           desc: 'Tenants can scan & pay directly — zero manual entry' },
    { icon: 'bar-chart',        bg: '#FEF9C3', color: '#CA8A04', title: 'Mess Menu Manager',     desc: 'Digital weekly menu, complaints & request management' },
];

const PremiumSubscriptionScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const [plan, setPlan]         = useState<'monthly' | 'quarterly'>('monthly');
    const [modal, setModal]       = useState(false);       // confirm bottom sheet
    const [payModal, setPayModal] = useState(false);       // Razorpay WebView modal
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading]   = useState(true);
    const [activeStudents, setActiveStudents] = useState(0);
    const [roomAllocated, setRoomAllocated]   = useState(0);
    // Trial state
    const [trialActive, setTrialActive]       = useState(false);
    const [trialDaysLeft, setTrialDaysLeft]   = useState(0);

    const glowAnim  = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(glowAnim,  { toValue: 1,    duration: 1800, useNativeDriver: true }),
            Animated.timing(glowAnim,  { toValue: 0,    duration: 1800, useNativeDriver: true }),
        ])).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.06, duration: 900,  useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1,    duration: 900,  useNativeDriver: true }),
        ])).start();
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const [studRes, trialRaw] = await Promise.all([
                api.get('/students?limit=500').catch(() => ({ data: { success: false } })),
                AsyncStorage.getItem('premium_trial_start'),
            ]);
            if (studRes.data?.success) {
                const all = studRes.data.data || [];
                const active    = all.filter((s: any) => s.status === 1);
                const allocated = active.filter((s: any) => s.room_id != null).length;
                setActiveStudents(active.length);
                setRoomAllocated(allocated);
            }
            if (trialRaw) {
                const start    = new Date(trialRaw);
                const elapsed  = Math.floor((Date.now() - start.getTime()) / 86400000);
                const daysLeft = TRIAL_DAYS - elapsed;
                if (daysLeft > 0) { setTrialActive(true); setTrialDaysLeft(daysLeft); }
                else { setTrialActive(false); }
            }
        } catch {}
        finally { setLoading(false); }
    }, []);

    useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

    // ── Razorpay payment handler ───────────────────────────────────────────────
    const handleWebViewMessage = useCallback(async (event: any) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'PAYMENT_SUCCESS') {
                setPayModal(false);
                setProcessing(false);
                // Record trial start if not already set
                const existing = await AsyncStorage.getItem('premium_trial_start');
                if (!existing) {
                    await AsyncStorage.setItem('premium_trial_start', new Date().toISOString());
                    setTrialActive(true);
                    setTrialDaysLeft(TRIAL_DAYS);
                }
                Alert.alert(
                    '🎉 Welcome to Premium!',
                    `Your payment is successful!\nPayment ID: ${msg.paymentId}\n\nAll premium features are now unlocked.`,
                    [{ text: 'Awesome!', style: 'default' }]
                );
            } else if (msg.type === 'PAYMENT_DISMISSED') {
                setPayModal(false);
                setProcessing(false);
            } else if (msg.type === 'PAYMENT_FAILED') {
                setPayModal(false);
                setProcessing(false);
                Alert.alert('Payment Failed', msg.error || 'Please try again.', [{ text: 'OK' }]);
            }
        } catch {}
    }, []);

    const openRazorpay = useCallback(() => {
        setModal(false);
        setTimeout(() => { setProcessing(true); setPayModal(true); }, 300);
    }, []);

    // Pricing
    const billable      = Math.max(activeStudents, 1);
    const monthlyPrice  = billable * RATE;
    const quarterlyFull = billable * RATE * 3;
    const quarterlyDisc = Math.round(quarterlyFull * 0.9);

    const displayPrice  = plan === 'monthly' ? monthlyPrice : quarterlyDisc;
    const displayPeriod = plan === 'monthly' ? '/month' : '/3 months';
    const displayLabel  = plan === 'monthly' ? '1 Month' : '3 Months';

    // Theme shortcuts
    const P   = theme.primary;
    const G1  = theme.gradientStart;
    const G2  = theme.gradientEnd;
    const CB  = theme.cardBg;
    const BG  = theme.background;
    const LB  = isDark ? '#334155' : theme.lightBg;
    const BD  = isDark ? '#334155' : '#E2E8F0';
    const DIV = isDark ? '#334155' : '#F1F5F9';
    const TP  = theme.textPrimary;
    const TS  = theme.textSecondary;
    const ALT = isDark ? '#0F172A' : '#F8FAFC';
    const SCC = theme.success;

    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

    return (
        <View style={[s.root, { backgroundColor: BG }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* HERO */}
            <LinearGradient colors={[G1, G2, P] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.hero, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={[s.backBtn, { top: insets.top + 10 }]} onPress={() => navigation.goBack()} activeOpacity={0.75}>
                    <Ionicons name="chevron-back" size={22} color="#FFF" />
                </TouchableOpacity>

                <Animated.View style={[s.crownWrap, { opacity: glowOpacity, transform: [{ scale: pulseAnim }] }]}>
                    <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} style={s.crownCircle}>
                        <Ionicons name="diamond" size={32} color="#FFF" />
                    </LinearGradient>
                </Animated.View>

                <Text style={s.heroTitle}>Hostex Premium</Text>

                {/* FREE TRIAL PILL */}
                <View style={[s.trialPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="gift" size={13} color="#FFF" />
                    <Text style={s.trialPillTxt}>30-Day Free Trial — No Card Needed</Text>
                </View>

                <Text style={s.heroSub}>
                    Just <Text style={s.priceHL}>₹{RATE}/student/month</Text>
                    {'\n'}Pay only for your active students
                </Text>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>

                {/* FREE TRIAL CARD */}
                <View style={[s.trialCard, { backgroundColor: isDark ? '#1A2744' : '#EFF6FF', borderColor: isDark ? '#334155' : '#BFDBFE' }]}>
                    <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.trialIcon}>
                        <Ionicons name="gift-outline" size={20} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.trialCardTitle, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>🎁 Start Free — No Card Required</Text>
                        <Text style={[s.trialCardDesc,  { color: isDark ? '#94A3B8' : '#3B82F6' }]}>
                            Full 30-day premium access. Cancel before trial ends and pay absolutely nothing.
                        </Text>
                    </View>
                </View>

                {/* LIVE STUDENT STATS */}
                <View style={s.section}>
                    <Text style={[s.secTitle, { color: TP }]}>Your Hostel — Live Count</Text>
                    <View style={[s.statsRow, { backgroundColor: CB, borderColor: BD }]}>
                        {loading ? (
                            <>
                                <ActivityIndicator size="small" color={P} />
                                <Text style={[s.loadingTxt, { color: TS }]}>Fetching student count...</Text>
                            </>
                        ) : (
                            <>
                                <View style={s.statPill}>
                                    <View style={[s.statPillIcon, { backgroundColor: LB }]}>
                                        <Ionicons name="people" size={16} color={P} />
                                    </View>
                                    <Text style={[s.statNum, { color: TP }]}>{activeStudents}</Text>
                                    <Text style={[s.statLbl, { color: TS }]}>Active</Text>
                                </View>
                                <View style={[s.statDiv, { backgroundColor: BD }]} />
                                <View style={s.statPill}>
                                    <View style={[s.statPillIcon, { backgroundColor: '#DCFCE7' }]}>
                                        <Ionicons name="bed" size={16} color="#059669" />
                                    </View>
                                    <Text style={[s.statNum, { color: TP }]}>{roomAllocated}</Text>
                                    <Text style={[s.statLbl, { color: TS }]}>Room Alloc.</Text>
                                </View>
                                <View style={[s.statDiv, { backgroundColor: BD }]} />
                                <View style={s.statPill}>
                                    <View style={[s.statPillIcon, { backgroundColor: '#FEF3C7' }]}>
                                        <Ionicons name="cash" size={16} color="#D97706" />
                                    </View>
                                    <Text style={[s.statNum, { color: '#D97706' }]}>₹{RATE}</Text>
                                    <Text style={[s.statLbl, { color: TS }]}>Per Student</Text>
                                </View>
                                <View style={[s.statDiv, { backgroundColor: BD }]} />
                                <View style={s.statPill}>
                                    <View style={[s.statPillIcon, { backgroundColor: LB }]}>
                                        <Ionicons name="calculator" size={16} color={P} />
                                    </View>
                                    <Text style={[s.statNum, { color: P }]}>₹{monthlyPrice}</Text>
                                    <Text style={[s.statLbl, { color: TS }]}>Total/mo</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* PLAN CARDS */}
                <View style={[s.section, { paddingTop: 0 }]}>
                    <Text style={[s.secTitle, { color: TP }]}>Choose Your Plan</Text>
                    <View style={s.plansRow}>
                        {/* 1 Month */}
                        <TouchableOpacity onPress={() => setPlan('monthly')} activeOpacity={0.82} style={{ flex: 1 }}>
                            {plan === 'monthly' ? (
                                <LinearGradient colors={[G1, P] as any} style={[s.planCard, s.planActive, { shadowColor: P }]}>
                                    <View style={[s.planTag, { backgroundColor: '#FBBF24' }]}>
                                        <Text style={s.planTagTxt}>Most Popular</Text>
                                    </View>
                                    <Text style={s.planLblA}>1 Month</Text>
                                    {loading
                                        ? <ActivityIndicator size="small" color="#FFF" style={{ marginVertical: 4 }} />
                                        : <Text style={s.planPriceA}>₹{monthlyPrice}</Text>}
                                    <Text style={s.planPeriodA}>/month</Text>
                                    <Text style={s.planCalcA}>{billable} students × ₹{RATE}</Text>
                                    <View style={[s.checkCircle, { backgroundColor: '#FFF' }]}>
                                        <Ionicons name="checkmark" size={14} color={P} />
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={[s.planCard, { backgroundColor: CB, borderColor: BD }]}>
                                    <View style={[s.planTag, { backgroundColor: LB }]}>
                                        <Text style={[s.planTagTxt, { color: P }]}>Most Popular</Text>
                                    </View>
                                    <Text style={[s.planLblI, { color: TS }]}>1 Month</Text>
                                    {loading
                                        ? <ActivityIndicator size="small" color={P} style={{ marginVertical: 4 }} />
                                        : <Text style={[s.planPriceI, { color: TP }]}>₹{monthlyPrice}</Text>}
                                    <Text style={[s.planPeriodI, { color: TS }]}>/month</Text>
                                    <Text style={[s.planCalcI, { color: TS }]}>{billable} students × ₹{RATE}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* 3 Months */}
                        <TouchableOpacity onPress={() => setPlan('quarterly')} activeOpacity={0.82} style={{ flex: 1 }}>
                            {plan === 'quarterly' ? (
                                <LinearGradient colors={[G1, P] as any} style={[s.planCard, s.planActive, { shadowColor: P }]}>
                                    <View style={[s.planTag, { backgroundColor: '#FBBF24' }]}>
                                        <Text style={s.planTagTxt}>Save 10%</Text>
                                    </View>
                                    <Text style={s.planLblA}>3 Months</Text>
                                    {loading
                                        ? <ActivityIndicator size="small" color="#FFF" style={{ marginVertical: 4 }} />
                                        : <Text style={s.planPriceA}>₹{quarterlyDisc}</Text>}
                                    <Text style={s.planPeriodA}>/3 months</Text>
                                    <Text style={s.planCalcA}>{billable} × ₹{RATE} × 3 −10%</Text>
                                    <View style={[s.checkCircle, { backgroundColor: '#FFF' }]}>
                                        <Ionicons name="checkmark" size={14} color={P} />
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={[s.planCard, { backgroundColor: CB, borderColor: BD }]}>
                                    <View style={[s.planTag, { backgroundColor: '#DCFCE7' }]}>
                                        <Text style={[s.planTagTxt, { color: '#059669' }]}>Save 10%</Text>
                                    </View>
                                    <Text style={[s.planLblI, { color: TS }]}>3 Months</Text>
                                    {loading
                                        ? <ActivityIndicator size="small" color={P} style={{ marginVertical: 4 }} />
                                        : <Text style={[s.planPriceI, { color: TP }]}>₹{quarterlyDisc}</Text>}
                                    <Text style={[s.planPeriodI, { color: TS }]}>/3 months</Text>
                                    <Text style={[s.planCalcI, { color: TS }]}>{billable} × ₹{RATE} × 3 −10%</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={[s.priceNote, { color: TS }]}>* Price auto-adjusts as students are added/removed</Text>
                </View>

                {/* TRUST STRIP */}
                <View style={[s.trustStrip, { backgroundColor: CB, borderColor: BD }]}>
                    {[
                        { icon: 'gift',           label: '30-Day Free Trial' },
                        { icon: 'lock-closed',    label: '100% Secure'       },
                        { icon: 'refresh-circle', label: 'Cancel Anytime'    },
                    ].map((item, i) => (
                        <View key={i} style={s.trustItem}>
                            <Ionicons name={item.icon as any} size={18} color={P} />
                            <Text style={[s.trustTxt, { color: TS }]}>{item.label}</Text>
                        </View>
                    ))}
                </View>

                {/* FEATURES */}
                <View style={s.section}>
                    <Text style={[s.secTitle, { color: TP }]}>Everything Included</Text>
                    <View style={[s.featCard, { backgroundColor: CB, borderColor: BD }]}>
                        {FEATURES.map((f, i) => (
                            <View key={i} style={[s.featRow, i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: DIV }]}>
                                <View style={[s.featIcon, { backgroundColor: isDark ? '#334155' : f.bg }]}>
                                    <Ionicons name={f.icon as any} size={18} color={isDark ? P : f.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.featTitle, { color: TP }]}>{f.title}</Text>
                                    <Text style={[s.featDesc,  { color: TS }]}>{f.desc}</Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={20} color={SCC} />
                            </View>
                        ))}
                    </View>
                </View>

                {/* FREE vs PREMIUM */}
                <View style={s.section}>
                    <Text style={[s.secTitle, { color: TP }]}>Free vs Premium</Text>
                    <View style={[s.compCard, { backgroundColor: CB, borderColor: BD }]}>
                        <View style={[s.compRow, { backgroundColor: P }]}>
                            <Text style={s.compHF}>Feature</Text>
                            <Text style={s.compHFree}>Free</Text>
                            <Text style={[s.compHPrem, { color: '#FBBF24' }]}>Premium</Text>
                        </View>
                        {([
                            ['Students / Hostel', '10 max',  'Unlimited'],
                            ['Bill Reminders',    '✗',       '✓'        ],
                            ['Reports & Export',  'Basic',   'Advanced' ],
                            ['Digital Receipts',  '✗',       '✓'        ],
                            ['QR Payments',       '✗',       '✓'        ],
                            ['Cloud Backup',      '✗',       '✓'        ],
                            ['Free Trial',        '✗',       '30 Days'  ],
                        ] as [string,string,string][]).map(([feat, free, prem], i) => (
                            <View key={i} style={[s.compRow, { backgroundColor: i % 2 === 0 ? ALT : 'transparent' }]}>
                                <Text style={[s.compF, { color: TS }]}>{feat}</Text>
                                <Text style={[s.compFree, free === '✗' ? s.compNo : {}]}>{free}</Text>
                                <Text style={[s.compPrem, { color: P }, prem === '✗' ? s.compNo : {}]}>{prem}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* FAQ */}
                <View style={s.section}>
                    <Text style={[s.secTitle, { color: TP }]}>FAQ</Text>
                    {[
                        { q: 'How is the price calculated?', a: `₹${RATE} × number of active students per month. Adjusts automatically as students change.` },
                        { q: 'What is the free trial?',       a: '30 days of full access. No credit card required. Cancel anytime before it ends — pay nothing.' },
                        { q: 'Can I cancel anytime?',         a: 'Yes! No lock-in. Cancel from your profile — no questions asked.' },
                        { q: 'Is my payment safe?',           a: 'Payments are secured via Razorpay / UPI with 256-bit encryption.' },
                    ].map((faq, i) => (
                        <View key={i} style={[s.faqCard, { backgroundColor: CB, borderColor: BD }]}>
                            <View style={s.faqQ}>
                                <Ionicons name="help-circle" size={18} color={P} />
                                <Text style={[s.faqQTxt, { color: TP }]}>{faq.q}</Text>
                            </View>
                            <Text style={[s.faqATxt, { color: TS }]}>{faq.a}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>

            {/* STICKY CTA */}
            <View style={[s.ctaBar, { backgroundColor: CB, borderTopColor: BD, paddingBottom: insets.bottom + 12 }]}>
                <View>
                    <Text style={[s.ctaPlan, { color: TS }]}>{displayLabel} · {billable} students</Text>
                    <Text style={[s.ctaPrice, { color: TP }]}>{loading ? '...' : `₹${displayPrice}${displayPeriod}`}</Text>
                    {trialActive
                        ? <Text style={[s.ctaTrialNote, { color: '#10B981' }]}>✓ Trial active · {trialDaysLeft}d left</Text>
                        : <Text style={[s.ctaTrialNote, { color: TS }]}>30-day free trial included</Text>}
                </View>
                {trialActive ? (
                    /* Already in trial — show Pay Now */
                    <TouchableOpacity onPress={() => setModal(true)} activeOpacity={0.88} style={{ flex: 1 }}>
                        <LinearGradient colors={['#F59E0B', '#D97706'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={[s.ctaBtn, { shadowColor: '#F59E0B' }]}>
                            <Ionicons name="wallet" size={18} color="#FFF" />
                            <Text style={s.ctaBtnTxt}>Pay Now · ₹{displayPrice}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    /* No trial yet — start trial */
                    <TouchableOpacity onPress={() => setModal(true)} activeOpacity={0.88} style={{ flex: 1 }}>
                        <LinearGradient colors={[G1, P] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={[s.ctaBtn, { shadowColor: P }]}>
                            <Ionicons name="wallet" size={18} color="#FFF" />
                            <Text style={s.ctaBtnTxt}>Pay Now</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── CONFIRM BOTTOM SHEET ────────────────────────────────────── */}
            <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={[s.modalSheet, { backgroundColor: CB, paddingBottom: insets.bottom + 16 }]}>
                        <View style={[s.modalHandle, { backgroundColor: BD }]} />

                        <LinearGradient colors={['#FBBF24', '#D97706']} style={s.modalIcon}>
                            <Ionicons name="diamond" size={28} color="#FFF" />
                        </LinearGradient>

                        <Text style={[s.modalTitle, { color: TP }]}>
                            Complete Payment
                        </Text>
                        <Text style={[s.modalSub, { color: TS }]}>
                            <Text style={{ color: P, fontWeight: '800' }}>{displayLabel} Premium Plan{'\n'}</Text>
                            {billable} students × ₹{RATE}{plan === 'quarterly' ? ' × 3 months (−10%)' : ''}
                        </Text>

                        <View style={[s.amountPill, { backgroundColor: LB }]}>
                            <Text style={[s.amountTxt, { color: P }]}>₹{displayPrice}{displayPeriod}</Text>
                        </View>

                        <View style={s.modalNotes}>
                            {(trialActive ? [
                                `${trialDaysLeft} days remaining in your trial`,
                                'Continue with full premium after payment',
                                'Secured by Razorpay / UPI — 256-bit encryption',
                            ] : [
                                '30-day free trial — cancel before it ends, pay nothing',
                                'Price auto-updates with student count changes',
                                'Secured by Razorpay / UPI — 256-bit encryption',
                            ]).map((note, i) => (
                                <View key={i} style={s.noteRow}>
                                    <Ionicons name="checkmark-circle" size={16} color={SCC} />
                                    <Text style={[s.noteTxt, { color: TS }]}>{note}</Text>
                                </View>
                            ))}
                        </View>

                        {/* ── PAY BUTTON — opens Razorpay WebView ─── */}
                        <TouchableOpacity onPress={openRazorpay} activeOpacity={0.88} style={{ alignSelf: 'stretch' }}>
                            <LinearGradient colors={[G1, P] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={[s.payBtn, { shadowColor: P }]}>
                                <Ionicons name="wallet" size={20} color="#FFF" />
                                <Text style={s.payBtnTxt}>
                                    Pay ₹{displayPrice} Now
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModal(false)} style={s.cancelBtn} activeOpacity={0.7}>
                            <Text style={[s.cancelTxt, { color: TS }]}>Maybe Later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── RAZORPAY WEBVIEW MODAL ──────────────────────────────────── */}
            {/* ── RAZORPAY WEBVIEW OVERLAY (Replaced Modal to fix Android keyboard gap) ── */}
            {payModal && (
                <View style={[StyleSheet.absoluteFill, s.webviewOverlay, { zIndex: 99999, elevation: 99999, backgroundColor: '#0a0f1e' }]}>
                    {processing && (
                        <WebView
                            source={{ html: buildRazorpayHtml({
                                amount: displayPrice * 100,
                                name:   user?.full_name  || 'Hostel Owner',
                                email:  user?.email      || 'owner@hostex.com',
                                phone:  user?.phone      || '9999999999',
                                planLabel: displayLabel,
                                primaryColor: P,
                            })}}
                            onMessage={handleWebViewMessage}
                            style={s.webview}
                            javaScriptEnabled
                            domStorageEnabled
                            bounces={false}
                            scrollEnabled={false}
                            scalesPageToFit={false}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            startInLoadingState
                            renderLoading={() => (
                                <View style={[StyleSheet.absoluteFill, s.webviewLoading, { backgroundColor: '#0a0f1e' }]}>
                                    <ActivityIndicator size="large" color={P} />
                                    <Text style={[s.webviewLoadingTxt, { color: '#FFF' }]}>Opening Razorpay...</Text>
                                </View>
                            )}
                        />
                    )}
                    <TouchableOpacity
                        style={[s.webviewClose, { backgroundColor: CB, zIndex: 100000, elevation: 100000 }]}
                        onPress={() => { setPayModal(false); setProcessing(false); }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close" size={20} color={TP} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const s = StyleSheet.create({
    root:       { flex: 1 },
    hero:       { paddingHorizontal: 20, paddingBottom: 36, alignItems: 'center' },
    backBtn:    { position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    crownWrap:  { marginTop: 16, marginBottom: 10, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 16, elevation: 10 },
    crownCircle:{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    heroTitle:  { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: 0.4, marginBottom: 8 },
    trialPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10 },
    trialPillTxt:{ fontSize: 12, fontWeight: '700', color: '#FFF' },
    heroSub:    { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21 },
    priceHL:    { color: '#FBBF24', fontWeight: '800' },
    trialCard:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
    trialIcon:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    trialCardTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 3 },
    trialCardDesc: { fontSize: 12, lineHeight: 17 },
    section:    { paddingHorizontal: 16, paddingTop: 18 },
    secTitle:   { fontSize: 17, fontWeight: '700', marginBottom: 12 },
    statsRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 8, justifyContent: 'space-around' },
    loadingTxt: { fontSize: 13, marginLeft: 10 },
    statPill:   { alignItems: 'center', gap: 4 },
    statPillIcon:{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statNum:    { fontSize: 18, fontWeight: '800' },
    statLbl:    { fontSize: 9, fontWeight: '500', textAlign: 'center' },
    statDiv:    { width: 1, height: 38 },
    plansRow:   { flexDirection: 'row', gap: 10, marginBottom: 6 },
    planCard:   { borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1.5, minHeight: 152, justifyContent: 'center' },
    planActive: { borderColor: 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 12, elevation: 8 },
    planTag:    { position: 'absolute', top: -10, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    planTagTxt: { fontSize: 10, fontWeight: '700' },
    planLblA:   { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
    planLblI:   { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    planPriceA: { fontSize: 26, fontWeight: '800', color: '#FFF' },
    planPriceI: { fontSize: 26, fontWeight: '800' },
    planPeriodA:{ fontSize: 11, color: 'rgba(255,255,255,0.75)' },
    planPeriodI:{ fontSize: 11 },
    planCalcA:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, textAlign: 'center' },
    planCalcI:  { fontSize: 10, marginTop: 3, textAlign: 'center' },
    checkCircle:{ marginTop: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    priceNote:  { fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
    trustStrip: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 16, borderRadius: 14, borderWidth: 1, paddingVertical: 12 },
    trustItem:  { alignItems: 'center', gap: 4 },
    trustTxt:   { fontSize: 10, fontWeight: '600' },
    featCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    featRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
    featIcon:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    featTitle:  { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    featDesc:   { fontSize: 11, lineHeight: 16 },
    compCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    compRow:    { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
    compHF:     { flex: 2, fontSize: 12, fontWeight: '800', color: '#FFF' },
    compHFree:  { flex: 1, fontSize: 12, fontWeight: '800', color: '#FFF', textAlign: 'center' },
    compHPrem:  { flex: 1, fontSize: 12, fontWeight: '800', textAlign: 'center' },
    compF:      { flex: 2, fontSize: 12, fontWeight: '600' },
    compFree:   { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#64748B' },
    compPrem:   { flex: 1, fontSize: 12, fontWeight: '800', textAlign: 'center' },
    compNo:     { color: '#94A3B8', opacity: 0.5 },
    faqCard:    { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    faqQ:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    faqQTxt:    { fontSize: 13, fontWeight: '700', flex: 1, lineHeight: 18 },
    faqATxt:    { fontSize: 12, lineHeight: 18, paddingLeft: 26 },
    ctaBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0, gap: 16 },
    ctaPlan:    { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    ctaPrice:   { fontSize: 20, fontWeight: '800' },
    ctaBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, gap: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 10, elevation: 6 },
    ctaBtnTxt:  { fontSize: 15, fontWeight: '800', color: '#FFF' },
    modalOverlay:{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
    modalHandle:{ width: 40, height: 5, borderRadius: 3, marginBottom: 20 },
    modalIcon:  { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
    modalSub:   { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
    amountPill: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 20 },
    amountTxt:  { fontSize: 22, fontWeight: '800' },
    modalNotes: { alignSelf: 'stretch', marginBottom: 20, gap: 8 },
    noteRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    noteTxt:    { fontSize: 13, flex: 1 },
    payBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, gap: 10, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.42, shadowRadius: 14, elevation: 8 },
    payBtnTxt:  { fontSize: 16, fontWeight: '800', color: '#FFF' },
    cancelBtn:  { marginTop: 12, paddingVertical: 8 },
    cancelTxt:  { fontSize: 14 },
    ctaTrialNote: { fontSize: 10, marginTop: 1 },
    
    // Razorpay WebView modal
    webviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
    webview:        { flex: 1, backgroundColor: 'transparent' },
    webviewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    webviewLoadingTxt: { fontSize: 14, fontWeight: '600' },
    webviewClose: { position: 'absolute', top: 52, right: 16, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, elevation: 5 },
});

export default PremiumSubscriptionScreen;
