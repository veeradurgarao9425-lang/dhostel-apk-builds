import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, FileCheck2, Receipt, IdCard, Download, File, ArrowLeft } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
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
const SUCCESS_SOFT= '#DCFCE7';

type DocType = 'Agreement' | 'Receipt' | 'KYC' | 'Other';

const typeMeta: Record<DocType, { icon: any; tint: string; soft: string }> = {
  Agreement: { icon: FileCheck2, tint: BLUE, soft: BLUE_SOFT },
  Receipt: { icon: Receipt, tint: SUCCESS, soft: SUCCESS_SOFT },
  KYC: { icon: IdCard, tint: '#D97706', soft: '#FEF3C7' },
  Other: { icon: File, tint: TEXT_MID, soft: '#F1F5F9' },
};

export default function DocumentsScreen({ navigation }: any) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/fees/my-fees');
      const feeRecords: any[] = res.data?.data ?? res.data ?? [];

      const docs: any[] = [];
      for (const feeRecord of feeRecords) {
        const payments: any[] = feeRecord.payments ?? [];
        for (const payment of payments) {
          if (payment.verification_status === 'verified') {
            docs.push({
              id: payment.payment_id.toString(),
              paymentId: payment.payment_id,
              name: `Receipt - ${feeRecord.fee_month}`,
              type: 'Receipt' as DocType,
              date: payment.payment_date,
              sizeKb: null,
            });
          }
        }
      }
      setDocuments(docs);
    } catch (err: any) {
      console.error('DocumentsScreen fetch error:', err);
      Alert.alert('Error', 'Could not load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = async (paymentId: string | number) => {
    try {
      const res = await api.get(`/fees/receipts/${paymentId}`);
      const receipt = res.data?.data ?? res.data;
      Alert.alert(
        'Receipt Details',
        `Receipt #: ${receipt.receipt_number ?? '-'}\nAmount: ₹${receipt.amount ?? '-'}\nDate: ${receipt.payment_date ? new Date(receipt.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}\nMethod: ${receipt.payment_method ?? '-'}\nStatus: ${receipt.verification_status ?? '-'}`,
      );
    } catch (err: any) {
      console.error('Receipt fetch error:', err);
      Alert.alert('Error', 'Could not load receipt details. Please try again.');
    }
  };

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
              <Text style={s.headerGreeting}>Documents</Text>
              <Text style={s.headerSub}>KYC, agreements & receipts</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={s.loadingTxt}>Loading documents…</Text>
          </View>
        ) : documents.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <FileText size={32} color={TEXT_MID} />
            </View>
            <Text style={s.emptyTitle}>No Documents Found</Text>
            <Text style={s.emptySub}>Your rental agreement, payment receipts, and KYC documents will appear here once verified.</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {documents.map((d, i) => {
              const meta = typeMeta[d.type as DocType] || typeMeta.Other;
              const Icon = meta.icon;
              return (
                <View key={d.id}>
                  <TouchableOpacity style={s.row} activeOpacity={0.7}>
                    <View style={[s.iconWrap, { backgroundColor: meta.soft }]}>
                      <Icon size={22} color={meta.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.nameTxt} numberOfLines={1}>{d.name}</Text>
                      <Text style={s.metaTxt}>
                        {d.type} • {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {d.sizeKb ? ` • ${d.sizeKb} KB` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity style={s.dlBtn} activeOpacity={0.7} onPress={() => handleDownload(d.paymentId)}>
                      <Download size={18} color={BLUE} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {i < documents.length - 1 && <View style={s.divider} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  headerSection: { backgroundColor: BLUE, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtnLight: { padding: 8, marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  scroll: { padding: 20, paddingBottom: 60 },

  loadingWrap: { marginTop: 60, alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: TEXT_MID, fontWeight: '500' },

  emptyCard: { backgroundColor: WHITE, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', marginTop: 20 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptySub: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },

  listCard: { backgroundColor: WHITE, borderRadius: 24, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  nameTxt: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  metaTxt: { fontSize: 13, color: TEXT_MID, fontWeight: '500' },
  dlBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: BORDER, marginLeft: 64 },
});
