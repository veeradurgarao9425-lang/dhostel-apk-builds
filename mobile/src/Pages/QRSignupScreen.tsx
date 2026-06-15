import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';

export default function QRSignupScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const url = useMemo(() => {
    const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
    const hid = user?.hostel_id;
    return `${baseURL}/public/qr-signup?hostelId=${encodeURIComponent(hid || '')}`;
  }, [user?.hostel_id]);

  return (
    <View style={s.container}>
      <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
        <Text style={s.title}>QR Student Signup</Text>
        <Text style={s.subtitle}>Students scan and submit details. Owner must approve.</Text>
      </LinearGradient>
      <View style={s.body}>
        <View style={s.card}>
          <QRCode value={url} size={240} />
          <Text style={s.link}>{url}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#E2E8F0', marginTop: 6 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, alignItems: 'center', gap: 12 },
  link: { color: '#334155', fontSize: 12, textAlign: 'center' }
});
