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

// Helper for number to words
const numberToWords = (num: number) => {
    if (num === 0) return 'ZERO ONLY';
    const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
    const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const n = ('000000000' + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'CRORE ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'LAKH ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'THOUSAND ' : '';
    str += (n[4] != '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'HUNDRED ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'AND ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str.trim() + ' ONLY';
};

export const ReceiptScreen = ({ navigation, route }: any) => {
    const { feeData } = route.params || {};

    if (!feeData) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 100, fontSize: 16 }}>No Receipt Data Found</Text>
            </View>
        );
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    };

    const receiptData = {
        receiptNo: feeData.fee_id ? `REC-${feeData.fee_id}-${Date.now().toString().slice(-4)}` : 'N/A',
        student: `${feeData.first_name} ${feeData.last_name}`,
        room: feeData.room_number || 'N/A',
        amountPaid: feeData.paid_amount || 0,
        paymentMode: 'CASH', // Defaulting to CASH as per design image
        date: formatDate(new Date().toISOString()),
        mobile: feeData.phone || 'N/A',
        month: feeData.fee_month || 'N/A',
    };

    const generateHtml = () => {
        return `
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; background-color: #f9f9f9; }
                  .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #eee; }
                  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                  .hostel-name { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                  .receipt-title { font-size: 18px; color: #666; font-weight: 500; text-transform: uppercase; }
                  .meta { display: flex; justify-content: space-between; margin-bottom: 30px; color: #666; font-size: 14px; }
                  .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                  .details-table th, .details-table td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #eee; }
                  .details-table th { color: #888; font-weight: 500; width: 40%; }
                  .details-table td { color: #333; font-weight: 600; text-align: right; }
                  .amount-row td { font-size: 18px; color: #2E7D32; border-top: 2px solid #eee; }
                  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; line-height: 1.6; }
                  .signature { margin-top: 50px; text-align: right; padding-right: 20px; }
                  .sign-line { border-top: 1px solid #ccc; display: inline-block; width: 200px; padding-top: 5px; font-weight: bold; color: #333; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="hostel-name">My Hostel</div>
                    <div class="receipt-title">Payment Receipt</div>
                  </div>
                  
                  <div class="meta">
                    <div><strong>Date:</strong> ${receiptData.date}</div>
                    <div><strong>Receipt No:</strong> ${receiptData.receiptNo}</div>
                  </div>
                  
                  <table class="details-table">
                    <tr>
                      <th>Student Name</th>
                      <td>${receiptData.student}</td>
                    </tr>
                    <tr>
                      <th>Room Number</th>
                      <td>${receiptData.room}</td>
                    </tr>
                    <tr>
                      <th>Mobile Number</th>
                      <td>${receiptData.mobile}</td>
                    </tr>
                    <tr>
                      <th>Fee Month</th>
                      <td>${receiptData.month}</td>
                    </tr>
                    <tr>
                      <th>Payment Mode</th>
                      <td>${receiptData.paymentMode}</td>
                    </tr>
                    <tr class="amount-row">
                      <th>Amount Paid</th>
                      <td>₹${receiptData.amountPaid.toLocaleString('en-IN')}</td>
                    </tr>
                  </table>
                  
                  <div class="signature">
                    <div class="sign-line">Authorized Signature</div>
                  </div>

                  <div class="footer">
                    <p>Thank you for your payment!</p>
                    <p>This is a computer generated receipt.</p>
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
            <StatusBar barStyle="light-content" backgroundColor="#1E9E49" />

            {/* Header */}
            <AppHeader title="Payment Receipt" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Main Card */}
                <View style={styles.card}>
                    {/* Top Section */}
                    <View style={styles.cardHeader}>
                        <Text style={styles.studentName}>{receiptData.student.toUpperCase()}</Text>
                        <View style={styles.receiptBadge}>
                            <Text style={styles.receiptBadgeText}>RECEIPT</Text>
                        </View>
                    </View>
                    <Text style={styles.addressText}>
                        Hyderabad{'\n'}Ward 104 Kondapur, Ranga Reddy, Serilingampalle mandal
                    </Text>

                    {/* Details Box */}
                    <View style={styles.detailsBox}>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Invoice No: </Text>{receiptData.receiptNo}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Invoice Month: </Text>{receiptData.month}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Paid at: </Text>{receiptData.date}</Text>
                        
                        <View style={styles.rowDetails}>
                            <View>
                                <Text style={styles.detailLabel}>Room No:</Text>
                                <Text style={styles.detailValueLarge}>{receiptData.room}</Text>
                            </View>
                            <View style={{ marginRight: 20 }}>
                                <Text style={styles.detailLabel}>Mobile:</Text>
                                <Text style={styles.detailValueLarge}>{receiptData.mobile}</Text>
                            </View>
                        </View>

                        {/* Table */}
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.th, { flex: 2 }]}>Description</Text>
                                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Rent</Text>
                                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Deposit</Text>
                                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={[styles.td, { flex: 2, fontWeight: 'bold' }]}>Monthly Rent</Text>
                                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>₹ {receiptData.amountPaid}</Text>
                                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>₹ 0</Text>
                                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>₹ {receiptData.amountPaid}</Text>
                            </View>
                            <View style={styles.wordsRow}>
                                <Text style={styles.wordsText}>Amount in Words: <Text style={styles.wordsHighlight}>{numberToWords(receiptData.amountPaid)}</Text></Text>
                            </View>
                        </View>
                    </View>

                    {/* Notice */}
                    <View style={styles.noticeBox}>
                        <Text style={styles.noticeText}>Notice: Once Advance / Rent paid is non-refundable on any excuse.</Text>
                    </View>

                    {/* Signature */}
                    <View style={styles.signatureSection}>
                        <Text style={styles.signatureTitle}>Incharge Sign</Text>
                        <Text style={styles.signatureNote}>This is a computer generated receipt and does not require physical signature.</Text>
                    </View>

                    {/* Payment Mode */}
                    <View style={styles.paymentSection}>
                        <Text style={styles.paymentModeText}>Payment Mode: <Text style={styles.paymentModeValue}>{receiptData.paymentMode}</Text></Text>
                        <View style={styles.paidBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                            <Text style={styles.paidText}>PAID</Text>
                        </View>
                    </View>
                </View>

                {/* Share Button */}
                <TouchableOpacity style={styles.shareButton} onPress={sharePdf}>
                    <Ionicons name="share-social-outline" size={20} color="#FFF" />
                    <Text style={styles.shareText}>Share Receipt</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F8FA',
    },
    header: {
        backgroundColor: '#1E9E49',
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    backButton: {
        backgroundColor: '#FFF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 0, // padding applied inside sections
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 20,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 4,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A365D',
        flex: 1,
    },
    receiptBadge: {
        backgroundColor: '#1E3A8A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    receiptBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    addressText: {
        fontSize: 12,
        color: '#718096',
        paddingHorizontal: 16,
        paddingBottom: 16,
        lineHeight: 18,
    },
    detailsBox: {
        backgroundColor: '#F4F7FB',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 8,
    },
    detailText: {
        fontSize: 13,
        color: '#1A365D',
        marginBottom: 4,
    },
    detailLabel: {
        fontWeight: 'bold',
        color: '#1A365D',
    },
    rowDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 16,
    },
    detailValueLarge: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1A365D',
        marginTop: 4,
    },
    table: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EBF4FF',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#E2E8F0',
    },
    th: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1A365D',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#E2E8F0',
    },
    td: {
        fontSize: 13,
        color: '#2D3748',
    },
    wordsRow: {
        padding: 12,
        backgroundColor: '#FFF',
    },
    wordsText: {
        fontSize: 12,
        color: '#1A365D',
        fontWeight: 'bold',
    },
    wordsHighlight: {
        color: '#1A365D',
    },
    noticeBox: {
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#FEF3C7',
    },
    noticeText: {
        color: '#B45309',
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    signatureSection: {
        padding: 16,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderColor: '#E2E8F0',
    },
    signatureTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4A5568',
        marginBottom: 4,
    },
    signatureNote: {
        fontSize: 10,
        color: '#A0AEC0',
        textAlign: 'right',
    },
    paymentSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F0FDF4',
    },
    paymentModeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1A202C',
    },
    paymentModeValue: {
        color: '#1A202C',
    },
    paidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#34D399',
    },
    paidText: {
        color: '#059669',
        fontWeight: 'bold',
        marginLeft: 4,
        fontSize: 12,
    },
    shareButton: {
        backgroundColor: '#3B82F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        alignSelf: 'center',
        width: '60%',
    },
    shareText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default ReceiptScreen;