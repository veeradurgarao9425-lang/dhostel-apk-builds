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
import { useTheme } from '../../contexts/ThemeContext';
import { downloadAndSaveFile } from '../utils/fileDownloader';

export const ReceiptScreen = ({ navigation, route }: any) => {
    const { feeData } = route.params || {};
    const { user } = useAuth();
    const { theme, isDark } = useTheme();

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

    const isStaff = feeData.isStaff === true;
    const hostelName = user?.hostel_name || 'My Hostel';
    const amountPaid = feeData.paid_amount || feeData.amount || 0;
    const paymentMode = feeData.payment_mode_name || feeData.mode || feeData.payment_mode || 'CASH';
    const transactionId = feeData.transaction_id || 'N/A';
    const receiptNo = feeData.receipt_number || (feeData.fee_id ? `REC-${feeData.fee_id}` : (feeData.payment_id ? `REC-${feeData.payment_id}` : 'N/A'));
    const transactionTime = formatDateTime(feeData.payment_date || feeData.created_at || new Date().toISOString());
    const studentName = `${feeData.first_name || ''} ${feeData.last_name || ''}`.trim() || feeData.full_name || 'N/A';
    const roomNo = isStaff ? 'N/A' : (feeData.room_number || 'N/A');
    const mobileNo = feeData.phone || 'N/A';
    const feeMonth = isStaff ? (feeData.note || 'Wage Payment') : (feeData.fee_month || feeData.payment_for_month || 'N/A');
    const avatarInitials = getInitials(hostelName);
    const upiId = `${hostelName.toLowerCase().replace(/\s+/g, '')}@yesbank`;

    const documentTitle = isStaff ? 'WAGE RECEIPT' : 'RENT RECEIPT';
    const amountLabel = isStaff ? 'Wage / Advance Paid' : 'Rent / Fee Paid';
    const recipientLabel = isStaff ? 'Paid To (Staff)' : 'Paid By (Student)';

    const generateHtml = () => {
        return `
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                  @page { margin: 20px; size: auto; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: #ffffff;
                    margin: 0;
                    padding: 24px;
                    color: #1e293b;
                  }
                  .receipt-container {
                    width: 100%;
                    max-width: 100%;
                    background-color: #ffffff;
                  }
                  .document-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: 900;
                    color: #0f172a;
                    margin-bottom: 24px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    border-bottom: 2px dashed #e2e8f0;
                    padding-bottom: 16px;
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
                    background-color: #10B981;
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
                    padding: 24px;
                    border: 2px solid #e2e8f0;
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
                    font-size: 24px;
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
                    background-color: #10B981;
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
                  .logo-hostix {
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
                  <div class="document-title">${documentTitle}</div>
                  <div class="status-header">
                    <div class="status-icon-circle">
                      <span style="font-size: 20px; line-height: 48px;">✓</span>
                    </div>
                    <div class="status-text-container">
                      <h2 class="status-title">Payment Successful</h2>
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
                      <h4 class="transfer-title">${recipientLabel}</h4>
                    </div>

                    <div class="details-list">
                      <div class="detail-group">
                        <span class="detail-label">Name</span>
                        <span class="detail-value">${studentName}</span>
                      </div>

                      ${!isStaff ? `
                      <div class="detail-group">
                        <span class="detail-label">Room No.</span>
                        <span class="detail-value">${roomNo}</span>
                      </div>
                      ` : ''}

                      <div class="detail-group">
                        <span class="detail-label">Message / Fee Month</span>
                        <span class="detail-value">Rent for ${feeMonth}</span>
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
                      <span class="logo-hostix">HOSTIX<span class="logo-dot">•</span>PG OS</span>
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

    const downloadPdf = async () => {
        try {
            const { uri } = await Print.printToFileAsync({ html: generateHtml() });
            const filename = `receipt_${receiptNo.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            await downloadAndSaveFile(uri, filename, 'application/pdf', true);
        } catch (error) {
            console.error('Error saving PDF:', error);
            Alert.alert('Error', 'Failed to save PDF');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <AppHeader 
                title="Transaction Details" 
                alignLeft
                subtitle="Digital payment receipt"
                showBack={true} 
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
                
                {/* Receipt Ticket Card */}
                <View style={[styles.ticketCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    
                    {/* Top Status Section */}
                    <View style={styles.ticketTop}>
                        <View style={styles.successIconWrap}>
                            <Ionicons name="checkmark-circle" size={56} color="#10B981" />
                        </View>
                        <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Payment Successful</Text>
                        <Text style={styles.transactionTime}>{transactionTime}</Text>
                        
                        <Text style={[styles.amountBig, { color: theme.textPrimary }]}>₹{amountPaid.toLocaleString('en-IN')}</Text>
                        <Text style={styles.amountLabel}>{amountLabel}</Text>
                    </View>

                    {/* Ticket Cutout/Dashed Line */}
                    <View style={styles.ticketDividerWrap}>
                        <View style={[styles.cutoutLeft, { backgroundColor: theme.background, borderColor: isDark ? '#334155' : '#E2E8F0' }]} />
                        <View style={[styles.dashedLine, { borderColor: isDark ? '#334155' : '#E2E8F0' }]} />
                        <View style={[styles.cutoutRight, { backgroundColor: theme.background, borderColor: isDark ? '#334155' : '#E2E8F0' }]} />
                    </View>

                    {/* Details Section */}
                    <View style={styles.ticketBottom}>
                        
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Paid To</Text>
                            <Text style={[styles.infoValue, { color: theme.textPrimary, flex: 1, textAlign: 'right' }]}>{hostelName}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{recipientLabel}</Text>
                            <Text style={[styles.infoValue, { color: theme.textPrimary, flex: 1, textAlign: 'right' }]}>{studentName}</Text>
                        </View>

                        {!isStaff && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Room No.</Text>
                                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{roomNo}</Text>
                            </View>
                        )}

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fee Month</Text>
                            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{feeMonth}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Payment Mode</Text>
                            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{paymentMode}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Receipt No.</Text>
                            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{receiptNo}</Text>
                        </View>

                        {transactionId && transactionId !== 'N/A' && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Ref / UTR</Text>
                                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{transactionId}</Text>
                            </View>
                        )}

                    </View>
                </View>

                {/* Action Buttons Row */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: theme.primary, borderWidth: 1 }]} onPress={sharePdf} activeOpacity={0.85}>
                        <Ionicons name="share-social-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.actionBtnText, { color: theme.primary }]}>Share PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={downloadPdf} activeOpacity={0.85}>
                        <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.actionBtnText}>Save PDF</Text>
                    </TouchableOpacity>
                </View>

                {/* Branding Footer */}
                <View style={styles.brandingFooter}>
                    <Text style={styles.poweredBy}>Secured by</Text>
                    <Text style={styles.brandingText}>HOSTIX<Text style={styles.brandingDot}>•</Text>PG OS</Text>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    ticketCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    ticketTop: {
        padding: 24,
        alignItems: 'center',
    },
    successIconWrap: {
        marginBottom: 12,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    transactionTime: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 20,
    },
    amountBig: {
        fontSize: 36,
        fontWeight: '900',
        marginBottom: 4,
    },
    amountLabel: {
        fontSize: 13,
        color: '#94A3B8',
        textTransform: 'uppercase',
        fontWeight: '700',
        letterSpacing: 1,
    },
    ticketDividerWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        height: 30,
    },
    cutoutLeft: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderRightWidth: 1,
        position: 'absolute',
        left: -15,
        zIndex: 2,
    },
    dashedLine: {
        flex: 1,
        height: 1,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        marginHorizontal: 20,
        opacity: 0.5,
    },
    cutoutRight: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderLeftWidth: 1,
        position: 'absolute',
        right: -15,
        zIndex: 2,
    },
    ticketBottom: {
        padding: 24,
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'right',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        flex: 1,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
    },
    brandingFooter: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        gap: 4,
    },
    poweredBy: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    brandingText: {
        fontWeight: '900',
        color: '#94A3B8',
        fontSize: 13,
        letterSpacing: 1,
    },
    brandingDot: {
        color: '#E2E8F0',
        fontWeight: '900',
    },
});

export default ReceiptScreen;