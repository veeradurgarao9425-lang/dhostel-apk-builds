import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, SlidersHorizontal, Megaphone, Bell, AlertCircle,
  Wrench, UtensilsCrossed, ArrowLeft,
} from 'lucide-react-native';
import { colors, radius, spacing, font, shadow } from '../theme';
import { sampleNotices, Notice } from '../data/tenantContent';
import api from '../services/api';

type FilterTab = 'All' | 'Important' | 'Maintenance' | 'Food';
const FILTER_TABS: FilterTab[] = ['All', 'Important', 'Maintenance', 'Food'];

const categoryMeta: Record<string, {
  icon: any;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  label: string;
}> = {
  Important: { icon: AlertCircle, iconColor: colors.danger, iconBg: colors.dangerSoft, accentColor: colors.danger, label: 'Important' },
  Maintenance: { icon: Wrench, iconColor: colors.warning, iconBg: colors.warningSoft, accentColor: colors.warning, label: 'Maintenance' },
  General: { icon: Bell, iconColor: colors.primary, iconBg: colors.primarySoft, accentColor: colors.primary, label: 'General' },
  Food: { icon: UtensilsCrossed, iconColor: colors.success, iconBg: colors.successSoft, accentColor: colors.success, label: 'Food' },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return `${diffD}d ago`;
}

function groupNoticesByDate(notices: Notice[]) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return [
    ...(notices.filter((n) => n.date === todayStr).length
      ? [{ label: 'Today', items: notices.filter((n) => n.date === todayStr) }]
      : []),
    ...(notices.filter((n) => n.date === yesterdayStr).length
      ? [{ label: 'Yesterday', items: notices.filter((n) => n.date === yesterdayStr) }]
      : []),
    ...(notices.filter((n) => n.date < yesterdayStr).length
      ? [{ label: 'Earlier', items: notices.filter((n) => n.date < yesterdayStr) }]
      : []),
  ];
}

function NoticeRow({ notice, isLast }: { notice: Notice; isLast: boolean }) {
  const meta = categoryMeta[notice.category] || categoryMeta['General'];
  const Icon = meta.icon;

  return (
    <TouchableOpacity
      style={[styles.noticeRow, !isLast && styles.noticeRowDivider]}
      activeOpacity={0.72}
    >
      {/* Icon */}
      <View style={[styles.noticeIcon, { backgroundColor: meta.iconBg }]}>
        <Icon size={18} color={meta.iconColor} strokeWidth={1.5} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={styles.noticeTopRow}>
          <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
          {notice.pinned && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.noticeText} numberOfLines={2}>{notice.body}</Text>
        <Text style={styles.noticeTime}>{timeAgo(notice.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NoticesScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await api.get('/notices');
        if (res.data.success) {
          const formatted = res.data.data.map((n: any) => ({
            id: String(n.notice_id),
            title: n.title,
            body: n.content,
            category: n.notice_type || 'General',
            date: n.created_at.slice(0, 10),
            pinned: false,
          }));
          setNotices(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const displayNotices = notices.length > 0 ? notices : [];
  const filtered = displayNotices.filter((n) =>
    activeFilter === 'All' ? true : n.category === activeFilter
  );
  const grouped = groupNoticesByDate(filtered);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Gradient Header ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>Announcements</Text>
            <Text style={styles.headerTitle}>Notices</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.backBtn} />
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
              <SlidersHorizontal size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
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

      {/* ── List ────────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Megaphone size={28} color={colors.textSubtle} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No notices</Text>
            <Text style={styles.emptyBody}>
              Announcements from your hostel will appear here.
            </Text>
          </View>
        ) : (
          grouped.map(({ label, items }) => (
            <View key={label}>
              <Text style={styles.groupLabel}>{label}</Text>
              <View style={styles.noticeCard}>
                {items.map((notice, i) => (
                  <NoticeRow
                    key={notice.id}
                    notice={notice}
                    isLast={i === items.length - 1}
                  />
                ))}
              </View>
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

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  hCircle1: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -20,
  },
  hCircle2: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 80,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerEyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Filter ────────────────────────────────────────────────────────────────
  filterWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 120, paddingTop: spacing.lg },

  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // White rounded container (not individual cards)
  noticeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  noticeRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noticeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger, flexShrink: 0 },
  noticeText: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 6 },
  noticeTime: { fontSize: 11, color: colors.textSubtle, fontWeight: '500' },

  // ── Empty ─────────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});
