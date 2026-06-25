import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors, spacing, font } from '../../theme';
import Avatar from './Avatar';

type Props = {
  /** Big greeting line e.g. "Good evening" */
  eyebrow?: string;
  /** Bold title e.g. the tenant name or screen title */
  title: string;
  name?: string;
  unreadCount?: number;
  onPressBell?: () => void;
  onPressAvatar?: () => void;
};

/**
 * Shared top bar used on every primary screen: greeting + notification bell
 * (with unread badge) + profile avatar. Keeps the header identical app-wide.
 */
export default function AppHeader({
  eyebrow,
  title,
  name,
  unreadCount = 0,
  onPressBell,
  onPressAvatar,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          onPress={onPressBell}
          accessibilityLabel="Notifications"
        >
          <Bell size={20} color={colors.text} />
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
