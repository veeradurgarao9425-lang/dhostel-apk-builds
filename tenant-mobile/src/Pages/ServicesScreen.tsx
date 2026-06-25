import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Utensils, Shirt, Sparkles, UserPlus, Coffee, Soup, Moon } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Screen, AppHeader, Card, SectionHeader } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { sampleServices } from '../data/tenantContent';

const mealIcon: Record<string, any> = {
  Breakfast: Coffee,
  Lunch: Soup,
  Dinner: Moon,
};
const facilityIcon: Record<string, any> = {
  Laundry: Shirt,
  Housekeeping: Sparkles,
  'Visitor pass': UserPlus,
};

export default function ServicesScreen({ navigation }: any) {
  const { user } = useAuth();

  return (
    <Screen>
      <AppHeader
        eyebrow="Daily life"
        title="Services"
        name={user?.name}
        onPressBell={() => navigation.navigate('Notifications')}
        onPressAvatar={() => navigation.navigate('Profile')}
      />

      {sampleServices.map((group, gi) => {
        const isMess = group.category.toLowerCase().includes('mess');
        return (
          <View key={group.category}>
            <SectionHeader title={group.category} />
            <Card padded={false}>
              {group.items.map((item, i) => {
                const Icon =
                  (isMess ? mealIcon[item.name] : facilityIcon[item.name]) || Utensils;
                return (
                  <View key={item.id} style={[styles.row, i > 0 && styles.divider]}>
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: isMess ? colors.successSoft : colors.primarySoft },
                      ]}
                    >
                      <Icon size={18} color={isMess ? colors.success : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.detail}>{item.detail}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        );
      })}

      <Text style={styles.note}>
        Menu and schedules are set by your hostel. Timings may vary on holidays.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: font.body, fontWeight: '600', color: colors.text },
  detail: { fontSize: font.small, color: colors.textMuted, marginTop: 2, lineHeight: 19 },
  note: { fontSize: font.small, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.xl },
});
