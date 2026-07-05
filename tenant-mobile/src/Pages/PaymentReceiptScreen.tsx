import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Share2, Mail, Printer, Download, ChevronUp, FileText, MessageSquare, User, Calendar, ArrowLeft, Clock } from 'lucide-react-native';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { downloadAndSaveFile } from '../utils/fileDownloader';

export default function PaymentReceiptScreen({ route, navigation }: any) {
  const { user, connectedHostel } = useAuth();
  
  // Extract fee data from navigation params
  const { fee, isPaid } = route.params || {};

  const insets = useSafeAreaInsets();

  // Dynamic details
  const hostelName = connectedHostel?.hostel_name || 'MY HOSTEL PG';
  const hostelEmail = 'admin@hostel.com';
  const hostelInitials = hostelName.substring(0, 2).toUpperCase();
  const paidDate = fee?.payments?.[0]?.payment_date || fee?.due_date || new Date().toISOString();
  const paymentMode = fee?.payments?.[0]?.payment_mode?.toUpperCase() || 'ONLINE';
  const amount = isPaid ? fee?.paid_amount : (fee?.balance > 0 ? fee.balance : fee?.total_due);
  const transactionId = fee?.payments?.[0]?.transaction_id || `REC-${fee?.fee_id || '302'}`;
  const feeMonthStr = fee?.fee_month ? new Date(fee.fee_month).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : 'N/A';

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 40px; color: #1A1A1A;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: ${isPaid ? '#10B981' : '#F59E0B'};">${isPaid ? 'Transaction Successful' : 'Payment Due'}</h1>
          <p>Receipt Number: <strong>${transactionId}</strong></p>
        </div>
        
        <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0;">Payment Details</h3>
          <p><strong>Paid To:</strong> ${hostelName}</p>
          <p><strong>Amount:</strong> Rs. ${amount}</p>
          <p><strong>Date:</strong> ${new Date(paidDate).toLocaleString()}</p>
          <p><strong>Payment Mode:</strong> ${paymentMode}</p>
        </div>

        <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px;">
          <h3 style="margin-top: 0;">Tenant Information</h3>
          <p><strong>Name:</strong> ${user?.name || 'Tenant'}</p>
          <p><strong>Room:</strong> ${user?.room_number || 'N/A'} ${user?.bed_number ? `(Bed ${user.bed_number})` : ''}</p>
          <p><strong>Fee Month:</strong> ${feeMonthStr}</p>
        </div>
      </body>
    </html>
  `;

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

  const handleDownload = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const filename = `receipt_${transactionId.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      await downloadAndSaveFile(uri, filename, 'application/pdf', true);
    } catch (error) {
      console.error('Error saving PDF:', error);
      Alert.alert('Error', 'Failed to save PDF');
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
            
            {/* Dashed Bottom / Jagged Edge Simulation */}
            <View style={styles.dashedBottom}>
              <Text style={{ color: '#D1D5DB', letterSpacing: 2 }}>- - - - - - - - - - - - - - - - - - - - - - - - - - - -</Text>
            </View>
          </View>
          
          {/* Powered By */}
          <View style={styles.poweredBy}>
            <Text style={styles.poweredByText}>Powered by HOSTIX OS</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}><Share2 size={24} color="#2245D4" /></View>
              <Text style={[styles.actionText, { color: '#666666' }]}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleDownload}>
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}><Download size={24} color="#2245D4" /></View>
              <Text style={[styles.actionText, { color: '#666666' }]}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Dues', { initialTab: 'Payment History' })}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}><Clock size={24} color="#9333EA" /></View>
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
    paddingBottom: 24, // For dashed border
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
  dashedBottom: {
    position: 'absolute',
    bottom: 5,
    left: 20,
    right: 20,
    alignItems: 'center',
    opacity: 0.5,
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
