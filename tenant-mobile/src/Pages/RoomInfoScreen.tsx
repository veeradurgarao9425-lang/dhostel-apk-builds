import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { BedDouble, Phone, MessageCircle, Building2, Wrench, Clock } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Screen, AppHeader, Card, SectionHeader, Pill, EmptyState } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { formatCurrency } from '../utils/format';

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || '—'}</Text>
  </View>
);

export default function RoomInfoScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const isAllocated = !!user?.is_allocated;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader
        eyebrow="Your stay"
        title="My Room"
        name={user?.name}
        onPressBell={() => navigation.navigate('Notifications')}
        onPressAvatar={() => navigation.navigate('Profile')}
      />

      {!isAllocated ? (
        <Card>
          <EmptyState
            icon={Clock}
            title="No room allocated yet"
            message="Once your hostel owner allocates a room, all the details will show up here."
          />
        </Card>
      ) : (
        <>
          {/* Room hero */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <BedDouble size={24} color="#fff" />
            </View>
            <Text style={styles.heroLabel}>YOUR ROOM</Text>
            <Text style={styles.heroRoom}>{user?.room_number || '—'}</Text>
            <Text style={styles.heroRent}>{formatCurrency(user?.monthly_rent)} / month</Text>
            <View style={{ marginTop: spacing.md }}>
              <Pill label="Active tenant" tone="success" />
            </View>
          </LinearGradient>

          {/* Room details */}
          <SectionHeader title="Details" />
          <Card padded={false}>
            <View style={styles.cardPad}>
              <DetailRow label="Room number" value={user?.room_number} />
              <DetailRow label="Monthly rent" value={formatCurrency(user?.monthly_rent)} />
              <DetailRow label="Tenant" value={user?.name} />
              <DetailRow label="Phone" value={user?.phone} />
              <DetailRow label="Status" value="Active" />
            </View>
          </Card>

          {/* Owner / front desk contact */}
          <SectionHeader title="Hostel contact" />
          <Card style={styles.contact}>
            <View style={styles.contactRow}>
              <View style={styles.contactIcon}>
                <Building2 size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>Front desk / Owner</Text>
                <Text style={styles.contactSub}>Reach out for any stay-related help</Text>
              </View>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.contactBtn}
                activeOpacity={0.85}
                onPress={() => Linking.openURL('tel:')}
              >
                <Phone size={18} color={colors.primary} />
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Complaints')}
              >
                <Wrench size={18} color={colors.primary} />
                <Text style={styles.contactBtnText}>Raise issue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Notices')}
              >
                <MessageCircle size={18} color={colors.primary} />
                <Text style={styles.contactBtnText}>Notices</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center' },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroLabel: { color: '#C7D2FE', fontSize: font.tiny, fontWeight: '700', letterSpacing: 1 },
  heroRoom: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1, marginVertical: 2 },
  heroRent: { color: '#DBE0FF', fontSize: font.body, fontWeight: '600' },

  cardPad: { paddingHorizontal: spacing.lg },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: font.body, color: colors.textMuted },
  detailValue: {
    fontSize: font.body,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },

  contact: { gap: spacing.lg },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  contactSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  contactActions: { flexDirection: 'row', gap: spacing.sm },
  contactBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactBtnText: { fontSize: font.tiny, fontWeight: '700', color: colors.primary },
});
