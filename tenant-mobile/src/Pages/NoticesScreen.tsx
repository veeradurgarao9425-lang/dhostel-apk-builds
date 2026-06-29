import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, AlertCircle, Wrench, UtensilsCrossed, ChevronRight, SlidersHorizontal
} from 'lucide-react-native';
import api from '../services/api';

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';

type FilterTab = 'All' | 'Important' | 'Maintenance' | 'Food';
const FILTER_TABS: FilterTab[] = ['All', 'Important', 'Maintenance', 'Food'];

const categoryMeta: Record<string, { icon: any; iconColor: string; iconBg: string }> = {
  Important: { icon: AlertCircle, iconColor: '#EF4444', iconBg: '#FEE2E2' },
  Maintenance: { icon: Wrench, iconColor: '#F59E0B', iconBg: '#FEF3C7' },
  General: { icon: Bell, iconColor: '#3B82F6', iconBg: '#EFF6FF' },
  Food: { icon: UtensilsCrossed, iconColor: '#10B981', iconBg: '#D1FAE5' },
};

export default function NoticesScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [notices, setNotices] = useState<any[]>([]);

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
          }));
          setNotices(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      }
    };
    fetchNotices();
  }, []);

  const filtered = notices.filter((n) => activeFilter === 'All' ? true : n.category === activeFilter);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── Blue Header ─────────────────────────────────────────────────────────── */}
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

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <View style={styles.filterScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, activeFilter === tab && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text style={[styles.filterText, activeFilter === tab && styles.filterTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.noticesWrapper}>
          {filtered.length > 0 ? (
            filtered.map((notice) => {
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
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Bell size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No notices found in this category.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrap: { backgroundColor: BLUE, paddingBottom: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerGreeting: { color: WHITE, fontSize: 24, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, fontWeight: '500' },
  hBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  
  filterScroll: { backgroundColor: '#F8FAFC', paddingVertical: 12 },
  filterContainer: { paddingHorizontal: 16, gap: 10 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: WHITE, borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: WHITE },

  noticesWrapper: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  noticeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  noticeIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  noticeBody: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 6 },
  noticeDate: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, opacity: 0.7 },
  emptyText: { marginTop: 16, fontSize: 15, color: '#64748B', fontWeight: '500' },
});
