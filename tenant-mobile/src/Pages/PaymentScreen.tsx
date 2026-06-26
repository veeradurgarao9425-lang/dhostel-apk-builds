import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Smartphone, Landmark, Banknote, ShieldCheck } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/ui';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { colors, radius, spacing, font } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';

const methods = [
  { key: 'upi', label: 'UPI', detail: 'GPay, PhonePe, Paytm', icon: Smartphone },
  { key: 'bank', label: 'Bank transfer', detail: 'NEFT / IMPS', icon: Landmark },
  { key: 'cash', label: 'Cash at desk', detail: 'Pay the front desk', icon: Banknote },
];

export default function PaymentScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const amount = Number(user?.outstanding_due || 0);
  const [uploading, setUploading] = useState(false);

  const handleUploadProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        const asset = result.assets[0];
        
        const formData = new FormData();
        formData.append('proof', {
          uri: asset.uri,
          name: asset.fileName || 'proof.jpg',
          type: asset.mimeType || 'image/jpeg',
        } as any);
        formData.append('amount_paid', String(amount));
        formData.append('payment_mode_id', '1'); // Defaulting to UPI/Online for uploaded proofs

        const response = await api.post('/fees/upload-proof', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          alert('Payment proof uploaded successfully!');
          await refreshUser();
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Failed to upload payment proof');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay rent</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount due</Text>
          <Text style={styles.amount}>{formatCurrency(amount)}</Text>
          {user?.next_due_date && (
            <Text style={styles.due}>Due on {formatDate(user?.next_due_date)}</Text>
          )}
        </Card>

        <Text style={styles.section}>Choose a payment method</Text>
        {methods.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.key} style={styles.method} onPress={() => {}}>
              <View style={styles.methodIcon}>
                <Icon size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>{m.label}</Text>
                <Text style={styles.methodDetail}>{m.detail}</Text>
              </View>
            </Card>
          );
        })}

        <View style={styles.secure}>
          <ShieldCheck size={14} color={colors.success} />
          <Text style={styles.secureText}>Payments are recorded against your account</Text>
        </View>

        <Button
          title="Upload Payment Proof"
          icon={Smartphone}
          onPress={handleUploadProof}
          loading={uploading}
          style={{ marginTop: spacing.lg }}
        />
        <Text style={styles.hint}>
          For now, pay via the methods above and your owner will mark it received.
        </Text>
      </View>
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
  },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg },
  amountCard: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  amountLabel: { fontSize: font.small, color: colors.textMuted },
  amount: { fontSize: 42, fontWeight: '800', color: colors.text, letterSpacing: -1, marginTop: 4 },
  due: { fontSize: font.small, color: colors.textMuted, marginTop: 4 },
  section: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginTop: spacing['2xl'], marginBottom: spacing.md },
  method: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: { fontSize: font.body, fontWeight: '700', color: colors.text },
  methodDetail: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md },
  secureText: { fontSize: font.tiny, color: colors.textMuted },
  hint: { fontSize: font.small, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.md, lineHeight: 19 },
});
