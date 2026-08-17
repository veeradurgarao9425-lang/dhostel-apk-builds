import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Smartphone,
  Landmark,
  Banknote,
  CreditCard,
  ShieldCheck,
  Upload,
  X,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import api from '../../services/api';
import { PaymentSkeleton } from '../../components/tenant/UIComponents';
import { OfflineBanner } from '../../components/tenant/NetworkComponents';
import { UploadProgressBar } from '../../components/tenant/MediaComponents';
import { AppHeader } from '../../components/tenant/ui';

const BLUE = '#6D4AFF';
const BLUE_SOFT = '#F5F3FF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1E293B';
const TEXT_MID = '#64748B';
const TEXT_LIGHT = '#94A3B8';
const BG = '#FAFAFC';
const BORDER = '#E2E8F0';
const SUCCESS = '#10B981';
const DANGER = '#EF4444';

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export default function PaymentScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [amount, setAmount] = useState(String(user?.outstanding_due || '0'));
  const [selectedMode, setSelectedMode] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [proofImage, setProofImage] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchModes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/fees/payment-modes');
      if (res.data?.success && res.data.data.length > 0) {
        setModes(res.data.data);
        setSelectedMode(res.data.data[0].payment_mode_id);
      } else {
        setModes([
          { payment_mode_id: 1, payment_mode_name: 'UPI / GPay' },
          { payment_mode_id: 2, payment_mode_name: 'Cash' },
          { payment_mode_id: 3, payment_mode_name: 'Bank Transfer' },
        ]);
        setSelectedMode(1);
      }
    } catch {
      setModes([
        { payment_mode_id: 1, payment_mode_name: 'UPI / GPay' },
        { payment_mode_id: 2, payment_mode_name: 'Cash' },
        { payment_mode_id: 3, payment_mode_name: 'Bank Transfer' },
      ]);
      setSelectedMode(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchModes(); }, [fetchModes]));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProofImage(result.assets[0]);
      setUploadStatus('idle');
      setUploadProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showWarning('Please enter a valid payment amount.');
      return;
    }
    if (!selectedMode) {
      showWarning('Please select a payment mode.');
      return;
    }
    if (!proofImage) {
      showWarning('Please upload a payment screenshot.');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(10);

    try {
      const uri = proofImage.uri;
      const filename = proofImage.fileName || uri.split('/').pop() || `proof_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = proofImage.mimeType || (ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg');

      const formData = new FormData();
      formData.append('proof', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename,
        type: mimeType,
      } as any);
      formData.append('amount_paid', String(amount));
      formData.append('payment_mode_id', String(selectedMode));
      if (reference && reference.trim()) {
        formData.append('transaction_reference', reference.trim());
      }

      setUploadProgress(40);

      const response = await api.post('/fees/upload-proof', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
        transformRequest: (data) => data,
        onUploadProgress: (e: any) => {
          if (e.total) {
            const pct = Math.min(95, Math.round((e.loaded / e.total) * 100));
            setUploadProgress(pct);
          }
        },
      });

      if (response.data.success) {
        setUploadProgress(100);
        setUploadStatus('done');
        showSuccess('Payment proof submitted! Awaiting owner verification.');
        await refreshUser();
        setTimeout(() => navigation.goBack(), 1200);
      } else {
        setUploadStatus('error');
        showError(response.data.message || 'Failed to submit payment proof.');
      }
    } catch (err: any) {
      setUploadStatus('error');
      const msg = err.response?.data?.message || err.message || 'Failed to submit payment. Please try again.';
      showError(msg);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <AppHeader title="Pay Rent" subtitle="Clear your dues securely" showBack={true} />
        <PaymentSkeleton />
      </View>
    );
  }

  const getModeIcon = (name: string, isSelected: boolean) => {
    const lower = name.toLowerCase();
    const color = isSelected ? '#FFFFFF' : '#64748B';
    if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('qr')) {
      return <Smartphone size={20} color={color} />;
    }
    if (lower.includes('cash')) {
      return <Banknote size={20} color={color} />;
    }
    if (lower.includes('card') || lower.includes('debit') || lower.includes('credit')) {
      return <CreditCard size={20} color={color} />;
    }
    return <Landmark size={20} color={color} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <AppHeader title="Pay Rent" subtitle="Clear your dues securely" showBack={true} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Offline Banner */}
          <OfflineBanner />

          {/* Outstanding Card */}
          <View style={s.outstandingCard}>
            <View>
              <Text style={s.outLbl}>TOTAL OUTSTANDING</Text>
              <Text style={s.outVal}>₹{user?.outstanding_due || 0}</Text>
            </View>
            {user?.next_due_date ? (
              <View style={s.dueBadge}>
                <Text style={s.dueTxt}>
                  Due: {new Date(user.next_due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Amount to Pay */}
          <View style={s.amountContainer}>
            <Text style={s.sectionLabel}>
              Amount to Pay <Text style={s.requiredStar}>*</Text>
            </Text>
            <View style={s.amountRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </View>

          {/* Payment Mode Selector */}
          <Text style={s.sectionLabel}>
            Payment Mode <Text style={s.requiredStar}>*</Text>
          </Text>
          <View style={s.modesGrid}>
            {modes.map((m) => {
              const isSelected = selectedMode === m.payment_mode_id;
              return (
                <TouchableOpacity
                  key={m.payment_mode_id}
                  style={[s.modeCard, isSelected && s.modeCardSelected]}
                  onPress={() => setSelectedMode(m.payment_mode_id)}
                  activeOpacity={0.75}
                >
                  <View style={[s.modeIconWrap, isSelected ? s.modeIconWrapSelected : s.modeIconWrapUnselected]}>
                    {getModeIcon(m.payment_mode_name, isSelected)}
                  </View>
                  <Text style={[s.modeText, isSelected && s.modeTextSelected]} numberOfLines={1}>
                    {m.payment_mode_name}
                  </Text>
                  {isSelected && (
                    <View style={s.checkBadge}>
                      <CheckCircle2 size={16} color={BLUE} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reference ID */}
          <Text style={s.sectionLabel}>Transaction Reference / UTR (Optional)</Text>
          <View style={s.inputWrapper}>
            <TextInput
              style={s.textInput}
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. 12-digit UPI / Bank Ref ID"
              placeholderTextColor={TEXT_LIGHT}
            />
          </View>

          {/* Screenshot Upload */}
          <Text style={s.sectionLabel}>
            Payment Screenshot <Text style={s.requiredStar}>*</Text>
          </Text>

          <TouchableOpacity style={[s.uploadBoxNew, proofImage && s.uploadBoxAttached]} onPress={pickImage} activeOpacity={0.7}>
            {proofImage ? (
              <View style={s.previewRow}>
                <View style={s.previewImgWrap}>
                  <Image source={{ uri: proofImage.uri }} style={s.previewImg} />
                  <TouchableOpacity
                    style={s.removeImgBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setProofImage(null);
                      setUploadStatus('idle');
                    }}
                    hitSlop={8}
                  >
                    <X size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={s.attachedBadge}>
                    <ImageIcon size={12} color="#16A34A" />
                    <Text style={s.attachedBadgeText}>Screenshot Attached</Text>
                  </View>
                  <Text style={s.fileNameText} numberOfLines={1}>
                    {proofImage.fileName || 'payment_proof.jpg'}
                  </Text>
                  <Text style={s.changeImageText}>Tap box to change screenshot</Text>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={s.uploadIconCircle}>
                  <UploadCloud size={28} color={BLUE} />
                </View>
                <Text style={s.uploadTitle}>Tap to attach payment proof</Text>
                <Text style={s.uploadSub}>Supports JPG, PNG, Screenshots up to 5MB</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Upload Progress Bar */}
          {uploadStatus === 'uploading' && (
            <View style={s.progressSection}>
              <View style={s.progressRow}>
                <Text style={s.progressLabel}>Uploading payment proof...</Text>
                <Text style={s.progressPct}>{uploadProgress}%</Text>
              </View>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          )}

          <View style={s.secureNotice}>
            <ShieldCheck size={16} color={SUCCESS} strokeWidth={2.5} />
            <Text style={s.secureText}>Your payment will be manually verified by the hostel owner.</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[s.saveBtn, uploadStatus === 'uploading' && s.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={uploadStatus === 'uploading'}
            activeOpacity={0.85}
          >
            {uploadStatus === 'uploading' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={WHITE} />
                <Text style={s.saveBtnText}>Uploading… {uploadProgress}%</Text>
              </View>
            ) : (
              <>
                <Upload size={18} color={WHITE} strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={s.saveBtnText}>Submit Payment Proof</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1 },
  outstandingCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
  },
  outLbl: { fontSize: 11, fontWeight: '700', color: TEXT_LIGHT, letterSpacing: 0.8, marginBottom: 2 },
  outVal: { fontSize: 24, fontWeight: '800', color: TEXT_DARK },
  dueBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dueTxt: { fontSize: 11, fontWeight: '700', color: DANGER },

  amountContainer: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_MID,
    marginBottom: 10,
    marginLeft: 2,
    letterSpacing: 0.3,
  },
  requiredStar: {
    color: DANGER,
    fontWeight: '800',
    fontSize: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  rupee: { fontSize: 28, fontWeight: '800', color: TEXT_DARK, marginRight: 10 },
  amountInput: { fontSize: 32, fontWeight: '800', color: TEXT_DARK, flex: 1, padding: 0 },

  // Modes
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    minWidth: '47%',
    flex: 1,
    gap: 10,
  },
  modeCardSelected: {
    borderColor: BLUE,
    backgroundColor: BLUE_SOFT,
  },
  modeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconWrapSelected: {
    backgroundColor: BLUE,
  },
  modeIconWrapUnselected: {
    backgroundColor: '#F1F5F9',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MID,
    flex: 1,
  },
  modeTextSelected: {
    color: BLUE,
  },
  checkBadge: {
    marginLeft: 'auto',
  },

  inputWrapper: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  textInput: { fontSize: 14, color: TEXT_DARK, fontWeight: '600', height: 48 },

  // Upload Box
  uploadBoxNew: {
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  uploadBoxAttached: {
    borderColor: BLUE,
    backgroundColor: BLUE_SOFT,
    borderStyle: 'solid',
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  uploadSub: { fontSize: 12, color: TEXT_MID, marginTop: 4 },

  // Preview
  previewRow: { flexDirection: 'row', gap: 14, width: '100%', alignItems: 'center' },
  previewImgWrap: { width: 76, height: 76, position: 'relative' },
  previewImg: { width: '100%', height: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1' },
  removeImgBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: DANGER,
    borderRadius: 10,
    padding: 3,
  },
  attachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  attachedBadgeText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  fileNameText: { fontSize: 12, fontWeight: '600', color: TEXT_DARK, marginBottom: 2 },
  changeImageText: { fontSize: 11, color: BLUE, fontWeight: '700' },

  // Progress bar
  progressSection: {
    marginBottom: 16,
    backgroundColor: WHITE,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, fontWeight: '700', color: BLUE },
  progressPct: { fontSize: 12, fontWeight: '800', color: BLUE },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BLUE,
    borderRadius: 3,
  },

  secureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  secureText: { fontSize: 11, fontWeight: '600', color: '#16A34A', flexShrink: 1 },

  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: WHITE, fontSize: 15, fontWeight: '800' },
});
