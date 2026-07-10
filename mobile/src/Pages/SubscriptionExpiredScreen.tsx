import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhoneCall, ShieldAlert } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const SubscriptionExpiredScreen = () => {
    const handleCallAdmin = () => {
        Linking.openURL('tel:6303359425');
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0F172A', '#1E293B']} style={StyleSheet.absoluteFillObject} />
            
            <View style={styles.content}>
                <View style={styles.iconWrapper}>
                    <View style={styles.iconBackground}>
                        <ShieldAlert size={64} color="#F43F5E" strokeWidth={1.5} />
                    </View>
                </View>

                <Text style={styles.title}>Subscription Completed</Text>
                
                <Text style={styles.message}>
                    Your free trial or subscription plan has ended. You can still view your data, but all management features are temporarily locked.
                </Text>
                
                <View style={styles.contactBox}>
                    <Text style={styles.contactTitle}>Your subscription is completed.</Text>
                    <Text style={styles.contactSubtitle}>Please contact admin to renew.</Text>
                </View>

                <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleCallAdmin}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#E11D48', '#BE123C']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <PhoneCall color="#FFF" size={20} />
                        <Text style={styles.buttonText}>Call Admin: 6303359425</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' },
    content: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
    iconWrapper: { marginBottom: 32, alignItems: 'center', justifyContent: 'center' },
    iconBackground: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(244, 63, 94, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)' },
    title: { fontSize: 28, fontWeight: '800', color: '#F8FAFC', marginBottom: 16, textAlign: 'center', letterSpacing: 0.5 },
    message: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginBottom: 40, lineHeight: 24, fontWeight: '500' },
    contactBox: { backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: 24, borderRadius: 20, width: '100%', marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    contactTitle: { fontSize: 18, color: '#F8FAFC', fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    contactSubtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },
    button: { width: '100%', borderRadius: 16, overflow: 'hidden', shadowColor: '#E11D48', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
    buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 24, gap: 12 },
    buttonText: { color: 'white', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 }
});
