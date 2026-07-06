import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Plus,
  X,
  Users,
  UserPlus,
  Receipt,
  Trash2,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Card, SectionHeader, Pill, Button, EmptyState, Avatar } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { formatCurrency, relativeDay } from '../utils/format';
import { useSplits, YOU_ID, Member } from '../hooks/useSplits';

function MemberChips({
  members,
  selected,
  onPress,
  multi,
}: {
  members: Member[];
  selected: string[];
  onPress: (id: string) => void;
  multi?: boolean;
}) {
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {members.map((m) => {
        const active = selected.includes(m.id);
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.memberRowItem, active && styles.memberRowItemActive]}
            onPress={() => onPress(m.id)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
               <View style={[styles.avatar, { backgroundColor: m.id === YOU_ID ? '#8B5CF6' : '#E2E8F0' }]}>
                 <Text style={styles.avatarTxt}>{m.id === YOU_ID ? 'Y' : m.name.charAt(0).toUpperCase()}</Text>
               </View>
               <Text style={styles.memberRowName}>{m.id === YOU_ID ? 'You' : m.name}</Text>
            </View>
            <View style={[styles.checkbox, active && styles.checkboxActive]}>
               {active && <Check size={14} color="#FFF" strokeWidth={3} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SplitsScreen({ navigation }: any) {
  const { user } = useAuth();
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

  const [showExpense, setShowExpense] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [memberName, setMemberName] = useState('');

  // Expense form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(YOU_ID);
  const [participants, setParticipants] = useState<string[]>(members.map((m) => m.id));

  const youBalance = balances.find((b) => b.member.id === YOU_ID)?.net ?? 0;
  const nameById = (id: string) => members.find((m) => m.id === id)?.name ?? '—';

  const openExpense = () => {
    setTitle('');
    setAmount('');
    setPaidById(YOU_ID);
    setParticipants(members.map((m) => m.id));
    setShowExpense(true);
  };

  const toggleParticipant = (id: string) =>
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const submitExpense = () => {
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0 || participants.length === 0) return;
    addExpense({ title, amount: amt, paidById, participantIds: participants });
    setShowExpense(false);
  };

  const submitMember = () => {
    addMember(memberName);
    setMemberName('');
    setShowMember(false);
  };

  const confirmSettle = () =>
    Alert.alert('Settle up', 'Clear all expenses and reset balances to zero?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle all', style: 'destructive', onPress: settleAll },
    ]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}><View /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      
      {/* ── HEADER ── */}
      <View style={styles.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
             <Text style={styles.headerTitle}>Splits</Text>
             <Text style={styles.headerSub}>Roommate expenses</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Summary Card */}
        <View style={{ paddingHorizontal: 20, marginTop: -32, zIndex: 11 }}>
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
              <View style={styles.walletIconWrap}>
                <Wallet size={24} color="#2952F3" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>
                  {youBalance > 0 ? 'You receive' : youBalance < 0 ? 'You pay' : 'All settled up'}
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginTop: 2 }}>
                  {formatCurrency(Math.abs(youBalance))}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '500' }}>
                {expenses.length} expense{expenses.length === 1 ? '' : 's'}
              </Text>
              <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: 4 }}>
                {members.length} roommate{members.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </View>

        {/* Per-person balances */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 }}>Balances</Text>
          <View style={styles.listCard}>
            {balances.map((b, i) => (
              <View key={b.member.id} style={[styles.balanceRow, i !== 0 && styles.divider]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.avatarSmall, { backgroundColor: b.member.id === YOU_ID ? '#8B5CF6' : '#E2E8F0' }]}>
                    <Text style={styles.avatarTxtSmall}>{b.member.id === YOU_ID ? 'Y' : b.member.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 12 }}>
                    {b.member.id === YOU_ID ? 'You' : b.member.name}
                  </Text>
                </View>
                <View style={styles.settledBadge}>
                   <Text style={styles.settledBadgeTxt}>
                     {b.net === 0 ? 'settled' : b.net > 0 ? `gets ${formatCurrency(b.net)}` : `owes ${formatCurrency(Math.abs(b.net))}`}
                   </Text>
                </View>
                {b.member.id !== YOU_ID && b.net === 0 && (
                  <TouchableOpacity onPress={() => removeMember(b.member.id)} style={{ padding: 4, marginLeft: 8 }}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            {/* Add Roommate Row */}
            <TouchableOpacity style={[styles.balanceRow, styles.divider]} onPress={() => setShowMember(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.avatarSmall, { backgroundColor: '#EEF2FF' }]}>
                    <UserPlus size={20} color="#2952F3" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#2952F3', marginLeft: 12 }}>Add roommate</Text>
                </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expenses list */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
             <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A' }}>Shared expenses</Text>
             <TouchableOpacity onPress={openExpense}>
               <Text style={{ fontSize: 14, fontWeight: '700', color: '#2952F3' }}>+ Add roommate expenses</Text>
             </TouchableOpacity>
          </View>
          
          {expenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Receipt size={40} color="#2952F3" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginTop: 16 }}>No shared expenses yet</Text>
              <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: '85%' }}>
                Add groceries, water cans, WiFi or snacks and we'll split them evenly across roommates.
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {expenses.map((e, i) => (
                <View key={e.id} style={[styles.expenseRow, i !== 0 && styles.divider]}>
                  <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                    <View style={styles.expIcon}>
                      <Receipt size={20} color={colors.primary} />
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
                    <TouchableOpacity onPress={() => removeExpense(e.id)} style={{ padding: 4, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.danger, fontWeight: '600' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.hugeCta} onPress={openExpense} activeOpacity={0.85}>
            <Plus size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.hugeCtaTxt}>Add roommate expense</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            Roommate splits are shared with your room. Personal expenses are tracked in the main Expenses tab.
          </Text>

        </View>
      </ScrollView>

      {/* Add expense modal */}
      <Modal visible={showExpense} animationType="slide" transparent={false} onRequestClose={() => setShowExpense(false)}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity onPress={() => setShowExpense(false)} hitSlop={10} style={{ padding: 8 }}>
                <ArrowLeft size={24} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.fullScreenTitle}>Add Expense</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
              <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                <View style={styles.hugeReceiptIcon}>
                  <Receipt size={40} color="#2952F3" />
                </View>
                <Text style={styles.fieldLabelCentered}>What is this expense for?</Text>
                <TextInput
                  style={styles.inputLargeCenter}
                  placeholder="e.g. Dinner, Rent, Grocery"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                  textAlign="center"
                />
              </View>

              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Text style={styles.fieldLabelCentered}>Total Amount</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: '#1A1A1A', marginRight: 8 }}>₹</Text>
                  <TextInput
                    style={styles.inputAmountCenter}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={styles.fieldLabelLeft}>Paid by</Text>
                <MemberChips members={members} selected={[paidById]} onPress={(id) => setPaidById(id)} />
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={styles.fieldLabelLeft}>Split between</Text>
                <MemberChips members={members} selected={participants} onPress={toggleParticipant} multi />
              </View>

              {parseFloat(amount) > 0 && participants.length > 0 && (
                <View style={{ backgroundColor: '#EEF2FF', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 16 }}>
                   <Text style={{ fontSize: 13, color: '#2952F3', fontWeight: '700' }}>Each person pays</Text>
                   <Text style={{ fontSize: 28, color: '#2952F3', fontWeight: '800', marginTop: 4 }}>
                     {formatCurrency(parseFloat(amount) / participants.length)}
                   </Text>
                </View>
              )}
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingVertical: 24, backgroundColor: '#FFF' }}>
              <TouchableOpacity
                style={[styles.primaryBtnLarge, (!title.trim() || !(parseFloat(amount) > 0) || participants.length === 0) && { backgroundColor: '#8B93F0' }]}
                onPress={submitExpense}
                disabled={!title.trim() || !(parseFloat(amount) > 0) || participants.length === 0}
              >
                <Text style={styles.primaryBtnLargeTxt}>Continue</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add member modal */}
      <Modal visible={showMember} animationType="fade" transparent onRequestClose={() => setShowMember(false)}>
        <View style={styles.centerWrap}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.dialog}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Add roommate</Text>
                <TouchableOpacity onPress={() => setShowMember(false)} hitSlop={8}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor={colors.textSubtle}
                value={memberName}
                onChangeText={setMemberName}
                autoFocus
              />
              <Button
                title="Add Roommate"
                variant="primary"
                onPress={submitMember}
                style={{ marginTop: spacing.xl }}
                disabled={!memberName.trim()}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Home Header
  headerSection: { backgroundColor: '#1E3A8A' },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 16 },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 },

  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  walletIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },

  listCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', padding: 16, height: 64 },
  divider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  
  avatarSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarTxtSmall: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  settledBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  settledBadgeTxt: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },

  expenseRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  expIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  expTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  expSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  expAmt: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  hugeCta: { flexDirection: 'row', backgroundColor: '#2952F3', borderRadius: 28, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  hugeCtaTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  footerText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16, paddingHorizontal: 16, lineHeight: 18 },

  // Add Expense Full Screen Modal Styles
  fullScreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  fullScreenTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  
  hugeReceiptIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  
  fieldLabelCentered: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  fieldLabelLeft: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8, marginLeft: 16 },
  inputLargeCenter: { fontSize: 16, color: '#1A1A1A', fontWeight: '600', height: 56, backgroundColor: '#F5F6FA', borderRadius: 16, width: '100%', paddingHorizontal: 20, textAlign: 'center' },
  inputAmountCenter: { fontSize: 40, fontWeight: '800', color: '#64748B', minWidth: 100, textAlign: 'center' },
  
  primaryBtnLarge: { backgroundColor: '#2952F3', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  primaryBtnLargeTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Member Row Items
  memberRowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', height: 64 },
  memberRowItemActive: { borderColor: '#818CF8', backgroundColor: '#EEF2FF' },
  memberRowName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#2952F3', borderColor: '#2952F3' },

  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Legacy Modal styles
  centerWrap: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.45)' },
  dialog: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, fontSize: 16, color: '#1A1A1A' },
});
