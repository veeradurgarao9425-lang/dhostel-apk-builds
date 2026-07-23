import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Filter, Utensils, Coffee, MapPin, Receipt, RefreshCcw
} from 'lucide-react-native';

const MOCK_GROUPS = [
  {
    date: 'Today', total: 180,
    items: [
      { id: '1', title: 'Cafe Coffee Day', time: '01:20 PM', amt: 180, Icon: Coffee }
    ]
  },
  {
    date: 'Yesterday', total: 180,
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
    color = '#4F46E5', // Premium Indigo by default
    bg = '#EEF2FF',
  } = route.params || {};

  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#0F172A" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{categoryName}</Text>
          <Text style={s.headerSub}>All transactions in May 2025</Text>
        </View>
        <TouchableOpacity style={s.filterBtn}>
          <Filter size={20} color="#0F172A" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Total Summary Block */}
        <View style={s.summaryBlock}>
          <Text style={s.totalLabel}>Total Spent</Text>
          <Text style={s.totalAmt}>₹{spent.toLocaleString('en-IN')}</Text>
        </View>

        {/* Transactions List */}
        <View style={s.listContainer}>
          {MOCK_GROUPS.map((group, gIdx) => (
            <View key={group.date} style={s.groupWrap}>
              <View style={s.groupHeader}>
                <Text style={s.groupDate}>{group.date}</Text>
                <Text style={s.groupTotal}>₹{group.total}</Text>
              </View>
              
              <View style={s.groupCard}>
                {group.items.map((item, iIdx) => {
                  const Icon = item.Icon;
                  const isLast = iIdx === group.items.length - 1;
                  return (
                    <View key={item.id} style={[s.row, !isLast && s.rowBorder]}>
                      <View style={[s.iconBox, { backgroundColor: bg }]}>
                        <Icon size={18} color={color} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowTitle}>{item.title}</Text>
                        <Text style={s.rowTime}>{item.time}</Text>
                      </View>
                      <Text style={s.rowAmt}>₹{item.amt}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Footer Summary Cards */}
        <View style={s.footerCardsRow}>
          <View style={s.footerCard}>
            <View style={[s.footerIconWrap, { backgroundColor: bg }]}>
              <RefreshCcw size={16} color={color} strokeWidth={2.5} />
            </View>
            <Text style={s.footerLbl}>Total</Text>
            <Text style={s.footerVal}>8 txns</Text>
          </View>
          <View style={s.footerCard}>
             <View style={[s.footerIconWrap, { backgroundColor: '#F3F4F6' }]}>
              <Receipt size={16} color="#64748B" strokeWidth={2.5} />
            </View>
            <Text style={s.footerLbl}>Avg per txn</Text>
            <Text style={s.footerVal}>₹90</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 20 },

  summaryBlock: { marginBottom: 24, paddingHorizontal: 4 },
  totalLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  totalAmt: { fontSize: 40, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },

  listContainer: { gap: 24, marginBottom: 24 },
  groupWrap: {},
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  groupDate: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  groupTotal: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  rowTime: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  rowAmt: { fontSize: 15, fontWeight: '800', color: '#0F172A' },

  footerCardsRow: { flexDirection: 'row', gap: 16 },
  footerCard: {
    flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  footerIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  footerLbl: { fontSize: 11, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  footerVal: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
});
