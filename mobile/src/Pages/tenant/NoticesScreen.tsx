import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, FlatList, Animated, Dimensions, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { CustomMonthYearPicker } from '../../components/tenant/pickers/CustomMonthYearPicker';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/tenantTheme';
import { Phase3EmptyState } from '../../components/tenant/UIComponents';
import { SkeletonNotificationRow } from '../../components/tenant/ui';
import AppHeader from '../../components/tenant/ui/AppHeader';
import { TenantHeaderNotification } from '../../components/tenant/TenantHeaderNotification';
import { getResolvedImageUrl } from '../../utils/imageHelper';

const { width: SCREEN_W } = Dimensions.get('window');

type FilterTab = 'All' | 'Important' | 'Maintenance' | 'Food' | 'General';
const FILTER_TABS: FilterTab[] = ['All', 'Important', 'Maintenance', 'Food', 'General'];

const categoryMeta: Record<string, { icon: any; iconColor: string; iconBg: string }> = {
  Important:   { icon: 'alert-circle', iconColor: '#DC2626', iconBg: '#FEE2E2' },
  Maintenance: { icon: 'build',        iconColor: '#EA580C', iconBg: '#FFEDD5' },
  General:     { icon: 'notifications',iconColor: theme.colors.primary, iconBg: theme.colors.primarySoft },
  Food:        { icon: 'restaurant',   iconColor: '#16A34A', iconBg: '#DCFCE7' },
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
          image_url: n.image_url,
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
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* ── Header ── */}
      <AppHeader
        title="Hostel Feed"
        subtitle={selectedMonth 
          ? `Updates for ${selectedMonth.toLocaleString('default', { month: 'short' })} ${selectedMonth.getFullYear()}` 
          : 'Alerts, updates, and announcements'}
        showBack={false}
        rightComponent={
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity style={styles.hBtn} onPress={() => setShowPicker(true)}>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
              {selectedMonth && <View style={styles.filterDot} />}
            </TouchableOpacity>
            {selectedMonth && (
              <TouchableOpacity style={styles.hBtn} onPress={() => setSelectedMonth(null)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TenantHeaderNotification navigation={navigation} />
          </View>
        }
      />

      {/* ── Tabs ── */}
      <View style={styles.filterScrollWrap}>
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
            <Text style={{ textAlign: 'center', color: theme.colors.textMuted }}>Network error occurred.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.noticesWrapper}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Phase3EmptyState variant="notices" onAction={fetchNotices} />
            }
            renderItem={({ item: notice }) => {
              const meta = categoryMeta[notice.category] || categoryMeta.General;
              return (
                <TouchableOpacity activeOpacity={0.85} style={styles.noticeCard}>
                  <View style={styles.cardContent}>
                    <View style={[styles.iconWrap, { backgroundColor: meta.iconBg }]}>
                      <Ionicons name={meta.icon as any} size={22} color={meta.iconColor} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.noticeTopRow}>
                        <Text style={styles.noticeCategory} numberOfLines={1}>{notice.category}</Text>
                        <View style={styles.dateChip}>
                          <Ionicons name="calendar-outline" size={10} color={theme.colors.textSubtle} />
                          <Text style={styles.noticeDate}>{notice.date}</Text>
                        </View>
                      </View>

                      <Text style={styles.noticeTitle} numberOfLines={2}>{notice.title}</Text>
                      <Text style={styles.noticeBody} numberOfLines={3}>{notice.body}</Text>

                      {notice.image_url && (
                        <Image
                          source={{ uri: getResolvedImageUrl(notice.image_url) || '' }}
                          style={styles.noticeImage}
                        />
                      )}
                    </View>
                  </View>
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
  root: { flex: 1, backgroundColor: theme.colors.bg },
  
  // Header
  headerWrap: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGreeting: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2, fontWeight: '500' },
  hBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: theme.colors.primary },

  // Filters
  filterScrollWrap: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  filterContainer: { paddingHorizontal: 16, gap: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  filterTextActive: { color: '#FFFFFF' },
  countBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.primary },
  countBadgeTextActive: { color: '#FFFFFF' },

  // List
  noticesWrapper: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100, gap: 12 },
  
  // Notice Card
  noticeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noticeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noticeCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noticeDate: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  noticeBody: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSubtle,
    lineHeight: 18,
  },
  noticeImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 8,
    resizeMode: 'cover',
  },
});
