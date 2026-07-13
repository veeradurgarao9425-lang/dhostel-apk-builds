import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, FileCheck2, Receipt, IdCard, Download, File, ArrowLeft, Plus } from 'lucide-react-native';

import { useToast } from '../context/ToastContext';
import { Phase3ErrorState, DocumentsSkeleton } from '../components/UIComponents';
import { AppHeader, EmptyState } from '../components/ui';
import { OfflineBanner } from '../components/NetworkComponents';
import { DownloadProgressSheet, FileErrorState } from '../components/MediaComponents';
import api from '../services/api';

const BLUE       = '#2245D4';
const BLUE_SOFT  = '#EEF2FF';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#1A1A1A';
const TEXT_MID   = '#666666';
const BG         = '#F8FAFD';
const BORDER     = '#E2E8F0';
const SUCCESS    = '#22C55E';
const SUCCESS_SOFT = '#DCFCE7';

type DocType = 'Agreement' | 'Receipt' | 'KYC' | 'Other';

const typeMeta: Record<DocType, { icon: any; tint: string; soft: string }> = {
  Agreement: { icon: FileCheck2, tint: BLUE,    soft: BLUE_SOFT },
  Receipt:   { icon: Receipt,    tint: SUCCESS,  soft: SUCCESS_SOFT },
  KYC:       { icon: IdCard,     tint: '#D97706', soft: '#FEF3C7' },
  Other:     { icon: File,       tint: TEXT_MID,  soft: '#F1F5F9' },
};

type DocFilter = 'All' | 'Agreement' | 'Receipt' | 'KYC' | 'Other';
const DOC_FILTERS: DocFilter[] = ['All', 'Receipt', 'Agreement', 'KYC', 'Other'];

type DlStatus = 'loading' | 'done' | 'error';

export default function DocumentsScreen({ navigation }: any) {
  const { showError } = useToast();
  const [documents, setDocuments]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DocFilter>('All');

  // Download progress state
  const [dlVisible, setDlVisible]   = useState(false);
  const [dlFileName, setDlFileName] = useState('');
  const [dlProgress, setDlProgress] = useState(0);
  const [dlStatus, setDlStatus]     = useState<DlStatus>('loading');
  const [dlError, setDlError]       = useState<'offline' | 'not_found' | 'unsupported' | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/fees/my-fees');
      const feeRecords: any[] = res.data?.data ?? res.data ?? [];
      const docs: any[] = [];
      for (const feeRecord of feeRecords) {
        for (const payment of (feeRecord.payments ?? [])) {
          if (payment.verification_status === 'verified') {
            docs.push({
              id: payment.payment_id.toString(),
              paymentId: payment.payment_id,
              name: `Receipt - ${feeRecord.fee_month}`,
              type: 'Receipt' as DocType,
              date: payment.payment_date,
            });
          }
        }
      }
      setDocuments(docs);
    } catch {
      setError('Could not load documents.');
      showError('Could not load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDocuments(); }, []));

  const handleDownload = async (paymentId: string | number, fileName: string) => {
    setDlFileName(fileName);
    setDlProgress(0);
    setDlStatus('loading');
    setDlError(null);
    setDlVisible(true);

    // Animate progress bar while API call is in flight
    let pct = 0;
    progressTimer.current = setInterval(() => {
      pct = Math.min(pct + 12, 85);
      setDlProgress(pct);
    }, 180);

    try {
      await api.get(`/fees/receipts/${paymentId}`);
      clearInterval(progressTimer.current!);
      setDlProgress(100);
      setDlStatus('done');
    } catch (e: any) {
      clearInterval(progressTimer.current!);
      setDlProgress(100);
      setDlStatus('error');
      const isOffline = !e?.response;
      setDlError(isOffline ? 'offline' : 'not_found');
    }
  };

  const closeDl = () => {
    if (dlStatus === 'loading') return;
    setDlVisible(false);
    setDlError(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      <AppHeader
        title="My Documents"
        subtitle="Manage your ID and agreements"
        showBack={navigation.canGoBack()}
      />

      {/* ── Offline Banner ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <OfflineBanner />
      </View>

      {/* ── Filter chips ── */}
      {!loading && !error && documents.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}
          style={{ backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER }}
        >
          {DOC_FILTERS.map(f => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f} onPress={() => setActiveFilter(f)} activeOpacity={0.7}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? BLUE : '#F1F5F9', borderWidth: 1, borderColor: active ? BLUE : BORDER }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFF' : TEXT_MID }}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView 
        contentContainerStyle={[
          s.scroll, 
          { flexGrow: 1 },
          (documents.length === 0 || (!loading && !error && activeFilter !== 'All' && documents.filter(d => d.type === activeFilter).length === 0)) 
            ? { justifyContent: 'center' } 
            : {}
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <DocumentsSkeleton />
        ) : error ? (
          <View style={{ marginTop: 40 }}>
            <Phase3ErrorState variant="server" onAction={fetchDocuments} />
          </View>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Documents Found"
            message="Your rental agreement, payment receipts, and KYC documents will appear here once verified."
          />
        ) : null}

        {!loading && !error && documents.length > 0 && (() => {
          const filtered = activeFilter === 'All' ? documents : documents.filter(d => d.type === activeFilter);
          if (filtered.length === 0) return (
            <View style={{ marginTop: 24 }}>
              <EmptyState
                icon={FileText}
                title={`No ${activeFilter} Documents`}
                message="No documents of this type found."
              />
            </View>
          );
          return (
            <View style={s.listCard}>
              {filtered.map((d, i) => {
                const meta = typeMeta[d.type as DocType] || typeMeta.Other;
                const Icon = meta.icon;
                return (
                  <View key={d.id}>
                    <View style={s.row}>
                      <View style={[s.iconWrap, { backgroundColor: meta.soft }]}>
                        <Icon size={22} color={meta.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.nameTxt} numberOfLines={1}>{d.name}</Text>
                        <Text style={s.metaTxt}>
                          {d.type} • {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <TouchableOpacity style={s.dlBtn} activeOpacity={0.7} onPress={() => handleDownload(d.paymentId, d.name)}>
                        <Download size={18} color={BLUE} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                    {i < filtered.length - 1 && <View style={s.divider} />}
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* File error inline state (when download failed) */}
        {dlError && !dlVisible && (
          <View style={{ marginTop: 12 }}>
            <FileErrorState type={dlError} />
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for Upload */}
      <TouchableOpacity 
        style={s.fab}
        onPress={() => showError('Document upload feature coming soon!')}
        activeOpacity={0.9}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      {/* ── Download Progress Sheet ── */}
      <DownloadProgressSheet
        visible={dlVisible}
        fileName={dlFileName}
        progress={dlProgress}
        status={dlStatus}
        onClose={closeDl}
      />
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
  fab: { position: 'absolute', bottom: 32, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
});
