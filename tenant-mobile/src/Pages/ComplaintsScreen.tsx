import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, FileImage, X, UploadCloud, ChevronDown, Calendar, CheckCircle2, Search, Filter, Wrench, ClipboardList, Check, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CustomDateTimePicker } from '../components/pickers/CustomDateTimePicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppHeader } from '../components/ui';

const { width } = Dimensions.get('window');

// Theme Constants
const BLUE = '#2245D4';
const BLUE_SOFT = '#EEF3FF';
const BLUE_LIGHT = '#F8FAFC';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1C1C1C';
const TEXT_MID = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#FAF8F5';

const SUCCESS = '#22C55E';
const SUCCESS_BG = '#DCFCE7';
const WARN = '#F97316';
const WARN_BG = '#FFEDD5';
const IN_PROGRESS = '#6366F1';
const IN_PROGRESS_BG = '#E0E7FF';

type FilterTab = 'All' | 'Open' | 'Resolved';
const FILTER_TABS: FilterTab[] = ['All', 'Open', 'Resolved'];


const statusConfig: Record<string, { bg: string; text: string; }> = {
  Open: { bg: WARN_BG, text: WARN },
  'In Progress': { bg: IN_PROGRESS_BG, text: IN_PROGRESS },
  Resolved: { bg: SUCCESS_BG, text: SUCCESS },
};

function ComplaintDetailView({ complaint, onClose }: { complaint: any; onClose: () => void }) {
  const statusKey = complaint.status ?? 'Open';
  const status = statusConfig[statusKey] ?? statusConfig['Open'];
  const statusColor = status.text;
  const statusBg = status.bg;

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: WHITE }}>
        <View style={s.headerCenter}>
          <TouchableOpacity onPress={onClose} style={s.backBtnMinimal}>
            <ChevronLeft size={28} color={TEXT_DARK} strokeWidth={3} />
          </TouchableOpacity>
          <Text style={s.headerTitleCenter}>Complaint Details</Text>
          <TouchableOpacity style={s.backBtnMinimal}>
            <Edit2 size={22} color={BLUE} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        
        {/* Prominent Title Block */}
        <View style={s.detailTopBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Text style={s.detailTitle}>{complaint.title}</Text>
            <View style={[s.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[s.statusPillTxt, { color: statusColor }]}>{complaint.status}</Text>
            </View>
          </View>
          <Text style={s.detailDate}>{complaint.date}</Text>
        </View>

        {/* Details List */}
        <View style={s.detailSection}>
          <Text style={s.detailLbl}>Description</Text>
          <Text style={s.detailValText}>{complaint.note}</Text>
        </View>

        <View style={s.detailSection}>
          <Text style={s.detailLbl}>Category</Text>
          <Text style={s.detailValText}>{complaint.category}</Text>
        </View>

        <View style={s.detailSection}>
          <Text style={s.detailLbl}>Priority</Text>
          <Text style={s.detailValText}>{complaint.priority}</Text>
        </View>

        <View style={s.detailSection}>
          <Text style={s.detailLbl}>Attachments</Text>
          <View style={s.attachmentsRow}>
            {/* Mock Image Previews */}
            <View style={s.largeImgBox}>
              <FileImage size={32} color={TEXT_MID} />
            </View>
            <View style={s.largeImgBox}>
              <FileImage size={32} color={TEXT_MID} />
            </View>
          </View>
        </View>
        
      </ScrollView>
    </View>
  );
}

function StepperForm({ visible, onClose, onSubmit, hostelId }: { visible: boolean; onClose: () => void; onSubmit: () => void; hostelId?: number }) {
  const [step, setStep] = useState(1);
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [prefDate, setPrefDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const categories = ['Maintenance', 'WiFi', 'Electrical', 'Food', 'Cleaning', 'Other'];
  
  // Reset form when opened
  React.useEffect(() => {
    if (visible) {
      setStep(1);
      setPriority('Medium');
      setCategory('');
      setTitle('');
      setDesc('');
      setPrefDate('');
      setImages([]);
    }
  }, [visible]);

  if (!visible) return null;

  const nextStep = () => setStep(s => Math.min(3, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        selectionLimit: 3 - images.length,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(a => a.uri);
        setImages(prev => [...prev, ...newImages].slice(0, 3));
      }
    } catch (e) {
      console.log('Image picker error', e);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[s.modalOverlayFull, { backgroundColor: WHITE }]}>
        <SafeAreaView style={s.modalContainerFull} edges={['top', 'bottom']}>
          <View style={s.formHeader}>
            <TouchableOpacity onPress={onClose} style={s.backBtnMinimal}>
              <ChevronLeft size={28} color={TEXT_DARK} strokeWidth={3} />
            </TouchableOpacity>
            <Text style={s.headerTitleCenter}>New Complaint</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Stepper Indicator */}
          <View style={s.stepperWrap}>
            <View style={s.stepLineWrap}>
              <View style={[s.stepLine, step >= 2 && s.stepLineActive]} />
              <View style={[s.stepLine, step >= 3 && s.stepLineActive]} />
            </View>
            <View style={s.stepNodes}>
              <View style={[s.stepNode, step >= 1 && s.stepNodeActive]}>
                <Text style={[s.stepNodeTxt, step >= 1 && s.stepNodeTxtActive]}>1</Text>
              </View>
              <View style={[s.stepNode, step >= 2 && s.stepNodeActive]}>
                <Text style={[s.stepNodeTxt, step >= 2 && s.stepNodeTxtActive]}>2</Text>
              </View>
              <View style={[s.stepNode, step >= 3 && s.stepNodeActive]}>
                <Text style={[s.stepNodeTxt, step >= 3 && s.stepNodeTxtActive]}>3</Text>
              </View>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.formBody}>
            {step === 1 && (
              <View style={s.stepContent}>
                <View style={s.stepHero}>
                  <View style={s.heroIconWrap}><ClipboardList size={36} color={BLUE} /></View>
                  <Text style={s.heroTitle}>Raise a Complaint</Text>
                  <Text style={s.heroSub}>Let us know what's not working so we can fix it.</Text>
                </View>

                <Text style={s.inputLbl}>Category</Text>
                <TouchableOpacity style={s.inputBox} onPress={() => setShowCatPicker(true)} activeOpacity={0.7}>
                  <Text style={{ color: category ? TEXT_DARK : TEXT_MID, fontSize: 15 }}>{category || 'Select Category'}</Text>
                  <ChevronDown size={20} color={TEXT_MID} />
                </TouchableOpacity>

                <Text style={s.inputLbl}>Priority</Text>
                <View style={s.priorityRow}>
                  {['Low', 'Medium', 'High'].map(p => (
                    <TouchableOpacity key={p} style={[s.priorityBtn, priority === p && s.priorityBtnActive]} onPress={() => setPriority(p)}>
                      <Text style={[s.priorityTxt, priority === p && s.priorityTxtActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.inputLbl}>Title</Text>
                <TextInput 
                  style={s.inputBoxStyle} 
                  placeholder="e.g. Broken tap" 
                  placeholderTextColor={TEXT_MID}
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={s.inputLbl}>Description</Text>
                <View style={s.textAreaWrap}>
                  <TextInput
                    style={s.textAreaStyle}
                    placeholder="Describe the issue..."
                    placeholderTextColor={TEXT_MID}
                    multiline
                    value={desc}
                    onChangeText={setDesc}
                    maxLength={300}
                  />
                  <Text style={s.charCount}>{desc.length}/300</Text>
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={s.stepContent}>
                <Text style={s.inputLbl}>Upload Photo</Text>
                {images.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                    {images.map((imgUri, i) => (
                      <View key={i} style={[s.largeImgBox, { width: 100, height: 100, flex: 0 }]}>
                        <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                        <TouchableOpacity 
                          style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 12, padding: 4 }}
                          onPress={() => removeImage(i)}
                        >
                          <X size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {images.length < 3 && (
                      <TouchableOpacity style={[s.largeImgBox, { width: 100, height: 100, flex: 0, borderStyle: 'dashed' }]} onPress={handleUpload}>
                        <Plus size={32} color={TEXT_MID} />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity style={s.uploadArea} onPress={handleUpload} activeOpacity={0.7}>
                    <UploadCloud size={28} color={BLUE} style={{ marginBottom: 8 }} />
                    <Text style={s.uploadTxt}>Tap to upload photo</Text>
                    <Text style={s.uploadSub}>PNG, JPG up to 5MB</Text>
                  </TouchableOpacity>
                )}

                <Text style={s.inputLbl}>Preferred Date & Time</Text>
                <TouchableOpacity style={s.inputBox} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                  <Text style={{ color: prefDate ? TEXT_DARK : TEXT_MID, fontSize: 15 }}>{prefDate || 'Select date and time'}</Text>
                  <Calendar size={20} color={TEXT_MID} />
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View style={s.stepContent}>
                <View style={s.stepHero}>
                  <View style={s.heroIconWrap}><CheckCircle2 size={36} color={SUCCESS} /></View>
                  <Text style={s.heroTitle}>Review & Submit</Text>
                  <Text style={s.heroSub}>Please review your complaint before submitting.</Text>
                </View>

                <View style={s.summaryCard}>
                  <View style={s.sumRow}><Text style={s.sumLbl}>Category</Text><Text style={s.sumVal}>{category || 'Not specified'}</Text></View>
                  <View style={s.sumRow}>
                    <Text style={s.sumLbl}>Priority</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: WARN, marginRight: 6 }} />
                      <Text style={[s.sumVal, { color: priority === 'High' ? '#EF4444' : priority === 'Medium' ? WARN : SUCCESS }]}>{priority}</Text>
                    </View>
                  </View>
                  <View style={s.sumRow}><Text style={s.sumLbl}>Title</Text><Text style={s.sumVal}>{title || 'Not specified'}</Text></View>
                  <View style={s.sumRow}><Text style={s.sumLbl}>Description</Text><Text style={[s.sumVal, { textAlign: 'right', flex: 1, marginLeft: 16 }]}>{desc || 'Not specified'}</Text></View>
                  <View style={s.sumRow}><Text style={s.sumLbl}>Preferred Time</Text><Text style={s.sumVal}>{prefDate || 'Not specified'}</Text></View>
                  {images.length > 0 && (
                    <View style={[s.sumRow, { borderBottomWidth: 0, flexDirection: 'column' }]}>
                      <Text style={s.sumLbl}>Attachments</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        {images.map((imgUri, i) => (
                          <View key={i} style={[s.largeImgBox, { width: 80, height: 80, flex: 0 }]}>
                            <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[s.formFooter, { paddingBottom: Platform.OS === 'ios' ? 40 : 24 }]}>
            <TouchableOpacity
              style={[s.btnBlue, { flex: 1, paddingVertical: 14 }, submitting && { opacity: 0.6 }]}
              disabled={submitting}
              onPress={step < 3 ? nextStep : async () => {
                setSubmitting(true);
                try {
                  const formData = new FormData();
                  formData.append('hostel_id', String(hostelId));
                  formData.append('category', category);
                  formData.append('title', title);
                  formData.append('description', desc);
                  if (prefDate) formData.append('pref_date', prefDate);
                  images.forEach((uri, i) => {
                    const ext = uri.split('.').pop() || 'jpg';
                    formData.append('images', {
                      uri,
                      name: `complaint-${i}.${ext}`,
                      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                    } as any);
                  });
                  await api.post('/complaints/tenant', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  onSubmit();
                  onClose();
                } catch (e) {
                  console.error('Failed to submit complaint', e);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? <ActivityIndicator color={WHITE} /> : <Text style={s.btnBlueTxt}>{step < 3 ? 'Next' : 'Submit'}</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      
      {/* Category Picker Modal */}
      <Modal visible={showCatPicker} transparent animationType="fade">
        <TouchableOpacity style={s.catOverlay} activeOpacity={1} onPress={() => setShowCatPicker(false)}>
          <View style={s.catBox}>
            <Text style={s.catTitle}>Select Category</Text>
            {categories.map(c => (
              <TouchableOpacity key={c} style={s.catOption} onPress={() => { setCategory(c); setShowCatPicker(false); }}>
                <Text style={[s.catOptionTxt, category === c && { color: BLUE, fontWeight: '700' }]}>{c}</Text>
                {category === c && <Check size={18} color={BLUE} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomDateTimePicker
        visible={showDatePicker}
        title="Preferred Date & Time"
        onConfirm={(date) => {
          setPrefDate(date.toLocaleString());
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </Modal>
  );
}

export default function ComplaintsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('Any time');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/complaints/tenant');
      if (res.data && res.data.success) {
        setComplaints(res.data.complaints || []);
      } else {
        setComplaints([]);
      }
    } catch (e) {
      console.error('Failed to fetch complaints', e);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  if (selectedComplaint) {
    return <ComplaintDetailView complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />;
  }

  const filtered = complaints.filter((c) => {
    const status = c.status ?? '';
    const matchesTab = activeTab === 'All' ||
                      (activeTab === 'Open' && (status === 'Open' || status === 'In Progress')) ||
                      (activeTab === 'Resolved' && status === 'Resolved');

    const matchesSearch = (c.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.category ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateFilter !== 'Any time') {
      if (dateFilter === 'Today') {
        const today = new Date().toISOString().slice(0, 10);
        matchesDate = (c.created_at ?? '').startsWith(today);
      } else if (dateFilter === 'Last 7 Days') {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        matchesDate = (c.created_at ?? '') >= cutoff;
      } else if (dateFilter === 'This Month') {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        matchesDate = (c.created_at ?? '').startsWith(monthStr);
      } else if (dateFilter === 'Last Month') {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        matchesDate = (c.created_at ?? '').startsWith(lastMonthStr);
      }
    }

    return matchesTab && matchesSearch && matchesDate;
  });

  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'Open' || c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── HEADER ── */}
      <View style={{ backgroundColor: BLUE }}>
        <SafeAreaView edges={['top']}>
          <AppHeader
            title="Complaints"
            subtitle={`Applied: ${totalCount} • Pending: ${pendingCount} • Resolved: ${resolvedCount}`}
            hideActions={true}
            onPressBack={() => navigation.goBack()}
            variant="primary"
          />
        </SafeAreaView>
      </View>

      {/* ── SEARCH & FILTER ── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={18} color={TEXT_MID} />
          <TextInput 
            style={s.searchInput} 
            placeholder="Search complaints..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={TEXT_MID}
          />
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Filter size={18} color={BLUE} />
        </TouchableOpacity>
      </View>

      {/* ── TABS ── */}
      <View style={s.tabWrapper}>
        <View style={s.tabContainer}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── LIST ── */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 15, color: TEXT_MID, fontWeight: '600' }}>No complaints found</Text>
            </View>
          ) : (
            filtered.map((c) => {
              const statusKey = c.status ?? 'Open';
              const status = statusConfig[statusKey] ?? statusConfig['Open'];
              const dateStr = c.created_at ? new Date(c.created_at).toLocaleString() : '';
              return (
                <TouchableOpacity
                  key={c.complaint_id ?? c.id}
                  style={s.listCard}
                  onPress={() => setSelectedComplaint({ ...c, date: dateStr, note: c.description })}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View>
                      <Text style={s.cardTitle}>{c.title}</Text>
                      <Text style={s.cardDate}>{dateStr}</Text>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: status.bg }]}>
                      <Text style={[s.statusPillTxt, { color: status.text }]}>{statusKey}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── FLOATING ADD BTN ── */}
      <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Plus size={24} color={WHITE} strokeWidth={3} />
      </TouchableOpacity>

      <StepperForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={fetchComplaints}
        hostelId={user?.hostel_id}
      />

      {/* Mock List Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <TouchableOpacity style={s.catOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={s.catBox}>
            <Text style={s.catTitle}>Filter by Date</Text>
            {['Any time', 'Last 7 Days', 'This Month', 'Last Month'].map(d => (
              <TouchableOpacity key={d} style={s.catOption} onPress={() => { setDateFilter(d); setShowFilterModal(false); }}>
                <Text style={[s.catOptionTxt, dateFilter === d && { color: BLUE, fontWeight: '700' }]}>{d}</Text>
                {dateFilter === d && <Check size={18} color={BLUE} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  
  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, marginTop: 12 },
  backBtnMinimal: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: TEXT_DARK },
  headerStats: { fontSize: 13, color: TEXT_MID, marginTop: 6, fontWeight: '600' },
  
  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, paddingBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: TEXT_DARK },
  filterBtn: { width: 44, height: 44, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Tabs
  tabWrapper: { paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  tabContainer: { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 24, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 20 },
  tabActive: { backgroundColor: BLUE },
  tabText: { fontSize: 14, fontWeight: '700', color: TEXT_MID },
  tabTextActive: { color: WHITE },

  // List Cards
  listContent: { padding: 20, paddingBottom: 100 },
  listCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  cardDate: { fontSize: 12, color: TEXT_MID, marginTop: 2 },
  
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusPillTxt: { fontSize: 11, fontWeight: '800' },

  // FAB
  fab: { position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  // Details View
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitleCenter: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  detailTopBlock: { backgroundColor: BLUE_LIGHT, borderRadius: 20, padding: 24, marginBottom: 24 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, flex: 1, paddingRight: 16 },
  detailDate: { fontSize: 12, color: TEXT_MID, marginTop: 8 },
  detailSection: { marginBottom: 24 },
  detailLbl: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 },
  detailValText: { fontSize: 15, color: TEXT_MID, lineHeight: 24 },
  attachmentsRow: { flexDirection: 'row', gap: 16 },
  largeImgBox: { flex: 1, height: 120, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 50 : 36, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER },
  btnBlue: { backgroundColor: BLUE, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnBlueTxt: { color: WHITE, fontSize: 16, fontWeight: '700' },
  btnOutlined: { borderWidth: 1, borderColor: BLUE, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', marginRight: 16 },
  btnOutlinedTxt: { color: BLUE, fontSize: 16, fontWeight: '700' },

  // Stepper Modal
  modalOverlayFull: { flex: 1, backgroundColor: WHITE },
  modalContainerFull: { flex: 1, backgroundColor: WHITE },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  stepperWrap: { alignItems: 'center', marginVertical: 12, paddingHorizontal: 60 },
  stepLineWrap: { position: 'absolute', top: 14, left: 80, right: 80, flexDirection: 'row' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB' },
  stepLineActive: { backgroundColor: BLUE },
  stepNodes: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  stepNode: { width: 30, height: 30, borderRadius: 15, backgroundColor: WHITE, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepNodeActive: { backgroundColor: BLUE, borderColor: BLUE },
  stepNodeTxt: { fontSize: 12, fontWeight: '800', color: TEXT_MID },
  stepNodeTxtActive: { color: WHITE },

  formBody: { padding: 24 },
  stepContent: { flex: 1 },
  stepHero: { alignItems: 'center', marginBottom: 32 },
  heroIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: BLUE_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 },
  heroSub: { fontSize: 14, color: TEXT_MID, textAlign: 'center' },

  inputLbl: { fontSize: 13, fontWeight: '800', color: TEXT_DARK, marginBottom: 8, marginTop: 16 },
  inputBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputBoxStyle: { borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 16, height: 56, fontSize: 15, color: TEXT_DARK },
  priorityRow: { flexDirection: 'row', gap: 12 },
  priorityBtn: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  priorityBtnActive: { borderColor: BLUE, backgroundColor: WHITE, borderWidth: 1.5 },
  priorityTxt: { fontSize: 14, fontWeight: '600', color: TEXT_MID },
  priorityTxtActive: { color: BLUE },
  textAreaWrap: { borderWidth: 1, borderColor: BORDER, borderRadius: 16, backgroundColor: WHITE },
  textAreaStyle: { height: 120, padding: 16, fontSize: 15, color: TEXT_DARK },
  charCount: { position: 'absolute', bottom: 12, right: 16, fontSize: 12, color: TEXT_MID },

  uploadArea: { borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 24, padding: 32, alignItems: 'center', backgroundColor: '#FAFAFA' },
  uploadTxt: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  uploadSub: { fontSize: 13, color: TEXT_MID },

  summaryCard: { },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  sumLbl: { fontSize: 14, color: TEXT_MID, fontWeight: '500' },
  sumVal: { fontSize: 14, color: TEXT_DARK, fontWeight: '700' },

  formFooter: { flexDirection: 'row', padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  
  // Category Picker
  catOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  catBox: { width: '100%', backgroundColor: WHITE, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  catTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 16 },
  catOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  catOptionTxt: { fontSize: 15, color: TEXT_DARK },
});
