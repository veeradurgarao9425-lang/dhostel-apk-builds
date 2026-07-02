import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Force Metro Reload
import { Bell, ChevronLeft } from 'lucide-react-native';
import { colors, spacing, font } from '../../theme';
import Avatar from './Avatar';

type Props = {
  /** Big greeting line e.g. "Good evening" */
  eyebrow?: string;
  /** Bold title e.g. the tenant name or screen title */
  title: string;
  subtitle?: string;
  name?: string;
  unreadCount?: number;
  onPressBell?: () => void;
  onPressAvatar?: () => void;
  hideActions?: boolean;
  onPressBack?: () => void;
  variant?: 'primary' | 'default';
};

/**
 * Shared top bar used on every primary screen: greeting + notification bell
 * (with unread badge) + profile avatar. Keeps the header identical app-wide.
 */
export default function AppHeader({
  eyebrow,
  title,
  subtitle,
  name,
  unreadCount = 0,
  onPressBell,
  onPressAvatar,
  hideActions = false,
  onPressBack,
  variant = 'default',
}: Props) {
  const isPrimary = variant === 'primary';
  const textColor = isPrimary ? '#FFFFFF' : colors.text;
  const mutedTextColor = isPrimary ? 'rgba(255,255,255,0.8)' : colors.textMuted;

  return (
    <View style={[
      styles.row,
      isPrimary && {
        backgroundColor: colors.primary,
        marginHorizontal: -spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      }
    ]}>
      {onPressBack && (
        <TouchableOpacity onPress={onPressBack} style={{ marginRight: 8, padding: 4 }} activeOpacity={0.7}>
          <ChevronLeft size={24} color={textColor} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
      <View style={styles.left}>
        {!!eyebrow && <Text style={[styles.eyebrow, { color: mutedTextColor }]}>{eyebrow}</Text>}
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && <Text style={{ fontSize: 13, color: mutedTextColor, marginTop: 2 }}>{subtitle}</Text>}
      </View>

      {!hideActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
            onPress={onPressBell}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color={textColor} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={onPressAvatar} accessibilityLabel="Profile">
            <Avatar name={name} size={42} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  left: { flex: 1, marginRight: spacing.md },
  eyebrow: { fontSize: font.small, color: colors.textMuted, marginBottom: 2 },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
