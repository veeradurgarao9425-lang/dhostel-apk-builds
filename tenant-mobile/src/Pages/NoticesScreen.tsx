import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, AlertCircle, Wrench, UtensilsCrossed,
  ChevronRight, SlidersHorizontal, Plus, Calendar
} from 'lucide-react-native';
import api from '../services/api';
import { mockNotices } from '../data/dummyData';
import { AppHeader, EmptyState, SkeletonNotificationRow } from '../components/ui';
import { CustomMonthYearPicker } from '../components/pickers/CustomMonthYearPicker';
import { LinearGradient } from 'expo-linear-gradient';

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF3FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID  = '#4A5568';
const TEXT_LIGHT= '#9CA3AF';
const BG        = '#F8FAFD';
const BORDER    = '#E8EDF5';

type FilterTab = 'All' | 'Important' | 'Maintenance' | 'Food' | 'General';
const FILTER_TABS: FilterTab[] = ['All', 'Important', 'Maintenance', 'Food', 'General'];

const categoryMeta: Record<string, { icon: any; iconColor: string; iconBg: string }> = {
  Important:   { icon: AlertCircle,     iconColor: '#DC2626', iconBg: '#FEE2E2' },
  Maintenance: { icon: Wrench,          iconColor: '#EA580C', iconBg: '#FFEDD5' },
  General:     { icon: Bell,            iconColor: '#2952F3', iconBg: '#EEF2FF' },
  Food:        { icon: UtensilsCrossed, iconColor: '#16A34A', iconBg: '#DCFCE7' },
};

export default function NoticesScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [notices, setNotices]           = useState<any[]>([]);
  const [loading, setLoading]           = useState<boolean>(true);
  const [error, setError]               = useState<string | null>(null);
  const [showPicker, setShowPicker]     = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

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

  const filtered = notices.filter(n => {
    const passCategory = activeFilter === 'All' ? true : n.category === activeFilter;
    let passDate = true;
    if (selectedMonth && n.date) {
      const noticeDate = new Date(n.date);
      passDate = noticeDate.getFullYear() === selectedMonth.getFullYear() && noticeDate.getMonth() === selectedMonth.getMonth();
    }
    return passCategory && passDate;
  });

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

      <AppHeader
        title="Notices"
        subtitle={selectedMonth 
          ? `Showing notices for ${selectedMonth.toLocaleString('default', { month: 'short' })} ${selectedMonth.getFullYear()}` 
          : 'Latest hostel announcements'}
        showBack={navigation.canGoBack()}
        rightComponent={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.hBtn} onPress={() => setShowPicker(true)}>
              <Calendar size={20} color={WHITE} />
              {selectedMonth && <View style={styles.filterDot} />}
            </TouchableOpacity>
            {selectedMonth && (
              <TouchableOpacity style={styles.hBtn} onPress={() => setSelectedMonth(null)}>
                <Plus size={20} color={WHITE} style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* ── Tabs Outside Header ── */}
      <View style={{ paddingTop: 12, paddingBottom: 4 }}>
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

      <CustomMonthYearPicker 
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={(d) => setSelectedMonth(d)}
        initialDate={selectedMonth || new Date()}
      />



      {/* ── Notices List ── */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ padding: 16 }}>
            <SkeletonNotificationRow />
            <SkeletonNotificationRow />
            <SkeletonNotificationRow />
          </View>
        ) : error ? (
          <View style={{ marginTop: 60 }}>
            <Text style={{ textAlign: 'center', color: TEXT_MID }}>Network error occurred.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.noticesWrapper}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon={Bell}
                title="No notices found"
                message="Your hostel announcements will appear here."
                action={{ label: "Refresh", onPress: fetchNotices }}
              />
            }
            renderItem={({ item: notice }) => {
              const meta = categoryMeta[notice.category] || categoryMeta.General;
              const Icon = meta.icon;
              return (
                <TouchableOpacity activeOpacity={0.85} style={{ marginBottom: 16, marginHorizontal: 20 }}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={{ borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: meta.iconColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 }}
                  >
                    <View style={{ backgroundColor: meta.iconBg, width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                      <Icon size={24} color={meta.iconColor} strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 }} numberOfLines={1}>{notice.title}</Text>
                      <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 18 }} numberOfLines={2}>{notice.body}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                        <Calendar size={12} color="#94A3B8" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginLeft: 4 }}>{notice.date}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerWrap: { backgroundColor: BLUE, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerGreeting: { color: WHITE, fontSize: 18, fontWeight: '700' },
  headerSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  hBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: BLUE },

  filterScroll:    { backgroundColor: WHITE, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterContainer: { paddingHorizontal: 16, gap: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
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
