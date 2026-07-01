import React, { useState } from 'react';
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
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Users,
  UserPlus,
  Receipt,
  Trash2,
  Wallet,
  ArrowRight,
  Check,
  ChevronLeft,
  Briefcase,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useSplits, YOU_ID, Member } from '../hooks/useSplits';

const BLUE = '#2245D4';
const BLUE_DARK = '#1E3A8A';
const BLUE_SOFT = '#EEF2FF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#666666';
const BORDER = '#F1F5F9';
const BG = '#F8FAFD';
const SUCCESS = '#22C55E';
const SUCCESS_BG = '#DCFCE7';
const DANGER = '#EF4444';
const DANGER_BG = '#FEE2E2';

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

  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── HEADER ── */}
      <View style={styles.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft size={24} color={WHITE} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerGreeting}>Splits & Roommates</Text>
              <Text style={styles.headerSub}>Manage shared expenses</Text>
            </View>
            <TouchableOpacity style={styles.hBtn} onPress={confirmSettle}>
              <Check size={20} color={WHITE} />
              <Text style={styles.hBtnText}>Settle</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* ── SUMMARY CARD ── */}
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconWrap, { backgroundColor: youBalance > 0 ? SUCCESS_BG : youBalance < 0 ? DANGER_BG : BLUE_SOFT }]}>
            <Wallet size={32} color={youBalance > 0 ? SUCCESS : youBalance < 0 ? DANGER : BLUE} />
          </View>
          <Text style={styles.summaryLabel}>
            {youBalance > 0 ? 'You are owed' : youBalance < 0 ? 'You owe' : 'All settled up'}
          </Text>
          <Text style={[styles.summaryAmount, { color: youBalance > 0 ? SUCCESS : youBalance < 0 ? DANGER : TEXT_DARK }]}>
            ₹{Math.abs(youBalance).toFixed(0)}
          </Text>
          <View style={styles.summaryBadgeRow}>
            <View style={styles.summaryBadge}>
              <Receipt size={14} color={TEXT_MID} />
              <Text style={styles.summaryBadgeTxt}>{expenses.length} Expenses</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Users size={14} color={TEXT_MID} />
              <Text style={styles.summaryBadgeTxt}>{members.length} People</Text>
            </View>
          </View>
        </View>

        {/* ── BALANCES ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Roommate Balances</Text>
          <TouchableOpacity onPress={() => setShowMember(true)}>
            <Text style={styles.addBtnText}>+ Add Roommate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {balances.map((b, i) => (
            <View key={b.member.id} style={[styles.balRow, i > 0 && styles.divider]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{b.member.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.balName}>{b.member.id === YOU_ID ? 'You' : b.member.name}</Text>
                {b.net === 0 ? (
                  <Text style={styles.balStatus}>Settled</Text>
                ) : b.net > 0 ? (
                  <Text style={[styles.balStatus, { color: SUCCESS }]}>Gets ₹{b.net.toFixed(0)}</Text>
                ) : (
                  <Text style={[styles.balStatus, { color: DANGER }]}>Owes ₹{Math.abs(b.net).toFixed(0)}</Text>
                )}
              </View>
              {b.net !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {b.net > 0 && b.member.id !== YOU_ID && youBalance < 0 && (
                    <TouchableOpacity 
                      style={{ backgroundColor: '#2245D4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                      onPress={() => Linking.openURL(`upi://pay?pa=${b.member.name.toLowerCase()}@upi&pn=${b.member.name}&am=${b.net}`)}
                    >
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Pay UPI</Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.netIconBadge, { backgroundColor: b.net > 0 ? SUCCESS_BG : DANGER_BG }]}>
                    {b.net > 0 ? <ArrowDownLeft size={16} color={SUCCESS} /> : <ArrowUpRight size={16} color={DANGER} />}
                  </View>
                  {b.member.id !== YOU_ID && (
                    <TouchableOpacity onPress={() => removeMember(b.member.id)} style={{ padding: 4 }}>
                      <X size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
          {balances.length === 0 && (
            <Text style={styles.emptyTxt}>No roommates added yet.</Text>
          )}
        </View>

        {/* ── EXPENSES ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shared Expenses</Text>
        </View>

        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Briefcase size={32} color={BLUE} />
            </View>
            <Text style={styles.emptyTitle}>No shared expenses</Text>
            <Text style={styles.emptySub}>Add rent, groceries, or utilities to split them evenly among roommates.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openExpense}>
              <Plus size={18} color={WHITE} />
              <Text style={styles.primaryBtnTxt}>Add First Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            {expenses.map((e, i) => (
              <View key={e.id} style={[styles.expRow, i > 0 && styles.divider]}>
                <View style={styles.expIcon}>
                  <Receipt size={20} color={BLUE} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.expTitle}>{e.title}</Text>
                  <Text style={styles.expSub}>
                    {nameById(e.paidById)} paid · split {e.participantIds.length} ways
                  </Text>
                </View>
                <Text style={styles.expAmt}>₹{e.amount}</Text>
                <TouchableOpacity onPress={() => removeExpense(e.id)} style={{ padding: 8, marginLeft: 8 }}>
                  <Trash2 size={16} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* ── FLOATING ADD BTN ── */}
      {expenses.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openExpense} activeOpacity={0.8}>
          <Plus size={24} color={WHITE} />
        </TouchableOpacity>
      )}

      {/* ── ADD EXPENSE MODAL ── */}
      <Modal visible={showExpense} animationType="slide" transparent onRequestClose={() => setShowExpense(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Shared Expense</Text>
              <TouchableOpacity onPress={() => setShowExpense(false)} style={styles.closeBtn}>
                <X size={20} color={TEXT_MID} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.fieldLabel}>What for?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. WiFi, Groceries"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Paid by</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, paidById === m.id && styles.chipActive]}
                    onPress={() => setPaidById(m.id)}
                  >
                    <Text style={[styles.chipTxt, paidById === m.id && styles.chipTxtActive]}>
                      {m.id === YOU_ID ? 'You' : m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Split between</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {members.map(m => {
                  const active = participants.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleParticipant(m.id)}
                    >
                      {active && <Check size={14} color={WHITE} style={{ marginRight: 4 }} />}
                      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>
                        {m.id === YOU_ID ? 'You' : m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 32 }]}
                onPress={submitExpense}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnTxt}>Add Expense</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ADD MEMBER MODAL ── */}
      <Modal visible={showMember} animationType="fade" transparent onRequestClose={() => setShowMember(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centerWrap}>
          <View style={styles.dialog}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Roommate</Text>
              <TouchableOpacity onPress={() => setShowMember(false)}>
                <X size={20} color={TEXT_MID} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              placeholderTextColor="#94A3B8"
              value={memberName}
              onChangeText={setMemberName}
              autoFocus
            />
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={submitMember}>
              <Text style={styles.primaryBtnTxt}>Add Roommate</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerSection: { backgroundColor: BLUE, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerGreeting: { fontSize: 20, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  hBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  hBtnText: { color: WHITE, fontWeight: '600', fontSize: 13 },

  summaryCard: {
    backgroundColor: WHITE, borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    marginBottom: 24, borderWidth: 1, borderColor: BORDER,
  },
  summaryIconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  summaryLabel: { fontSize: 14, color: TEXT_MID, fontWeight: '600', marginBottom: 4 },
  summaryAmount: { fontSize: 40, fontWeight: '800', marginBottom: 16 },
  summaryBadgeRow: { flexDirection: 'row', gap: 12 },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  summaryBadgeTxt: { fontSize: 12, fontWeight: '600', color: TEXT_MID },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  addBtnText: { fontSize: 13, fontWeight: '600', color: BLUE },

  card: {
    backgroundColor: WHITE, borderRadius: 20, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    borderWidth: 1, borderColor: BORDER,
  },
  divider: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 12, paddingTop: 12 },
  emptyTxt: { textAlign: 'center', color: TEXT_MID, fontSize: 14, paddingVertical: 12 },

  balRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 16, fontWeight: '700', color: BLUE },
  balName: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  balStatus: { fontSize: 13, color: TEXT_MID, fontWeight: '500' },
  netIconBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  emptyCard: { backgroundColor: WHITE, borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', marginBottom: 24 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptySub: { fontSize: 14, color: TEXT_MID, textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  expRow: { flexDirection: 'row', alignItems: 'center' },
  expIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center' },
  expTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  expSub: { fontSize: 12, color: TEXT_MID },
  expAmt: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },

  fab: { position: 'absolute', bottom: 32, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.6)' },
  centerWrap: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.6)' },
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  dialog: { backgroundColor: WHITE, borderRadius: 24, padding: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 15, color: TEXT_DARK, fontWeight: '500' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
  chipTxt: { fontSize: 14, fontWeight: '600', color: TEXT_MID },
  chipTxtActive: { color: WHITE },

  primaryBtn: { backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
  primaryBtnTxt: { color: WHITE, fontSize: 16, fontWeight: '700' },
});
