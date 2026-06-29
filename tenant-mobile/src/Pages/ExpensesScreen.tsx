import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, CheckCircle, Clock, AlertCircle, ShoppingBag, Utensils,
  Car, Coffee, Film, MoreHorizontal, Plus
} from 'lucide-react-native';

const { width: W } = Dimensions.get('window');
const BLUE = '#2245D4';
const WHITE = '#FFFFFF';

// Dummy data matching previous structure
const SAMPLE_EXPENSES = [
  { id: '1', title: 'Lunch at Cafe', amount: 350, category: 'Food', date: '09 Jun 2025' },
  { id: '2', title: 'Uber to College', amount: 120, category: 'Travel', date: '08 Jun 2025' },
  { id: '3', title: 'Stationery', amount: 450, category: 'Shopping', date: '05 Jun 2025' },
];

const CAT: Record<string, { icon: any; color: string; bg: string }> = {
  Food: { icon: Utensils, color: '#EF4444', bg: '#FEE2E2' },
  Travel: { icon: Car, color: '#3B82F6', bg: '#EFF6FF' },
  Shopping: { icon: ShoppingBag, color: '#10B981', bg: '#D1FAE5' },
  'Tea/Coffee': { icon: Coffee, color: '#F59E0B', bg: '#FEF3C7' },
  Entertainment: { icon: Film, color: '#8B5CF6', bg: '#EDE9FE' },
  Other: { icon: MoreHorizontal, color: '#64748B', bg: '#F1F5F9' },
};

export default function ExpensesScreen({ navigation }: any) {
  const [expenses, setExpenses] = useState(SAMPLE_EXPENSES);
  const [total, setTotal] = useState(920);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Blue Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.headerWrap}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerGreeting}>My Expenses</Text>
              <Text style={styles.headerSub}>Track your daily spending</Text>
            </View>
            <TouchableOpacity style={styles.hBtn} onPress={() => navigation.navigate('Notifications')}>
              <Bell size={20} color={WHITE} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* ── Quick Stats Bar ──────────────────────────────────────────────────────── */}
        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <AlertCircle size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>₹{total}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <Plus size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.statLabel}>Add New</Text>
              <Text style={[styles.statValue, { fontSize: 15, color: '#EF4444' }]}>Expense</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Recent Expenses ──────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.listWrapper}>
            {expenses.map((item, i) => {
              const catConf = CAT[item.category] || CAT.Other;
              const Icon = catConf.icon;
              return (
                <View key={item.id} style={styles.expenseCard}>
                  <View style={[styles.iconBg, { backgroundColor: catConf.bg }]}>
                    <Icon size={20} color={catConf.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseTitle}>{item.title}</Text>
                    <Text style={styles.expenseDate}>{item.date}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>-₹{item.amount}</Text>
                </View>
              );
            })}
          </View>
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
  
  statsBar: {
    flexDirection: 'row', backgroundColor: WHITE, marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  statBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  statValue: { fontSize: 16, color: '#0F172A', fontWeight: '800', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  listWrapper: { gap: 10 },
  expenseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  iconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expenseTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  expenseDate: { fontSize: 13, color: '#64748B' },
  expenseAmount: { fontSize: 16, fontWeight: '800', color: '#EF4444' },
});
