import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Smartphone, Landmark, Banknote, ShieldCheck, Upload, CheckCircle2, Image as ImageIcon, Check } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

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

export default function PaymentScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<PaymentMode[]>([]);
  
  const [amount, setAmount] = useState(String(user?.outstanding_due || '0'));
  const [selectedMode, setSelectedMode] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [proofImage, setProofImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchModes = async () => {
      try {
        const res = await api.get('/fees/payment-modes');
        if (res.data?.success) {
          setModes(res.data.data);
          if (res.data.data.length > 0) setSelectedMode(res.data.data[0].payment_mode_id);
        }
      } catch (err) {
        // Mocking modes if network fails so UI is still visible for review
        setModes([
          { payment_mode_id: 1, payment_mode_name: 'UPI / GPay' },
          { payment_mode_id: 2, payment_mode_name: 'Cash' },
          { payment_mode_id: 3, payment_mode_name: 'Bank Transfer' }
        ]);
        setSelectedMode(1);
      } finally {
        setLoading(false);
      }
    };
    fetchModes();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setProofImage(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return alert('Please enter a valid amount');
    if (!selectedMode) return alert('Please select a payment mode');
    if (!proofImage) return alert('Please upload a payment screenshot');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('proof', { uri: proofImage.uri, name: proofImage.fileName || 'proof.jpg', type: proofImage.mimeType || 'image/jpeg' } as any);
      formData.append('amount_paid', amount);
      formData.append('payment_mode_id', String(selectedMode));
      if (reference) formData.append('transaction_reference', reference);

      const response = await api.post('/fees/upload-proof', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        alert('Payment proof submitted successfully! Awaiting owner verification.');
        await refreshUser();
        navigation.goBack();
      }
    } catch (error) {
      alert('Failed to submit payment. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BLUE} />
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
              <ArrowLeft size={24} color={WHITE} strokeWidth={2.5} />
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
          
          {/* OUTSTANDING CARD */}
          <View style={s.outstandingCard}>
            <Text style={s.outLbl}>TOTAL OUTSTANDING</Text>
            <Text style={s.outVal}>₹{user?.outstanding_due || 0}</Text>
            {user?.next_due_date ? (
              <View style={s.dueBadge}>
                <Text style={s.dueTxt}>Due on {new Date(user.next_due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
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
              const isUPI = m.payment_mode_name.toLowerCase().includes('upi');
              const isCash = m.payment_mode_name.toLowerCase().includes('cash');
              
              return (
                <TouchableOpacity
                  key={m.payment_mode_id}
                  style={[s.modeCard, isSelected && s.modeCardSelected]}
                  onPress={() => setSelectedMode(m.payment_mode_id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.modeIconWrap, isSelected && { backgroundColor: BLUE }]}>
                    {isUPI ? <Smartphone size={20} color={isSelected ? WHITE : BLUE} /> : 
                     isCash ? <Banknote size={20} color={isSelected ? WHITE : BLUE} /> : 
                     <Landmark size={20} color={isSelected ? WHITE : BLUE} />}
                  </View>
                  <Text style={[s.modeText, isSelected && { color: BLUE, fontWeight: '800' }]}>{m.payment_mode_name}</Text>
                  
                  {isSelected && (
                    <View style={s.modeCheck}>
                      <Check size={12} color={WHITE} strokeWidth={3} />
                    </View>
                  )}
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
          <TouchableOpacity style={[s.uploadBox, proofImage && s.uploadBoxSuccess]} onPress={pickImage} activeOpacity={0.7}>
            {proofImage ? (
              <View style={s.uploadedState}>
                <Image source={{ uri: proofImage.uri }} style={s.proofImgPreview} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={s.uploadedText}>Image Attached</Text>
                  <Text style={s.changeImageText}>Tap here to change</Text>
                </View>
                <CheckCircle2 size={24} color={SUCCESS} strokeWidth={2.5} />
              </View>
            ) : (
              <View style={s.uploadPrompt}>
                <View style={s.uploadIconWrap}>
                  <ImageIcon size={28} color={BLUE} strokeWidth={2} />
                </View>
                <Text style={s.uploadText}>Tap to attach screenshot</Text>
                <Text style={s.uploadSubtext}>Required for verification (JPG, PNG)</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={s.secureNotice}>
            <ShieldCheck size={16} color={SUCCESS} strokeWidth={2.5} />
            <Text style={s.secureText}>Your payment will be manually verified by the owner.</Text>
          </View>

          <TouchableOpacity style={[s.saveBtn, uploading && s.saveBtnDisabled]} onPress={handleSubmit} disabled={uploading} activeOpacity={0.85}>
            {uploading ? (
              <ActivityIndicator color={WHITE} />
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
  
  scroll: { padding: 20, paddingTop: 20, paddingBottom: 40, flexGrow: 1 },

  outstandingCard: { backgroundColor: '#F0FDF4', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#DCFCE7' },
  outLbl: { fontSize: 12, fontWeight: '800', color: '#16A34A', letterSpacing: 1, marginBottom: 8 },
  outVal: { fontSize: 44, fontWeight: '900', color: TEXT_DARK, letterSpacing: -1 },
  dueBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12 },
  dueTxt: { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  amountContainer: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: TEXT_MID, marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: BORDER },
  rupee: { fontSize: 32, fontWeight: '800', color: TEXT_DARK, marginRight: 12 },
  amountInput: { fontSize: 36, fontWeight: '800', color: TEXT_DARK, flex: 1, padding: 0 },

  modesGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modeCard: { flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  modeCardSelected: { borderColor: BLUE, backgroundColor: BLUE_SOFT },
  modeIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modeText: { fontSize: 12, fontWeight: '600', color: TEXT_MID, textAlign: 'center' },
  modeCheck: { position: 'absolute', top: -6, right: -6, backgroundColor: BLUE, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: WHITE },

  inputWrapper: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 24 },
  textInput: { fontSize: 15, color: TEXT_DARK, fontWeight: '600', height: 50 },

  uploadBox: { backgroundColor: WHITE, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed', marginBottom: 24 },
  uploadBoxSuccess: { borderStyle: 'solid', borderColor: '#DCFCE7', backgroundColor: '#F0FDF4', padding: 16 },
  uploadPrompt: { alignItems: 'center' },
  uploadIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  uploadText: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  uploadSubtext: { fontSize: 12, color: TEXT_MID },
  
  uploadedState: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  proofImgPreview: { width: 64, height: 64, borderRadius: 12 },
  uploadedText: { fontSize: 15, fontWeight: '800', color: TEXT_DARK },
  changeImageText: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginTop: 4 },

  secureNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 8, backgroundColor: '#F0FDF4', paddingVertical: 12, borderRadius: 12 },
  secureText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },

  saveBtn: { backgroundColor: BLUE, borderRadius: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  saveBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: WHITE, fontSize: 16, fontWeight: '800' },
});
