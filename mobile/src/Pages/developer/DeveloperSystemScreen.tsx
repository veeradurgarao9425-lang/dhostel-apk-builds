import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperSystemScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [system, setSystem] = useState<any>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await developerService.getSystemStatus();
      if (res?.success && res.data) {
        setSystem(res.data);
      }
    } catch (err) {
      console.error('Fetch system status error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const formatUptime = (seconds = 0) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>System & Database Diagnostics</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Running server ping & diagnostics...</Text>
          </View>
        ) : (
          <>
            {/* Database Health Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="server" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.cardTitle}>Database Engine</Text>
                </View>
                <View style={styles.statusBadgeGreen}>
                  <Text style={styles.statusBadgeTextGreen}>{system?.database?.status || 'HEALTHY'}</Text>
                </View>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Query Latency (Roundtrip)</Text>
                <Text style={styles.diagValGreen}>{system?.database?.latency_ms || 0} ms</Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Connection Pool Bounds</Text>
                <Text style={styles.diagVal}>Min: {system?.database?.pool_min} / Max: {system?.database?.pool_max}</Text>
              </View>
            </View>

            {/* Server Runtime Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="hardware-chip" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.cardTitle}>Backend Runtime</Text>
                </View>
                <View style={styles.statusBadgeBlue}>
                  <Text style={styles.statusBadgeTextBlue}>{system?.server?.status || 'ONLINE'}</Text>
                </View>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Node.js Version</Text>
                <Text style={styles.diagVal}>{system?.server?.node_version || 'N/A'}</Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Server Uptime</Text>
                <Text style={styles.diagVal}>{formatUptime(system?.server?.uptime_seconds)}</Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Environment</Text>
                <Text style={styles.diagVal}>{system?.server?.environment}</Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Heap Memory Used</Text>
                <Text style={styles.diagVal}>{system?.server?.memory?.heap_used_mb} MB / {system?.server?.memory?.heap_total_mb} MB</Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Resident Set Size (RSS)</Text>
                <Text style={styles.diagVal}>{system?.server?.memory?.rss_mb} MB</Text>
              </View>
            </View>

            <TouchableOpacity onPress={fetchStatus} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.refreshBtnText}>Re-test Diagnostics</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  topBarTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#131D31',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeTextGreen: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeTextBlue: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  diagLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  diagVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  diagValGreen: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '900',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
