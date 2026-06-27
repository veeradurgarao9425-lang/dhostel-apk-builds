import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus, Wrench, X, CheckCircle2, Clock, Loader,
  Zap, Droplets, Wifi, Sparkles, Sofa, MoreHorizontal,
  ArrowLeft,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { relativeDay } from '../utils/format';
import { sampleComplaints, Complaint } from '../data/tenantContent';
import api from '../services/api';

const statusConfig: Record<Complaint['status'], {
  bg: string; text: string; border: string; label: string;
}> = {
  Open:        { bg: colors.dangerSoft,  text: colors.danger,  border: colors.dangerBorder,  label: 'Open' },
  'In Progress': { bg: colors.warningSoft, text: colors.warning, border: colors.warningBorder, label: 'In Progress' },
  Resolved:    { bg: colors.successSoft, text: colors.success, border: colors.successBorder, label: 'Resolved' },
};

const categories: { key: Complaint['category']; icon: any; label: string }[] = [
  { key: 'Electrical', icon: Zap,         label: 'Electrical' },
  { key: 'Plumbing',   icon: Droplets,    label: 'Plumbing' },
  { key: 'WiFi',       icon: Wifi,        label: 'WiFi' },
  { key: 'Cleaning',   icon: Sparkles,    label: 'Cleaning' },
  { key: 'Furniture',  icon: Sofa,        label: 'Furniture' },
  { key: 'Other',      icon: MoreHorizontal, label: 'Other' },
];

type FilterTab = 'All' | 'Open' | 'Resolved';
const FILTER_TABS: FilterTab[] = ['All', 'Open', 'Resolved'];

export default function ComplaintsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [items, setItems] = useState<Complaint[]>(sampleComplaints);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<Complaint['category']>('Electrical');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/complaints/tenant');
      if (res.data.success) {
        const formatted = res.data.complaints.map((c: any) => ({
          id: String(c.complaint_id),
          title: c.title,
          category: c.category,
          status: c.status,
          date: c.created_at,
          note: c.description,
        }));
        setItems(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const submit = async () => {
    if (title.trim().length < 4) return;
    setSubmitting(true);
    try {
      const res = await api.post('/complaints/tenant', {
        hostel_id: user?.hostel_id,
        category,
        title: title.trim(),
        description: note.trim() || undefined,
      });
      if (res.data.success) {
        setTitle(''); setNote(''); setCategory('Electrical');
        setShowForm(false);
        fetchComplaints();
      }
    } catch (err) {
      console.error('Failed to raise complaint', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter((c) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Open') return c.status === 'Open' || c.status === 'In Progress';
    return c.status === 'Resolved';
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Gradient Header ──────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>Maintenance</Text>
            <Text style={styles.headerTitle}>Complaints</Text>
          </View>
          {user?.is_allocated && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <View style={styles.filterWrapper}>
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── List ────────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Wrench size={28} color={colors.textSubtle} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No complaints</Text>
            <Text style={styles.emptyBody}>
              {user?.is_allocated ? 'Raise an issue and track it from open to resolved right here.' : 'You need to be room-allocated to raise complaints.'}
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {filtered.map((c, i) => {
              const status = statusConfig[c.status];
              const cat = categories.find((x) => x.key === c.category);
              const CatIcon = cat?.icon || MoreHorizontal;
              return (
                <View
                  key={c.id}
                  style={[styles.listRow, i < filtered.length - 1 && styles.listRowDivider]}
                >
                  <View style={styles.catIconWrap}>
                    <CatIcon size={18} color={colors.primary} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <Text style={styles.cardSub}>
                      {c.category} · {relativeDay(c.date)}
                    </Text>
                    {!!c.note && (
                      <Text style={styles.cardNote} numberOfLines={2}>{c.note}</Text>
                    )}
                  </View>
                  <View style={[styles.statusPill, {
                    backgroundColor: status.bg,
                    borderColor: status.border,
                  }]}>
                    <Text style={[styles.statusPillText, { color: status.text }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── New complaint modal ──────────────────────────────────────────── */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={styles.sheet}>
            {/* Sheet header */}
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Complaint</Text>
              <TouchableOpacity
                onPress={() => setShowForm(false)}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category */}
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
                      <Icon size={15} color={active ? '#fff' : colors.primary} />
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title */}
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bathroom tap leaking"
                placeholderTextColor={colors.textSubtle}
                value={title}
                onChangeText={setTitle}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Add details that'll help fix it faster…"
                placeholderTextColor={colors.textSubtle}
                value={note}
                onChangeText={setNote}
                multiline
              />

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, title.trim().length < 4 && styles.submitBtnDisabled]}
                onPress={submit}
                disabled={submitting || title.trim().length < 4}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={title.trim().length >= 4
                    ? [colors.gradientStart, colors.gradientEnd]
                    : ['#C4BAE8', '#D0C8EF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGrad}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Submitting…' : 'Submit Complaint'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  hCircle1: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -20,
  },
  hCircle2: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 80,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3, marginTop: 3 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },

  // ── Filter ────────────────────────────────────────────────────────────────
  filterWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: { padding: spacing.xl, paddingBottom: 120 },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  listRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  catIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  cardSub: { fontSize: 12, color: colors.textMuted },
  cardNote: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginTop: 2,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // ── Empty ─────────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyBody: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'center', paddingHorizontal: 40,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32,33,36,0.5)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    padding: spacing.xl,
    paddingTop: 12,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13, fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  catChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: font.body,
    color: colors.text,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { borderRadius: radius.lg, marginTop: spacing.xl, ...shadow.raised },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnGrad: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
