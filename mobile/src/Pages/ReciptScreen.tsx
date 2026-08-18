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
import { generateReceiptHtml } from '../utils/receiptHtml';

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

    const generateHtml = () => generateReceiptHtml({
        documentTitle,
        hostelName,
        hostelAddress: (user as any)?.hostel_address || undefined,
        ownerName: user?.full_name || user?.name || undefined,
        ownerContact: user?.phone || undefined,
        payerLabel: recipientLabel,
        payerName: studentName,
        payerContact: mobileNo,
        roomNo,
        isStaff,
        receiptNo,
        transactionTime,
        paymentMode,
        transactionId,
        periodLabel: feeMonth,
        amountPaid: parseFloat(String(amountPaid)) || 0,
        duesAmount: parseFloat(String(feeData.total_due ?? feeData.dues_amount ?? amountPaid)) || 0,
        netBalance: parseFloat(String(feeData.balance ?? 0)) || 0,
        recordedBy: user?.full_name || user?.name || undefined,
    });

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