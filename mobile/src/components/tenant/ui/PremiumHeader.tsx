/**
 * PremiumHeader — Purple gradient header used on all main screens.
 * Shows greeting, name, room badge, notification bell, and avatar.
 * Includes soft floating circles as abstract decoration.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { colors, spacing, font, radius } from '../../../theme/tenantTheme';

interface PremiumHeaderProps {
  greeting?: string;
  name?: string;
  roomNumber?: string | null;
  unreadCount?: number;
  onPressBell?: () => void;
  onPressAvatar?: () => void;
  subtitle?: string;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export default function PremiumHeader({
  name,
  roomNumber,
  unreadCount = 0,
  onPressBell,
  onPressAvatar,
  subtitle,
}: PremiumHeaderProps) {
  const initials = (name || 'T').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Floating abstract circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />
      <View style={styles.circle4} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.greetingText}>{greeting()} 👋</Text>
          <Text style={styles.nameText} numberOfLines={1}>
            {name || 'Welcome'}
          </Text>
          {!!roomNumber && (
            <View style={styles.roomBadge}>
              <View style={styles.roomDot} />
              <Text style={styles.roomBadgeText}>Room {roomNumber}</Text>
            </View>
          )}
          {!!subtitle && !roomNumber && (
            <Text style={styles.subtitleText}>{subtitle}</Text>
          )}
        </View>

        <View style={styles.right}>
          {/* Bell */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onPressBell}
            activeOpacity={0.75}
          >
            <Bell size={20} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={onPressAvatar}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: 16,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 160,
  },

  // Floating circles
  circle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -40,
    right: -30,
  },
  circle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 20,
    right: 60,
  },
  circle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 10,
    left: -10,
  },
  circle4: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -20,
    right: 100,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flex: 1,
  },
  left: { flex: 1, paddingRight: spacing.md },
  greetingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roomDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  roomBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
