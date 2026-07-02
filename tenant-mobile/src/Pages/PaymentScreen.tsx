import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
  Image, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Smartphone, Landmark, Banknote, ShieldCheck, Upload, X, UploadCloud } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { PaymentSkeleton } from '../components/UIComponents';
import { OfflineBanner } from '../components/NetworkComponents';
import { UploadProgressBar } from '../components/MediaComponents';

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF2FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#666666';
const TEXT_LIGHT= '#9CA3AF';
const BG        = '#F8FAFD';
const BORDER    = '#E2E8F0';
const SUCCESS   = '#22C55E';
const SUCCESS_BG= '#DCFCE7';

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export default function PaymentScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading]         = useState(true);
  const [modes, setModes]             = useState<PaymentMode[]>([]);
  const [amount, setAmount]           = useState(String(user?.outstanding_due || '0'));
  const [selectedMode, setSelectedMode] = useState<number | null>(null);
  const [reference, setReference]     = useState('');
  const [proofImage, setProofImage]   = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchModes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/fees/payment-modes');
      if (res.data?.success) {
        setModes(res.data.data);
        if (res.data.data.length > 0) setSelectedMode(res.data.data[0].payment_mode_id);
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

  useFocusEffect(useCallback(() => { fetchModes(); }, []));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setProofImage(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showWarning('Please enter a valid amount.');
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
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('proof', { uri: proofImage.uri, name: proofImage.fileName || 'proof.jpg', type: proofImage.mimeType || 'image/jpeg' } as any);
      formData.append('amount_paid', amount);
      formData.append('payment_mode_id', String(selectedMode));
      if (reference) formData.append('transaction_reference', reference);

      const response = await api.post('/fees/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          setUploadProgress(pct);
        },
      });

      if (response.data.success) {
        setUploadProgress(100);
        setUploadStatus('done');
        showSuccess('Payment proof submitted! Awaiting owner verification.');
        await refreshUser();
        setTimeout(() => navigation.goBack(), 1200);
      }
    } catch {
      setUploadStatus('error');
      showError('Failed to submit payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" backgroundColor={BLUE} />
        <View style={s.headerSection}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
            <View style={s.headerTop}>
              <View style={s.backBtnLight}>
                <ChevronLeft size={28} color={WHITE} strokeWidth={3} />
              </View>
            </View>
          </SafeAreaView>
        </View>
        <PaymentSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── HEADER ── */}
      <View style={s.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnLight} activeOpacity={0.7}>
              <ChevronLeft size={28} color={WHITE} strokeWidth={3} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.headerGreeting}>Pay Rent</Text>
              <Text style={s.headerSub}>Clear your dues securely</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Offline Banner ── */}
          <OfflineBanner />

          {/* OUTSTANDING CARD */}
          <View style={s.outstandingCard}>
            <View>
              <Text style={s.outLbl}>TOTAL OUTSTANDING</Text>
              <Text style={s.outVal}>₹{user?.outstanding_due || 0}</Text>
            </View>
            {user?.next_due_date ? (
              <View style={s.dueBadge}>
                <Text style={s.dueTxt}>Due: {new Date(user.next_due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
              </View>
            ) : null}
          </View>

          {/* AMOUNT TO PAY */}
          <View style={s.amountContainer}>
            <Text style={s.sectionLabel}>Amount to Pay</Text>
            <View style={s.amountRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor="#CBD5E0"
              />
            </View>
          </View>

          {/* PAYMENT MODE */}
          <Text style={s.sectionLabel}>Payment Mode</Text>
          <View style={s.modesGrid}>
            {modes.map((m) => {
              const isSelected = selectedMode === m.payment_mode_id;
              const isUPI  = m.payment_mode_name.toLowerCase().includes('upi');
              const isCash = m.payment_mode_name.toLowerCase().includes('cash');
              return (
                <TouchableOpacity
                  key={m.payment_mode_id}
                  style={[s.modeCard, isSelected && s.modeCardSelected]}
                  onPress={() => setSelectedMode(m.payment_mode_id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.radioOuter, isSelected && { borderColor: BLUE }]}>
                    {isSelected && <View style={[s.radioInner, { backgroundColor: BLUE }]} />}
                  </View>
                  <Text style={[s.modeText, isSelected && { color: BLUE, fontWeight: '800' }]}>{m.payment_mode_name}</Text>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {isUPI  ? <Smartphone size={20} color={isSelected ? BLUE : TEXT_MID} /> :
                     isCash ? <Banknote   size={20} color={isSelected ? BLUE : TEXT_MID} /> :
                               <Landmark   size={20} color={isSelected ? BLUE : TEXT_MID} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* REFERENCE ID */}
          <Text style={s.sectionLabel}>Transaction Reference (Optional)</Text>
          <View style={s.inputWrapper}>
            <TextInput
              style={s.textInput}
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. UPI Ref Number"
              placeholderTextColor={TEXT_LIGHT}
            />
          </View>

          {/* SCREENSHOT UPLOAD */}
          <Text style={s.sectionLabel}>Payment Screenshot *</Text>
          <TouchableOpacity style={s.uploadBoxNew} onPress={pickImage} activeOpacity={0.7}>
            {proofImage ? (
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <View style={[s.largeImgBox, { width: 100, height: 100, flex: 0 }]}>
                  <Image source={{ uri: proofImage.uri }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                  <TouchableOpacity
                    style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 12, padding: 4 }}
                    onPress={() => setProofImage(null)}
                  >
                    <X size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={s.uploadedText}>Screenshot Attached</Text>
                  <Text style={s.changeImageText}>Tap to change</Text>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <UploadCloud size={40} color={BLUE} style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT_DARK }}>Tap to attach screenshot</Text>
                <Text style={{ fontSize: 14, color: TEXT_MID, marginVertical: 8 }}>JPG, PNG up to 5MB</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={s.secureNotice}>
            <ShieldCheck size={16} color={SUCCESS} strokeWidth={2.5} />
            <Text style={s.secureText}>Your payment will be manually verified by the owner.</Text>
          </View>

          {/* Upload progress bar */}
          <UploadProgressBar progress={uploadProgress} status={uploadStatus} />

          <TouchableOpacity
            style={[s.saveBtn, uploadStatus === 'uploading' && s.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={uploadStatus === 'uploading'}
            activeOpacity={0.85}
          >
            {uploadStatus === 'uploading' ? (
              <Text style={s.saveBtnText}>Uploading… {uploadProgress}%</Text>
            ) : (
              <>
                <Upload size={20} color={WHITE} strokeWidth={2.5} style={{ marginRight: 8 }} />
                <Text style={s.saveBtnText}>Submit Details</Text>
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
  headerSection: { backgroundColor: BLUE, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtnLight: { padding: 8, marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { padding: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1 },
  outstandingCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: BORDER },
  outLbl: { fontSize: 11, fontWeight: '700', color: TEXT_LIGHT, letterSpacing: 1, marginBottom: 2 },
  outVal: { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  dueBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dueTxt: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  amountContainer: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: TEXT_MID, marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: BORDER },
  rupee: { fontSize: 32, fontWeight: '800', color: TEXT_DARK, marginRight: 12 },
  amountInput: { fontSize: 36, fontWeight: '800', color: TEXT_DARK, flex: 1, padding: 0 },
  modesGrid: { gap: 12, marginBottom: 24 },
  modeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  modeCardSelected: { borderColor: BLUE, backgroundColor: BLUE_SOFT },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  modeText: { fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  inputWrapper: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 24 },
  textInput: { fontSize: 15, color: TEXT_DARK, fontWeight: '600', height: 50 },
  uploadBoxNew: { borderWidth: 2, borderColor: BLUE, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, backgroundColor: BLUE_SOFT },
  largeImgBox: { height: 120, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  uploadedText: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  changeImageText: { fontSize: 14, color: BLUE, fontWeight: '600' },
  secureNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8, backgroundColor: '#F0FDF4', paddingVertical: 12, borderRadius: 12 },
  secureText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
  saveBtn: { backgroundColor: BLUE, borderRadius: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  saveBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: WHITE, fontSize: 16, fontWeight: '800' },
});
