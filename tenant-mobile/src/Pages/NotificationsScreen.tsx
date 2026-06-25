import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Wallet, Megaphone, Wrench, BellRing, Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, EmptyState } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { relativeDay } from '../utils/format';
import { sampleNotifications, NotificationItem } from '../data/tenantContent';

const typeMeta: Record<NotificationItem['type'], { icon: any; tint: string; soft: string }> = {
  due: { icon: Wallet, tint: colors.primary, soft: colors.primarySoft },
  notice: { icon: Megaphone, tint: colors.info, soft: colors.infoSoft },
  complaint: { icon: Wrench, tint: colors.warning, soft: colors.warningSoft },
  system: { icon: BellRing, tint: colors.textMuted, soft: '#F1F5F9' },
};

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState(sampleNotifications);
  const hasUnread = items.some((i) => !i.read);

  const markAllRead = () => setItems((prev) => prev.map((i) => ({ ...i, read: true })));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={10}>
            <Text style={styles.markRead}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <View style={styles.content}>
        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon={Bell}
              title="You're all caught up"
              message="Rent reminders, notices and complaint updates will show up here."
            />
          </Card>
        ) : (
          items.map((n) => {
            const meta = typeMeta[n.type];
            const Icon = meta.icon;
            return (
              <View key={n.id} style={[styles.row, !n.read && styles.rowUnread]}>
                <View style={[styles.iconWrap, { backgroundColor: meta.soft }]}>
                  <Icon size={18} color={meta.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{n.title}</Text>
                    {!n.read && <View style={styles.dot} />}
                  </View>
                  <Text style={styles.body}>{n.body}</Text>
                  <Text style={styles.time}>{relativeDay(n.date)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { width: 22 },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  markRead: { fontSize: font.small, fontWeight: '700', color: colors.primary },
  content: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  rowUnread: { backgroundColor: '#FBFBFF', borderColor: colors.primaryBorder },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  body: { fontSize: font.small, color: colors.textMuted, marginTop: 2, lineHeight: 20 },
  time: { fontSize: font.tiny, color: colors.textSubtle, marginTop: 6 },
});
