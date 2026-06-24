import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { Shield, Info, Lock, Eye, RefreshCw } from 'lucide-react-native';

export const PrivacyPolicyScreen = () => {
    const { theme, isDark } = useTheme();

    const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
        <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                    <Icon size={18} color={theme.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader title="Privacy Policy" />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.introBlock}>
                    <Shield size={44} color={theme.primary} style={styles.introIcon} />
                    <Text style={[styles.introTitle, { color: theme.textPrimary }]}>Hostix Privacy Disclosures</Text>
                    <Text style={[styles.introSubtitle, { color: theme.textSecondary }]}>
                        Last Updated: June 23, 2026. This policy outlines how Hostix collects, manages, and secures data on your device and servers.
                    </Text>
                </View>

                <Section title="1. Information We Collect" icon={Info}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        Hostix collects operational information necessary to run and organize your hostel business. This includes:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Manager/Owner profile details:</Text> Name and email address registered on registration.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Tenant records:</Text> Full name, phone number, check-in dates, allocated room/bed details, and check-out statuses.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Financial logs:</Text> Rental collections, monthly fee receipts, dues transactions, and daily visitor/guest payments.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Expense records:</Text> Operational bills (electricity, water, maintenance, salaries) recorded by the manager.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Device notification tokens:</Text> Push tokens enabling the delivery of notifications and dues alerts.</Text>
                    </View>
                </Section>

                <Section title="2. How We Use Information" icon={Eye}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        We use the collected information to power features in the app and facilitate hostel administration:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Generating monthly tenant fee receipts and tracking collections.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Dispatching reminders for due rent and important notices.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Aggregating monthly revenue charts and operational profit margins.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Managing room capacity lists and bed occupancy statuses.</Text>
                    </View>
                </Section>

                <Section title="3. Security and Storage" icon={Lock}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        Your data security is our top priority:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• All user passwords are encrypted using secure cryptographic hashing algorithms prior to storage.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Data exchanges between the mobile client and the host servers are encrypted using standard SSL protocols.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• We do not sell, rent, or lease any of your business records or personal datasets to third parties.</Text>
                    </View>
                </Section>

                <Section title="4. Revisions and Control" icon={RefreshCw}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        We may update this policy occasionally to support new app features. Since Hostix provides instant edit and delete functionality, owners and managers can delete tenant records, guest registers, and logged expenses instantly to maintain control over their data footprint.
                    </Text>
                </Section>

                <View style={styles.footerSpacing} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    introBlock: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 8,
        marginBottom: 16,
    },
    introIcon: {
        marginBottom: 12,
    },
    introTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 6,
        textAlign: 'center',
    },
    introSubtitle: {
        fontSize: 12.5,
        lineHeight: 18,
        textAlign: 'center',
    },
    section: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    sectionContent: {
        paddingLeft: 2,
    },
    text: {
        fontSize: 13.5,
        lineHeight: 19,
    },
    bullets: {
        marginTop: 8,
        gap: 6,
    },
    bullet: {
        fontSize: 13,
        lineHeight: 18,
    },
    footerSpacing: {
        height: 40,
    },
});

export default PrivacyPolicyScreen;
