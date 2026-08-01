import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';

interface GrowthPath {
  path_id: number;
  path_key: string;
  name: string;
  emoji: string;
  description: string;
  color_hex: string;
  is_active: number;
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

  const onPressPath = (path: GrowthPath) => {
    if (path.is_active) {
      navigation.navigate('GrowthRoadmap', { pathKey: path.path_key, pathName: path.name });
    } else {
      Alert.alert(`${path.emoji} ${path.name}`, 'This learning path is coming soon — keep an eye out!');
    }
  };

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
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={paths}
          keyExtractor={(p) => String(p.path_id)}
          numColumns={2}
          columnWrapperStyle={{ gap: theme.spacing.md }}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.card, { backgroundColor: item.is_active ? item.color_hex : theme.colors.surfaceAlt }]}
              onPress={() => onPressPath(item)}
            >
              {!item.is_active && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              )}
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={[styles.cardName, !item.is_active && styles.cardNameMuted]} numberOfLines={2}>
                {item.name}
              </Text>
              {item.is_active ? (
                <Text style={styles.cardProgress}>
                  {item.completedLevels}/{item.totalLevels || '∞'} levels
                </Text>
              ) : (
                <Text style={styles.cardProgressMuted}>Locked</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  headerTitle: { ...theme.text.sectionTitle },
  grid: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing['4xl'], gap: theme.spacing.md },
  card: {
    flex: 1,
    minHeight: 140,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    justifyContent: 'flex-end',
    ...theme.shadow.subtle,
  },
  comingSoonBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.pill,
  },
  comingSoonText: { fontSize: 9, fontWeight: '800', color: theme.colors.textMuted },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardName: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  cardNameMuted: { color: theme.colors.textMuted },
  cardProgress: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '600' },
  cardProgressMuted: { fontSize: 11, color: theme.colors.textSubtle, marginTop: 4, fontWeight: '600' },
});

export default GrowthPathsScreen;
