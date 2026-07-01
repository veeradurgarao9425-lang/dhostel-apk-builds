import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, AlertCircle, Wrench, UtensilsCrossed,
  ChevronRight, SlidersHorizontal, Plus,
} from 'lucide-react-native';
import api from '../services/api';
import { mockNotices } from '../data/dummyData';
import { Phase3EmptyState, Phase3ErrorState } from '../components/UIComponents';

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF3FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID  = '#4A5568';
const TEXT_LIGHT= '#9CA3AF';
const BG        = '#F8FAFD';
const BORDER    = '#E8EDF5';

type FilterTab = 'All' | 'Important' | 'Maintenance' | 'Food';
const FILTER_TABS: FilterTab[] = ['All', 'Important', 'Maintenance', 'Food'];

const categoryMeta: Record<string, { icon: any; iconColor: string; iconBg: string }> = {
  Important:   { icon: AlertCircle,     iconColor: '#E53935', iconBg: '#FDEAEA' },
  Maintenance: { icon: Wrench,          iconColor: '#FB8C00', iconBg: '#FFF3E0' },
  General:     { icon: Bell,            iconColor: BLUE,      iconBg: BLUE_SOFT },
  Food:        { icon: UtensilsCrossed, iconColor: '#43A047', iconBg: '#EAF5EA' },
};

export default function NoticesScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [notices, setNotices]           = useState<any[]>([]);
  const [loading, setLoading]           = useState<boolean>(true);
  const [error, setError]               = useState<string | null>(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/notices');
      if (res.data.success) {
        const formatted = res.data.data.map((n: any) => ({
          id: String(n.notice_id),
          title: n.title,
          body: n.content,
          category: n.notice_type || 'General',
          date: n.created_at.slice(0, 10),
        }));
        setNotices(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch notices:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const filtered = notices.filter(n => activeFilter === 'All' ? true : n.category === activeFilter);

  // Count badges per filter tab
  const getCounts = () => {
    const counts: Record<string, number> = { All: notices.length };
    FILTER_TABS.forEach(tab => {
      if (tab !== 'All') counts[tab] = notices.filter(n => n.category === tab).length;
    });
    return counts;
  };
  const counts = getCounts();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Blue Header ── */}
      <View style={styles.headerWrap}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerGreeting}>Notices</Text>
              <Text style={styles.headerSub}>Latest hostel announcements</Text>
            </View>
            <TouchableOpacity style={styles.hBtn}>
              <SlidersHorizontal size={20} color={WHITE} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Filter Chips with Count Badges ── */}
      <View style={styles.filterScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab;
            const count    = counts[tab] ?? 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{tab}</Text>
                {count > 0 && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Notices List ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.noticesWrapper}>
          {error ? (
            <View style={{ marginTop: 60 }}>
              <Phase3ErrorState variant="server" onAction={fetchNotices} />
            </View>
          ) : filtered.length > 0 ? (
            filtered.map(notice => {
              const meta = categoryMeta[notice.category] || categoryMeta.General;
              const Icon = meta.icon;
              return (
                <TouchableOpacity key={notice.id} style={styles.noticeCard} activeOpacity={0.7}>
                  <View style={[styles.noticeIconWrap, { backgroundColor: meta.iconBg }]}>
                    <Icon size={18} color={meta.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                    <Text style={styles.noticeBody} numberOfLines={2}>{notice.body}</Text>
                    <Text style={styles.noticeDate}>{notice.date}</Text>
                  </View>
                  <ChevronRight size={18} color="#CBD5E0" />
                </TouchableOpacity>
              );
            })
          ) : (
            <Phase3EmptyState variant="notices" onAction={fetchNotices} />
          )}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerWrap: { backgroundColor: BLUE, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerGreeting: { color: WHITE, fontSize: 24, fontWeight: '800' },
  headerSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, fontWeight: '500' },
  hBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  filterScroll:    { backgroundColor: WHITE, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterContainer: { paddingHorizontal: 16, gap: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  filterChipActive:    { backgroundColor: BLUE, borderColor: BLUE },
  filterText:          { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  filterTextActive:    { color: WHITE },
  countBadge:          { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.25)' },
  countBadgeText:      { fontSize: 10, fontWeight: '800', color: BLUE },
  countBadgeTextActive:{ color: WHITE },

  noticesWrapper: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  noticeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: WHITE, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: BORDER },
  noticeIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noticeTitle:    { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  noticeBody:     { fontSize: 13, color: TEXT_MID, lineHeight: 18, marginBottom: 6 },
  noticeDate:     { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  emptyState:     { alignItems: 'center', justifyContent: 'center', marginTop: 80, opacity: 0.7 },
  emptyText:      { marginTop: 16, fontSize: 15, color: TEXT_MID, fontWeight: '500' },
});
