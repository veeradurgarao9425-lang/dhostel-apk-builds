import React, { useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Clock, Wrench, MoreHorizontal, FileImage, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

type FilterTab = 'All' | 'Open' | 'Resolved';
const FILTER_TABS: FilterTab[] = ['All', 'Open', 'Resolved'];

const BLUE = '#2245D4';
const BLUE_SOFT = '#EEF2FF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#666666';
const BORDER = '#F1F5F9';
const BG = '#F8FAFD';
const SUCCESS = '#22C55E';
const SUCCESS_BG = '#DCFCE7';
const WARN = '#F59E0B';
const WARN_BG = '#FEF3C7';
const DANGER = '#EF4444';
const DANGER_BG = '#FEE2E2';

// Mock data
const COMPLAINTS = [
  { id: '1', title: 'WIFI Not Working', date: '14 May 2026, 09:30 AM', status: 'Open', category: 'WiFi', priority: 'High', note: 'Internet is very slow and keeps disconnecting in my room.' },
  { id: '2', title: 'Water Leakage', date: '13 May 2026, 04:20 PM', status: 'In Progress', category: 'Maintenance', priority: 'Medium', note: 'There is a water leakage in room near the window.' },
  { id: '3', title: 'Fan Not Working', date: '12 May 2026, 11:15 AM', status: 'Resolved', category: 'Electrical', priority: 'Low', note: 'Fan makes noise.' },
  { id: '4', title: 'Mess Food Issue', date: '10 May 2026, 08:00 PM', status: 'Resolved', category: 'Food', priority: 'High', note: 'Food was too spicy today.' },
];

const statusConfig: Record<string, { bg: string; text: string; }> = {
  Open: { bg: DANGER_BG, text: DANGER },
  'In Progress': { bg: WARN_BG, text: WARN },
  Resolved: { bg: SUCCESS_BG, text: SUCCESS },
};

const categories = [
  { key: 'WiFi', icon: Wrench },
  { key: 'Maintenance', icon: Wrench },
  { key: 'Electrical', icon: Wrench },
  { key: 'Food', icon: Wrench },
];

function ComplaintDetailView({ complaint, onClose }: { complaint: any; onClose: () => void }) {
  const statusColor = statusConfig[complaint.status].text;
  const statusBg = statusConfig[complaint.status].bg;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: BG }}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <ArrowLeft size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitleDark}>Complaint Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        
        {/* Ticket Card */}
        <View style={styles.ticketCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 }}>{complaint.title}</Text>
              <Text style={{ fontSize: 13, color: TEXT_MID }}>{complaint.date}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: statusColor }}>{complaint.status}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
            <View>
              <Text style={styles.lbl}>CATEGORY</Text>
              <Text style={styles.val}>{complaint.category}</Text>
            </View>
            <View>
              <Text style={styles.lbl}>PRIORITY</Text>
              <Text style={[styles.val, { color: complaint.priority === 'High' ? DANGER : TEXT_DARK }]}>{complaint.priority}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descCard}>
            <Text style={styles.descTxt}>{complaint.note}</Text>
          </View>
        </View>

        {/* Attachments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={styles.imgBox}>
              <FileImage size={24} color={TEXT_MID} />
            </View>
            <View style={styles.imgBox}>
              <FileImage size={24} color={TEXT_MID} />
            </View>
          </View>
        </View>
        
      </ScrollView>

      {/* Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
          <Text style={styles.primaryBtnTxt}>Update Complaint</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ComplaintsScreen({ navigation }: any) {
  const { user } = useAuth();
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
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── HEADER ── */}
      <View style={styles.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnLight}>
              <ArrowLeft size={24} color={WHITE} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerGreeting}>Complaints</Text>
              <Text style={styles.headerSub}>Track maintenance & issues</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── LIST ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <CheckCircle size={32} color={SUCCESS} />
            </View>
            <Text style={styles.emptyTitle}>All Good!</Text>
            <Text style={styles.emptySub}>You have no complaints in this category. Everything is working perfectly.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {filtered.map((c, i) => {
              const status = statusConfig[c.status];
              const cat = categories.find((x) => x.key === c.category);
              const CatIcon = cat?.icon || MoreHorizontal;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.listRow, i < filtered.length - 1 && styles.listDivider]}
                  onPress={() => setSelectedComplaint(c)}
                  activeOpacity={0.7}
                >
                  <View style={styles.catIconWrap}>
                    <CatIcon size={20} color={BLUE} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <Text style={styles.cardSub}>{c.category} · {c.date.split(',')[0]}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusPillTxt, { color: status.text }]}>{c.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── FLOATING ADD BTN ── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Plus size={26} color={WHITE} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSection: { backgroundColor: BLUE, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtnLight: { padding: 8, marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  tabWrapper: { paddingHorizontal: 20, marginTop: -20, zIndex: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 20, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16 },
  tabActive: { backgroundColor: BLUE },
  tabText: { fontSize: 14, fontWeight: '600', color: TEXT_MID },
  tabTextActive: { color: WHITE },

  emptyCard: { backgroundColor: WHITE, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed' },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: SUCCESS_BG, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptySub: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },

  listCard: { backgroundColor: WHITE, borderRadius: 24, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: BORDER },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  listDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  catIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  cardSub: { fontSize: 13, color: TEXT_MID },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillTxt: { fontSize: 11, fontWeight: '800' },

  fab: { position: 'absolute', bottom: 32, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },

  // Detail View Styles
  backBtn: { padding: 8, marginLeft: -8, backgroundColor: WHITE, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  headerTitleDark: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  ticketCard: { backgroundColor: WHITE, borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: BORDER },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, borderStyle: 'dashed' },
  lbl: { fontSize: 11, fontWeight: '700', color: TEXT_MID, marginBottom: 4 },
  val: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 12, marginLeft: 4 },
  descCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER },
  descTxt: { fontSize: 15, color: TEXT_MID, lineHeight: 24 },
  
  imgBox: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed' },
  
  bottomBar: { padding: 20, paddingBottom: 40, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER },
  primaryBtn: { backgroundColor: BLUE, paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnTxt: { color: WHITE, fontSize: 16, fontWeight: '800' },
});
