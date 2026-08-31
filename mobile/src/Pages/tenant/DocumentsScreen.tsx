import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar,
  Image, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  FileCheck2, Receipt, IdCard, Download, ArrowLeft,
  ShieldCheck, ShieldAlert, Eye, X, User, Share2,
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
import AppHeader from '../../components/tenant/ui/AppHeader';
import { generateReceiptHtml } from '../../utils/receiptHtml';
import { downloadAndSaveFile } from '../../utils/fileDownloader';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

const BLUE = '#7C3AED';
const BLUE_SOFT = '#EDE9FE';
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
              name: `Receipt - ${feeRecord.fee_month || 'Rent'}`,
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

      const amountPaid = parseFloat(String(r.amount_paid || r.amount || 0));
      const studentName = `${r.first_name || ''} ${r.last_name || ''}`.trim() || profile?.full_name || 'Tenant';
      const hostelName = r.hostel_name || profile?.hostel_name || 'My Hostel';
      const receiptNo = r.receipt_number || `REC-${paymentId}`;
      const feeMonth = r.fee_month || r.payment_for_month || 'Rent Payment';
      const paymentMode = (r.payment_mode || 'Online').toUpperCase();
      const transactionId = r.transaction_id || '';

      const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${displayHours}:${displayMinutes} ${ampm} • ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
      };

      const transactionTime = formatDateTime(r.payment_date || r.created_at || new Date().toISOString());

      const html = generateReceiptHtml({
        documentTitle: 'RENT RECEIPT',
        hostelName,
        hostelAddress: r.hostel_address || undefined,
        ownerName: r.owner_name || undefined,
        ownerContact: r.owner_phone || undefined,
        payerLabel: 'Paid By (Student)',
        payerName: studentName,
        payerContact: r.phone || profile?.phone || undefined,
        roomNo: r.room_number || profile?.room_number || 'N/A',
        isStaff: false,
        receiptNo,
        transactionTime,
        paymentMode,
        transactionId,
        periodLabel: feeMonth,
        amountPaid,
        duesAmount: parseFloat(String(r.total_due ?? r.monthly_rent ?? amountPaid)),
        netBalance: parseFloat(String(r.balance ?? 0)),
        recordedBy: r.recorded_by || undefined,
      });

      if (progressTimer.current) clearInterval(progressTimer.current);
      setDlProgress(100);
      setDlStatus('done');

      const { uri } = await Print.printToFileAsync({ html });
      const filename = `receipt_${receiptNo.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      await downloadAndSaveFile(uri, filename, 'application/pdf', true);
      showSuccess('Receipt downloaded successfully!');
    } catch (e: any) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setDlStatus('error');
      showError('Failed to generate receipt PDF.');
    }
  };


  const handleDownloadImage = async (imageUrl: string, title: string) => {
    try {
      const resolved = getResolvedImageUrl(imageUrl) || imageUrl;
      if (!resolved) {
        showError('Document URL unavailable.');
        return;
      }
      setDlFileName(`${title.replace(/\s+/g, '_')}.jpg`);
      setDlProgress(20);
      setDlStatus('loading');
      setDlVisible(true);

      const fileUri = `${FileSystem.cacheDirectory}${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(resolved, fileUri);
      
      setDlProgress(100);
      setDlStatus('done');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        showSuccess('File saved to cache.');
      }
    } catch (err) {
      setDlStatus('error');
      showError('Could not download image.');
    }
  };

  const hasAadhaarFront = !!(profile?.id_proof_front_url || profile?.id_proof_document_url);
  const hasAadhaarBack = !!profile?.id_proof_back_url;
  const hasPhoto = !!profile?.profile_photo_url;
  const isKycVerified = profile?.id_proof_status === 1 || profile?.is_verified;

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <OfflineBanner />

      {/* Unified AppHeader */}
      <AppHeader
        title="My Documents"
        subtitle="KYC proofs & rent receipts"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>
              {(hasAadhaarFront ? 1 : 0) + (hasAadhaarBack ? 1 : 0) + (hasPhoto ? 1 : 0) + receipts.length} Docs
            </Text>
          </View>
        }
      />

      {/* KYC Status Banner */}
      {profile && (
        <View style={[styles.kycBanner, isKycVerified ? styles.kycVerifiedBg : styles.kycPendingBg]}>
          <View style={[styles.kycIconCircle, isKycVerified ? styles.kycVerifiedIcon : styles.kycPendingIcon]}>
            {isKycVerified ? <ShieldCheck size={18} color={SUCCESS} /> : <ShieldAlert size={18} color={AMBER} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycBannerTitle, { color: isKycVerified ? '#065F46' : '#92400E' }]}>
              {isKycVerified ? 'KYC Verified' : 'KYC Pending Review'}
            </Text>
            <Text style={[styles.kycBannerSub, { color: isKycVerified ? '#047857' : '#B45309' }]}>
              {isKycVerified
                ? 'Your identity documents are verified.'
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
          {/* ────────────────── KYC & ID PROOFS (SIDE BY SIDE GRID) ────────────────── */}
          {(activeFilter === 'All' || activeFilter === 'KYC') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IdCard size={18} color={BLUE} />
                <Text style={styles.sectionTitle}>Identity & KYC Proofs</Text>
              </View>

              <View style={styles.gridRow}>
                {/* Front Side */}
                {hasAadhaarFront && (
                  <View style={styles.gridCard}>
                    <TouchableOpacity
                      style={styles.cardThumbWrap}
                      activeOpacity={0.85}
                      onPress={() => {
                        const raw = profile.id_proof_front_url || profile.id_proof_document_url;
                        setPreviewImage({ uri: getResolvedImageUrl(raw) || raw, title: 'ID Proof (Front Side)' });
                      }}
                    >
                      <Image
                        source={{ uri: getResolvedImageUrl(profile.id_proof_front_url || profile.id_proof_document_url) || '' }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                      <View style={styles.docTypeBadge}>
                        <Text style={styles.docTypeBadgeText}>Front Side</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {profile?.id_proof_type_name || profile?.id_proof_type || 'ID Proof Front'}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {profile?.id_proof_number ? `No: ${profile.id_proof_number}` : 'Govt ID Proof'}
                      </Text>

                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            const raw = profile.id_proof_front_url || profile.id_proof_document_url;
                            setPreviewImage({ uri: getResolvedImageUrl(raw) || raw, title: 'ID Proof (Front Side)' });
                          }}
                          activeOpacity={0.7}
                        >
                          <Eye size={13} color={BLUE} />
                          <Text style={styles.actionBtnText}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.downloadActionBtn]}
                          onPress={() => handleDownloadImage(profile.id_proof_front_url || profile.id_proof_document_url, 'ID_Proof_Front')}
                          activeOpacity={0.7}
                        >
                          <Download size={13} color="#FFFFFF" />
                          <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Back Side */}
                {hasAadhaarBack && (
                  <View style={styles.gridCard}>
                    <TouchableOpacity
                      style={styles.cardThumbWrap}
                      activeOpacity={0.85}
                      onPress={() => {
                        const raw = profile.id_proof_back_url;
                        setPreviewImage({ uri: getResolvedImageUrl(raw) || raw, title: 'ID Proof (Back Side)' });
                      }}
                    >
                      <Image
                        source={{ uri: getResolvedImageUrl(profile.id_proof_back_url) || '' }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                      <View style={styles.docTypeBadge}>
                        <Text style={styles.docTypeBadgeText}>Back Side</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {profile?.id_proof_type_name || profile?.id_proof_type || 'ID Proof Back'}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {profile?.id_proof_number ? `No: ${profile.id_proof_number}` : 'Govt ID Proof'}
                      </Text>

                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            const raw = profile.id_proof_back_url;
                            setPreviewImage({ uri: getResolvedImageUrl(raw) || raw, title: 'ID Proof (Back Side)' });
                          }}
                          activeOpacity={0.7}
                        >
                          <Eye size={13} color={BLUE} />
                          <Text style={styles.actionBtnText}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.downloadActionBtn]}
                          onPress={() => handleDownloadImage(profile.id_proof_back_url, 'ID_Proof_Back')}
                          activeOpacity={0.7}
                        >
                          <Download size={13} color="#FFFFFF" />
                          <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Passport Photo */}
                {hasPhoto && (
                  <View style={styles.gridCard}>
                    <TouchableOpacity
                      style={styles.cardThumbWrap}
                      activeOpacity={0.85}
                      onPress={() => {
                        const raw = profile.profile_photo_url;
                        setPreviewImage({ uri: getResolvedImageUrl(raw) || raw, title: 'Passport Photo' });
                      }}
                    >
                      <Image
                        source={{ uri: getResolvedImageUrl(profile.profile_photo_url) || '' }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                      <View style={styles.docTypeBadge}>
                        <Text style={styles.docTypeBadgeText}>Photo</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>Passport Photo</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>Profile / KYC</Text>

                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            const raw = profile.profile_photo_url;
                            setPreviewImage({ uri: getResolvedImageUrl(raw) || raw, title: 'Passport Photo' });
                          }}
                          activeOpacity={0.7}
                        >
                          <Eye size={13} color={BLUE} />
                          <Text style={styles.actionBtnText}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.downloadActionBtn]}
                          onPress={() => handleDownloadImage(profile.profile_photo_url, 'Passport_Photo')}
                          activeOpacity={0.7}
                        >
                          <Download size={13} color="#FFFFFF" />
                          <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {!hasAadhaarFront && !hasAadhaarBack && !hasPhoto && (
                <View style={styles.emptyCard}>
                  <IdCard size={28} color={TEXT_MUTED} />
                  <Text style={styles.emptyCardTitle}>No KYC Proofs Uploaded</Text>
                  <Text style={styles.emptyCardSub}>Uploaded Aadhaar or ID proofs will show here side by side.</Text>
                </View>
              )}
            </View>
          )}

          {/* ────────────────── RENT RECEIPTS (SIDE BY SIDE GRID) ────────────────── */}
          {(activeFilter === 'All' || activeFilter === 'Receipt') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Receipt size={18} color={SUCCESS} />
                <Text style={styles.sectionTitle}>Rent Receipts ({receipts.length})</Text>
              </View>

              {receipts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Receipt size={28} color={TEXT_MUTED} />
                  <Text style={styles.emptyCardTitle}>No Receipts Available</Text>
                  <Text style={styles.emptyCardSub}>Verified rent payments will generate downloadable receipts here.</Text>
                </View>
              ) : (
                <View style={styles.gridRow}>
                  {receipts.map((rec, index) => (
                    <View key={rec.id || index} style={styles.gridCard}>
                      <View style={styles.receiptCardHeader}>
                        <View style={styles.receiptIconCircle}>
                          <FileCheck2 size={20} color={SUCCESS} />
                        </View>
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedBadgeText}>Paid</Text>
                        </View>
                      </View>

                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{rec.name}</Text>
                        <Text style={styles.receiptAmountText}>
                          &#8377;{Number(rec.amount).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {rec.date ? new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                        </Text>

                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.downloadActionBtn, { flex: 1 }]}
                            onPress={() => handleDownloadReceipt(rec.paymentId, `${rec.name}.pdf`)}
                            activeOpacity={0.7}
                          >
                            <Download size={13} color="#FFFFFF" />
                            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>PDF</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
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
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {previewImage?.uri && (
                  <TouchableOpacity
                    onPress={() => handleDownloadImage(previewImage.uri, previewImage.title || 'Document')}
                    style={styles.previewActionBtn}
                    activeOpacity={0.7}
                  >
                    <Download size={18} color={WHITE} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setPreviewImage(null)}
                  style={styles.previewCloseBtn}
                  activeOpacity={0.7}
                >
                  <X size={20} color={WHITE} />
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

      {/* Download progress sheet */}
      <DownloadProgressSheet
        visible={dlVisible}
        fileName={dlFileName}
        progress={dlProgress}
        status={dlStatus}
        onClose={() => setDlVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  headerCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  headerCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontSize: 13,
    fontWeight: '800',
  },
  kycBannerSub: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MID,
  },
  tabBtnTextActive: {
    color: WHITE,
  },
  scrollContent: {
    padding: 16,
    gap: 18,
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
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  // ── 2-Column Side by Side Grid ──
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardThumbWrap: {
    width: '100%',
    height: 105,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  docTypeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docTypeBadgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  cardSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BLUE_SOFT,
  },
  downloadActionBtn: {
    backgroundColor: BLUE,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: BLUE,
  },
  // Receipts card inside grid
  receiptCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  receiptIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    backgroundColor: SUCCESS,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '800',
  },
  receiptAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: SUCCESS,
  },
  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
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
    fontSize: 15,
    fontWeight: '800',
  },
  previewActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
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

