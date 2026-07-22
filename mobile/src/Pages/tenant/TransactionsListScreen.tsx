import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Filter, Utensils, Coffee, MapPin, Receipt, RefreshCcw
} from 'lucide-react-native';

const BLUE       = '#2245D4';
const BLUE_SOFT  = '#EEF3FF';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#0D1B3E';
const TEXT_MID   = '#4A5568';
const TEXT_LIGHT = '#9CA3AF';
const BG         = '#F8FAFD';
const BORDER     = '#E8EDF5';

const MOCK_GROUPS = [
  {
    date: 'Today, 14 May 2025', total: 180,
    items: [
      { id: '1', title: 'Cafe Coffee Day', time: '01:20 PM', amt: 180, Icon: Coffee }
    ]
  },
  {
    date: 'Yesterday, 13 May 2025', total: 180,
    items: [
      { id: '2', title: "Domino's Pizza", time: '08:15 PM', amt: 180, Icon: Utensils }
    ]
  },
  {
    date: '10 May 2025', total: 180,
    items: [
      { id: '3', title: 'KFC', time: '07:30 PM', amt: 180, Icon: Utensils }
    ]
  },
  {
    date: '08 May 2025', total: 90,
    items: [
      { id: '4', title: 'Subway', time: '01:10 PM', amt: 90, Icon: Utensils }
    ]
  },
  {
    date: '06 May 2025', total: 120,
    items: [
      { id: '5', title: "McDonald's", time: '06:40 PM', amt: 120, Icon: Utensils }
    ]
  },
];

export default function TransactionsListScreen({ navigation, route }: any) {
  const { 
    categoryName = 'Restaurants', 
    spent = 720, 
    color = BLUE,
    bg = BLUE_SOFT,
  } = route.params || {};

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={TEXT_DARK} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{categoryName}</Text>
          <Text style={s.headerSub}>All transactions in May 2025</Text>
        </View>
        <TouchableOpacity style={s.filterBtn}>
          <Filter size={18} color={color} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.totalLabel}>Total Spent</Text>
        <Text style={s.totalAmt}>₹ {spent.toLocaleString('en-IN')}</Text>

        <View style={s.listCard}>
          {MOCK_GROUPS.map((group, gIdx) => (
            <View key={group.date}>
              <View style={s.groupHeader}>
                <Text style={s.groupDate}>{group.date}</Text>
                <Text style={s.groupTotal}>₹ {group.total}</Text>
              </View>
              {group.items.map((item, iIdx) => {
                const Icon = item.Icon;
                return (
                  <View key={item.id} style={s.row}>
                    <View style={[s.iconBox, { backgroundColor: bg }]}>
                      <Icon size={16} color={color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{item.title}</Text>
                      <Text style={s.rowTime}>{item.time}</Text>
                    </View>
                    <Text style={s.rowAmt}>₹ {item.amt}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Footer Summary */}
        <View style={s.footerSummary}>
          <View style={s.footerCol}>
            <View style={s.footerIconWrap}>
              <RefreshCcw size={14} color={color} strokeWidth={3} />
            </View>
            <View>
              <Text style={s.footerLbl}>Total Transactions</Text>
              <Text style={s.footerVal}>8</Text>
            </View>
          </View>
          <View style={s.footerDivider} />
          <View style={s.footerCol}>
            <View>
              <Text style={s.footerLbl}>Average per transaction</Text>
              <Text style={s.footerVal}>₹ 90</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8, marginRight: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  headerSub: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500', marginTop: 1 },
  filterBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 20 },

  totalLabel: { fontSize: 12, fontWeight: '600', color: TEXT_MID, marginBottom: 4 },
  totalAmt: { fontSize: 28, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.5, marginBottom: 24 },

  listCard: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 20 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  groupDate: { fontSize: 11, fontWeight: '700', color: TEXT_MID },
  groupTotal: { fontSize: 11, fontWeight: '700', color: TEXT_DARK },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 2 },
  rowTime: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  rowAmt: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },

  footerSummary: {
    flexDirection: 'row', backgroundColor: BLUE_SOFT, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#D4E0FF',
  },
  footerCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(34, 69, 212, 0.1)', alignItems: 'center', justifyContent: 'center' },
  footerLbl: { fontSize: 10, color: TEXT_MID, fontWeight: '600', marginBottom: 2 },
  footerVal: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  footerDivider: { width: 1, backgroundColor: '#C7D6FF', marginHorizontal: 16 },
});
