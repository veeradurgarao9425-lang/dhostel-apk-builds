import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, font } from '../../../theme/tenantTheme';

type Props = {
  icon: any; // LucideIcon
  title: string;
  subtitle?: string;
  value?: string;
  iconColor?: string;
  iconBg?: string;
  rightContent?: React.ReactNode;
  hideChevron?: boolean;
  isLast?: boolean;
  onPress?: () => void;
};

/** A standard tappable list row: tinted icon + title/subtitle + chevron/right slot. */
export default function ListRow({
  icon: Icon,
  title,
  subtitle,
  value,
  iconColor = colors.primary,
  iconBg = colors.primarySoft,
  rightContent,
  hideChevron = false,
  isLast = false,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.borderBottom]}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!value && <Text style={styles.valueTxt}>{value}</Text>}
      {rightContent}
      {!hideChevron && onPress && <ChevronRight size={18} color={colors.border} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md, paddingHorizontal: spacing.md },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: font.body, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: font.small, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  valueTxt: { fontSize: font.small, fontWeight: '600', color: colors.textMuted },
});
