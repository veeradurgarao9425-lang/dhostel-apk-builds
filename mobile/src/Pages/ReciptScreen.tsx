import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    Clipboard,
    Linking,
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
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <AppHeader title="Transaction Details" showBack={true} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="receipt-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>No Receipt Data Found</Text>
                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>This transaction record could not be loaded.</Text>
                </View>
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
        
        return `${displayHours}:${displayMinutes} ${ampm} • ${day} ${month} ${year}`;
    };

    const isStaff = feeData.isStaff === true;
    const hostelName = user?.hostel_name || 'My Hostel';
    const amountPaid = feeData.paid_amount || feeData.amount || 0;
    const paymentMode = (feeData.payment_mode_name || feeData.mode || feeData.payment_mode || 'CASH').toUpperCase();
    const transactionId = feeData.transaction_id || '';
    const receiptNo = feeData.receipt_number || (feeData.fee_id ? `REC-${feeData.fee_id}` : (feeData.payment_id ? `REC-${feeData.payment_id}` : 'N/A'));
    const transactionTime = formatDateTime(feeData.payment_date || feeData.created_at || new Date().toISOString());
    const studentName = `${feeData.first_name || ''} ${feeData.last_name || ''}`.trim() || feeData.full_name || 'N/A';
    const roomNo = isStaff ? 'N/A' : (feeData.room_number || 'N/A');
    const mobileNo = feeData.phone || '';
    const feeMonth = isStaff ? (feeData.note || 'Wage Payment') : (feeData.fee_month || feeData.payment_for_month || 'N/A');

    const documentTitle = isStaff ? 'WAGE RECEIPT' : 'RENT RECEIPT';
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

    const copyToClipboard = (text: string, label: string) => {
        if (!text || text === 'N/A') return;
        Clipboard.setString(text);
        Alert.alert('Copied', `${label} copied to clipboard.`);
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <AppHeader 
                title="Transaction Details" 
                alignLeft
                subtitle="Official payment receipt & records"
                showBack={true} 
            />

            <ScrollView 
                style={styles.content} 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContainer}
            >
                {/* ── 1. Top Payment Status Banner ── */}
                <View style={[
                    styles.heroBanner,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                ]}>
                    <View style={styles.heroTopRow}>
                        <View style={[styles.successIconBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' }]}>
                            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Payment Successful</Text>
                            <Text style={[styles.heroTime, { color: theme.textSecondary }]}>{transactionTime}</Text>
                        </View>
                        <View style={[styles.verifiedPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
                            <Text style={styles.verifiedText}>VERIFIED</Text>
                        </View>
                    </View>

                    {/* Compact Covered Total Received Box */}
                    <View style={[
                        styles.coveredAmountBox,
                        {
                            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                        }
                    ]}>
                        <View>
                            <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Total Received</Text>
                            <Text style={[styles.amountVal, { color: '#10B981' }]}>
                                ₹{Number(amountPaid).toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={[styles.paymentModePill, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF', borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE' }]}>
                            <Ionicons name={paymentMode === 'CASH' ? 'cash' : 'card'} size={13} color="#6366F1" />
                            <Text style={styles.paymentModeText}>{paymentMode}</Text>
                        </View>
                    </View>
                </View>

                {/* ── 2. Payer & Resident Information ── */}
                <View style={[
                    styles.sectionCard,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                ]}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="person" size={15} color="#6366F1" />
                        <Text style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                            {recipientLabel.toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.payerRow}>
                        <View style={[styles.payerAvatar, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF' }]}>
                            <Text style={styles.payerAvatarText}>
                                {studentName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.payerName, { color: theme.textPrimary }]}>{studentName}</Text>
                            <Text style={[styles.payerSub, { color: theme.textSecondary }]}>
                                {mobileNo ? mobileNo : 'Resident Contact'}
                            </Text>
                        </View>
                        {!isStaff && (
                            <View style={[styles.roomBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
                                <Ionicons name="bed" size={12} color="#10B981" />
                                <Text style={styles.roomBadgeText}>
                                    {roomNo !== 'N/A' ? `Room ${roomNo}` : 'No Room'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── 3. Transaction Details & Ledger Summary ── */}
                <View style={[
                    styles.sectionCard,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                ]}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="receipt" size={15} color="#6366F1" />
                        <Text style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                            TRANSACTION LEDGER
                        </Text>
                    </View>

                    <View style={styles.infoGrid}>
                        {/* Receipt No */}
                        <View style={styles.gridRow}>
                            <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Receipt No</Text>
                            <TouchableOpacity 
                                onPress={() => copyToClipboard(receiptNo, 'Receipt No')}
                                style={styles.copyRow}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.gridValue, { color: '#6366F1', fontWeight: '800' }]}>{receiptNo}</Text>
                                <Ionicons name="copy-outline" size={13} color="#6366F1" />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.innerDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                        {/* Payment Period */}
                        <View style={styles.gridRow}>
                            <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Payment Period</Text>
                            <Text style={[styles.gridValue, { color: theme.textPrimary }]}>{feeMonth}</Text>
                        </View>

                        <View style={[styles.innerDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                        {/* Received By */}
                        <View style={styles.gridRow}>
                            <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Received By</Text>
                            <Text style={[styles.gridValue, { color: theme.textPrimary, flex: 1, textAlign: 'right' }]}>{hostelName}</Text>
                        </View>

                        {Boolean(transactionId && transactionId !== 'N/A') && (
                            <>
                                <View style={[styles.innerDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                                <View style={styles.gridRow}>
                                    <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Ref / UTR ID</Text>
                                    <TouchableOpacity 
                                        onPress={() => copyToClipboard(transactionId, 'Transaction ID')}
                                        style={styles.copyRow}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.gridValue, { color: theme.textPrimary }]}>{transactionId}</Text>
                                        <Ionicons name="copy-outline" size={13} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* ── 4. Full-Width Action Buttons ── */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity 
                        style={[
                            styles.actionBtnSecondary, 
                            { 
                                backgroundColor: isDark ? '#1E293B' : '#FFFFFF', 
                                borderColor: theme.primary, 
                            }
                        ]} 
                        onPress={sharePdf} 
                        activeOpacity={0.8}
                    >
                        <Ionicons name="share-social-outline" size={18} color={theme.primary} />
                        <Text style={[styles.actionBtnSecondaryText, { color: theme.primary }]}>Share PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionBtnPrimary, { backgroundColor: theme.primary }]} 
                        onPress={downloadPdf} 
                        activeOpacity={0.85}
                    >
                        <Ionicons name="download-outline" size={18} color="#FFF" />
                        <Text style={styles.actionBtnPrimaryText}>Save PDF</Text>
                    </TouchableOpacity>
                </View>

                {/* Security Branding */}
                <View style={styles.brandingFooter}>
                    <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                    <Text style={[styles.brandingText, { color: theme.textSecondary }]}>
                        Verified Digital Record • Secured by <Text style={{ fontWeight: '800', color: theme.textPrimary }}>Hostix PG</Text>
                    </Text>
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
    },
    scrollContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 12,
    },
    heroBanner: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    successIconBadge: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    heroTime: {
        fontSize: 11.5,
        fontWeight: '500',
        marginTop: 1,
    },
    verifiedPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    verifiedText: {
        fontSize: 9.5,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: 0.5,
    },
    coveredAmountBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    amountLabel: {
        fontSize: 10.5,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    amountVal: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    paymentModePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    paymentModeText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#6366F1',
    },
    sectionCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardSectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    payerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    payerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    payerAvatarText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#6366F1',
    },
    payerName: {
        fontSize: 14.5,
        fontWeight: '800',
    },
    payerSub: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    roomBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roomBadgeText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#10B981',
    },
    infoGrid: {
        gap: 10,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    gridLabel: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    gridValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    innerDivider: {
        height: 1,
    },
    copyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    actionBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    actionBtnSecondaryText: {
        fontSize: 14,
        fontWeight: '800',
    },
    actionBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    actionBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    brandingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    brandingText: {
        fontSize: 11,
        fontWeight: '600',
    },
});

export default ReceiptScreen;