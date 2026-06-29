import React, { useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, CheckCircle, Clock, AlertCircle, Trash2, Camera, X, Wrench, MoreHorizontal } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '../theme';
import { Complaint } from '../data/tenantContent';

type FilterTab = 'All' | 'Open' | 'Resolved';
const FILTER_TABS: FilterTab[] = ['All', 'Open', 'Resolved'];

// Mock data matching the image
const COMPLAINTS = [
  { id: '1', title: 'WIFI Not Working', date: '14 May 2026, 09:30 AM', status: 'Open', category: 'WiFi', priority: 'High', note: 'Internet is very slow and keeps disconnecting in my room.' },
  { id: '2', title: 'Water Leakage', date: '13 May 2026, 04:20 PM', status: 'In Progress', category: 'Maintenance', priority: 'Medium', note: 'There is a water leakage in room near the window.' },
  { id: '3', title: 'Fan Not Working', date: '12 May 2026, 11:15 AM', status: 'Resolved', category: 'Electrical', priority: 'Low', note: 'Fan makes noise.' },
  { id: '4', title: 'Mess Food Issue', date: '10 May 2026, 08:00 PM', status: 'Resolved', category: 'Food', priority: 'High', note: 'Food was too spicy today.' },
];

const statusConfig: Record<string, { bg: string; text: string }> = {
  Open: { bg: '#FFF7ED', text: '#EA580C' }, // Orange
  'In Progress': { bg: '#EFF6FF', text: '#3B82F6' }, // Blue (list)
  Resolved: { bg: '#F0FDF4', text: '#16A34A' }, // Green
};

// ── Detail View ───────────────────────────────────────────────────────────────
function ComplaintDetailView({ complaint, onClose }: { complaint: any; onClose: () => void }) {
  // The image shows "In Progress" as orange in the detail view, I'll match it
  const statusColor = complaint.status === 'In Progress' ? '#C2410C' : statusConfig[complaint.status].text;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.75}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaint Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Card */}
        <View style={[styles.detailCard, { backgroundColor: '#FFF6EF' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.detailCardTitle}>{complaint.title}</Text>
              <Text style={styles.detailCardDate}>{complaint.date}</Text>
            </View>
            <Text style={{ color: statusColor, fontWeight: '700', fontSize: 13 }}>{complaint.status}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Description</Text>
          <Text style={styles.detailText}>{complaint.note}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailText}>{complaint.category}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Priority</Text>
          <Text style={styles.detailText}>{complaint.priority}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>Attachments</Text>
          <View style={styles.attachmentsRow}>
            {/* Using colored boxes as placeholders for images to match layout */}
            <View style={styles.attachmentBox}>
              <Text style={{ fontSize: 24 }}>📷</Text>
            </View>
            <View style={styles.attachmentBox}>
              <Text style={{ fontSize: 24 }}>📷</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Add Update Button pinned to bottom */}
      <View style={styles.bottomBtnWrap}>
        <TouchableOpacity style={styles.updateBtn} activeOpacity={0.85}>
          <Text style={styles.updateBtnText}>Add Update</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ComplaintsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  if (selectedComplaint) {
    return <ComplaintDetailView complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />;
  }

  const filtered = COMPLAINTS.filter((c) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Open') return c.status === 'Open' || c.status === 'In Progress';
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

      {/* ── Tabs Wrapper ─────────────────────────────────────────────────── */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
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
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 14,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  // Tabs
  tabWrapper: { paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: 16 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.primary, ...shadow.subtle },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // List
  scrollContent: { padding: spacing.xl, paddingBottom: 120 },
  complaintCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.xl,
    marginBottom: 12,
    ...shadow.subtle,
  },
  complaintTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  complaintDate: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  statusText: { fontSize: 11, fontWeight: '800' },

  // Detail View
  detailCard: {
    padding: 20,
    borderRadius: radius.xl,
    marginBottom: 24,
  },
  detailCardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  detailCardDate: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 8 },
  detailText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },

  attachmentsRow: { flexDirection: 'row', gap: 12 },
  attachmentBox: {
    width: 90, height: 90,
    backgroundColor: '#E5E7EB',
    borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },

  bottomBtnWrap: {
    padding: spacing.xl,
    paddingBottom: 40,
    backgroundColor: colors.bg,
  },
  updateBtn: {
    backgroundColor: '#7B3A2A',
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadow.raised,
  },
  updateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
