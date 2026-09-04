import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar,
  Image, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  FileCheck2, Receipt, IdCard, Download, ArrowLeft,
  ShieldCheck, ShieldAlert, Eye, X, User, FileText,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { useToast } from '../../../contexts/ToastContext';
import { Phase3ErrorState, DocumentsSkeleton } from '../../components/tenant/UIComponents';
import { OfflineBanner } from '../../components/tenant/NetworkComponents';
import { DownloadProgressSheet } from '../../components/tenant/MediaComponents';
import api from '../../services/api';
import { getResolvedImageUrl } from '../../utils/imageHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BLUE = '#6D4AFF';
const BLUE_SOFT = '#F4F1FF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID = '#4A5568';
const TEXT_MUTED = '#94A3B8';
const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const SUCCESS = '#10B981';
const SUCCESS_SOFT = '#ECFDF5';
const AMBER = '#F59E0B';
const AMBER_SOFT = '#FFFBEB';

type DocFilter = 'All' | 'KYC' | 'Receipt';
const DOC_FILTERS: { key: DocFilter; label: string }[] = [
  { key: 'All', label: 'All Documents' },
  { key: 'KYC', label: 'KYC & ID Proofs' },
  { key: 'Receipt', label: 'Rent Receipts' },
];

export default function DocumentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DocFilter>('All');

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ uri: string; title: string } | null>(null);

  // Download progress state
  const [dlVisible, setDlVisible] = useState(false);
  const [dlFileName, setDlFileName] = useState('');
  const [dlProgress, setDlProgress] = useState(0);
  const [dlStatus, setDlStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile (KYC documents) and receipts in parallel
      const [profileRes, feesRes] = await Promise.all([
        api.get('/auth/tenant/me').catch(() => null),
        api.get('/fees/my-fees').catch(() => null),
      ]);

      if (profileRes?.data?.data) {
        setProfile(profileRes.data.data);
      }

      const feeRecords: any[] = feesRes?.data?.data ?? feesRes?.data ?? [];
      const receiptDocs: any[] = [];
      for (const feeRecord of feeRecords) {
        for (const payment of (feeRecord.payments ?? [])) {
          if (payment.verification_status === 'Verified' || payment.is_verified) {
            receiptDocs.push({
              id: payment.payment_id?.toString() || payment.id?.toString(),
              paymentId: payment.payment_id || payment.id,
              name: `Rent Receipt - ${feeRecord.fee_month || 'Monthly Rent'}`,
              type: 'Receipt',
              date: payment.payment_date || feeRecord.created_at,
              amount: payment.amount_paid || payment.amount || 0,
              paymentMode: payment.payment_mode || 'Online',
              receiptNo: payment.receipt_number || `REC-${payment.payment_id || payment.id}`,
            });
          }
        }
      }
      setReceipts(receiptDocs);
    } catch (e) {
      setError('Could not load your documents.');
      showError('Could not load documents. Please pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDocuments(); }, []));

  const handleDownloadReceipt = async (paymentId: string | number, fileName: string) => {
    setDlFileName(fileName);
    setDlProgress(0);
    setDlStatus('loading');
    setDlVisible(true);

    let pct = 0;
    progressTimer.current = setInterval(() => {
      pct = Math.min(pct + 15, 85);
      setDlProgress(pct);
    }, 150);

    try {
      const res = await api.get(`/fees/receipts/${paymentId}`);
      const r = res.data?.data;
      if (!res.data?.success || !r) throw new Error('Receipt not found');

      const amount = Number(r.amount_paid || 0).toLocaleString('en-IN');
      const paidDate = r.payment_date ? new Date(r.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
      const tenantName = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Tenant';
      const hostelName = r.hostel_name || 'Hostel';

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:32px;color:#1A1A1A;background:#FFF}
          .hdr{border-bottom:2px solid #6D4AFF;padding-bottom:16px;margin-bottom:20px}
          .hdr h1{font-size:20px;color:#6D4AFF;font-weight:800}
          .hdr p{font-size:13px;color:#64748B;margin-top:4px}
          .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #E2E8F0;font-size:14px}
          .row span:first-child{color:#64748B}
          .row span:last-child{font-weight:700}
          .amount{font-size:28px;font-weight:800;color:#10B981;margin:24px 0;text-align:center}
          .badge{display:inline-block;padding:4px 10px;background:#DCFCE7;color:#15803D;font-weight:700;font-size:12px;border-radius:6px}
        </style>
      </head>
      <body>
        <div class="hdr">
          <h1>${hostelName}</h1>
          <p>Payment Receipt &bull; ${r.fee_month || 'Rent Payment'}</p>
        </div>
        <div class="amount">&#8377;${amount}</div>
        <div class="row"><span>Receipt No</span><span>${r.receipt_number || `REC-${paymentId}`}</span></div>
        <div class="row"><span>Tenant</span><span>${tenantName}</span></div>
        <div class="row"><span>Room / Bed</span><span>Room ${r.room_number || '-'} (Bed ${r.bed_number || '-'})</span></div>
        <div class="row"><span>Payment Date</span><span>${paidDate}</span></div>
        <div class="row"><span>Payment Mode</span><span>${r.payment_mode || 'Online'}</span></div>
        <div class="row"><span>Status</span><span class="badge">Paid &amp; Verified</span></div>
      </body></html>`;

      if (progressTimer.current) clearInterval(progressTimer.current);
      setDlProgress(100);
      setDlStatus('done');

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      showSuccess('Receipt ready for download / share!');
    } catch (e: any) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setDlStatus('error');
      showError('Failed to generate receipt PDF.');
    }
  };

  const handleDownloadDoc = async (rawUrl: string, fileName: string) => {
    try {
      const resolved = getResolvedImageUrl(rawUrl) || rawUrl;
      if (!resolved) {
        showError('Document URL is not available.');
        return;
      }
      showSuccess('Preparing document download...');
      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const destUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${cleanName}`;
      const result = await FileSystem.downloadAsync(resolved, destUri);
      if (result.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'image/jpeg',
            dialogTitle: `Download / Save ${fileName}`,
          });
          showSuccess('Document ready to save / share!');
        } else {
          showSuccess('Document saved successfully!');
        }
      } else {
        throw new Error('Download failed from server');
      }
    } catch (e: any) {
      console.error('Download error:', e);
      showError('Could not download document.');
    }
  };

  const hasAadhaarFront = !!(profile?.id_proof_front_url || profile?.id_proof_document_url);
  const hasAadhaarBack = !!profile?.id_proof_back_url;
  const hasPhoto = !!profile?.profile_photo_url;
  const isKycVerified = profile?.id_proof_status === 1 || profile?.is_verified;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>My Documents</Text>
          <Text style={styles.headerSubtitle}>KYC proofs & payment receipts</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* KYC Status Banner */}
      {profile && (
        <View style={[styles.kycBanner, isKycVerified ? styles.kycVerifiedBg : styles.kycPendingBg]}>
          <View style={[styles.kycIconCircle, isKycVerified ? styles.kycVerifiedIcon : styles.kycPendingIcon]}>
            {isKycVerified ? <ShieldCheck size={20} color={SUCCESS} /> : <ShieldAlert size={20} color={AMBER} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycBannerTitle, { color: isKycVerified ? '#065F46' : '#92400E' }]}>
              {isKycVerified ? 'KYC Complete & Verified' : 'KYC Verification Pending'}
            </Text>
            <Text style={[styles.kycBannerSub, { color: isKycVerified ? '#047857' : '#B45309' }]}>
              {isKycVerified
                ? 'Your identity documents are verified by the hostel management.'
                : 'Your uploaded ID proofs are under review.'}
            </Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {DOC_FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <DocumentsSkeleton />
        </View>
      ) : error ? (
        <Phase3ErrorState variant="error" onAction={fetchDocuments} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ────────────────── KYC & ID PROOFS SECTION ────────────────── */}
          {(activeFilter === 'All' || activeFilter === 'KYC') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IdCard size={18} color={BLUE} />
                <Text style={styles.sectionTitle}>Identity & KYC Proofs</Text>
              </View>

              {/* ID Proof Card */}
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View>
                    <Text style={styles.cardTitle}>
                      {profile?.id_proof_type_name || profile?.id_proof_type || 'Govt ID Proof'}
                    </Text>
                    <Text style={styles.cardDocNumber}>
                      {profile?.id_proof_number ? `Number: ${profile.id_proof_number}` : 'ID Number on file'}
                    </Text>
                  </View>
                  <View style={[styles.badge, isKycVerified ? styles.badgeSuccess : styles.badgeAmber]}>
                    <Text style={[styles.badgeText, { color: isKycVerified ? SUCCESS : AMBER }]}>
                      {isKycVerified ? 'Verified' : 'Submitted'}
                    </Text>
                  </View>
                </View>

                {/* 2x2 Documents Grid */}
                {(() => {
                  const kycList = [
                    {
                      id: 'front',
                      title: 'ID Proof (Front)',
                      subtitle: profile?.id_proof_type_name || 'Front Side',
                      rawUrl: profile?.id_proof_front_url || profile?.id_proof_document_url,
                      Icon: IdCard,
                    },
                    {
                      id: 'back',
                      title: 'ID Proof (Back)',
                      subtitle: profile?.id_proof_type_name || 'Back Side',
                      rawUrl: profile?.id_proof_back_url,
                      Icon: IdCard,
                    },
                    {
                      id: 'photo',
                      title: 'Passport Photo',
                      subtitle: 'Profile Picture',
                      rawUrl: profile?.profile_photo_url,
                      Icon: User,
                    },
                    {
                      id: 'agreement',
                      title: 'Hostel Agreement',
                      subtitle: 'Terms & Rules',
                      rawUrl: profile?.police_verification_url || profile?.agreement_url || null,
                      Icon: FileText,
                    },
                  ];

                  return (
                    <View style={styles.docsGrid}>
                      {kycList.map((doc) => {
                        const hasDoc = !!doc.rawUrl;
                        const resolved = hasDoc ? (getResolvedImageUrl(doc.rawUrl) || doc.rawUrl) : null;
                        const DocIcon = doc.Icon;

                        return (
                          <View key={doc.id} style={styles.docTileCard}>
                            {hasDoc ? (
                              <View style={styles.docTileInner}>
                                <TouchableOpacity
                                  style={styles.docImageWrap}
                                  activeOpacity={0.85}
                                  onPress={() => setPreviewImage({ uri: resolved!, title: doc.title })}
                                >
                                  <Image
                                    source={{ uri: resolved! }}
                                    style={styles.docThumb}
                                    resizeMode="cover"
                                  />
                                  <View style={styles.docTileOverlay}>
                                    <Text style={styles.docTileLabel} numberOfLines={1}>{doc.title}</Text>
                                  </View>
                                </TouchableOpacity>

                                {/* Action Buttons Row */}
                                <View style={styles.docTileBottomBar}>
                                  <TouchableOpacity
                                    style={styles.docActionBtn}
                                    onPress={() => setPreviewImage({ uri: resolved!, title: doc.title })}
                                    activeOpacity={0.7}
                                  >
                                    <Eye size={13} color={BLUE} />
                                    <Text style={styles.docActionTxt}>View</Text>
                                  </TouchableOpacity>

                                  <View style={styles.docActionSep} />

                                  <TouchableOpacity
                                    style={styles.docActionBtn}
                                    onPress={() => handleDownloadDoc(doc.rawUrl!, `${doc.title}.jpg`)}
                                    activeOpacity={0.7}
                                  >
                                    <Download size={13} color={SUCCESS} />
                                    <Text style={[styles.docActionTxt, { color: SUCCESS }]}>Download</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.docTileEmpty}>
                                <View style={styles.docTileEmptyIcon}>
                                  <DocIcon size={24} color={TEXT_MUTED} />
                                </View>
                                <Text style={styles.docTileEmptyTitle} numberOfLines={1}>{doc.title}</Text>
                                <Text style={styles.docTileEmptySub}>Not uploaded</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            </View>
          )}

          {/* ────────────────── RENT RECEIPTS SECTION ────────────────── */}
          {(activeFilter === 'All' || activeFilter === 'Receipt') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Receipt size={18} color={SUCCESS} />
                <Text style={styles.sectionTitle}>Rent Receipts ({receipts.length})</Text>
              </View>

              {receipts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Receipt size={32} color={TEXT_MUTED} />
                  <Text style={styles.emptyCardTitle}>No Receipts Yet</Text>
                  <Text style={styles.emptyCardSub}>Verified rent payments will generate downloadable receipts here.</Text>
                </View>
              ) : (
                receipts.map((rec, index) => (
                  <View key={rec.id || index} style={styles.receiptCard}>
                    <View style={styles.receiptIcon}>
                      <FileCheck2 size={20} color={SUCCESS} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.receiptName}>{rec.name}</Text>
                      <Text style={styles.receiptMeta}>
                        {rec.date ? new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} &bull; &#8377;{Number(rec.amount).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={() => handleDownloadReceipt(rec.paymentId, `${rec.name}.pdf`)}
                      activeOpacity={0.8}
                    >
                      <Download size={16} color={BLUE} />
                      <Text style={styles.downloadBtnText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Image Preview Zoom Modal ── */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.previewModalOverlay}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.previewModalHeader}>
              <Text style={styles.previewModalTitle}>{previewImage?.title || 'Document Preview'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {previewImage?.uri && (
                  <TouchableOpacity
                    onPress={() => handleDownloadDoc(previewImage.uri, `${previewImage.title || 'document'}.jpg`)}
                    style={styles.previewCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Download size={20} color={WHITE} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setPreviewImage(null)}
                  style={styles.previewCloseBtn}
                  activeOpacity={0.7}
                >
                  <X size={22} color={WHITE} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.previewImageContainer}>
              {previewImage?.uri ? (
                <Image
                  source={{ uri: previewImage.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <ActivityIndicator color={WHITE} size="large" />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Download sheet */}
      <DownloadProgressSheet
        visible={dlVisible}
        fileName={dlFileName}
        progress={dlProgress}
        status={dlStatus}
        onClose={() => setDlVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_MID,
    marginTop: 1,
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kycVerifiedBg: {
    backgroundColor: SUCCESS_SOFT,
    borderColor: '#A7F3D0',
  },
  kycPendingBg: {
    backgroundColor: AMBER_SOFT,
    borderColor: '#FDE68A',
  },
  kycIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycVerifiedIcon: {
    backgroundColor: '#D1FAE5',
  },
  kycPendingIcon: {
    backgroundColor: '#FEF3C7',
  },
  kycBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  kycBannerSub: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabBtnActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: TEXT_MID,
  },
  tabBtnTextActive: {
    color: WHITE,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  cardDocNumber: {
    fontSize: 12.5,
    color: TEXT_MID,
    marginTop: 2,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: SUCCESS_SOFT,
  },
  badgeAmber: {
    backgroundColor: AMBER_SOFT,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  docTileCard: {
    width: (SCREEN_WIDTH - 32 - 32 - 12) / 2,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  docTileInner: {
    width: '100%',
  },
  docImageWrap: {
    width: '100%',
    height: 100,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  docThumb: {
    width: '100%',
    height: '100%',
  },
  docTileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docTileLabel: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '700',
  },
  docTileBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  docActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  docActionTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: BLUE,
  },
  docActionSep: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  docTileEmpty: {
    width: '100%',
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderStyle: 'dashed',
  },
  docTileEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  docTileEmptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 2,
  },
  docTileEmptySub: {
    fontSize: 10.5,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WHITE,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  receiptIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SUCCESS_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptName: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  receiptMeta: {
    fontSize: 12,
    color: TEXT_MID,
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BLUE_SOFT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  downloadBtnText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  emptyCardSub: {
    fontSize: 12,
    color: TEXT_MID,
    textAlign: 'center',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  previewModalTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  previewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
