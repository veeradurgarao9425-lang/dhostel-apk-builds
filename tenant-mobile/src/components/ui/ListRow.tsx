import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, font } from '../../theme';

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tint?: string;
  tintSoft?: string;
  right?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
};

/** A standard tappable list row: tinted icon + title/subtitle + chevron/right slot. */
export default function ListRow({
  icon: Icon,
  title,
  subtitle,
  tint = colors.primary,
  tintSoft = colors.primarySoft,
  right,
  showChevron = true,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: tintSoft }]}>
        <Icon size={20} color={tint} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {showChevron && onPress && <ChevronRight size={18} color={colors.textSubtle} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
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
});
