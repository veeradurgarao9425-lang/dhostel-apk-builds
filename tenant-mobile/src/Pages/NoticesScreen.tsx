import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Megaphone } from 'lucide-react-native';
import { colors, radius, spacing, font, shadow } from '../theme';
import { sampleNotices, Notice } from '../data/tenantContent';

type FilterTab = 'All' | 'Important' | 'Maintenance' | 'Food';

const FILTER_TABS: FilterTab[] = ['All', 'Important', 'Maintenance', 'Food'];

const categoryMeta: Record<string, { dotColor: string; bgColor: string; textColor: string; label: string }> = {
  Important: { dotColor: '#EF4444', bgColor: '#FEE2E2', textColor: '#DC2626', label: 'Important' },
  Maintenance: { dotColor: '#F59E0B', bgColor: '#FEF3C7', textColor: '#D97706', label: 'Maintenance' },
  General: { dotColor: '#0EA5E9', bgColor: '#E0F2FE', textColor: '#0284C7', label: 'General' },
  Food: { dotColor: '#10B981', bgColor: '#D1FAE5', textColor: '#059669', label: 'Food' },
};

function timeAgo(dateStr: string): string {
  const now = new Date('2025-06-09');
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return `${diffD}d ago`;
}

function groupNoticesByDate(notices: Notice[]) {
  const today = '2025-06-09';
  const yesterday = '2025-06-08';
  const todayGroup = notices.filter((n) => n.date === today);
  const yesterdayGroup = notices.filter((n) => n.date === yesterday);
  const olderGroup = notices.filter((n) => n.date < yesterday);
  return [
    ...(todayGroup.length ? [{ label: 'Today', items: todayGroup }] : []),
    ...(yesterdayGroup.length ? [{ label: 'Yesterday', items: yesterdayGroup }] : []),
    ...(olderGroup.length ? [{ label: 'Earlier', items: olderGroup }] : []),
  ];
}

function NoticeCard({ notice }: { notice: Notice }) {
  const meta = categoryMeta[notice.category] || categoryMeta['General'];

  return (
    <TouchableOpacity style={styles.noticeCard} activeOpacity={0.75}>
      {/* Left color bar */}
      <View style={[styles.colorBar, { backgroundColor: meta.dotColor }]} />

      <View style={styles.noticeBody}>
        {/* Category pill + unread */}
        <View style={styles.noticeTopRow}>
          <View style={[styles.catPill, { backgroundColor: meta.bgColor }]}>
            <View style={[styles.catDot, { backgroundColor: meta.dotColor }]} />
            <Text style={[styles.catPillText, { color: meta.textColor }]}>{meta.label}</Text>
          </View>
          {notice.pinned && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.noticeTitle}>{notice.title}</Text>
        <Text style={styles.noticeBodyText} numberOfLines={3}>{notice.body}</Text>
        <Text style={styles.noticeTime}>{timeAgo(notice.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NoticesScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const filtered = sampleNotices.filter((n) => {
    if (activeFilter === 'All') return true;
    return n.category === activeFilter;
  });

  const grouped = groupNoticesByDate(filtered);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── White Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notices</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <Search size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter tabs ────────────────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Notices list ───────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Megaphone size={32} color={colors.textSubtle} />
            </View>
            <Text style={styles.emptyTitle}>No notices</Text>
            <Text style={styles.emptyBody}>Announcements from your hostel will appear here.</Text>
          </View>
        ) : (
          grouped.map(({ label, items }) => (
            <View key={label}>
              <Text style={styles.groupLabel}>{label}</Text>
              {items.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 64,
  },
  headerTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Filter tabs ─────────────────────────────────────────────────────────────
  filterRow: { paddingVertical: spacing.md },
  filterScroll: { paddingHorizontal: spacing['2xl'], gap: spacing.sm },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTabTextActive: { color: '#fff' },

  // ── List ────────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: spacing['2xl'], paddingBottom: 120 },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },

  // ── Notice Card ─────────────────────────────────────────────────────────────
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  colorBar: { width: 4 },
  noticeBody: { flex: 1, padding: spacing.xl },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catPillText: { fontSize: 11, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  noticeBodyText: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 8 },
  noticeTime: { fontSize: 11, color: colors.textSubtle, fontWeight: '500' },

  // ── Empty state ─────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
