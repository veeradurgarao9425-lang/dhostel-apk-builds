import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Linking } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { Shield, Info, Lock, Eye, RefreshCw, Trash2, Camera, Bell, ExternalLink } from 'lucide-react-native';

export const PrivacyPolicyScreen = () => {
    const { theme, isDark } = useTheme();

    const openWebPolicy = () => {
        Linking.openURL('https://hostix.app/privacy-policy').catch(() => {});
    };

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
                    <Text style={[styles.introTitle, { color: theme.textPrimary }]}>Hostix Privacy & Data Safety</Text>
                    <Text style={[styles.introSubtitle, { color: theme.textSecondary }]}>
                        Package: com.durgarao2.hostixmobile • Last Updated: August 2026. This policy outlines data handling and security across Hostix.
                    </Text>
                </View>

                <Section title="1. Information We Collect" icon={Info}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        Hostix collects operational information necessary to provide hostel and PG management services:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Manager/Owner Profiles:</Text> Name, phone number, and email address.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Resident & Tenancy Records:</Text> Full name, phone number, check-in dates, allocated room/bed details, emergency contacts, and KYC ID verification.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Financial & Fee Logs:</Text> Rental collections, monthly fee receipts, dues transactions, and operational expense logs. (No raw bank card secrets are stored).</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Media & Documents:</Text> Profile photos, KYC Aadhaar attachments, and maintenance complaint pictures.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>Device Notification Tokens:</Text> Push tokens enabling delivery of alerts and notices.</Text>
                    </View>
                </Section>

                <Section title="2. Device Permissions" icon={Camera}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        We request the following permissions solely when needed:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>CAMERA / STORAGE:</Text> Capture or upload KYC documents and maintenance complaint photos.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>NOTIFICATIONS:</Text> Receive dues reminders, notice board bulletins, and gate pass updates.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>INTERNET:</Text> Secure real-time synchronization with Hostix cloud servers.</Text>
                    </View>
                </Section>

                <Section title="3. How We Use Information" icon={Eye}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        We process collected data to power features in the app and facilitate hostel administration:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Generating monthly tenant fee receipts and tracking payments.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Sending reminders for due rent and hostel notices.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Aggregating revenue charts and operational analytics for owners.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Managing room capacity lists and bed occupancy statuses.</Text>
                    </View>
                </Section>

                <Section title="4. Security and Storage" icon={Lock}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        Your data security is our top priority:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• All user passwords are encrypted using secure bcrypt cryptographic hashing algorithms.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Data exchanges are secured with 256-bit TLS/SSL encryption.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• We do NOT sell, rent, or lease personal datasets to third parties.</Text>
                    </View>
                </Section>

                <Section title="5. Account & Data Deletion" icon={Trash2}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        You have the right to request permanent deletion of your account and personal records at any time:
                    </Text>
                    <View style={styles.bullets}>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• In-App: Go to Settings → Account → Request Account Deletion.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Email: Contact support@hostix.app or privacy@hostix.app with your registered phone number.</Text>
                        <Text style={[styles.bullet, { color: theme.textSecondary }]}>• Requests are processed within 48 to 72 business hours.</Text>
                    </View>
                </Section>

                <Section title="6. Contact & Support" icon={RefreshCw}>
                    <Text style={[styles.text, { color: theme.textSecondary }]}>
                        For privacy inquiries, contact our grievance officer at privacy@hostix.app or support@hostix.app.
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
