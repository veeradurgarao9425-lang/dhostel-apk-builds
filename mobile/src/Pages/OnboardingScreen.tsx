import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING } from '../theme/index';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Persisted flag so the intro is shown only once (first launch).
export const ONBOARDING_KEY = 'hasSeenIntro';

// ─── Slides ───────────────────────────────────────────────────────────────────
// Each slide is shown as a contained "board": a rounded preview panel up top
// (not full-bleed) with the copy sitting below on a clean light background —
// the same structure as a modern app intro. Icons come from @expo/vector-icons
// so there are no image assets to ship.
type Slide = {
  key: string;
  badge: keyof typeof Ionicons.glyphMap;
  image: any; // real app screenshot shown in the phone-frame
  eyebrow: string;
  title: string;
  subtitle: string;
  gradient: [string, string, string];
  chips: string[];
  bgColor?: string;
};

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    badge: 'sparkles',
    image: require('../../assets/onboarding/slide2.jpg'), // 01 Dashboard
    eyebrow: 'WELCOME',
    title: 'Manage your PG,\nthe smart way',
    subtitle: 'Everything you need to run your PG — tenants, rooms, fees and reports — in one beautiful app.',
    gradient: ['#7B4FEA', '#5F2EEA', '#3B0FAB'],
    chips: ['All-in-one', 'Fast', 'Secure'],
  },
  {
    key: 'students',
    badge: 'person-add',
    image: require('../../assets/onboarding/slide1.jpg'), // 02 Manage Students
    eyebrow: 'STUDENTS & ROOMS',
    title: 'Tenants & rooms\nat your fingertips',
    subtitle: 'Add tenants in seconds, track room occupancy live, and never lose a record again.',
    gradient: ['#5F6BFF', '#4338CA', '#2A1E8F'],
    chips: ['Live occupancy', 'Quick add', 'Room map'],
  },
  {
    key: 'rooms',
    badge: 'business',
    image: require('../../assets/onboarding/slide3.jpg'), // 03 Room Status
    eyebrow: 'ROOM STATUS',
    title: 'Rooms at a\nQuick View',
    subtitle: 'Know which rooms are vacant, occupied or full across all floors instantly.',
    gradient: ['#0EA5E9', '#0284C7', '#0369A1'],
    chips: ['Floor views', 'Live status', 'Smart filters'],
  },
  {
    key: 'collections',
    badge: 'cash',
    image: require('../../assets/onboarding/slide4.jpeg'), // 04 Pending Dues
    eyebrow: 'COLLECTIONS',
    title: 'Track & Collect\nPending Dues Effortlessly',
    subtitle: 'Stay on top of outstanding payments, send reminders and collect dues faster – all in one place.',
    gradient: ['#F59E0B', '#D97706', '#B45309'],
    chips: ['Overdue alerts', 'Reminders', 'Quick collect'],
  },
  {
    key: 'more_features',
    badge: 'star',
    image: require('../../assets/onboarding/slide5.jpeg'), // 05 More Features
    eyebrow: 'AND MORE',
    title: 'Everything you need,\nin your pocket',
    subtitle: 'Manage expenses, support tickets, and get comprehensive reports anywhere you go.',
    gradient: ['#EC4899', '#DB2777', '#BE185D'],
    chips: ['Expenses', 'Support', 'Reports'],
  },
  {
    key: 'notifications',
    badge: 'notifications',
    image: require('../../assets/onboarding/slide6.jpeg'), // 06 Notifications
    eyebrow: 'STAY INFORMED',
    title: 'Real-Time Alerts\n& Updates',
    subtitle: 'Never miss a beat. Get instant push notifications for rent payments, student complaints, and important hostel updates.',
    gradient: ['#06B6D4', '#0891B2', '#155E75'],
    chips: ['Push Alerts', 'Reminders', 'Instant Updates'],
  },
  {
    key: 'security',
    badge: 'shield-checkmark',
    image: require('../../assets/onboarding/slide7.jpeg'), // 07 Security
    eyebrow: 'BANK-LEVEL SECURITY',
    title: 'Your Data is\nSafe & Secure',
    subtitle: 'We use industry-leading encryption to protect your data. Your privacy and security are our top priorities.',
    gradient: ['#10B981', '#059669', '#047857'],
    chips: ['Encrypted', 'Cloud Backup', 'Privacy First'],
    bgColor: '#F2EEFC', // Matches the image background for slide 7
  }
];

const AUTO_ADVANCE_MS = 4000;

// The preview board occupies the upper portion of the screen; the copy sits
// below it on the light background.
const BOARD_HEIGHT = Math.min(SCREEN_H * 0.52, 460);

export default function OnboardingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const interacting = useRef(false);

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      /* non-fatal — worst case the intro shows again */
    }
    navigation.replace('Login');
  }, [navigation]);

  const goToIndex = useCallback((i: number) => {
    listRef.current?.scrollToOffset({ offset: i * SCREEN_W, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      finish();
    } else {
      goToIndex(index + 1);
    }
  }, [index, finish, goToIndex]);

  // Gentle auto-advance. Pauses while the user is dragging and stops once they
  // reach the last slide so the CTA stays put.
  useEffect(() => {
    if (index >= SLIDES.length - 1) return;
    const timer = setTimeout(() => {
      if (!interacting.current) goToIndex(index + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, goToIndex]);

  const onMomentumEnd = useCallback((e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(i);
    interacting.current = false;
  }, []);

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Swipeable slides ── */}
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => { interacting.current = true; }}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        renderItem={({ item, index: i }) => (
          <Panel item={item} i={i} scrollX={scrollX} insets={insets} />
        )}
      />

      {/* ── Skip (top-right) ── */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skip, { top: insets.top + 8 }]}
          onPress={finish}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* ── Bottom controls: dots + Get Started ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.xl }]}>
        {/* Animated page dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
            // Animate scaleX (not width) so this stays on the native driver,
            // matching the natively-driven scrollX. Base width 8 → up to 24 (×3).
            const scaleX = scrollX.interpolate({
              inputRange,
              outputRange: [1, 3, 1],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 1, 0.25],
              extrapolate: 'clamp',
            });
            return (
              <View key={i} style={styles.dotContainer}>
                <Animated.View
                  style={[styles.dot, { opacity, transform: [{ scaleX }] }]}
                />
              </View>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={handleNext} style={styles.ctaWrap}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons
              name={isLast ? 'rocket' : 'arrow-forward'}
              size={18}
              color={COLORS.white}
              style={{ marginLeft: 8 }}
            />
          </LinearGradient>
        </TouchableOpacity>

        {isLast && (
          <TouchableOpacity onPress={finish} style={styles.loginHint} hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={styles.loginHintText}>
              Already have an account? <Text style={styles.loginHintLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Panel({
  item,
  i,
  scrollX,
  insets,
}: {
  item: Slide;
  i: number;
  scrollX: Animated.Value;
  insets: { top: number };
}) {
  return (
    <View style={[styles.panel, { backgroundColor: item.bgColor || '#F2EEFC', paddingTop: insets.top + 40, paddingBottom: 130 }]}>
      <Image
        source={item.image}
        style={{ flex: 1, width: '100%', resizeMode: 'contain' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2EEFC' },

  // Slide
  panel: {
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#F2EEFC',
  },

  // Preview board
  board: {
    width: SCREEN_W,
    borderBottomLeftRadius: RADIUS.xxl + 8,
    borderBottomRightRadius: RADIUS.xxl + 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 10 },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
    }),
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobTop: {
    width: 220,
    height: 220,
    top: -70,
    right: -70,
  },
  blobBottom: {
    width: 260,
    height: 260,
    bottom: -90,
    left: -100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Hero: phone-frame screenshot
  heroWrap: { alignItems: 'center' },
  phoneFrame: {
    height: BOARD_HEIGHT * 0.8,
    aspectRatio: 630 / 1400, // matches the screenshots exactly → no crop, no side bars
    borderRadius: 30,
    backgroundColor: '#0B0B14',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 12 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
    }),
  },
  phoneImage: {
    width: '100%',
    height: '100%',
  },
  heroBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
    }),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  chipText: {
    color: COLORS.white,
    fontSize: FONT.sm,
    fontWeight: FONT.semiBold,
  },

  // Copy
  copy: {
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.xxxl,
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontSize: FONT.sm,
    fontWeight: FONT.bold,
    letterSpacing: 1.5,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT.xxxl,
    lineHeight: FONT.xxxl + 6,
    fontWeight: FONT.black,
    color: COLORS.textPrimary,
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: SPACING.md,
    fontSize: FONT.md,
    lineHeight: 23,
    color: COLORS.textSecondary,
    textAlign: 'left',
    fontWeight: FONT.medium,
  },

  // Skip
  skip: {
    position: 'absolute',
    right: SPACING.xl,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    ...Platform.select({
      android: { elevation: 4 },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  skipText: {
    color: COLORS.white,
    fontSize: FONT.base,
    fontWeight: 'bold', // User requested bold
  },

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dotContainer: {
    width: 28, // Active dot will be 24px wide, leaving a nice 4px gap.
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  ctaWrap: {
    width: '100%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 8 },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
    }),
  },
  cta: {
    height: 56,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: COLORS.white,
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    letterSpacing: 0.3,
  },
  loginHint: { marginTop: SPACING.lg },
  loginHintText: {
    color: COLORS.textSecondary,
    fontSize: FONT.base,
    fontWeight: FONT.medium,
  },
  loginHintLink: {
    color: COLORS.primary,
    fontWeight: FONT.bold,
    textDecorationLine: 'underline',
  },
});
