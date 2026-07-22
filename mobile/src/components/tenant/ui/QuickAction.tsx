import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, font, shadow } from '../../../theme/tenantTheme';

type Props = {
  icon: LucideIcon;
  label: string;
  tint?: string;
  tintSoft?: string;
  badge?: number;
  onPress?: () => void;
};

/** Square tappable tile used in the dashboard quick-actions grid. */
export default function QuickAction({
  icon: Icon,
  label,
  tint = colors.primary,
  tintSoft = colors.primarySoft,
  badge,
  onPress,
}: Props) {
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: tintSoft }]}>
        <Icon size={22} color={tint} />
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '23%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  label: { fontSize: font.tiny, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
