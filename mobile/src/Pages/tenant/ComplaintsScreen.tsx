import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, ToastAndroid, Alert, FlatList
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, FileImage, X, UploadCloud, ChevronDown, Calendar, CheckCircle2, Search, Filter, Wrench, ClipboardList, Check, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CustomDateTimePicker } from '../../components/tenant/pickers/CustomDateTimePicker';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import api from '../../services/api';
import { AppHeader, SkeletonListRow, EmptyState } from '../../components/tenant/ui';
import { notifyComplaintRaised } from '../../hooks/useTenantNotifications';
import { LinearGradient } from 'expo-linear-gradient';
import { getResolvedImageUrl, appendImageFileToFormData } from '../../utils/imageHelper';

const { width } = Dimensions.get('window');

// Theme Constants
const BLUE = '#2952F3';
const BLUE_SOFT = '#EEF2FF';
const BLUE_LIGHT = '#F8FAFC';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1F2937';
const TEXT_MID = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F7F9FC';

const SUCCESS = '#22C55E';
const SUCCESS_BG = '#DCFCE7';
const WARN = '#F97316';
const WARN_BG = '#FFEDD5';
const IN_PROGRESS = '#6366F1';
const IN_PROGRESS_BG = '#E0E7FF';

type FilterTab = 'All' | 'Open' | 'Resolved';
const FILTER_TABS: FilterTab[] = ['All', 'Open', 'Resolved'];


const statusConfig: Record<string, { bg: string; text: string; }> = {
  Open: { bg: '#FEF3C7', text: '#F5A623' },
  'In Progress': { bg: '#DBEAFE', text: '#2952F3' },
  Resolved: { bg: '#D1FAE5', text: '#16C47F' },
  Rejected: { bg: '#FEE2E2', text: '#EF4444' },
};

import { Settings, Wifi, Zap, Droplets, Grid } from 'lucide-react-native';

const getCategoryIcon = (cat: string) => {
  if (!cat) return <Wrench size={20} color={BLUE} />;
  const c = cat.toLowerCase();
  if (c.includes('wifi') || c.includes('network')) return <Wifi size={20} color={BLUE} />;
  if (c.includes('elect')) return <Zap size={20} color={BLUE} />;
  if (c.includes('plumb') || c.includes('water')) return <Droplets size={20} color={BLUE} />;
  if (c.includes('clean')) return <Grid size={20} color={BLUE} />;
  return <Wrench size={20} color={BLUE} />;
};

function ComplaintTracker({ status }: { status: string }) {
  const steps = [
    { label: 'Complaint Raised', key: 'Open', desc: 'We have received your complaint.' },
    { label: 'Technician Assigned', key: 'In Progress', desc: 'A technician will attend to this shortly.' },
    { label: status === 'Rejected' ? 'Complaint Rejected' : 'Resolved', key: status === 'Rejected' ? 'Rejected' : 'Resolved', desc: status === 'Rejected' ? 'Complaint was rejected by admin.' : 'The issue has been fixed.' }
  ];

  let currentIdx = 0;
  if (status === 'In Progress') currentIdx = 1;
  if (status === 'Resolved' || status === 'Rejected') currentIdx = 2;

  return (
    <View style={{ backgroundColor: WHITE, padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT_DARK, marginBottom: 16 }}>Live Status Tracker</Text>
      {steps.map((step, idx) => {
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const isLast = idx === steps.length - 1;
        const isActiveState = idx < currentIdx;
        
        let color = '#CBD5E1';
        if (isCompleted) color = BLUE;
        if (isCompleted && step.key === 'Rejected') color = '#EF4444';
        if (isCompleted && step.key === 'Resolved') color = '#10B981';

        return (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: isCompleted ? color : '#F1F5F9', borderWidth: 2, borderColor: isCompleted ? color : '#E2E8F0', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                 {isCompleted && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: WHITE }} />}
              </View>
              {!isLast && <View style={{ width: 2, height: 36, backgroundColor: isActiveState ? color : '#F1F5F9', marginVertical: -2, zIndex: 1 }} />}
            </View>
            <View style={{ marginLeft: 12, paddingBottom: isLast ? 0 : 20, flex: 1, marginTop: -2 }}>
              <Text style={{ fontSize: 14, fontWeight: isCurrent ? '800' : (isCompleted ? '700' : '600'), color: isCurrent ? color : (isCompleted ? TEXT_DARK : TEXT_MID) }}>{step.label}</Text>
              {(isCurrent || isCompleted) && <Text style={{ fontSize: 12, color: TEXT_MID, marginTop: 4, lineHeight: 16 }}>{step.desc}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ComplaintDetailView({ complaint, onClose }: { complaint: any; onClose: () => void }) {
  const statusKey = complaint.status ?? 'Open';
  const status = statusConfig[statusKey] ?? statusConfig['Open'];
  const statusColor = status.text;
  const statusBg = status.bg;
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <AppHeader 
        title="Complaint Details" 
        onBack={onClose}
        rightComponent={
          (statusKey !== 'Resolved' && statusKey !== 'Rejected') ? (
            <TouchableOpacity style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
              <Edit2 size={18} color={WHITE} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        
        {/* Prominent Title Block */}
        <View style={s.detailTopBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <Text style={s.detailTitle}>{complaint.title}</Text>
            <View style={[s.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[s.statusPillTxt, { color: statusColor }]}>{complaint.status}</Text>
            </View>
          </View>
          <Text style={s.detailDate}>Submitted on {complaint.date}</Text>
        </View>

        {/* Live Tracker (Swiggy Style) */}
        <ComplaintTracker status={statusKey} />

        {/* Category & Priority Side-by-Side */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: WHITE, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
            <Text style={{ fontSize: 12, color: TEXT_MID, fontWeight: '600', marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {getCategoryIcon(complaint.category || '')}
              <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_DARK }} numberOfLines={1}>{complaint.category || 'General'}</Text>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: WHITE, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
            <Text style={{ fontSize: 12, color: TEXT_MID, fontWeight: '600', marginBottom: 8 }}>Priority</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: complaint.priority === 'High' ? '#EF4444' : complaint.priority === 'Medium' ? '#F97316' : '#10B981' }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_DARK }}>{complaint.priority || 'Medium'}</Text>
            </View>
          </View>
        </View>

        {/* Details List */}
        <View style={s.detailSection}>
          <Text style={s.detailLbl}>Description</Text>
          <View style={{ backgroundColor: WHITE, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
            <Text style={s.detailValText}>{complaint.description || complaint.note || 'No description provided.'}</Text>
          </View>
        </View>

        {/* Attachments Section */}
        {(() => {
          let attachedList: string[] = [];
          if (complaint.image_urls) {
            try {
              if (Array.isArray(complaint.image_urls)) {
                attachedList = complaint.image_urls;
              } else if (typeof complaint.image_urls === 'string') {
                if (complaint.image_urls.startsWith('[')) {
                  attachedList = JSON.parse(complaint.image_urls);
                } else {
                  attachedList = complaint.image_urls.split(',').map((u: string) => u.trim());
                }
              }
            } catch (e) {
              attachedList = [complaint.image_urls];
            }
          }

          if (attachedList.length === 0) return null;

          return (
            <View style={s.detailSection}>
              <Text style={s.detailLbl}>Attachments ({attachedList.length})</Text>
              <View style={s.attachmentsRow}>
                {attachedList.map((imgUri: string, idx: number) => {
                  const resolved = getResolvedImageUrl(imgUri);
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={s.largeImgBox} 
                      onPress={() => setZoomImage(resolved)}
                      activeOpacity={0.8}
                    >
                      {resolved ? (
                        <Image source={{ uri: resolved }} style={s.attachmentImg} />
                      ) : (
                        <FileImage size={32} color={TEXT_MID} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })()}
        
      </ScrollView>

      {/* Fullscreen Image Zoom Modal */}
      <Modal visible={!!zoomImage} transparent animationType="fade" onRequestClose={() => setZoomImage(null)}>
        <View style={s.zoomModalContainer}>
          <TouchableOpacity style={s.zoomCloseBtn} onPress={() => setZoomImage(null)}>
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          {zoomImage && (
            <Image source={{ uri: zoomImage }} style={s.zoomedImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

function StepperForm({ visible, onClose, onSubmit, hostelId }: { visible: boolean; onClose: () => void; onSubmit: () => void; hostelId?: number }) {
  const { showError } = useToast();
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('Maintenance');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: boolean, desc?: boolean }>({});
  const categories = ['Maintenance', 'WiFi', 'Electrical', 'Food', 'Cleaning', 'Other'];
  
  const handleReset = () => {
    setPriority('Medium');
    setCategory('Maintenance');
    setTitle('');
    setDesc('');
    setImages([]);
    setErrors({});
  };

  // Reset form when opened
  React.useEffect(() => {
    if (visible) {
      handleReset();
    }
  }, [visible]);

  if (!visible) return null;

  const handleUpload = () => {
    Alert.alert('Add Photo Attachment', 'Choose an option', [
      {
        text: '📷 Take Photo',
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission Required', 'Camera permission is needed.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              setImages(prev => [...prev, res.assets[0].uri].slice(0, 3));
            }
          } catch (e) {
            console.error('Camera error', e);
          }
        }
      },
      {
        text: '🖼️ Choose from Gallery',
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission Required', 'Media library access is needed.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: true,
              selectionLimit: 3 - images.length,
              quality: 0.7,
            });
            if (!result.canceled && result.assets) {
              const newImages = result.assets.map(a => a.uri);
              setImages(prev => [...prev, ...newImages].slice(0, 3));
            }
          } catch (e) {
            console.error('Gallery error', e);
          }
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const newErrors = {
      title: !title.trim(),
      desc: !desc.trim(),
    };
    setErrors(newErrors);
    if (newErrors.title || newErrors.desc) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('hostel_id', String(hostelId || ''));
      formData.append('category', category);
      formData.append('title', title);
      formData.append('description', desc);
      images.forEach((uri, i) => {
        appendImageFileToFormData(formData, 'images', uri, `complaint-${i}.jpg`);
      });
      await api.post('/complaints/tenant', formData);
      notifyComplaintRaised(title);
      onSubmit();
      onClose();
    } catch (e) {
      console.error('Failed to submit complaint', e);
      showError('Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalContainerFull}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        
        {/* Colored Top Header with Left '<' Back Button */}
        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.slimModalHeader}>
          <SafeAreaView edges={['top']} style={s.headerInnerRow}>
            <TouchableOpacity onPress={onClose} style={s.backBtnHeader} activeOpacity={0.7}>
              <ChevronLeft size={22} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={s.slimModalTitle}>New Complaint</Text>
          </SafeAreaView>
        </LinearGradient>

        {submitting && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.75)', zIndex: 10, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '700', color: TEXT_DARK }}>Submitting Complaint...</Text>
          </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.formBody}>
            <View style={s.stepContent}>
              {/* Category Quick Pills */}
              <Text style={s.inputLbl}>Category <Text style={{color: '#EF4444'}}>*</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
                      category === cat && { backgroundColor: BLUE, borderColor: BLUE },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[{ fontSize: 13, fontWeight: '700', color: TEXT_DARK }, category === cat && { color: WHITE }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Priority Selection */}
              <Text style={[s.inputLbl, { marginTop: 12 }]}>Priority</Text>
              <View style={s.priorityRow}>
                {['Low', 'Medium', 'High'].map((p) => (
                  <TouchableOpacity key={p} style={[s.priorityBtn, priority === p && s.priorityBtnActive]} onPress={() => setPriority(p)}>
                    <Text style={[s.priorityTxt, priority === p && s.priorityTxtActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title Input */}
              <Text style={[s.inputLbl, { marginTop: 12 }]}>Title <Text style={{color: '#EF4444'}}>*</Text></Text>
              <TextInput 
                style={[s.inputBoxStyle, errors.title && { borderColor: '#EF4444' }]} 
                placeholder="e.g. WiFi not connecting" 
                placeholderTextColor={TEXT_MID}
                value={title}
                onChangeText={(t) => { setTitle(t); setErrors(e => ({...e, title: false})); }}
              />
              {errors.title && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Please enter a title</Text>}

              {/* Description Input */}
              <Text style={[s.inputLbl, { marginTop: 12 }]}>Description <Text style={{color: '#EF4444'}}>*</Text></Text>
              <View style={[s.textAreaWrap, errors.desc && { borderColor: '#EF4444' }]}>
                <TextInput
                  style={s.textAreaStyle}
                  placeholder="Explain the issue..."
                  placeholderTextColor={TEXT_MID}
                  multiline
                  value={desc}
                  onChangeText={(t) => { setDesc(t); setErrors(e => ({...e, desc: false})); }}
                  maxLength={300}
                />
                <Text style={s.charCount}>{desc.length}/300</Text>
              </View>
              {errors.desc && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Please enter a description</Text>}

              {/* Photo Upload */}
              <Text style={[s.inputLbl, { marginTop: 12 }]}>Attach Photos (Optional)</Text>
              {images.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {images.map((imgUri, i) => (
                    <View key={i} style={[s.largeImgBox, { width: 72, height: 72, flex: 0 }]}>
                      <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                      <TouchableOpacity 
                        style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, padding: 3 }}
                        onPress={() => removeImage(i)}
                      >
                        <X size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {images.length < 3 && (
                    <TouchableOpacity style={[s.largeImgBox, { width: 72, height: 72, flex: 0, borderStyle: 'dashed' }]} onPress={handleUpload}>
                      <Plus size={22} color={TEXT_MID} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={[s.uploadArea, { paddingVertical: 14 }]} onPress={handleUpload} activeOpacity={0.7}>
                  <UploadCloud size={22} color={BLUE} style={{ marginBottom: 4 }} />
                  <Text style={s.uploadTxt}>Tap to upload photos</Text>
                  <Text style={s.uploadSub}>PNG, JPG up to 5MB</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action Footer with Reset & Submit */}
          <View style={s.formFooter}>
            <TouchableOpacity 
              style={s.btnReset} 
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={s.btnResetTxt}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.btnBlue, { flex: 1 }, submitting && { opacity: 0.7 }]} 
              disabled={submitting}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              {submitting ? <ActivityIndicator color={WHITE} /> : <Text style={s.btnBlueTxt}>Submit Complaint</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function ComplaintsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
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

    const matchesSearch = String(c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(c.category || '').toLowerCase().includes(searchQuery.toLowerCase());

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
      
      <AppHeader title="Complaints" subtitle="Track and manage maintenance issues" showBack={navigation.canGoBack()} />

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
          {FILTER_TABS.map((tab) => {
            const count = tab === 'All' ? totalCount : tab === 'Open' ? pendingCount : resolvedCount;
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER }, isActive && { backgroundColor: BLUE, borderColor: BLUE }]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[{ fontSize: 13, fontWeight: '700', color: TEXT_MID }, isActive && { color: WHITE }]}>{tab} ({count})</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        
        {dateFilter !== 'Any time' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
            <View style={{ backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: BLUE, fontWeight: '600', marginRight: 6 }}>Date: {dateFilter}</Text>
              <TouchableOpacity onPress={() => setDateFilter('Any time')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={14} color={BLUE} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── LIST ── */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ padding: 16 }}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.complaint_id ?? item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listContent}
            ListEmptyComponent={
              <EmptyState
                icon={ClipboardList}
                title="No complaints found"
                message="Your maintenance requests will appear here."
                action={{ label: "Refresh", onPress: fetchComplaints }}
              />
            }
            renderItem={({ item: c }) => {
              const statusKey = c.status ?? 'Open';
              const status = statusConfig[statusKey] ?? statusConfig['Open'];
              const dateStr = c.created_at ? new Date(c.created_at).toLocaleString() : '';
              
              return (
                <TouchableOpacity
                  style={s.listCard}
                  onPress={() => setSelectedComplaint({ ...c, date: dateStr, note: c.description })}
                  activeOpacity={0.85}
                >
                  <View style={s.cardContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 }}>
                        <View style={[s.iconWrap, { backgroundColor: '#F8FAFC' }]}>
                          {getCategoryIcon(c.category || '')}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.cardTitle} numberOfLines={1}>{c.title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Calendar size={12} color={TEXT_MID} />
                            <Text style={s.cardDate}>{dateStr.split(',')[0]}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[s.statusPill, { backgroundColor: status.bg }]}>
                        <Text style={[s.statusPillTxt, { color: status.text }]}>{statusKey}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 13, color: TEXT_MID, lineHeight: 18, marginTop: 4 }} numberOfLines={2}>
                      {c.description || 'No description provided.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* ── FLOATING ADD BTN ── */}
      <TouchableOpacity
        style={[
          s.fabWrapper,
          {
            bottom: Math.max(insets.bottom + 85, 100),
          },
        ]}
        onPress={() => setShowForm(true)}
        activeOpacity={0.85}
      >
        <View style={s.fab}>
          <Plus size={26} color={WHITE} strokeWidth={3} />
        </View>
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
  root: { flex: 1, backgroundColor: '#F7F9FC' },
  
  // Header
  headerGradient: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, marginTop: 8 },
  headerTitleBig: { fontSize: 22, fontWeight: '800', color: WHITE, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 8 },
  statChip: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statChipTxt: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, marginTop: 12 },
  backBtnMinimal: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: TEXT_DARK },
  headerStats: { fontSize: 13, color: TEXT_MID, marginTop: 6, fontWeight: '600' },
  
  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, paddingBottom: 4, marginTop: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 16, height: 52, shadowColor: '#1F2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 0 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: TEXT_DARK },
  filterBtn: { width: 52, height: 52, backgroundColor: '#EEF2FF', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  // Tabs
  tabWrapper: { paddingHorizontal: 20, marginTop: 4, marginBottom: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 24, padding: 4, shadowColor: '#1F2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 20 },
  tabActive: { backgroundColor: BLUE },
  tabText: { fontSize: 14, fontWeight: '600', color: TEXT_MID },
  tabTextActive: { color: WHITE },

  // List Cards
  listContent: { padding: 16, paddingTop: 8, paddingBottom: 100 },
  listCard: { backgroundColor: WHITE, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardContent: { padding: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cardDate: { fontSize: 12, color: TEXT_MID, fontWeight: '600' },
  
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // FAB
  fabWrapper: { position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, shadowColor: '#2952F3', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  fab: { flex: 1, borderRadius: 28, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center' },

  // Details View
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitleCenter: { fontSize: 17, fontWeight: '700', color: TEXT_DARK, letterSpacing: -0.3 },
  detailTopBlock: { backgroundColor: BLUE_LIGHT, borderRadius: 20, padding: 24, marginBottom: 24 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, flex: 1, paddingRight: 16 },
  detailDate: { fontSize: 12, color: TEXT_MID, marginTop: 8 },
  detailSection: { marginBottom: 24 },
  detailLbl: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 },
  detailValText: { fontSize: 15, color: TEXT_MID, lineHeight: 24 },
  attachmentsRow: { flexDirection: 'row', gap: 16 },
  largeImgBox: { flex: 1, height: 120, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  attachmentImg: { width: '100%', height: '100%', borderRadius: 14, resizeMode: 'cover' },
  zoomModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  zoomCloseBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 },
  zoomedImage: { width: '90%', height: '80%' },
  
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 50 : 36, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER },
  btnBlue: { backgroundColor: BLUE, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnBlueTxt: { color: WHITE, fontSize: 16, fontWeight: '700' },
  btnOutlined: { borderWidth: 1, borderColor: BLUE, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', marginRight: 16 },
  btnOutlinedTxt: { color: BLUE, fontSize: 16, fontWeight: '700' },

  // Stepper Modal
  modalOverlayFull: { flex: 1, backgroundColor: WHITE },
  modalContainerFull: { flex: 1, backgroundColor: WHITE },
  slimModalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  headerInnerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtnHeader: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  slimModalTitle: { fontSize: 18, fontWeight: '800', color: WHITE },
  
  formBody: { padding: 20, paddingBottom: 40 },
  stepContent: { flex: 1 },

  inputLbl: { fontSize: 13, fontWeight: '800', color: TEXT_DARK, marginBottom: 8, marginTop: 12 },
  inputBoxStyle: { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, height: 48, fontSize: 14, color: TEXT_DARK },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  priorityBtnActive: { borderColor: BLUE, backgroundColor: WHITE, borderWidth: 1.5 },
  priorityTxt: { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  priorityTxtActive: { color: BLUE, fontWeight: '700' },
  textAreaWrap: { borderWidth: 1, borderColor: BORDER, borderRadius: 14, backgroundColor: WHITE },
  textAreaStyle: { height: 90, padding: 12, fontSize: 14, color: TEXT_DARK },
  charCount: { position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: TEXT_MID },

  uploadArea: { borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 16, padding: 18, alignItems: 'center', backgroundColor: '#FAFAFA' },
  uploadTxt: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  uploadSub: { fontSize: 12, color: TEXT_MID },

  formFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: WHITE },
  btnReset: { paddingHorizontal: 20, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  btnResetTxt: { fontSize: 14, fontWeight: '700', color: TEXT_MID },
  btnSubmitModal: { backgroundColor: BLUE, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnSubmitModalTxt: { color: WHITE, fontSize: 15, fontWeight: '700' },
  
  // Category Picker
  catOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  catBox: { width: '100%', backgroundColor: WHITE, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  catTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 16 },
  catOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  catOptionTxt: { fontSize: 15, color: TEXT_DARK },
});
