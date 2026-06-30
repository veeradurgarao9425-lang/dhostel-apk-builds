import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft, ChevronRight, ChevronDown, Utensils,
  Coffee, ShoppingBag, Receipt, MoreHorizontal, MapPin
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const BLUE       = '#2245D4';
const BLUE_SOFT  = '#EEF3FF';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#0D1B3E';
const TEXT_MID   = '#4A5568';
const TEXT_LIGHT = '#9CA3AF';
const BG         = '#F8FAFD';
const BORDER     = '#E8EDF5';

// Mock data generator for subcategories/places
const getBreakdownData = (category: string, isSubcategory: boolean) => {
  if (!isSubcategory) {
    return [
      { id: '1', name: 'Restaurants', amt: 720, pct: 50, Icon: Coffee },
      { id: '2', name: 'Snacks & Beverages', amt: 360, pct: 22, Icon: Utensils },
      { id: '3', name: 'Groceries', amt: 260, pct: 18, Icon: ShoppingBag },
      { id: '4', name: 'Desserts', amt: 110, pct: 7, Icon: Receipt },
    ];
  }
  return [
    { id: '1', name: 'Cafe Coffee Day', amt: 240, pct: 33, Icon: MapPin },
    { id: '2', name: 'Dominos', amt: 180, pct: 25, Icon: MapPin },
    { id: '3', name: 'KFC', amt: 150, pct: 21, Icon: MapPin },
    { id: '4', name: 'Others', amt: 150, pct: 21, Icon: MapPin },
  ];
};

const getRecentData = (category: string) => [
  { id: '1', title: 'Lunch at Cafe', time: 'Today, 1:20 PM', amt: 180, Icon: Utensils },
  { id: '2', title: 'Cold Coffee', time: 'Today, 11:45 AM', amt: 120, Icon: Coffee },
  { id: '3', title: 'D-Mart Groceries', time: 'Yesterday, 7:30 PM', amt: 260, Icon: ShoppingBag },
  { id: '4', title: 'Burger King', time: 'Yesterday, 1:10 PM', amt: 190, Icon: Utensils },
];

const DONUT_R = 36;
const DONUT_SW = 12;
const DONUT_SZ = (DONUT_R + DONUT_SW / 2 + 2) * 2;
const CIRC = 2 * Math.PI * DONUT_R;

export default function CategoryDetailScreen({ navigation, route }: any) {
  const { 
    categoryName = 'Food & Dining', 
    spent = 1450, 
    totalPct = 40, 
    isSubcategory = false,
    color = BLUE,
    bg = BLUE_SOFT,
  } = route.params || {};

  const breakdown = getBreakdownData(categoryName, isSubcategory);
  const recent = getRecentData(categoryName);
  const strokeDashoffset = CIRC - (totalPct / 100) * CIRC;

  const handleBreakdownPress = (item: any) => {
    if (!isSubcategory) {
      // Drill down to subcategory
      navigation.push('CategoryDetail', {
        categoryName: item.name,
        spent: item.amt,
        totalPct: item.pct,
        isSubcategory: true,
        color, bg
      });
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={TEXT_DARK} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.headerIconWrap}>
          <Utensils size={18} color={color} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{categoryName}</Text>
          <Text style={s.headerSub}>{`All ${isSubcategory ? 'restaurant' : 'food related'} expenses`}</Text>
        </View>
        <TouchableOpacity style={s.monthPill}>
          <Text style={s.monthPillText}>May 2025</Text>
          <ChevronDown size={14} color={TEXT_MID} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Total Overview */}
        <View style={s.overviewCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.overviewLabel}>Total Spent</Text>
            <Text style={s.overviewAmt}>₹ {spent.toLocaleString('en-IN')}</Text>
            <View style={s.overviewSubBadge}>
              <Text style={s.overviewSubText}>{totalPct}% of {isSubcategory ? 'Food & Dining' : 'total expenses'}</Text>
            </View>
          </View>
          <View style={s.donutWrap}>
            <Svg width={DONUT_SZ} height={DONUT_SZ}>
              <Circle cx={DONUT_SZ / 2} cy={DONUT_SZ / 2} r={DONUT_R} fill="none" stroke={BORDER} strokeWidth={DONUT_SW} />
              <Circle cx={DONUT_SZ / 2} cy={DONUT_SZ / 2} r={DONUT_R} fill="none"
                stroke={color} strokeWidth={DONUT_SW} strokeLinecap="round"
                strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${DONUT_SZ/2} ${DONUT_SZ/2})`}
              />
            </Svg>
            <View style={s.donutCenter}>
              <Text style={s.donutPctText}>{totalPct}%</Text>
              <Text style={s.donutLbl}>of total</Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
        <Text style={s.sectionTitle}>{isSubcategory ? 'Top Places' : 'Breakdown'}</Text>
        <View style={s.listCard}>
          {breakdown.map((item, i) => {
            const Icon = item.Icon;
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[s.row, i < breakdown.length - 1 && s.rowBorder]}
                activeOpacity={isSubcategory ? 1 : 0.7}
                onPress={() => handleBreakdownPress(item)}
              >
                <View style={[s.iconBox, { backgroundColor: bg }]}>
                  <Icon size={16} color={color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={s.rowTitle}>{item.name}</Text>
                  <Text style={s.rowSub}>Transactions</Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 6 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.rowAmt}>₹ {item.amt}</Text>
                    <Text style={[s.rowPct, { color }]}>{item.pct}%</Text>
                  </View>
                  {!isSubcategory && <ChevronRight size={16} color={TEXT_LIGHT} strokeWidth={2} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Transactions */}
        <Text style={s.sectionTitle}>Recent Transactions</Text>
        <View style={s.listCard}>
          {recent.map((item, i) => {
            const Icon = item.Icon;
            return (
              <View key={item.id} style={[s.row, i < recent.length - 1 && s.rowBorder]}>
                <View style={[s.iconBox, { backgroundColor: bg }]}>
                  <Icon size={16} color={color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{item.title}</Text>
                  <Text style={s.rowSub}>{item.time}</Text>
                </View>
                <Text style={s.rowAmt}>₹ {item.amt}</Text>
              </View>
            );
          })}
        </View>

        {/* View All Button */}
        <TouchableOpacity 
          style={s.viewAllBtn} 
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TransactionsList', { categoryName, isSubcategory, spent })}
        >
          <Text style={[s.viewAllText, { color }]}>View All Transactions</Text>
          <ChevronRight size={18} color={color} strokeWidth={2.5} />
        </TouchableOpacity>
        
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
  headerIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  headerSub: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500', marginTop: 1 },
  monthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE,
  },
  monthPillText: { fontSize: 11, fontWeight: '600', color: TEXT_MID },

  scroll: { padding: 16 },
  
  overviewCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: BORDER,
  },
  overviewLabel: { fontSize: 12, fontWeight: '600', color: TEXT_MID, marginBottom: 4 },
  overviewAmt: { fontSize: 32, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.5, marginBottom: 12 },
  overviewSubBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: BLUE_SOFT },
  overviewSubText: { fontSize: 10, fontWeight: '700', color: BLUE },

  donutWrap: { position: 'relative', width: DONUT_SZ, height: DONUT_SZ, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutPctText: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  donutLbl: { fontSize: 9, color: TEXT_LIGHT, fontWeight: '600' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 12, marginLeft: 4 },
  
  listCard: {
    backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    marginBottom: 24, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 2 },
  rowSub: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  rowAmt: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  rowPct: { fontSize: 11, fontWeight: '700', textAlign: 'right', marginTop: 2 },

  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  viewAllText: { fontSize: 14, fontWeight: '700' },
});
