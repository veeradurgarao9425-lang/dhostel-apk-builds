/**
 * InAppNotificationBanner.tsx
 *
 * Real-time floating in-app notification banner (distinct from OS push notification).
 * Displayed when events arrive while the app is foregrounded.
 *
 * Features:
 * - Category-based icon and color tint
 * - Smooth slide-in / slide-out spring animations
 * - Auto-dismiss with a visible countdown progress bar
 * - Swipe-to-dismiss gesture (upward swipe)
 * - Tap-to-navigate directly to the relevant screen
 * - Aesthetic color matching: Hostix (purple/teal) vs Stayvix (warm rust/brown/cream)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  CreditCard,
  DoorOpen,
  Wrench,
  Megaphone,
  ShieldAlert,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  X,
  Compass,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export interface InAppNotificationPayload {
  id?: string;
  title: string;
  message: string;
  category?: string;
  data?: any;
  duration?: number; // ms, default 4500
}

interface InAppNotificationBannerProps {
  notification: InAppNotificationPayload | null;
  isTenant?: boolean;
  onDismiss: () => void;
  onPress: (data?: any) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  notification,
  isTenant = false,
  onDismiss,
  onPress,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [activeNotif, setActiveNotif] = useState<InAppNotificationPayload | null>(notification);

  useEffect(() => {
    if (notification) {
      setActiveNotif(notification);
      progressAnim.setValue(1);

      // Slide in animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Countdown progress animation
      const duration = notification.duration || 4500;
      Animated.timing(progressAnim, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          dismissBanner();
        }
      });
    }
  }, [notification]);

  const dismissBanner = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveNotif(null);
      onDismiss();
    });
  };

  // Swipe up to dismiss gesture responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20 || gestureState.vy < -0.5) {
          dismissBanner();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!activeNotif) return null;

  // Resolve category colors and icon
  const cat = (activeNotif.category || activeNotif.data?.category || activeNotif.data?.type || '').toLowerCase();
  const titleLower = activeNotif.title.toLowerCase();

  let IconComponent = Bell;
  let accentColor = isTenant ? '#C2410C' : '#7C3AED'; // Rust for Stayvix, Purple for Hostix
  let badgeBg = isTenant ? '#FFEDD5' : '#F3E8FF';
  let categoryLabel = 'UPDATE';

  if (cat.includes('due') || cat.includes('payment') || titleLower.includes('payment') || titleLower.includes('due')) {
    IconComponent = CreditCard;
    accentColor = isTenant ? '#B45309' : '#0D9488'; // Amber rust / Teal
    badgeBg = isTenant ? '#FEF3C7' : '#CCFBF1';
    categoryLabel = 'DUES & PAYMENTS';
  } else if (cat.includes('vacat') || titleLower.includes('vacat')) {
    IconComponent = DoorOpen;
    accentColor = '#EA580C'; // Warm orange
    badgeBg = '#FFEDD5';
    categoryLabel = 'VACATE NOTICE';
  } else if (cat.includes('complaint') || titleLower.includes('complaint')) {
    IconComponent = Wrench;
    accentColor = isTenant ? '#9A3412' : '#2563EB'; // Rust-brown or Blue
    badgeBg = isTenant ? '#FED7AA' : '#DBEAFE';
    categoryLabel = 'COMPLAINT';
  } else if (cat.includes('notice') || titleLower.includes('notice')) {
    IconComponent = Megaphone;
    accentColor = isTenant ? '#C2410C' : '#6D4AFF';
    badgeBg = isTenant ? '#FFEDD5' : '#EDE9FE';
    categoryLabel = 'NOTICE';
  } else if (cat.includes('gate') || titleLower.includes('pass')) {
    IconComponent = ShieldAlert;
    accentColor = '#0284C7';
    badgeBg = '#E0F2FE';
    categoryLabel = 'GATE PASS';
  } else if (cat.includes('expense') || titleLower.includes('expense')) {
    IconComponent = Wallet;
    accentColor = '#059669';
    badgeBg = '#D1FAE5';
    categoryLabel = 'EXPENSE';
  } else if (cat.includes('regist') || titleLower.includes('regist') || titleLower.includes('admission')) {
    IconComponent = UserCheck;
    accentColor = '#7C3AED';
    badgeBg = '#EDE9FE';
    categoryLabel = 'TENANT MGMT';
  } else if (cat.includes('growth') || titleLower.includes('growth') || titleLower.includes('story')) {
    IconComponent = Compass;
    accentColor = '#D97706';
    badgeBg = '#FEF3C7';
    categoryLabel = 'GROWTH JOURNEY';
  }

  // Theme palettes
  // Hostix = Purple & Teal
  // Stayvix = Warm Rust, Warm Brown, Cream
  const cardBg = isTenant ? '#FFFDF8' : '#FFFFFF';
  const borderColor = isTenant ? '#FDE68A' : '#E2E8F0';
  const titleColor = isTenant ? '#451A03' : '#0F172A';
  const messageColor = isTenant ? '#78350F' : '#475569';
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 12 : 16);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: topInset + 6,
          transform: [{ translateY }],
          opacity: opacityAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.94}
        onPress={() => {
          dismissBanner();
          onPress(activeNotif.data);
        }}
        style={[
          styles.container,
          {
            backgroundColor: cardBg,
            borderColor,
          },
        ]}
      >
        {/* Accent left pill bar */}
        <View style={[styles.leftPill, { backgroundColor: accentColor }]} />

        {/* Content Body */}
        <View style={styles.innerContent}>
          {/* Main App Icon on Left */}
          <View style={styles.appIconBox}>
            <Image
              source={require('../../../assets/HostixNew.png')}
              style={styles.appLogo}
              resizeMode="contain"
            />
            {/* Category Micro-Badge */}
            <View style={[styles.categoryMicroBadge, { backgroundColor: accentColor }]}>
              <IconComponent size={10} color="#FFFFFF" strokeWidth={2.8} />
            </View>
          </View>

          {/* Texts */}
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.categoryTag, { color: accentColor }]}>
                {categoryLabel}
              </Text>
              <Text style={styles.timeTag}>Just now</Text>
            </View>
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
              {activeNotif.title}
            </Text>
            <Text style={[styles.message, { color: messageColor }]} numberOfLines={2}>
              {activeNotif.message}
            </Text>
          </View>

          {/* Action icon */}
          <View style={styles.actionArrow}>
            <ChevronRight size={18} color={accentColor} />
          </View>
        </View>

        {/* Countdown Timer Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 20,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  leftPill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4.5,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 18,
  },
  appIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  appLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  categoryMicroBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  timeTag: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  actionArrow: {
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
});
