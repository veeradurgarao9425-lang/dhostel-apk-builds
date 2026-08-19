import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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

export default function DeveloperAuditLogsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const res = await developerService.getAuditLogs({
        page: pageNum,
        limit: 20,
      });

      if (res.success && res.data) {
        if (pageNum === 1) {
          setLogs(res.data);
        } else {
          setLogs((prev) => [...prev, ...res.data]);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.total_pages);
          setPage(res.pagination.page);
        }
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const onRefresh = () => {
    setPage(1);
    fetchLogs(1, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchLogs(page + 1);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('AUTH')) return '#7C3AED';
    if (action.includes('SUPPORT')) return '#C2410C';
    if (action.includes('STATUS') || action.includes('ACTIVATE')) return '#059669';
    return '#2563EB';
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const color = getActionColor(item.action || '');

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.actionTag, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
            <Text style={[styles.actionText, { color }]}>{item.action}</Text>
          </View>
          <Text style={styles.timeText}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>

        <Text style={styles.devBy}>By Developer: <Text style={styles.devUser}>{item.developer_username || 'Developer'}</Text></Text>

        {item.target_type && (
          <Text style={styles.targetInfo}>Target: {item.target_type} #{item.target_id || 'N/A'}</Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.ipText}>IP: {item.ip_address || '127.0.0.1'}</Text>
          <Text style={styles.idText}>Log #{item.id}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1C1917" />
        </TouchableOpacity>
        <View>
          <Text style={styles.topTag}>GOVERNANCE TRAIL</Text>
          <Text style={styles.screenTitle}>Developer Audit Logs</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C2410C" />
          <Text style={styles.loadingText}>Loading audit trail...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={40} color="#C4B5A5" />
              <Text style={styles.emptyTitle}>No Audit Logs Recorded</Text>
            </View>
          }
        />
      )}
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
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#78716C',
    marginTop: 12,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '800',
  },
  timeText: {
    color: '#A89687',
    fontSize: 10,
  },
  devBy: {
    color: '#78716C',
    fontSize: 12,
    marginBottom: 2,
  },
  devUser: {
    color: '#1C1917',
    fontWeight: '700',
  },
  targetInfo: {
    color: '#57534E',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F5EFE6',
    paddingTop: 8,
  },
  ipText: {
    color: '#A89687',
    fontSize: 10,
  },
  idText: {
    color: '#A89687',
    fontSize: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    marginTop: 20,
  },
  emptyTitle: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
});
