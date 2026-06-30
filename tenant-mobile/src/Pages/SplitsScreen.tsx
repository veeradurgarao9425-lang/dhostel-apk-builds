import React, { useMemo, useState } from 'react';
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
  Check,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Screen, AppHeader, Card, SectionHeader, Pill, Button, EmptyState, Avatar } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { formatCurrency, relativeDay } from '../utils/format';
import { useSplits, YOU_ID, Member } from '../hooks/useSplits';

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

  if (!loaded) return <Screen><View /></Screen>;

  return (
    <Screen>
      <AppHeader
        eyebrow="Roommate expenses"
        title="Splits"
        name={user?.name}
        onPressBell={() => navigation.navigate('Notifications')}
        onPressAvatar={() => navigation.navigate('Profile')}
      />

      {/* Your net summary */}
      <Card style={styles.summary}>
        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor:
                youBalance > 0 ? colors.successSoft : youBalance < 0 ? colors.dangerSoft : colors.primarySoft,
            },
          ]}
        >
          <Wallet
            size={24}
            color={youBalance > 0 ? colors.success : youBalance < 0 ? colors.danger : colors.primary}
          />
        </View>
        <Text style={styles.summaryLabel}>
          {youBalance > 0 ? 'You are owed' : youBalance < 0 ? 'You owe' : 'All settled up'}
        </Text>
        <Text
          style={[
            styles.summaryAmount,
            { color: youBalance > 0 ? colors.success : youBalance < 0 ? colors.danger : colors.text },
          ]}
        >
          {formatCurrency(Math.abs(youBalance))}
        </Text>
        <Text style={styles.summarySub}>
          {expenses.length} expense{expenses.length === 1 ? '' : 's'} · {members.length} people
        </Text>
      </Card>

      {/* Per-person balances */}
      <SectionHeader
        title="Who owes what"
        actionLabel={expenses.length ? 'Settle up' : undefined}
        onPressAction={confirmSettle}
      />
      <Card padded={false}>
        {balances.map((b, i) => (
          <View key={b.member.id} style={[styles.balRow, i > 0 && styles.divider]}>
            <Avatar name={b.member.name} size={36} />
            <Text style={styles.balName}>{b.member.id === YOU_ID ? 'You' : b.member.name}</Text>
            <View style={{ flex: 1 }} />
            {b.net === 0 ? (
              <Pill label="settled" tone="default" />
            ) : b.net > 0 ? (
              <Text style={[styles.balAmt, { color: colors.success }]}>
                gets {formatCurrency(b.net)}
              </Text>
            ) : (
              <Text style={[styles.balAmt, { color: colors.danger }]}>
                owes {formatCurrency(Math.abs(b.net))}
              </Text>
            )}
            {b.member.id !== YOU_ID && (
              <TouchableOpacity onPress={() => removeMember(b.member.id)} hitSlop={8} style={styles.removeBtn}>
                <X size={14} color={colors.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addMemberRow} onPress={() => setShowMember(true)} activeOpacity={0.7}>
          <View style={styles.addMemberIcon}>
            <UserPlus size={18} color={colors.primary} />
          </View>
          <Text style={styles.addMemberText}>Add roommate</Text>
        </TouchableOpacity>
      </Card>

      {/* Expenses */}
      <SectionHeader title="Shared expenses" />
      {expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title="No shared expenses yet"
            message="Add groceries, water cans, WiFi or snacks and we'll split them evenly across roommates."
          />
        </Card>
      ) : (
        <Card padded={false}>
          {expenses.map((e, i) => (
            <View key={e.id} style={[styles.expRow, i > 0 && styles.divider]}>
              <View style={styles.expIcon}>
                <Receipt size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.expTitle}>{e.title}</Text>
                <Text style={styles.expSub}>
                  {nameById(e.paidById)} paid · {relativeDay(e.date)} · split {e.participantIds.length} ways
                </Text>
              </View>
              <Text style={styles.expAmt}>{formatCurrency(e.amount)}</Text>
              <TouchableOpacity onPress={() => removeExpense(e.id)} hitSlop={8} style={styles.removeBtn}>
                <Trash2 size={15} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      <View style={{ height: spacing.lg }} />
      <Button title="Add expense" icon={Plus} onPress={openExpense} />
      <Text style={styles.note}>Expenses are stored on your device only.</Text>

      {/* Add expense modal */}
      <Modal visible={showExpense} animationType="slide" transparent onRequestClose={() => setShowExpense(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add expense</Text>
              <TouchableOpacity onPress={() => setShowExpense(false)} hitSlop={10}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>What for?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Groceries, Water can"
                placeholderTextColor={colors.textSubtle}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textSubtle}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Paid by</Text>
              <MemberChips members={members} selected={[paidById]} onPress={(id) => setPaidById(id)} />

              <Text style={styles.fieldLabel}>Split between</Text>
              <MemberChips members={members} selected={participants} onPress={toggleParticipant} multi />

              {parseFloat(amount) > 0 && participants.length > 0 && (
                <Text style={styles.perHead}>
                  {formatCurrency(parseFloat(amount) / participants.length)} per person
                </Text>
              )}

              <Button
                title="Add expense"
                onPress={submitExpense}
                disabled={!title.trim() || !(parseFloat(amount) > 0) || participants.length === 0}
                style={{ marginTop: spacing.lg }}
              />
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add member modal */}
      <Modal visible={showMember} animationType="fade" transparent onRequestClose={() => setShowMember(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centerWrap}>
          <View style={styles.dialog}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add roommate</Text>
              <TouchableOpacity onPress={() => setShowMember(false)} hitSlop={10}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Roommate's name"
              placeholderTextColor={colors.textSubtle}
              value={memberName}
              onChangeText={setMemberName}
              autoFocus
            />
            <Button title="Add" onPress={submitMember} disabled={!memberName.trim()} style={{ marginTop: spacing.lg }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

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
    <View style={styles.chipRow}>
      {members.map((m) => {
        const active = selected.includes(m.id);
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onPress(m.id)}
            activeOpacity={0.8}
          >
            {multi && active && <Check size={14} color="#fff" />}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {m.id === YOU_ID ? 'You' : m.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: { fontSize: font.small, color: colors.textMuted },
  summaryAmount: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginVertical: 2 },
  summarySub: { fontSize: font.small, color: colors.textSubtle },

  balRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  balName: { fontSize: font.body, fontWeight: '600', color: colors.text },
  balAmt: { fontSize: font.small, fontWeight: '700' },
  removeBtn: { padding: 4 },
  addMemberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addMemberIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberText: { fontSize: font.body, fontWeight: '600', color: colors.primary },

  expRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  expIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expTitle: { fontSize: font.body, fontWeight: '600', color: colors.text },
  expSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  expAmt: { fontSize: font.body, fontWeight: '700', color: colors.text },

  note: { fontSize: font.small, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.md },

  // Modals
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  centerWrap: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.xl,
    maxHeight: '88%',
  },
  dialog: { backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.xl },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  fieldLabel: { fontSize: font.small, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: font.body,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.small, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#fff' },
  perHead: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
});
