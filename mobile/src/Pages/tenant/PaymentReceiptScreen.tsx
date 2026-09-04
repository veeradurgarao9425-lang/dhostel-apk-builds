import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Share2, Mail, Printer, Download, ChevronUp, FileText, MessageSquare, User, Calendar, ArrowLeft, Clock } from 'lucide-react-native';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../../contexts/AuthContext';
import { downloadAndSaveFile } from '../../utils/fileDownloader';

export default function PaymentReceiptScreen({ route, navigation }: any) {
  const { user, connectedHostel } = useAuth();
  
  // Extract fee data from navigation params
  const { fee, isPaid } = route.params || {};

  const insets = useSafeAreaInsets();

  // Dynamic details
  const hostelName = connectedHostel?.hostel_name || 'MY HOSTEL PG';
  const hostelEmail = 'admin@hostel.com';
  const hostelInitials = hostelName.substring(0, 2).toUpperCase();
  const paidDate = fee?.payment_date || fee?.payments?.[0]?.payment_date || fee?.due_date || fee?.created_at || new Date().toISOString();
  const paymentMode = String(fee?.payment_mode || fee?.payments?.[0]?.payment_mode || 'ONLINE').toUpperCase();
  
  // Resolve accurate payment amount
  const resolvedAmount = Number(
    fee?.amount !== undefined && fee?.amount !== null && Number(fee.amount) > 0
      ? fee.amount
      : fee?.paid_amount !== undefined && fee?.paid_amount !== null && Number(fee.paid_amount) > 0
      ? fee.paid_amount
      : fee?.payments?.[0]?.amount !== undefined && fee?.payments?.[0]?.amount !== null && Number(fee.payments[0].amount) > 0
      ? fee.payments[0].amount
      : fee?.total_due !== undefined && fee?.total_due !== null && Number(fee.total_due) > 0
      ? fee.total_due
      : fee?.balance !== undefined && fee?.balance !== null
      ? fee.balance
      : 0
  );
  const amount = resolvedAmount;
  const transactionId = fee?.receipt_number || fee?.transaction_id || fee?.payments?.[0]?.transaction_id || fee?.payments?.[0]?.receipt_number || `REC-${fee?.payment_id || fee?.fee_id || '302'}`;
  const feeMonthStr = fee?.fee_month ? new Date(fee.fee_month).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : 'N/A';

  const accent      = isPaid ? '#10B981' : '#F59E0B';
  const accentDark  = isPaid ? '#065F46' : '#78350F';
  const statusLabel = isPaid ? 'PAID' : 'PENDING';
  const generatedAt = new Date().toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateStr     = new Date(paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr     = new Date(paidDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#F1F5F9;display:flex;justify-content:center;padding:24px;min-height:100vh}
    .wrap{width:100%;max-width:540px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.13)}

    /* header */
    .hdr{background:linear-gradient(135deg,#2245D4 0%,#3B5CFF 100%);padding:28px 24px 24px;position:relative;overflow:hidden}
    .hdr::before{content:'';position:absolute;top:-50px;right:-50px;width:180px;height:180px;background:rgba(255,255,255,0.08);border-radius:50%}
    .hdr-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-logo{width:40px;height:40px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#2245D4;font-size:14px}
    .brand-name{font-size:12px;font-weight:800;color:#fff;letter-spacing:1.5px;text-transform:uppercase}
    .brand-sub{font-size:10px;color:rgba(255,255,255,0.75);margin-top:2px}
    .status-pill{background:#fff;color:${accentDark};font-size:10px;font-weight:800;padding:4px 12px;border-radius:20px;letter-spacing:1.5px}
    .amt-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
    .amt-big{font-size:40px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1}
    .amt-sub{font-size:12px;color:rgba(255,255,255,0.8);margin-top:6px}

    /* hostel strip */
    .strip{background:${accent}15;border-top:1px solid ${accent}30;border-bottom:1px solid ${accent}30;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
    .strip-left{display:flex;align-items:center;gap:12px}
    .avatar{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#2245D4,#3B5CFF);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900}
    .hn{font-size:13px;font-weight:800;color:#0F172A}
    .hl{font-size:10px;color:#64748B;margin-top:1px}
    .chip{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:20px;background:${accent}20;border:1px solid ${accent}40}
    .chip-dot{width:6px;height:6px;border-radius:50%;background:${accent}}
    .chip-txt{font-size:10px;font-weight:800;color:${accentDark}}

    /* body */
    .body{padding:20px 24px}
    .sec-title{font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}

    /* grid */
    .grid{border:1.5px solid #E2E8F0;border-radius:14px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;margin-bottom:16px}
    .cell{padding:12px 14px;border-bottom:1px solid #E2E8F0;border-right:1px solid #E2E8F0}
    .cell:nth-child(even){border-right:none}
    .cell:nth-last-child(-n+2){border-bottom:none}
    .cell.full{grid-column:1/-1;border-right:none}
    .cl{font-size:9px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}
    .cv{font-size:12px;font-weight:700;color:#1E293B}

    /* mode */
    .mode-row{display:flex;align-items:center;gap:10px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:10px 14px;margin-bottom:16px}
    .mode-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2245D4,#3B5CFF);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900}
    .mode-lbl{font-size:9px;color:#94A3B8;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
    .mode-val{font-size:13px;font-weight:800;color:#1E293B}
    .mode-amt{margin-left:auto;background:${accent}20;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:800;color:${accentDark}}

    /* dashed */
    .dash{border:none;border-top:2px dashed #E2E8F0;margin:16px 0;position:relative}

    /* summary */
    .summ{background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:14px;padding:14px 16px;margin-bottom:16px}
    .srow{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .srow:last-child{margin-bottom:0}
    .slbl{font-size:12px;color:#64748B}
    .sval{font-size:12px;font-weight:700;color:#1E293B}
    .stotal{display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #E2E8F0;padding-top:12px;margin-top:4px}
    .stotal-lbl{font-size:13px;font-weight:800;color:#0F172A}
    .stotal-val{font-size:22px;font-weight:900;color:${accent}}

    /* footer */
    .foot{background:#F8FAFC;border-top:1.5px solid #E2E8F0;padding:14px 24px;text-align:center}
    .foot-brand{font-size:11px;font-weight:800;color:#2245D4;letter-spacing:1.5px;text-transform:uppercase}
    .foot-note{font-size:9px;color:#94A3B8;margin-top:3px}
    .foot-gen{font-size:9px;color:#CBD5E1;margin-top:6px}
  </style>
</head>
<body>
<div class="wrap">

  <div class="hdr">
    <div class="hdr-top">
      <div class="brand">
        <div class="brand-logo">H•</div>
        <div>
          <div class="brand-name">HOSTIX</div>
          <div class="brand-sub">PG Management OS</div>
        </div>
      </div>
      <div class="status-pill">${isPaid ? '✓' : '!'} ${statusLabel}</div>
    </div>
    <div class="amt-label">Total Amount</div>
    <div class="amt-big">₹${Number(amount || 0).toLocaleString('en-IN')}</div>
    <div class="amt-sub">${dateStr} at ${timeStr}</div>
  </div>

  <div class="strip">
    <div class="strip-left">
      <div class="avatar">${hostelInitials}</div>
      <div>
        <div class="hn">${hostelName}</div>
        <div class="hl">Accommodation Provider</div>
      </div>
    </div>
    <div class="chip">
      <div class="chip-dot"></div>
      <span class="chip-txt">${statusLabel}</span>
    </div>
  </div>

  <div class="body">
    <div class="sec-title">Invoice Details</div>
    <div class="grid">
      <div class="cell">
        <div class="cl">Tenant Name</div>
        <div class="cv">${user?.name || 'Tenant'}</div>
      </div>
      <div class="cell">
        <div class="cl">Fee Month</div>
        <div class="cv">${feeMonthStr}</div>
      </div>
      <div class="cell">
        <div class="cl">Room / Bed</div>
        <div class="cv">Room ${user?.room_number || 'N/A'}${user?.bed_number ? ` · Bed ${user.bed_number}` : ''}</div>
      </div>
      <div class="cell">
        <div class="cl">Receipt No</div>
        <div class="cv">${transactionId}</div>
      </div>
      <div class="cell full">
        <div class="cl">Transaction / Reference ID</div>
        <div class="cv" style="color:#6366F1">${transactionId}</div>
      </div>
    </div>

    <div class="mode-row">
      <div class="mode-ico">${(paymentMode[0] || 'P').toUpperCase()}</div>
      <div>
        <div class="mode-lbl">Payment Mode</div>
        <div class="mode-val">${paymentMode}</div>
      </div>
      <div class="mode-amt">₹${Number(amount || 0).toLocaleString('en-IN')}</div>
    </div>

    <hr class="dash"/>

    <div class="summ">
      <div class="srow"><span class="slbl">Rent Amount</span><span class="sval">₹${Number(amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="srow"><span class="slbl">Other Charges</span><span class="sval">₹0</span></div>
      <div class="stotal">
        <span class="stotal-lbl">Total Paid</span>
        <span class="stotal-val">₹${Number(amount || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>
  </div>

  <div class="foot">
    <div class="foot-brand">HOSTIX • PG OS</div>
    <div class="foot-note">System-generated receipt · No signature required</div>
    <div class="foot-gen">Generated on ${generatedAt}</div>
  </div>

</div>
</body>
</html>`;

  const handleShare = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Receipt' });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not share receipt');
    }
  };

  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const filename = `receipt_${transactionId.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: '.pdf',
          dialogTitle: `Download / Save ${filename}`,
        });
      } else {
        Alert.alert('Success', 'Receipt PDF has been saved.');
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
      Alert.alert('Error', 'Failed to generate receipt PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Simple App Header */}
        <View style={[styles.headerGradient, { paddingTop: insets.top + 16, paddingBottom: 16, backgroundColor: isPaid ? '#388E3C' : '#F59E0B' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12, marginLeft: -4 }}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle} numberOfLines={1}>
                {isPaid ? 'Transaction Successful' : 'Payment Due'}
              </Text>
              <Text style={[styles.successDate, { marginTop: 2 }]}>
                {new Date(paidDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} on {new Date(paidDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Receipt Cards Container */}
        <View style={styles.receiptContainer}>
          
          {/* Primary Info Card */}
          <View style={styles.primaryCard}>
            <Text style={styles.paidToLabel}>PAID TO</Text>
            <View style={styles.paidToRow}>
              <View style={styles.hostelAvatar}>
                <Text style={styles.hostelInitials}>{hostelInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hostelName}>{hostelName}</Text>
                <Text style={styles.hostelEmail}>{hostelEmail}</Text>
              </View>
              <Text style={styles.amountText}>{formatCurrency(amount || 0)}</Text>
            </View>
          </View>

          {/* Transfer Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.smallIconWrap}><FileText size={16} color="#2245D4" /></View>
                <Text style={styles.detailsTitle}>Transfer Details</Text>
              </View>
              <ChevronUp size={20} color="#1A1A1A" />
            </View>
            
            <View style={styles.divider} />

            {/* Detail Rows */}
            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.detailIconWrap}><User size={14} color="#666666" /></View>
                <Text style={styles.detailLabel}>Student Name</Text>
              </View>
              <Text style={styles.detailValue}>{user?.name || 'Tenant'}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.detailIconWrap}><FileText size={14} color="#666666" /></View>
                <Text style={styles.detailLabel}>Room / Bed Number</Text>
              </View>
              <Text style={styles.detailValue}>Room {user?.room_number || 'N/A'}{user?.bed_number ? `, Bed ${user.bed_number}` : ''}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.detailIconWrap}><MessageSquare size={14} color="#666666" /></View>
                <Text style={styles.detailLabel}>Message</Text>
              </View>
              <Text style={styles.detailValue}>Rent for {feeMonthStr}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.detailIconWrap}><FileText size={14} color="#666666" /></View>
                <Text style={styles.detailLabel}>Receipt Number</Text>
              </View>
              <Text style={styles.detailValue}>{transactionId}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.detailIconWrap}><Calendar size={14} color="#666666" /></View>
                <Text style={styles.detailLabel}>Debited From</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.modeAvatar}><Text style={styles.modeInitials}>{paymentMode.charAt(0)}</Text></View>
                <Text style={styles.detailValue}>{paymentMode}</Text>
                <Text style={styles.detailValueAmount}>{formatCurrency(amount || 0)}</Text>
              </View>
            </View>
            
            {/* Dashed Border Divider */}
            <View style={styles.dashedDivider} />
          </View>
          
          {/* Powered By */}
          <View style={styles.poweredBy}>
            <Text style={styles.poweredByText}>Powered by HOSTIX OS</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionItem} onPress={handleShare} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}><Share2 size={22} color="#2245D4" /></View>
              <Text style={[styles.actionText, { color: '#666666' }]}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleDownload} disabled={downloading} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                {downloading ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Download size={22} color="#10B981" />
                )}
              </View>
              <Text style={[styles.actionText, { color: '#10B981', fontWeight: '700' }]}>{downloading ? 'Saving...' : 'Download'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Main', { screen: 'Dues', params: { initialTab: 'Payment History' } })} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}><Clock size={22} color="#9333EA" /></View>
              <Text style={[styles.actionText, { color: '#666666' }]}>View History</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  successDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  receiptContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  paidToLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 1,
    marginBottom: 12,
  },
  paidToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2245D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostelInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hostelName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  hostelEmail: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  smallIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  detailValueAmount: {
    fontSize: 13,
    color: '#666666',
  },
  modeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2245D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dashedDivider: {
    height: 1,
    width: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 18,
    marginBottom: 6,
  },
  poweredBy: {
    alignItems: 'center',
    marginBottom: 24,
  },
  poweredByText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2245D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  }
});
