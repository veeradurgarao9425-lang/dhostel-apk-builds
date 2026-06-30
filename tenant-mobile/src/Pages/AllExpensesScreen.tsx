import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, SlidersHorizontal,
  Utensils, Car, ShoppingBag, Receipt,
  Film, HeartPulse, MoreHorizontal, Coffee,
  Home, Plane, Zap, Gift, BookOpen,
} from 'lucide-react-native';

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

const ALL_DATA = [
  { id: 1,  title: 'Breakfast',        cat: 'Food',          time: '08:30 AM', amt: 120, date: 'Today, 14 Jun 2025' },
  { id: 2,  title: 'Auto Ride',        cat: 'Transport',     time: '09:15 AM', amt: 80,  date: 'Today, 14 Jun 2025' },
  { id: 3,  title: 'Groceries',        cat: 'Shopping',      time: '11:45 AM', amt: 150, date: 'Today, 14 Jun 2025' },
  { id: 4,  title: 'Movie Ticket',     cat: 'Entertainment', time: '07:00 PM', amt: 220, date: 'Yesterday, 13 Jun 2025' },
  { id: 5,  title: 'Bus Pass',         cat: 'Transport',     time: '08:30 AM', amt: 200, date: 'Yesterday, 13 Jun 2025' },
  { id: 6,  title: 'Evening Tea',      cat: 'Food',          time: '04:20 PM', amt: 40,  date: 'Yesterday, 13 Jun 2025' },
  { id: 7,  title: 'Online Shopping',  cat: 'Shopping',      time: '09:00 PM', amt: 450, date: '12 Jun 2025' },
  { id: 8,  title: 'Electricity Bill', cat: 'Bills',         time: '11:00 AM', amt: 170, date: '12 Jun 2025' },
  { id: 9,  title: 'Lunch',            cat: 'Food',          time: '01:00 PM', amt: 95,  date: '11 Jun 2025' },
  { id: 10, title: 'Cab Ride',         cat: 'Transport',     time: '06:00 PM', amt: 130, date: '11 Jun 2025' },
];

const FILTER_CATS = ['All', 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];
const GROUP_COLORS = ['#EEF3FF', '#FFF3E0', '#EAF5EA', '#FCE4EC', '#F4E5FA'];

export default function AllExpensesScreen({ navigation }: any) {
  const [query, setQuery]             = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const grouped = useMemo(() => {
    const filtered = ALL_DATA.filter(item => {
      const matchCat = activeFilter === 'All' || item.cat === activeFilter;
      const matchQ   = item.title.toLowerCase().includes(query.toLowerCase()) || item.cat.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
    const map: Record<string, typeof ALL_DATA> = {};
    filtered.forEach(item => { if (!map[item.date]) map[item.date] = []; map[item.date].push(item); });
    return Object.entries(map);
  }, [query, activeFilter]);

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
            <TouchableOpacity style={s.iconBtn}>
              <SlidersHorizontal size={20} color={WHITE} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={s.searchBox}>
            <Search size={16} color={TEXT_LIGHT} strokeWidth={2} />
            <TextInput style={s.searchInput} placeholder="Search expenses..." placeholderTextColor={TEXT_LIGHT} value={query} onChangeText={setQuery} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={s.filterBar}>
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {grouped.length === 0 ? (
          <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text><Text style={s.emptyTitle}>No results found</Text><Text style={s.emptySub}>Try a different keyword or category</Text></View>
        ) : (
          grouped.map(([date, items], groupIdx) => {
            const dayTotal   = items.reduce((sum, i) => sum + i.amt, 0);
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
                  {items.map((item, idx) => {
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
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerWrap: { backgroundColor: BLUE },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: WHITE },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
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
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT_LIGHT, fontWeight: '500' },
});
