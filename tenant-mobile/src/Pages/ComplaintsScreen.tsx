import React, { useState } from 'react';
import {
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
  Wrench,
  X,
  CheckCircle2,
  Clock,
  Loader,
  Zap,
  Droplets,
  Wifi,
  Sparkles,
  Sofa,
  MoreHorizontal,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Screen, AppHeader, Card, Pill, Button, EmptyState } from '../components/ui';
import type { Tone } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { formatDate, relativeDay } from '../utils/format';
import { sampleComplaints, Complaint } from '../data/tenantContent';

const statusMeta: Record<Complaint['status'], { tone: Tone; icon: any }> = {
  Open: { tone: 'danger', icon: Clock },
  'In Progress': { tone: 'warning', icon: Loader },
  Resolved: { tone: 'success', icon: CheckCircle2 },
};

const categories: { key: Complaint['category']; icon: any }[] = [
  { key: 'Electrical', icon: Zap },
  { key: 'Plumbing', icon: Droplets },
  { key: 'WiFi', icon: Wifi },
  { key: 'Cleaning', icon: Sparkles },
  { key: 'Furniture', icon: Sofa },
  { key: 'Other', icon: MoreHorizontal },
];

export default function ComplaintsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [items, setItems] = useState<Complaint[]>(sampleComplaints);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<Complaint['category']>('Electrical');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (title.trim().length < 4) return;
    setSubmitting(true);
    // Local optimistic add — swap for api.post('/tenant/complaints', ...) later.
    setTimeout(() => {
      const newItem: Complaint = {
        id: `c${Date.now()}`,
        title: title.trim(),
        category,
        status: 'Open',
        date: new Date().toISOString().slice(0, 10),
        note: note.trim() || undefined,
      };
      setItems((prev) => [newItem, ...prev]);
      setTitle('');
      setNote('');
      setCategory('Electrical');
      setSubmitting(false);
      setShowForm(false);
    }, 500);
  };

  return (
    <Screen>
      <AppHeader
        eyebrow="Maintenance"
        title="Complaints"
        name={user?.name}
        onPressBell={() => navigation.navigate('Notifications')}
        onPressAvatar={() => navigation.navigate('Profile')}
      />

      <Button title="Raise a new complaint" icon={Plus} onPress={() => setShowForm(true)} />

      <View style={{ height: spacing.lg }} />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wrench}
            title="No complaints"
            message="Raise an issue and track it from open to resolved right here."
          />
        </Card>
      ) : (
        items.map((c) => {
          const meta = statusMeta[c.status];
          const StatusIcon = meta.icon;
          const cat = categories.find((x) => x.key === c.category);
          const CatIcon = cat?.icon || MoreHorizontal;
          return (
            <Card key={c.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.catIcon}>
                  <CatIcon size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardSub}>
                    {c.category} · {relativeDay(c.date)}
                  </Text>
                </View>
                <Pill label={c.status} tone={meta.tone} icon={<StatusIcon size={11} color={statusFg(meta.tone)} />} />
              </View>
              {!!c.note && <Text style={styles.note}>{c.note}</Text>}
            </Card>
          );
        })
      )}

      {/* New complaint modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New complaint</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} hitSlop={10}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.catGrid}>
                {categories.map((c) => {
                  const Icon = c.icon;
                  const active = category === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => setCategory(c.key)}
                      activeOpacity={0.8}
                    >
                      <Icon size={16} color={active ? '#fff' : colors.primary} />
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                        {c.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bathroom tap leaking"
                placeholderTextColor={colors.textSubtle}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Add any details that'll help fix it faster…"
                placeholderTextColor={colors.textSubtle}
                value={note}
                onChangeText={setNote}
                multiline
              />

              <Button
                title="Submit complaint"
                onPress={submit}
                loading={submitting}
                disabled={title.trim().length < 4}
                style={{ marginTop: spacing.lg }}
              />
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const statusFg = (tone: Tone) =>
  tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.danger;

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  note: {
    fontSize: font.small,
    color: colors.textMuted,
    lineHeight: 20,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.sm,
  },

  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.xl,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  fieldLabel: { fontSize: font.small, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.md },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: font.small, fontWeight: '600', color: colors.text },
  catChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: font.body,
    color: colors.text,
  },
  textarea: { height: 96, textAlignVertical: 'top' },
});
