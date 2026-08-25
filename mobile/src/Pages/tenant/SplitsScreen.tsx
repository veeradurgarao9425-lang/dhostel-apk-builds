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
import { Wallet, Receipt, X, Check, Plus, ArrowDownLeft, ArrowUpRight, UserPlus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, SkeletonExpenseCard, EmptyState } from '../../components/tenant/ui';
import { BaseBottomSheet, ConfirmationDialog } from '../../components/tenant/UIComponents';
import { colors } from '../../theme/tenantTheme';
import { formatCurrency, relativeDay } from '../../utils/format';
import { useSplits, YOU_ID } from '../../hooks/useSplits';

export default function SplitsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    loaded,
    members,
    expenses,
    balances,
    addMember,
    removeMember,
    addExpense,
    removeExpense,
    settleAll,
  } = useSplits();

  // Drawer States
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'expense' | 'member'>('none');

  // Add Expense State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(YOU_ID);

  // Add Member State
  const [newMemberName, setNewMemberName] = useState('');

  // Settle State
  const [settleMember, setSettleMember] = useState<any>(null);

  // Delete States
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);

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

  const executeSettle = () => {
    if (!settleMember) return;
    if (settleMember.net < 0) {
      addExpense({ title: 'Payment', amount: Math.abs(settleMember.net), paidById: settleMember.member.id, participantIds: [YOU_ID] });
    } else {
      addExpense({ title: 'Payment', amount: settleMember.net, paidById: YOU_ID, participantIds: [settleMember.member.id] });
    }
    setSettleMember(null);
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Roommates</Text>
            <TouchableOpacity onPress={() => setActiveDrawer('member')} style={styles.pillBtn} activeOpacity={0.7}>
              <UserPlus size={16} color="#2952F3" strokeWidth={2.5} />
              <Text style={styles.pillBtnTxt}>Add</Text>
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
                {b.member.id !== YOU_ID && b.net !== 0 && (
                  <TouchableOpacity onPress={() => setSettleMember(b)} style={{ backgroundColor: '#2952F3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginLeft: 8 }}>
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Settle</Text>
                  </TouchableOpacity>
                )}
                {b.member.id !== YOU_ID && b.net === 0 && (
                  <TouchableOpacity 
                    onPress={() => setDeleteMemberId(b.member.id)} 
                    style={{ padding: 8, marginLeft: 8 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Recent Expenses List */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            {expenses.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('SplitHistory' as never)}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2952F3' }}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Add an expense to start splitting with your roommates."
            />
          ) : (
            <View style={{ gap: 12 }}>
              {expenses.slice(0, 5).map((e, i) => {
                const iconColors = ['#6D4AFF', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899'];
                const itemColor = iconColors[e.title.length % iconColors.length];
                
                return (
                  <View key={e.id} style={[styles.card, { padding: 14, flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                      <View style={[styles.expIcon, { backgroundColor: itemColor + '1A' }]}>
                        <Receipt size={22} color={itemColor} strokeWidth={2.2} />
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
                      <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 }}>
                        {e.participantIds.length > 1 ? `Split ${e.participantIds.length}` : 'Payment'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Floating Action Button for Add Expense */}
      <TouchableOpacity 
        style={[
          styles.fab,
          {
            bottom: Math.max(insets.bottom + 85, 100),
          },
        ]}
        onPress={() => setActiveDrawer('expense')}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#FFF" strokeWidth={2.8} />
      </TouchableOpacity>

      {/* Bottom Drawer for Add Expense */}
      <BaseBottomSheet visible={activeDrawer === 'expense'} onClose={() => setActiveDrawer('none')}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 550 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.sheetTitle}>Add Expense</Text>
                <TouchableOpacity 
                  onPress={() => setActiveDrawer('none')} 
                  style={{ padding: 8, marginRight: -8 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>What was this for?</Text>
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                placeholder="e.g. Dinner, Rent, WiFi"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
                {['🍔 Food', '🚕 Travel', '🏠 Rent', '🛒 Groceries', '📶 WiFi', '🎬 Movies', '⚡ Electricity', '💧 Water', '💊 Meds', '👔 Clothes', '🍕 Snacks', '🎉 Party'].map(cat => {
                  // We remove emojis just to check if it's strictly equivalent, but setting it sets the whole string.
                  const isActive = title === cat;
                  return (
                    <TouchableOpacity 
                      key={cat}
                      style={[styles.catChip, isActive && styles.catChipActive]}
                      onPress={() => setTitle(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.catChipTxt, isActive && styles.catChipTxtActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
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
        </ScrollView>
      </BaseBottomSheet>

      {/* Bottom Drawer for Add Member */}
      <BaseBottomSheet visible={activeDrawer === 'member'} onClose={() => setActiveDrawer('none')}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.sheetTitle}>Add Roommate</Text>
                <TouchableOpacity 
                  onPress={() => setActiveDrawer('none')} 
                  style={{ padding: 8, marginRight: -8 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color="#64748B" />
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
        </ScrollView>
      </BaseBottomSheet>

      <ConfirmationDialog
        visible={!!settleMember}
        onClose={() => setSettleMember(null)}
        type="success"
        title="Settle Up"
        description={
          settleMember?.net < 0
            ? `Did ${settleMember.member.name} pay you ${formatCurrency(Math.abs(settleMember.net))}?`
            : `Did you pay ${settleMember?.member.name} ${formatCurrency(settleMember?.net || 0)}?`
        }
        primaryAction={{ label: 'Confirm Payment', onPress: executeSettle }}
        secondaryAction={{ label: 'Cancel', onPress: () => setSettleMember(null) }}
      />
      
      <ConfirmationDialog
        visible={!!deleteMemberId}
        onClose={() => setDeleteMemberId(null)}
        type="danger"
        title="Remove Roommate"
        description="Are you sure you want to remove this roommate from the group?"
        primaryAction={{ 
          label: 'Remove', 
          onPress: () => {
            if (deleteMemberId) removeMember(deleteMemberId);
            setDeleteMemberId(null);
          }
        }}
        secondaryAction={{ label: 'Cancel', onPress: () => setDeleteMemberId(null) }}
      />
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

  expIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(109, 74, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  expTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  expSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  expAmt: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  // Buttons
  pillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(41, 82, 243, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pillBtnTxt: { fontSize: 13, fontWeight: '700', color: '#2952F3', marginLeft: 6 },
  
  fab: { position: 'absolute', bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2952F3', justifyContent: 'center', alignItems: 'center', shadowColor: '#2952F3', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 12, zIndex: 99999 },

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
  
  catChip: { backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  catChipActive: { backgroundColor: 'rgba(41, 82, 243, 0.1)', borderColor: '#2952F3' },
  catChipTxt: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catChipTxtActive: { color: '#2952F3', fontWeight: '700' },
});
