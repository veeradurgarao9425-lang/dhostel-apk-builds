import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, StatusBar, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, SlidersHorizontal,
  Utensils, Car, ShoppingBag, Receipt,
  Film, HeartPulse, MoreHorizontal, Coffee,
  Home, Plane, Zap, Gift, BookOpen,
  Calendar, Check, X,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useToast } from '../context/ToastContext';
import { Phase3EmptyState, BaseBottomSheet } from '../components/UIComponents';
import api from '../services/api';

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF3FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID  = '#4A5568';
const TEXT_LIGHT= '#9CA3AF';
const BG        = '#F8FAFD';
const BORDER    = '#E8EDF5';

const CATS: Record<string, { color: string; bg: string; Icon: any }> = {
  Food:          { color: '#EF5350', bg: '#FDEAEA', Icon: Utensils },
  Transport:     { color: BLUE,      bg: BLUE_SOFT, Icon: Car },
  Shopping:      { color: '#43A047', bg: '#EAF5EA', Icon: ShoppingBag },
  Bills:         { color: '#FB8C00', bg: '#FFF3E0', Icon: Receipt },
  Entertainment: { color: '#8E24AA', bg: '#F4E5FA', Icon: Film },
  Health:        { color: '#E53935', bg: '#FDEAEA', Icon: HeartPulse },
  Coffee:        { color: '#795548', bg: '#EFEBE9', Icon: Coffee },
  Travel:        { color: '#0288D1', bg: '#E1F5FE', Icon: Plane },
  Rent:          { color: '#546E7A', bg: '#ECEFF1', Icon: Home },
  Utilities:     { color: '#F9A825', bg: '#FFFDE7', Icon: Zap },
  Gifts:         { color: '#EC407A', bg: '#FCE4EC', Icon: Gift },
  Education:     { color: '#3949AB', bg: '#E8EAF6', Icon: BookOpen },
  Others:        { color: '#546E7A', bg: '#ECEFF1', Icon: MoreHorizontal },
};

const FILTER_CATS = ['All', 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Coffee', 'Education', 'Others'];
const GROUP_COLORS = ['#EEF3FF', '#FFF3E0', '#EAF5EA', '#FCE4EC', '#F4E5FA'];

export default function AllExpensesScreen({ navigation }: any) {
  const [query, setQuery]               = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [allData, setAllData]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [sortOrder, setSortOrder]       = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [dateFilter, setDateFilter]     = useState<'Any time' | 'Today' | 'This Month' | 'Last Month' | 'This Year'>('Any time');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { showError } = useToast();

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get('/tenant-expenses');
      if (res.data?.success) {
        const fetched = res.data.data;
        const formatted = fetched.map((e: any) => ({
          id: e.expense_id,
          title: e.title,
          cat: e.category,
          time: new Date(e.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          amt: Number(e.amount),
          date: new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          rawDate: e.date,
        }));
        setAllData(formatted);
      }
    } catch {
      showError('Could not load expenses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchExpenses(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpenses();
  }, [fetchExpenses]);

  const cycleSortOrder = useCallback(() => {
    const orders: typeof sortOrder[] = ['newest', 'lowest'];
    setSortOrder(prev => {
      const next = orders[(orders.indexOf(prev) + 1) % orders.length];
      return next;
    });
  }, []);

  const grouped = useMemo(() => {
    const filtered = allData.filter(item => {
      const matchCat = activeFilter === 'All' || item.cat === activeFilter;
      const matchQ   = item.title.toLowerCase().includes(query.toLowerCase()) || item.cat.toLowerCase().includes(query.toLowerCase());
      
      let matchDate = true;
      if (dateFilter !== 'Any time') {
        const itemDateStr = item.rawDate; // e.g. '2026-07-02'
        if (typeof itemDateStr === 'string') {
          const [y, m, d] = itemDateStr.split('-').map(Number);
          
          if (dateFilter === 'Today') {
            const today = new Date();
            matchDate = y === today.getFullYear() && (m - 1) === today.getMonth() && d === today.getDate();
          } else if (dateFilter === 'This Month') {
            const today = new Date();
            matchDate = y === today.getFullYear() && (m - 1) === today.getMonth();
          } else if (dateFilter === 'Last Month') {
            const today = new Date();
            const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            matchDate = y === lm.getFullYear() && (m - 1) === lm.getMonth();
          } else if (dateFilter === 'This Year') {
            const today = new Date();
            matchDate = y === today.getFullYear();
          }
        }
      }
      return matchCat && matchQ && matchDate;
    });
    const sortFn = (a: any, b: any) => {
      if (sortOrder === 'newest')  return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
      if (sortOrder === 'oldest')  return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
      if (sortOrder === 'highest') return b.amt - a.amt;
      return a.amt - b.amt;
    };
    const sorted = [...filtered].sort(sortFn);
    const map: Record<string, typeof allData> = {};
    sorted.forEach(item => { if (!map[item.date]) map[item.date] = []; map[item.date].push(item); });
    return Object.entries(map);
  }, [query, activeFilter, allData, sortOrder, dateFilter]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <View style={s.headerWrap}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
              <ArrowLeft size={22} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>All Expenses</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity style={[s.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={cycleSortOrder}>
                <SlidersHorizontal size={18} color={WHITE} strokeWidth={2} />
              </TouchableOpacity>
              {sortOrder !== 'newest' && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ fontSize: 10, color: WHITE, fontWeight: '700' }}>{sortOrder}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 16 }}>
            <View style={[s.searchBox, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}>
              <Search size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <TextInput style={s.searchInput} placeholder="Search expenses..." placeholderTextColor="rgba(255,255,255,0.6)" value={query} onChangeText={setQuery} />
            </View>
            <TouchableOpacity 
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
                position: 'relative',
              }}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Calendar size={18} color={WHITE} strokeWidth={2} />
              {dateFilter !== 'Any time' && (
                <View style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={s.filterBar}>
        {dateFilter !== 'Any time' && (
          <TouchableOpacity 
            style={[s.filterPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} 
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={[s.filterPillDot, { backgroundColor: '#DBEAFE' }]}>
              <Calendar size={12} color="#2563EB" strokeWidth={2} />
            </View>
            <Text style={[s.filterPillText, { color: '#2563EB', fontWeight: '700' }]}>{dateFilter}</Text>
          </TouchableOpacity>
        )}

        {FILTER_CATS.map(cat => {
          const meta = CATS[cat]; const active = activeFilter === cat;
          return (
            <TouchableOpacity key={cat} style={[s.filterPill, active && { backgroundColor: BLUE, borderColor: BLUE }]} onPress={() => setActiveFilter(cat)} activeOpacity={0.7}>
              {meta && (<View style={[s.filterPillDot, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : meta.bg }]}><meta.Icon size={12} color={active ? WHITE : meta.color} strokeWidth={2} /></View>)}
              <Text style={[s.filterPillText, active && { color: WHITE }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} colors={[BLUE]} />}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', paddingTop: 80 }}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={{ marginTop: 12, fontSize: 13, color: TEXT_MID, fontWeight: '500' }}>Loading expenses…</Text>
          </View>
        ) : (
          grouped.length === 0 ? (
            allData.length === 0 ? (
              <View style={{ marginTop: 40 }}>
                <Phase3EmptyState variant="expenses" onAction={() => navigation.navigate('AddExpense')} />
              </View>
            ) : (
              <View style={{ marginTop: 40 }}>
                <Phase3EmptyState variant="search" />
              </View>
            )
          ) : (
            grouped.map(([date, items], groupIdx) => {
              const dayTotal   = items.reduce((sum: number, i: any) => sum + i.amt, 0);
              const groupColor = GROUP_COLORS[groupIdx % GROUP_COLORS.length];
              return (
                <View key={date} style={s.group}>
                  <View style={s.groupHeader}>
                    <View><Text style={s.groupDate}>{date}</Text><Text style={s.groupCount}>{items.length} transaction{items.length > 1 ? 's' : ''}</Text></View>
                    <View style={[s.groupTotalBadge, { backgroundColor: groupColor }]}>
                      <Text style={s.groupTotalLabel}>Spent</Text>
                      <Text style={s.groupTotalAmt}>₹ {dayTotal.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <View style={s.groupCard}>
                    {items.map((item: any, idx: number) => {
                      const meta = CATS[item.cat] || CATS.Others; const Icon = meta.Icon;
                      return (
                        <TouchableOpacity key={item.id} style={[s.row, idx < items.length - 1 && s.rowDivider]} activeOpacity={0.7}>
                          <View style={[s.iconWrap, { backgroundColor: meta.bg }]}><Icon size={20} color={meta.color} strokeWidth={2} /></View>
                          <View style={{ flex: 1 }}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowTime}>{item.time}</Text></View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={s.rowAmt}>- ₹{item.amt}</Text>
                            <View style={[s.catPill, { backgroundColor: meta.bg }]}><Text style={[s.catPillText, { color: meta.color }]}>{item.cat}</Text></View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
      {/* ── Date Filter Modal (using reusable BaseBottomSheet) ── */}
      <BaseBottomSheet visible={showDatePicker} onClose={() => setShowDatePicker(false)} height="auto">
        <View style={{ padding: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_DARK }}>Filter by Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <X size={20} color={TEXT_MID} />
            </TouchableOpacity>
          </View>
          
          {(['Any time', 'Today', 'This Month', 'Last Month', 'This Year'] as const).map((filter) => {
            const active = dateFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}
                onPress={() => {
                  setDateFilter(filter);
                  setShowDatePicker(false);
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: active ? '700' : '500', color: active ? BLUE : TEXT_DARK }}>
                  {filter}
                </Text>
                {active && <Check size={18} color={BLUE} strokeWidth={2.5} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BaseBottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerWrap: { backgroundColor: BLUE },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: WHITE },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  searchInput: { flex: 1, fontSize: 14, color: WHITE, fontWeight: '500' },
  filterBar: { backgroundColor: WHITE, maxHeight: 56, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  filterPillDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterPillText: { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  group: { marginBottom: 20 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  groupDate: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, marginBottom: 2 },
  groupCount: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  groupTotalBadge: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'flex-end', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  groupTotalLabel: { fontSize: 10, color: TEXT_MID, fontWeight: '600', marginBottom: 1 },
  groupTotalAmt: { fontSize: 18, fontWeight: '900', color: TEXT_DARK, letterSpacing: -0.5 },
  groupCard: { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: BLUE, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  rowTime: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  rowAmt: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3, marginBottom: 4 },
  catPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catPillText: { fontSize: 10, fontWeight: '700' },
});
