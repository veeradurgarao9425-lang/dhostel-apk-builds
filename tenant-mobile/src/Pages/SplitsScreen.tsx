import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Wallet, Receipt, X, Check, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, SkeletonExpenseCard, EmptyState } from '../components/ui';
import { colors } from '../theme';
import { formatCurrency, relativeDay } from '../utils/format';
import { useSplits, YOU_ID } from '../hooks/useSplits';

export default function SplitsScreen() {
  const {
    loaded,
    members,
    expenses,
    balances,
    addMember,
    removeMember,
    addExpense,
    removeExpense,
  } = useSplits();

  // Drawer States
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'expense' | 'member'>('none');

  // Add Expense State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(YOU_ID);

  // Add Member State
  const [newMemberName, setNewMemberName] = useState('');

  const youBalance = balances.find((b) => b.member.id === YOU_ID)?.net ?? 0;
  const nameById = (id: string) => members.find((m) => m.id === id)?.name ?? '—';

  const submitExpense = () => {
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0) return;
    
    addExpense({ 
      title, 
      amount: amt, 
      paidById, 
      participantIds: members.map(m => m.id) 
    });
    
    setTitle('');
    setAmount('');
    setPaidById(YOU_ID);
    setActiveDrawer('none');
  };

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      addMember(newMemberName);
      setNewMemberName('');
      setActiveDrawer('none');
    }
  };

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <AppHeader title="Splits" subtitle="Roommate expenses" showBack={true} />
        <View style={{ padding: 16 }}>
          <SkeletonExpenseCard />
          <SkeletonExpenseCard />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <AppHeader title="Splits" subtitle="Manage Roommate Expenses" showBack={true} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Balances Summary Card */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={[styles.summaryCard, youBalance > 0 ? styles.summaryCardPositive : youBalance < 0 ? styles.summaryCardNegative : styles.summaryCardNeutral]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.summaryTitle}>
                  {youBalance > 0 ? 'You will get' : youBalance < 0 ? 'You will pay' : 'All settled up'}
                </Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(Math.abs(youBalance))}
                </Text>
              </View>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                {youBalance > 0 ? (
                  <ArrowDownLeft size={24} color="#FFF" />
                ) : youBalance < 0 ? (
                  <ArrowUpRight size={24} color="#FFF" />
                ) : (
                  <Wallet size={24} color="#FFF" />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Roommates & Balances */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Roommates</Text>
            <TouchableOpacity onPress={() => setActiveDrawer('member')} style={{ paddingVertical: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#2952F3' }}>+ Add Roommate</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.card}>
            {balances.map((b, i) => (
              <View key={b.member.id} style={[styles.row, i !== 0 && styles.divider]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.avatarSmall, { backgroundColor: b.member.id === YOU_ID ? '#2952F3' : '#E2E8F0' }]}>
                    <Text style={[styles.avatarTxtSmall, b.member.id !== YOU_ID && { color: '#64748B' }]}>
                      {b.member.id === YOU_ID ? 'Y' : b.member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginLeft: 12 }}>
                    {b.member.id === YOU_ID ? 'You' : b.member.name}
                  </Text>
                </View>
                <View style={[styles.settledBadge, b.net > 0 && { backgroundColor: '#ECFDF5' }, b.net < 0 && { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.settledBadgeTxt, b.net > 0 && { color: '#059669' }, b.net < 0 && { color: '#DC2626' }]}>
                    {b.net === 0 ? 'Settled' : b.net > 0 ? `To get ${formatCurrency(b.net)}` : `To pay ${formatCurrency(Math.abs(b.net))}`}
                  </Text>
                </View>
                {b.member.id !== YOU_ID && b.net === 0 && (
                  <TouchableOpacity onPress={() => removeMember(b.member.id)} style={{ padding: 4, marginLeft: 8 }}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Recent Expenses List */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity 
              style={styles.smallAddBtn}
              onPress={() => setActiveDrawer('expense')}
            >
              <Plus size={16} color="#FFF" />
              <Text style={styles.smallAddBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>

          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              message="Start sharing bills with your roommates."
            />
          ) : (
            <View style={styles.card}>
              {expenses.map((e, i) => (
                <View key={e.id} style={[styles.row, i !== 0 && styles.divider]}>
                  <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                    <View style={styles.expIcon}>
                      <Receipt size={18} color="#64748B" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.expTitle}>{e.title}</Text>
                      <Text style={styles.expSub}>
                        Paid by {nameById(e.paidById)} • {relativeDay(e.date)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                    <Text style={styles.expAmt}>{formatCurrency(e.amount)}</Text>
                    <TouchableOpacity onPress={() => removeExpense(e.id)} style={{ padding: 4, marginTop: 2 }}>
                      <Text style={{ fontSize: 11, color: colors.danger, fontWeight: '700' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Bottom Drawer for Add Expense */}
      <Modal visible={activeDrawer === 'expense'} transparent animationType="slide" onRequestClose={() => setActiveDrawer('none')}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActiveDrawer('none')} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.sheetTitle}>Add Expense</Text>
                <TouchableOpacity onPress={() => setActiveDrawer('none')} style={{ padding: 4 }}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>What was this for?</Text>
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                placeholder="e.g. Dinner, Rent, WiFi"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
              
              <Text style={styles.inputLabel}>Total Amount (₹)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 20 }]}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Who Paid?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }}>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, paidById === m.id && styles.chipActive]}
                    onPress={() => setPaidById(m.id)}
                  >
                    <View style={[styles.avatarMicro, paidById === m.id ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#E2E8F0' }]}>
                       <Text style={[styles.avatarMicroTxt, paidById === m.id && { color: '#FFF' }]}>
                         {m.id === YOU_ID ? 'Y' : m.name.charAt(0).toUpperCase()}
                       </Text>
                    </View>
                    <Text style={[styles.chipTxt, paidById === m.id && styles.chipTxtActive]}>
                      {m.id === YOU_ID ? 'You' : m.name}
                    </Text>
                    {paidById === m.id && <Check size={14} color="#FFF" style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={[styles.primaryBtnLarge, (!title.trim() || !(parseFloat(amount) > 0)) && { opacity: 0.5 }]}
                onPress={submitExpense}
                disabled={!title.trim() || !(parseFloat(amount) > 0)}
              >
                <Text style={styles.primaryBtnLargeTxt}>Split Equally</Text>
              </TouchableOpacity>
              <SafeAreaView edges={['bottom']} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bottom Drawer for Add Member */}
      <Modal visible={activeDrawer === 'member'} transparent animationType="slide" onRequestClose={() => setActiveDrawer('none')}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActiveDrawer('none')} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.sheetTitle}>Add Roommate</Text>
                <TouchableOpacity onPress={() => setActiveDrawer('none')} style={{ padding: 4 }}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={[styles.input, { marginBottom: 20 }]}
                placeholder="e.g. Rahul"
                placeholderTextColor="#9CA3AF"
                value={newMemberName}
                onChangeText={setNewMemberName}
                autoFocus
              />
              
              <TouchableOpacity 
                style={[styles.primaryBtnLarge, (!newMemberName.trim()) && { opacity: 0.5 }]}
                onPress={handleAddMember}
                disabled={!newMemberName.trim()}
              >
                <Text style={styles.primaryBtnLargeTxt}>Add to Splits</Text>
              </TouchableOpacity>
              <SafeAreaView edges={['bottom']} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  
  // Summary Card
  summaryCard: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  summaryCardPositive: { backgroundColor: '#10B981' }, 
  summaryCardNegative: { backgroundColor: '#EF4444' }, 
  summaryCardNeutral: { backgroundColor: '#6366F1' },  
  summaryTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  summaryAmount: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 2, letterSpacing: -1 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  // List Cards
  card: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, minHeight: 64 },
  divider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  avatarSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarTxtSmall: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  settledBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  settledBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  expIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  expTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  expSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  expAmt: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  // Small Add Button
  smallAddBtn: { flexDirection: 'row', backgroundColor: '#2952F3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignItems: 'center' },
  smallAddBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '700', marginLeft: 4 },

  // Bottom Sheet Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginLeft: 2 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
  
  primaryBtnLarge: { backgroundColor: '#2952F3', height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  primaryBtnLargeTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 10, paddingRight: 14, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#2952F3', borderColor: '#2952F3' },
  chipTxt: { fontSize: 14, fontWeight: '600', color: '#475569', marginLeft: 6 },
  chipTxtActive: { color: '#FFF' },
  avatarMicro: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  avatarMicroTxt: { fontSize: 10, fontWeight: '700', color: '#64748B' },
});
