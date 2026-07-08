import React from 'react';
import { View, Text, TouchableOpacity, Animated, Image, StyleSheet } from 'react-native';
import { Wallet, CheckCircle2, AlertCircle, ArrowRight, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface BudgetOverviewProps {
    budget: number;
    spent: number;
    progressAnim: Animated.Value;
    dueAmount: number;
    totalRentAmount: number;
    rentDueDate: string | null;
    formatDate: (date: string | null) => string;
}

export const BudgetOverview = ({
    budget, spent, progressAnim, dueAmount, totalRentAmount, rentDueDate, formatDate
}: BudgetOverviewProps) => {
    const navigation = useNavigation<any>();

    return (
        <>
            {/* ── Budget Progress Bar ── */}
            <View style={{ marginBottom: 16 }}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate("Expenses")}>
                    <View style={[styles.globalCard, { paddingVertical: 20, paddingHorizontal: 20 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.cardIconWrap, { backgroundColor: '#EEF2FF', width: 44, height: 44, borderRadius: 14 }]}>
                                    <Wallet size={20} color="#2952F3" />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>Monthly Budget</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>
                                        {budget > 0 ? `₹${(budget - spent > 0 ? budget - spent : 0).toLocaleString('en-IN')} remaining` : 'No budget set'}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: budget > 0 && spent > budget ? '#EF4444' : '#0F172A', letterSpacing: -0.5 }}>
                                    ₹{spent.toLocaleString('en-IN')}
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>
                                    / ₹{budget > 0 ? budget.toLocaleString('en-IN') : '0'}
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                            <Animated.View style={{
                                height: '100%',
                                borderRadius: 4,
                                backgroundColor: budget > 0 && spent > budget ? '#EF4444' : '#2952F3',
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%']
                                })
                            }} />
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* ── Total Due Overview Card ── */}
            <View style={{ marginBottom: 24 }}>
                <View style={[styles.globalCard, {
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    overflow: 'hidden',
                    backgroundColor: dueAmount === 0 ? '#F0FDF4' : (dueAmount < totalRentAmount ? '#FFF7ED' : '#FEF2F2'),
                    borderColor: dueAmount === 0 ? '#BBF7D0' : (dueAmount < totalRentAmount ? '#FED7AA' : '#FECACA'),
                    borderWidth: 1,
                }]}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <View style={[styles.cardIconWrap, {
                                backgroundColor: dueAmount === 0 ? '#D1FAE5' : (dueAmount < totalRentAmount ? '#FFEDD5' : '#FEE2E2'),
                                width: 32, height: 32, borderRadius: 10,
                            }]}>
                                {dueAmount === 0 ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color={dueAmount < totalRentAmount ? '#EA580C' : '#EF4444'} />}
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748B", marginBottom: 0 }}>
                                {dueAmount > 0 ? "Total Due" : "Monthly Rent"}
                            </Text>
                        </View>
                        <Text style={[{ fontWeight: "800", marginBottom: 2, fontSize: 28 }, dueAmount === 0 ? { color: "#16A34A" } : (dueAmount < totalRentAmount ? { color: "#EA580C" } : { color: "#E11D48" })]}>
                            ₹ {(dueAmount > 0 ? dueAmount : (totalRentAmount || 0)).toLocaleString("en-IN")}
                        </Text>
                        {dueAmount > 0 && (
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 12 }}>
                                📅 Due: {rentDueDate ? formatDate(rentDueDate) : "Not scheduled"}
                            </Text>
                        )}
                        {dueAmount > 0 ? (
                            <TouchableOpacity style={{ backgroundColor: '#0a0a0a', paddingVertical: 10, paddingHorizontal: 16, marginTop: 4, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "flex-start" }} onPress={() => navigation.navigate("Payments")}>
                                <Text style={{ fontSize: 13, color: '#f5f4f2', fontWeight: "700" }}>Pay Now</Text>
                                <ArrowRight size={16} color="#f5f4f2" />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ backgroundColor: "#D1FAE5", paddingVertical: 10, paddingHorizontal: 16, marginTop: 4, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "flex-start" }}>
                                <Check size={16} color="#10B981" strokeWidth={3} />
                                <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>Paid</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ width: 110, height: 110, justifyContent: "center", alignItems: "center" }}>
                        <Image source={require("../../../assets/wallet_3d.png")} style={{ width: 120, height: 120, position: "absolute", right: -16 }} resizeMode="contain" />
                    </View>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    globalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 0,
        shadowColor: "#1F2937",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
    },
    cardIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
