import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Smartphone, Landmark, Banknote, ShieldCheck, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/ui';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { colors, radius, spacing, font } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';

interface PaymentMode {
  payment_mode_id: number;
  payment_mode_name: string;
}

export default function PaymentScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<PaymentMode[]>([]);
  
  const [amount, setAmount] = useState(String(user?.outstanding_due || ''));
  const [selectedMode, setSelectedMode] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<any>(null);
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchModes = async () => {
      try {
        const res = await api.get('/fees/payment-modes');
        if (res.data.success) {
          setModes(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedMode(res.data.data[0].payment_mode_id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch payment modes', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModes();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setProofImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!selectedMode) {
      alert('Please select a payment mode');
      return;
    }
    if (!proofImage) {
      alert('Please upload a payment screenshot/receipt');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('proof', {
        uri: proofImage.uri,
        name: proofImage.fileName || 'proof.jpg',
        type: proofImage.mimeType || 'image/jpeg',
      } as any);
      formData.append('amount_paid', amount);
      formData.append('payment_mode_id', String(selectedMode));
      if (reference) formData.append('transaction_reference', reference);
      if (notes) formData.append('notes', notes);

      const response = await api.post('/fees/upload-proof', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        alert('Payment proof submitted successfully! Awaiting owner verification.');
        await refreshUser();
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pay Rent</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay Rent</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          <Card style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total Outstanding</Text>
            <Text style={styles.amount}>{formatCurrency(Number(user?.outstanding_due || 0))}</Text>
            {user?.next_due_date && (
              <Text style={styles.due}>Due on {formatDate(user?.next_due_date)}</Text>
            )}
          </Card>

          <Text style={styles.sectionLabel}>Amount Paying</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.sectionLabel}>Payment Mode</Text>
          <View style={styles.modesGrid}>
            {modes.map((m) => {
              const isSelected = selectedMode === m.payment_mode_id;
              return (
                <TouchableOpacity
                  key={m.payment_mode_id}
                  style={[styles.modeCard, isSelected && styles.modeCardSelected]}
                  onPress={() => setSelectedMode(m.payment_mode_id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modeIconWrap, isSelected && { backgroundColor: colors.primary }]}>
                    {m.payment_mode_name.toLowerCase().includes('upi') ? (
                      <Smartphone size={18} color={isSelected ? '#fff' : colors.primary} />
                    ) : m.payment_mode_name.toLowerCase().includes('cash') ? (
                      <Banknote size={18} color={isSelected ? '#fff' : colors.primary} />
                    ) : (
                      <Landmark size={18} color={isSelected ? '#fff' : colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.modeText, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                    {m.payment_mode_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Transaction Reference / UPI ID (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={reference}
            onChangeText={setReference}
            placeholder="e.g. 1234567890"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.sectionLabel}>Payment Screenshot *</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage} activeOpacity={0.7}>
            {proofImage ? (
              <View style={styles.uploadedState}>
                <CheckCircle2 size={24} color={colors.success} />
                <Text style={styles.uploadedText}>Image Attached: {proofImage.fileName || 'Screenshot.jpg'}</Text>
                <Text style={styles.changeImageText}>Tap to change</Text>
              </View>
            ) : (
              <View style={styles.uploadPrompt}>
                <View style={styles.uploadIconWrap}>
                  <ImageIcon size={24} color={colors.primary} />
                </View>
                <Text style={styles.uploadText}>Tap to upload screenshot</Text>
                <Text style={styles.uploadSubtext}>Supported formats: JPG, PNG</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.secure}>
            <ShieldCheck size={14} color={colors.success} />
            <Text style={styles.secureText}>Details will be verified by the owner</Text>
          </View>

          <Button
            title="Submit Payment Details"
            icon={Upload}
            onPress={handleSubmit}
            loading={uploading}
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: spacing.xl },
  
  amountCard: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.xl, backgroundColor: colors.primarySoft, borderWidth: 0 },
  amountLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  amount: { fontSize: 36, fontWeight: '800', color: colors.primary, letterSpacing: -1, marginTop: 4 },
  due: { fontSize: 12, color: colors.primary, marginTop: 4, opacity: 0.8 },
  
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSubtle, marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    height: 56,
  },
  currencyPrefix: { fontSize: 20, fontWeight: '600', color: colors.text, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '600', color: colors.text, height: '100%' },
  
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: colors.text,
  },
  
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: { fontSize: 13, fontWeight: '600', color: colors.text },
  
  uploadBox: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPrompt: { alignItems: 'center' },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadText: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  uploadSubtext: { fontSize: 12, color: colors.textMuted },
  
  uploadedState: { alignItems: 'center' },
  uploadedText: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' },
  changeImageText: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 8 },

  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  secureText: { fontSize: 12, color: colors.textMuted },
});
