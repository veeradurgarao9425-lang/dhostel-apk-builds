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

export default function DeveloperPaymentsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

  const fetchPayments = useCallback(async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await developerService.getPayments({ page: currentPage, limit: 20 });
      if (res?.success && res.data) {
        setPayments(res.data.payments || []);
        setTotalRevenue(res.data.total_revenue || 0);
        setPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 20 });
        setPage(currentPage);
      }
    } catch (err) {
      console.error('Fetch payments error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments(1);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments(1);
  };

  const renderPaymentItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="card" size={18} color="#10B981" />
          </View>
          <View>
            <Text style={styles.studentName}>
              {item.first_name} {item.last_name || ''}
            </Text>
            <Text style={styles.hostelName}>{item.hostel_name || 'Hostel'}</Text>
          </View>
        </View>

        <Text style={styles.amount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>
          Method: <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>{item.payment_method || 'Online'}</Text>
        </Text>
        <Text style={styles.footerDate}>
          {new Date(item.payment_date || item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Platform Payments</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Total Revenue Banner */}
      <View style={styles.revenueBanner}>
        <Text style={styles.revLabel}>TOTAL PLATFORM COLLECTIONS</Text>
        <Text style={styles.revAmount}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
      </View>

      {/* Payment Transactions List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading ledger...</Text>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="card-outline" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No payments recorded</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => String(item.payment_id)}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => fetchPayments(page - 1)}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <Ionicons name="arrow-back" size={14} color={page <= 1 ? '#475569' : '#F8FAFC'} />
                  <Text style={[styles.pageBtnText, page <= 1 && { color: '#475569' }]}>Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page <Text style={{ color: '#10B981', fontWeight: '800' }}>{page}</Text> of {pagination.totalPages}
                </Text>

                <TouchableOpacity
                  disabled={page >= pagination.totalPages}
                  onPress={() => fetchPayments(page + 1)}
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
  revenueBanner: {
    backgroundColor: '#131D31',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  revLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  revAmount: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: '900',
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
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  hostelName: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  amount: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  footerDate: {
    color: '#64748B',
    fontSize: 11,
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
