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

export default function DeveloperPaymentsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const res = await developerService.getPayments({
        page: pageNum,
        limit: 15,
      });

      if (res.success && res.data) {
        if (pageNum === 1) {
          setPayments(res.data);
        } else {
          setPayments((prev) => [...prev, ...res.data]);
        }
        if (res.summary) setSummary(res.summary);
        if (res.pagination) {
          setTotalPages(res.pagination.total_pages);
          setPage(res.pagination.page);
        }
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const onRefresh = () => {
    setPage(1);
    fetchPayments(1, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchPayments(page + 1);
    }
  };

  const renderPaymentItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Ionicons name="card" size={18} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>{item.student_name || 'Student'}</Text>
          <Text style={styles.hostelName}>{item.hostel_name || 'Hostel'}</Text>
        </View>
        <Text style={styles.amount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Mode: {(item.payment_mode || 'ONLINE').toUpperCase()}</Text>
        <Text style={styles.metaDate}>
          {item.payment_date ? new Date(item.payment_date).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1C1917" />
        </TouchableOpacity>
        <View>
          <Text style={styles.topTag}>FINANCIAL LEDGER</Text>
          <Text style={styles.screenTitle}>Platform Payments</Text>
        </View>
      </View>

      {/* Summary Header */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLbl}>COLLECTED (30D)</Text>
          <Text style={styles.summaryValGreen}>
            ₹{Number(summary.total_collected_last_30_days || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLbl}>TOTAL RECORDED</Text>
          <Text style={styles.summaryVal}>
            ₹{Number(summary.total_collected || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C2410C" />
          <Text style={styles.loadingText}>Loading payment transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item, index) => String(item.payment_id || index)}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="card-outline" size={40} color="#C4B5A5" />
              <Text style={styles.emptyTitle}>No Payments Found</Text>
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
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#EFE7DC',
  },
  summaryLbl: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '800',
  },
  summaryValGreen: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryVal: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
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
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '800',
  },
  hostelName: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 1,
  },
  amount: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5EFE6',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '600',
  },
  metaDate: {
    color: '#A89687',
    fontSize: 11,
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
