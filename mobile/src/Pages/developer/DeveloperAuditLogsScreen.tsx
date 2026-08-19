import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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

export default function DeveloperAuditLogsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 30 });

  const fetchLogs = useCallback(async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await developerService.getAuditLogs({ page: currentPage, limit: 30 });
      if (res?.success && res.data) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 30 });
        setPage(currentPage);
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs(1);
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return '#3B82F6';
    if (action.includes('START_SUPPORT')) return '#F59E0B';
    if (action.includes('EXIT_SUPPORT')) return '#10B981';
    if (action.includes('SUSPEND') || action.includes('DEACTIVATE')) return '#EF4444';
    if (action.includes('ACTIVATE')) return '#10B981';
    return '#A855F7';
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const actionColor = getActionColor(item.action);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.actionBadge, { backgroundColor: `${actionColor}20`, borderColor: actionColor }]}>
            <Text style={[styles.actionBadgeText, { color: actionColor }]}>{item.action}</Text>
          </View>
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>

        <View style={styles.logBody}>
          <Text style={styles.logText}>
            By: <Text style={styles.devText}>{item.developer_username || 'Developer'}</Text> (ID #{item.developer_id})
          </Text>
          {item.target_type && (
            <Text style={styles.targetText}>
              Target: <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>{item.target_type}</Text> {item.target_id ? `(#${item.target_id})` : ''}
            </Text>
          )}
        </View>

        {item.metadata ? (
          <View style={styles.metaBox}>
            <Text style={styles.metaText} numberOfLines={2}>
              {typeof item.metadata === 'string' ? item.metadata : JSON.stringify(item.metadata)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Developer Audit Trail ({pagination.total})</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Logs List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={styles.loadingText}>Fetching audit records...</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="time-outline" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No audit logs found</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC4899" />}
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => fetchLogs(page - 1)}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <Ionicons name="arrow-back" size={14} color={page <= 1 ? '#475569' : '#F8FAFC'} />
                  <Text style={[styles.pageBtnText, page <= 1 && { color: '#475569' }]}>Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page <Text style={{ color: '#EC4899', fontWeight: '800' }}>{page}</Text> of {pagination.totalPages}
                </Text>

                <TouchableOpacity
                  disabled={page >= pagination.totalPages}
                  onPress={() => fetchLogs(page + 1)}
                  style={[styles.pageBtn, page >= pagination.totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={[styles.pageBtnText, page >= pagination.totalPages && { color: '#475569' }]}>Next</Text>
                  <Ionicons name="arrow-forward" size={14} color={page >= pagination.totalPages ? '#475569' : '#F8FAFC'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
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
  listContent: {
    padding: 14,
    paddingBottom: 30,
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
  emptyBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#131D31',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  timeText: {
    color: '#64748B',
    fontSize: 10,
  },
  logBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  logText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  devText: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  targetText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  metaBox: {
    backgroundColor: '#0B1120',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  metaText: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  pageInfo: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
