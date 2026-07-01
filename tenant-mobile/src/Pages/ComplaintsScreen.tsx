import React, { useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, FileImage, X, UploadCloud, ChevronDown, Calendar, CheckCircle2, Search, Filter, Wrench, ClipboardList, Check, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CustomDateTimePicker } from '../components/pickers/CustomDateTimePicker';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Brown Theme Constants
const BROWN = '#8B4513';
const BROWN_SOFT = '#F5DEB3';
const BROWN_LIGHT = '#FFF8F0';
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

// Mock data
const COMPLAINTS = [
  { id: '1', title: 'WIFI Not Working', date: '14 May 2026, 09:30 AM', status: 'Open', category: 'WiFi', priority: 'High', note: 'Internet is very slow and keeps disconnecting in my room.' },
  { id: '2', title: 'Water Leakage', date: '13 May 2026, 04:20 PM', status: 'In Progress', category: 'Maintenance', priority: 'Medium', note: 'There is a water leakage in room near the window.' },
  { id: '3', title: 'Fan Not Working', date: '12 May 2026, 11:15 AM', status: 'Resolved', category: 'Electrical', priority: 'Low', note: 'Fan makes noise.' },
  { id: '4', title: 'Mess Food Issue', date: '10 May 2026, 08:00 PM', status: 'Resolved', category: 'Food', priority: 'High', note: 'Food was too spicy today.' },
];

const statusConfig: Record<string, { bg: string; text: string; }> = {
  Open: { bg: WARN_BG, text: WARN },
  'In Progress': { bg: IN_PROGRESS_BG, text: IN_PROGRESS },
  Resolved: { bg: SUCCESS_BG, text: SUCCESS },
};

function ComplaintDetailView({ complaint, onClose }: { complaint: any; onClose: () => void }) {
  const statusColor = statusConfig[complaint.status].text;
  const statusBg = statusConfig[complaint.status].bg;

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
            <Edit2 size={22} color={BROWN} />
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

function StepperForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [prefDate, setPrefDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [images, setImages] = useState<string[]>([]);
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
                  <View style={s.heroIconWrap}><ClipboardList size={36} color={BROWN} /></View>
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
                    <UploadCloud size={28} color={BROWN} style={{ marginBottom: 8 }} />
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
            <TouchableOpacity style={[s.btnBrown, { flex: 1, paddingVertical: 14 }]} onPress={step < 3 ? nextStep : onClose}>
              <Text style={s.btnBrownTxt}>{step < 3 ? 'Next' : 'Submit'}</Text>
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
                <Text style={[s.catOptionTxt, category === c && { color: BROWN, fontWeight: '700' }]}>{c}</Text>
                {category === c && <Check size={18} color={BROWN} />}
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
  
  if (selectedComplaint) {
    return <ComplaintDetailView complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />;
  }

  const filtered = COMPLAINTS.filter((c) => {
    const matchesTab = activeTab === 'All' || 
                      (activeTab === 'Open' && (c.status === 'Open' || c.status === 'In Progress')) ||
                      (activeTab === 'Resolved' && c.status === 'Resolved');
    
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.category.toLowerCase().includes(searchQuery.toLowerCase());
                          
    let matchesDate = true;
    if (dateFilter !== 'Any time') {
       // Mock date filtering logic for visual effect
       // Since the dates are strings like '14 May 2026, 09:30 AM', 
       // this will just be a simulated effect (hide everything if strict, or show if loose).
       if (dateFilter === 'Today') matchesDate = false; 
    }
                          
    return matchesTab && matchesSearch && matchesDate;
  });

  const totalCount = COMPLAINTS.length;
  const pendingCount = COMPLAINTS.filter(c => c.status === 'Open' || c.status === 'In Progress').length;
  const resolvedCount = COMPLAINTS.filter(c => c.status === 'Resolved').length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      
      {/* ── HEADER ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: BG }}>
        <View style={s.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnMinimal}>
              <ChevronLeft size={28} color={TEXT_DARK} />
            </TouchableOpacity>
            <View>
              <Text style={s.headerTitle}>Complaints</Text>
              <Text style={s.headerStats}>Applied: {totalCount} • Pending: {pendingCount} • Resolved: {resolvedCount}</Text>
            </View>
          </View>
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
            <Filter size={18} color={BROWN} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
        {filtered.map((c, i) => {
          const status = statusConfig[c.status];
          return (
            <TouchableOpacity
              key={c.id}
              style={s.listCard}
              onPress={() => setSelectedComplaint(c)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View>
                  <Text style={s.cardTitle}>{c.title}</Text>
                  <Text style={s.cardDate}>{c.date}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: status.bg }]}>
                  <Text style={[s.statusPillTxt, { color: status.text }]}>{c.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── FLOATING ADD BTN ── */}
      <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Plus size={24} color={WHITE} strokeWidth={3} />
      </TouchableOpacity>

      <StepperForm visible={showForm} onClose={() => setShowForm(false)} />

      {/* Mock List Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <TouchableOpacity style={s.catOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={s.catBox}>
            <Text style={s.catTitle}>Filter by Date</Text>
            {['Any time', 'Last 7 Days', 'This Month', 'Last Month'].map(d => (
              <TouchableOpacity key={d} style={s.catOption} onPress={() => { setDateFilter(d); setShowFilterModal(false); }}>
                <Text style={[s.catOptionTxt, dateFilter === d && { color: BROWN, fontWeight: '700' }]}>{d}</Text>
                {dateFilter === d && <Check size={18} color={BROWN} />}
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
  tabActive: { backgroundColor: BROWN },
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
  fab: { position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: BROWN, justifyContent: 'center', alignItems: 'center', shadowColor: BROWN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  // Details View
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitleCenter: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  detailTopBlock: { backgroundColor: BROWN_LIGHT, borderRadius: 20, padding: 24, marginBottom: 24 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, flex: 1, paddingRight: 16 },
  detailDate: { fontSize: 12, color: TEXT_MID, marginTop: 8 },
  detailSection: { marginBottom: 24 },
  detailLbl: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 },
  detailValText: { fontSize: 15, color: TEXT_MID, lineHeight: 24 },
  attachmentsRow: { flexDirection: 'row', gap: 16 },
  largeImgBox: { flex: 1, height: 120, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 50 : 36, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER },
  btnBrown: { backgroundColor: BROWN, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnBrownTxt: { color: WHITE, fontSize: 16, fontWeight: '700' },
  btnOutlined: { borderWidth: 1, borderColor: BROWN, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', marginRight: 16 },
  btnOutlinedTxt: { color: BROWN, fontSize: 16, fontWeight: '700' },

  // Stepper Modal
  modalOverlayFull: { flex: 1, backgroundColor: WHITE },
  modalContainerFull: { flex: 1, backgroundColor: WHITE },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  stepperWrap: { alignItems: 'center', marginVertical: 12, paddingHorizontal: 60 },
  stepLineWrap: { position: 'absolute', top: 14, left: 80, right: 80, flexDirection: 'row' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB' },
  stepLineActive: { backgroundColor: BROWN },
  stepNodes: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  stepNode: { width: 30, height: 30, borderRadius: 15, backgroundColor: WHITE, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepNodeActive: { backgroundColor: BROWN, borderColor: BROWN },
  stepNodeTxt: { fontSize: 12, fontWeight: '800', color: TEXT_MID },
  stepNodeTxtActive: { color: WHITE },

  formBody: { padding: 24 },
  stepContent: { flex: 1 },
  stepHero: { alignItems: 'center', marginBottom: 32 },
  heroIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: BROWN_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 },
  heroSub: { fontSize: 14, color: TEXT_MID, textAlign: 'center' },

  inputLbl: { fontSize: 13, fontWeight: '800', color: TEXT_DARK, marginBottom: 8, marginTop: 16 },
  inputBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputBoxStyle: { borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 16, height: 56, fontSize: 15, color: TEXT_DARK },
  priorityRow: { flexDirection: 'row', gap: 12 },
  priorityBtn: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  priorityBtnActive: { borderColor: BROWN, backgroundColor: WHITE, borderWidth: 1.5 },
  priorityTxt: { fontSize: 14, fontWeight: '600', color: TEXT_MID },
  priorityTxtActive: { color: BROWN },
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
