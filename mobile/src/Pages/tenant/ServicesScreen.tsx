import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Wifi, Shirt, Car, Dumbbell, Star } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../../contexts/AuthContext';
import { Screen, AppHeader, Card } from '../../components/tenant/ui';
import { colors, radius, spacing, font } from '../../theme/tenantTheme';
import api from '../../services/api';

const amenityIcon: Record<string, any> = {
  wifi:    Wifi,
  'wi-fi': Wifi,
  laundry: Shirt,
  parking: Car,
  gym:     Dumbbell,
};

function getIcon(name: string) {
  const key = name.toLowerCase();
  for (const [k, Icon] of Object.entries(amenityIcon)) {
    if (key.includes(k)) return Icon;
  }
  return Star;
}

export default function ServicesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/amenities');
        const data: any[] = res.data ?? res ?? [];
        if (!cancelled) setAmenities(Array.isArray(data) ? data.filter((a: any) => a.is_active !== false) : []);
      } catch {
        if (!cancelled) setAmenities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []));

  return (
    <Screen>
      <AppHeader
        title="Hostel Services"
        subtitle="Request and track maintenance services"
        showBack={navigation.canGoBack()}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading services…</Text>
        </View>
      ) : amenities.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No services listed by hostel</Text>
        </View>
      ) : (
        <>
          <Card padded={false}>
            {amenities.map((amenity, i) => {
              const Icon = getIcon(amenity.amenity_name ?? '');
              return (
                <View key={amenity.amenity_id ?? i} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
                    <Icon size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{amenity.amenity_name}</Text>
                    {!!amenity.description && (
                      <Text style={styles.detail}>{amenity.description}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>

          <Text style={styles.note}>
            Amenities are managed by your hostel. Availability may vary.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name:        { fontSize: font.body,  fontWeight: '600', color: colors.text },
  detail:      { fontSize: font.small, color: colors.textMuted, marginTop: 2, lineHeight: 19 },
  note:        { fontSize: font.small, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.xl },
  loadingWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  loadingText: { fontSize: font.small, color: colors.textMuted, marginTop: 8 },
  emptyWrap:   { alignItems: 'center', paddingTop: 80 },
  emptyText:   { fontSize: font.body,  color: colors.textMuted },
});
