import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { GrowthPathsSkeleton } from '../../../components/tenant/growth/GrowthSkeletons';

interface GrowthPath {
  path_id: number;
  path_key: string;
  name: string;
  emoji: string;
  description: string;
  color_hex: string;
  completedLevels: number;
  totalLevels: number;
}

export function GrowthPathsScreen({ navigation }: any) {
  const [paths, setPaths] = useState<GrowthPath[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api
        .get('/growth/paths')
        .then((res) => {
          if (!cancelled && res.data?.success) setPaths(res.data.data);
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Paths</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <GrowthPathsSkeleton />
      ) : (
        <FlatList
          data={paths}
          keyExtractor={(p) => String(p.path_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const pct = item.totalLevels > 0 ? Math.min(100, Math.round((item.completedLevels / item.totalLevels) * 100)) : 0;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => navigation.navigate('GrowthRoadmap', { pathKey: item.path_key, pathName: item.name, colorHex: item.color_hex })}
              >
                <View style={[styles.iconBadge, { backgroundColor: item.color_hex + '22' }]}>
                  <Text style={styles.iconEmoji}>{item.emoji}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: item.color_hex }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                      {item.completedLevels}/{item.totalLevels}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  headerTitle: { ...theme.text.sectionTitle },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing['4xl'], gap: theme.spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    ...theme.shadow.subtle,
  },
  iconBadge: {
    width: 52, height: 52, borderRadius: theme.radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 26 },
  cardName: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  cardDescription: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
});

export default GrowthPathsScreen;
