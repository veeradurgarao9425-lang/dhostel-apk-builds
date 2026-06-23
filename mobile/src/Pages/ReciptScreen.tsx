import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../../contexts/AuthContext';

export const ReceiptScreen = ({ navigation, route }: any) => {
    const { feeData } = route.params || {};
    const { user } = useAuth();

    if (!feeData) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 100, fontSize: 16 }}>No Receipt Data Found</Text>
            </View>
        );
    }

    const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = String(minutes).padStart(2, '0');
        
        const day = date.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${displayHours}:${displayMinutes} ${ampm} on ${day} ${month} ${year}`;
    };

    const getInitials = (name: string) => {
        if (!name) return 'H';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    const hostelName = user?.hostel_name || 'My Hostel';
    const amountPaid = feeData.paid_amount || feeData.amount || 0;
    const paymentMode = feeData.payment_mode_name || 'CASH';
    const transactionId = feeData.transaction_id || 'N/A';
    const receiptNo = feeData.receipt_number || (feeData.fee_id ? `REC-${feeData.fee_id}` : 'N/A');
    const transactionTime = formatDateTime(feeData.payment_date || feeData.created_at || new Date().toISOString());
    const studentName = `${feeData.first_name || ''} ${feeData.last_name || ''}`.trim();
    const roomNo = feeData.room_number || 'N/A';
    const mobileNo = feeData.phone || 'N/A';
    const feeMonth = feeData.fee_month || 'N/A';
    const avatarInitials = getInitials(hostelName);
    const upiId = `${hostelName.toLowerCase().replace(/\s+/g, '')}@yesbank`;

    const generateHtml = () => {
        return `
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f5f6f8;
                    margin: 0;
                    padding: 24px;
                    color: #1e293b;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                  }
                  .receipt-container {
                    width: 100%;
                    max-width: 480px;
                    background-color: #f5f6f8;
                  }
                  .status-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 20px;
                    padding-left: 8px;
                  }
                  .status-icon-circle {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background-color: #5f259f;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                  }
                  .status-text-container {
                    display: flex;
                    flex-direction: column;
                  }
                  .status-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                  }
                  .status-time {
                    font-size: 13px;
                    color: #64748b;
                    margin: 4px 0 0 0;
                  }
                  .receipt-card {
                    background-color: #ffffff;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                  }
                  .card-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin: 0 0 12px 0;
                  }
                  .paid-to-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                  }
                  .avatar-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                  }
                  .avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background-color: #00bcd4;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 18px;
                    font-weight: 700;
                  }
                  .info-text {
                    display: flex;
                    flex-direction: column;
                  }
                  .hostel-name {
                    font-size: 15px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                    text-transform: uppercase;
                  }
                  .upi-id {
                    font-size: 12px;
                    color: #64748b;
                    margin: 4px 0 0 0;
                  }
                  .amount {
                    font-size: 20px;
                    font-weight: 800;
                    color: #0f172a;
                  }
                  .divider {
                    height: 1px;
                    background-color: #e2e8f0;
                    margin: 16px 0;
                  }
                  .transfer-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                  }
                  .transfer-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #334155;
                    margin: 0;
                  }
                  .chevron-icon {
                    border: solid #64748b;
                    border-width: 0 2px 2px 0;
                    display: inline-block;
                    padding: 3px;
                    transform: rotate(-135deg);
                  }
                  .details-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                  }
                  .detail-group {
                    display: flex;
                    flex-direction: column;
                  }
                  .detail-label {
                    font-size: 11px;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                  }
                  .detail-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0;
                  }
                  .debited-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                  }
                  .debited-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                  }
                  .bank-logo {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background-color: #5f259f;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                  }
                  .footer {
                    text-align: center;
                    margin-top: 30px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                  }
                  .powered-by {
                    font-size: 12px;
                    color: #94a3b8;
                    margin: 0;
                  }
                  .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                  }
                  .logo-stivo {
                    font-weight: 800;
                    color: #5f259f;
                    font-size: 14px;
                    letter-spacing: 1px;
                  }
                  .logo-dot {
                    color: #10b981;
                  }
                </style>
              </head>
              <body>
                <div class="receipt-container">
                  <div class="status-header">
                    <div class="status-icon-circle">
                      <span style="font-size: 20px; line-height: 48px;">✓</span>
                    </div>
                    <div class="status-text-container">
                      <h2 class="status-title">Transaction Successful</h2>
                      <p class="status-time">${transactionTime}</p>
                    </div>
                  </div>

                  <div class="receipt-card">
                    <h3 class="card-label">Paid to</h3>
                    <div class="paid-to-row">
                      <div class="avatar-info">
                        <div class="avatar">${avatarInitials}</div>
                        <div class="info-text">
                          <h4 class="hostel-name">${hostelName}</h4>
                          <p class="upi-id">${upiId}</p>
                        </div>
                      </div>
                      <div class="amount">₹${amountPaid.toLocaleString('en-IN')}</div>
                    </div>

                    <div class="divider"></div>

                    <div class="transfer-header">
                      <h4 class="transfer-title">Transfer Details</h4>
                      <span class="chevron-icon"></span>
                    </div>

                    <div class="details-list">
                      <div class="detail-group">
                        <span class="detail-label">Message / Fee Month</span>
                        <span class="detail-value">Rent for ${feeMonth}</span>
                      </div>

                      <div class="detail-group">
                        <span class="detail-label">Student Name / Room</span>
                        <span class="detail-value">${studentName} (Room ${roomNo})</span>
                      </div>

                      <div class="detail-group">
                        <span class="detail-label">Receipt / Invoice No</span>
                        <span class="detail-value">${receiptNo}</span>
                      </div>

                      <div class="detail-group">
                        <span class="detail-label">Debited from</span>
                        <div class="debited-row">
                          <div class="debited-left">
                            <div class="bank-logo">${paymentMode[0].toUpperCase()}</div>
                            <span class="detail-value" style="font-weight: 500;">${paymentMode}</span>
                          </div>
                          <span class="amount" style="font-size: 14px; font-weight: 600;">₹${amountPaid.toLocaleString('en-IN')}</span>
                        </div>
                        ${transactionId && transactionId !== 'N/A' ? `
                        <span class="detail-label" style="margin-top: 6px;">UTR / Reference ID</span>
                        <span class="detail-value" style="font-size: 13px; color: #475569;">${transactionId}</span>
                        ` : ''}
                      </div>
                    </div>
                  </div>

                  <div class="footer">
                    <p class="powered-by">Powered by</p>
                    <div class="logo-container">
                      <span class="logo-stivo">STIVO<span class="logo-dot">•</span>PG OS</span>
                    </div>
                  </div>
                </div>
              </body>
            </html>
        `;
    };

    const sharePdf = async () => {
        try {
            const { uri } = await Print.printToFileAsync({ html: generateHtml() });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Receipt PDF' });
        } catch (error) {
            console.error('Error sharing PDF:', error);
            Alert.alert('Error', 'Failed to share PDF');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#5f259f" />

            {/* Header */}
            <AppHeader title="Transaction Details" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                
                {/* Status Header Block */}
                <View style={styles.statusHeader}>
                    <View style={styles.statusIconCircle}>
                        <Ionicons name="checkmark-sharp" size={24} color="#FFF" />
                    </View>
                    <View style={styles.statusTextContainer}>
                        <Text style={styles.statusTitle}>Transaction Successful</Text>
                        <Text style={styles.statusTime}>{transactionTime}</Text>
                    </View>
                </View>

                {/* Main Card */}
                <View style={styles.card}>
                    {/* Paid To Section */}
                    <Text style={styles.cardLabel}>Paid to</Text>
                    <View style={styles.paidToRow}>
                        <View style={styles.avatarInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{avatarInitials}</Text>
                            </View>
                            <View style={styles.infoText}>
                                <Text style={styles.hostelName}>{hostelName}</Text>
                                <Text style={styles.upiId}>{upiId}</Text>
                            </View>
                        </View>
                        <Text style={styles.amount}>₹{amountPaid.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Thin Divider */}
                    <View style={styles.divider} />

                    {/* Transfer Details Header */}
                    <View style={styles.transferHeader}>
                        <Text style={styles.transferTitle}>Transfer Details</Text>
                        <Ionicons name="chevron-up" size={20} color="#64748B" />
                    </View>

                    {/* Details List */}
                    <View style={styles.detailsList}>
                        <View style={styles.detailGroup}>
                            <Text style={styles.detailLabel}>Message / Fee Month</Text>
                            <Text style={styles.detailValue}>Rent for {feeMonth}</Text>
                        </View>

                        <View style={styles.detailGroup}>
                            <Text style={styles.detailLabel}>Student Name / Room</Text>
                            <Text style={styles.detailValue}>{studentName} (Room {roomNo})</Text>
                        </View>

                        <View style={styles.detailGroup}>
                            <Text style={styles.detailLabel}>Receipt / Invoice No</Text>
                            <Text style={styles.detailValue}>{receiptNo}</Text>
                        </View>

                        <View style={styles.detailGroup}>
                            <Text style={styles.detailLabel}>Debited from</Text>
                            <View style={styles.debitedRow}>
                                <View style={styles.debitedLeft}>
                                    <View style={styles.bankLogo}>
                                        <Text style={styles.bankLogoText}>{paymentMode[0].toUpperCase()}</Text>
                                    </View>
                                    <Text style={[styles.detailValue, { fontWeight: '500' }]}>{paymentMode}</Text>
                                </View>
                                <Text style={[styles.amount, { fontSize: 15, fontWeight: '700' }]}>₹{amountPaid.toLocaleString('en-IN')}</Text>
                            </View>
                            {transactionId && transactionId !== 'N/A' && (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={styles.detailLabel}>UTR / Reference ID</Text>
                                    <Text style={[styles.detailValue, { fontSize: 13, color: '#475569' }]}>{transactionId}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Share Button */}
                <TouchableOpacity style={styles.shareButton} onPress={sharePdf}>
                    <Ionicons name="logo-whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.shareText}>Share to WhatsApp</Text>
                </TouchableOpacity>

                {/* Stivo Branding Footer */}
                <View style={styles.brandingFooter}>
                    <Text style={styles.poweredBy}>Powered by</Text>
                    <Text style={styles.brandingText}>STIVO<Text style={styles.brandingDot}>•</Text>PG OS</Text>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6F8',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        marginTop: 10,
        paddingHorizontal: 8,
    },
    statusIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#5f259f',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statusTextContainer: {
        flexDirection: 'column',
        flex: 1,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    statusTime: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 14,
    },
    paidToRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#00bcd4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    infoText: {
        flexDirection: 'column',
        flex: 1,
    },
    hostelName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        textTransform: 'uppercase',
    },
    upiId: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
    },
    amount: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 16,
    },
    transferHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    transferTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#334155',
    },
    detailsList: {
        flexDirection: 'column',
        gap: 14,
    },
    detailGroup: {
        flexDirection: 'column',
    },
    detailLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    debitedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    debitedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bankLogo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#5f259f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bankLogoText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    shareButton: {
        backgroundColor: '#25D366',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        alignSelf: 'center',
        width: '100%',
        elevation: 3,
        shadowColor: '#25D366',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        marginBottom: 24,
    },
    shareText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    brandingFooter: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 6,
    },
    poweredBy: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    brandingText: {
        fontWeight: '900',
        color: '#5f259f',
        fontSize: 14,
        letterSpacing: 1,
    },
    brandingDot: {
        color: '#10B981',
    },
});

export default ReceiptScreen;