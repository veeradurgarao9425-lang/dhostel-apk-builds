import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperSystemScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await developerService.getSystemStatus();
      if (res.success && res.data) {
        setStatus(res.data);
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
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

  const mem = status?.memory || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1C1917" />
        </TouchableOpacity>
        <View>
          <Text style={styles.topTag}>SYSTEM HEALTH</Text>
          <Text style={styles.screenTitle}>Diagnostics & Server Status</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#C2410C" />
            <Text style={styles.loadingText}>Testing database & server latency...</Text>
          </View>
        ) : (
          <>
            {/* Health Status Card */}
            <View style={styles.card}>
              <View style={styles.healthTop}>
                <View style={styles.pulseDot} />
                <Text style={styles.healthTitle}>ALL SYSTEMS OPERATIONAL</Text>
              </View>
              <Text style={styles.healthSub}>Hostix Multi-Tenant Backend & Aiven Cloud MySQL</Text>
            </View>

            {/* Diagnostics Grid */}
            <View style={styles.grid}>
              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>DB LATENCY</Text>
                <Text style={[styles.diagValue, { color: '#059669' }]}>
                  {status?.database?.latency_ms || 0} ms
                </Text>
                <Text style={styles.diagSub}>Cloud MySQL Pool</Text>
              </View>

              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>SERVER UPTIME</Text>
                <Text style={styles.diagValue}>
                  {Math.floor((status?.uptime_seconds || 0) / 3600)}h {Math.floor(((status?.uptime_seconds || 0) % 3600) / 60)}m
                </Text>
                <Text style={styles.diagSub}>Active Process</Text>
              </View>

              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>NODE.JS MEMORY</Text>
                <Text style={styles.diagValue}>{mem.heap_used_mb || 0} MB</Text>
                <Text style={styles.diagSub}>Heap Used ({mem.heap_total_mb || 0} MB Total)</Text>
              </View>

              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>ACTIVE SESSIONS</Text>
                <Text style={[styles.diagValue, { color: '#C2410C' }]}>
                  {status?.active_support_sessions || 0}
                </Text>
                <Text style={styles.diagSub}>Support Impersonations</Text>
              </View>
            </View>

            {/* Server Details */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>ENVIRONMENT SPECIFICATIONS</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Node Environment</Text>
                <Text style={styles.detailVal}>{status?.environment || 'development'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Node.js Version</Text>
                <Text style={styles.detailVal}>{status?.node_version || 'v22.x'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Database Engine</Text>
                <Text style={styles.detailVal}>MySQL 8.0 (Aiven Cloud)</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timestamp</Text>
                <Text style={styles.detailVal}>{status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  topTag: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
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
    color: '#78716C',
    marginTop: 12,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  healthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  healthTitle: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  healthSub: {
    color: '#78716C',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  diagCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  diagLabel: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '800',
  },
  diagValue: {
    color: '#1C1917',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  diagSub: {
    color: '#78716C',
    fontSize: 10,
    marginTop: 2,
  },
  cardHeading: {
    color: '#8C7A6B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  detailLabel: {
    color: '#78716C',
    fontSize: 12,
  },
  detailVal: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '700',
  },
});
