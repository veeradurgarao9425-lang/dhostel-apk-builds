import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppHeader, EmptyState } from '../components/ui';
import { useSplits } from '../hooks/useSplits';
import { formatCurrency, relativeDay } from '../utils/format';
import { colors } from '../theme';
import { Receipt } from 'lucide-react-native';
import { ConfirmationDialog } from '../components/UIComponents';

export default function SplitHistoryScreen() {
  const { expenses, members, removeExpense } = useSplits();
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  const categories = ['All', ...Array.from(new Set(expenses.map(e => e.title)))];
  const filteredExpenses = expenses.filter(e => activeTab === 'All' || e.title === activeTab);

  const nameById = (id: string) => members.find((m) => m.id === id)?.name ?? '—';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <AppHeader title="Split History" showBack />
      
      {/* Category Tabs */}
      {expenses.length > 0 && (
        <View style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
            {categories.map(cat => {
              const isActive = activeTab === cat;
              return (
                <TouchableOpacity 
                  key={cat} 
                  onPress={() => setActiveTab(cat)}
                  style={{ 
                    backgroundColor: isActive ? '#2952F3' : '#F8FAFC', 
                    paddingHorizontal: 16, 
                    paddingVertical: 8, 
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isActive ? '#2952F3' : '#E2E8F0'
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: isActive ? '#FFF' : '#64748B', fontWeight: isActive ? '700' : '600', fontSize: 13 }}>
                    {cat === 'Payment' ? '💸 Payments' : cat}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Expenses Yet"
            description="Add an expense on the Splits screen to see it here."
          />
        ) : (
          filteredExpenses.map((e, i) => (
            <View key={e.id} style={[styles.expCard, i !== 0 && { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconCircle}>
                    <Receipt size={18} color="#2952F3" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.expTitle}>{e.title}</Text>
                    <Text style={styles.expSub}>
                      Paid by {nameById(e.paidById)} • {relativeDay(e.date)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                    <Text style={styles.expAmt}>{formatCurrency(e.amount)}</Text>
                    <TouchableOpacity 
                      onPress={() => setDeleteExpenseId(e.id)} 
                      style={{ padding: 8, marginTop: 2, marginRight: -8 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '700' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <ConfirmationDialog
        visible={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        type="danger"
        title="Remove Expense"
        description="Are you sure you want to remove this expense? This action cannot be undone and will recalculate all balances."
        primaryAction={{ 
          label: 'Remove', 
          onPress: () => {
            if (deleteExpenseId) removeExpense(deleteExpenseId);
            setDeleteExpenseId(null);
          }
        }}
        secondaryAction={{ label: 'Cancel', onPress: () => setDeleteExpenseId(null) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  expCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(41, 82, 243, 0.1)', justifyContent: 'center', alignItems: 'center' },
  expTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  expSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  expAmt: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
});
