import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || '—'}</Text>
  </View>
);

const formatCurrency = (value?: number | null) =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function HomeScreen({ navigation }: any) {
  const { user, signOut, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Refresh live data every time the dashboard gains focus so owner actions
  // (room allocation, dues) show up without re-login.
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const isAllocated = !!user?.is_allocated;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name || 'Tenant'}</Text>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {!isAllocated ? (
          // Pending state — registered, waiting for the owner to allocate a room.
          // Instead of an empty screen we show the details the tenant submitted,
          // so the room/dues just slot in once the owner accepts.
          <>
            <View style={styles.pendingCard}>
              <Text style={styles.pendingIcon}>⏳</Text>
              <Text style={styles.pendingTitle}>Waiting for room allocation</Text>
              <Text style={styles.pendingText}>
                Your registration is complete. The hostel owner will review and allocate your room
                shortly. Your room and rent details will appear here automatically once that's done.
              </Text>
              <Text style={styles.pendingHint}>Pull down to refresh</Text>
            </View>

            <Text style={styles.sectionTitle}>Your details</Text>
            <View style={styles.detailsCard}>
              <DetailRow label="Name" value={user?.name} />
              <DetailRow label="Phone" value={user?.phone} />
              <DetailRow label="Email" value={user?.email} />
              <DetailRow label="Gender" value={user?.gender} />
            </View>
          </>
        ) : (
          // Allocated — show the real room + dues.
          <>
            <View style={styles.roomCard}>
              <Text style={styles.roomLabel}>Your Room</Text>
              <Text style={styles.roomNumber}>{user?.room_number || '—'}</Text>
              <Text style={styles.rentText}>
                Monthly Rent: {formatCurrency(user?.monthly_rent)}
              </Text>
            </View>

            <View style={styles.dueCard}>
              <Text style={styles.dueAmount}>{formatCurrency(user?.outstanding_due)}</Text>
              <Text style={styles.dueLabel}>
                {user?.next_due_date
                  ? `Due on: ${formatDate(user?.next_due_date)}`
                  : 'Total outstanding'}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  (user?.outstanding_due || 0) > 0 ? styles.statusBadgePending : styles.statusBadgePaid,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    (user?.outstanding_due || 0) > 0 ? styles.statusTextPending : styles.statusTextPaid,
                  ]}
                >
                  {(user?.outstanding_due || 0) > 0 ? 'Pending ⚠️' : 'All clear ✅'}
                </Text>
              </View>
              {(user?.outstanding_due || 0) > 0 && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => navigation.navigate('Payments')}
                >
                  <Text style={styles.payButtonText}>Pay Now</Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#FF5252',
    fontWeight: '600',
  },
  // Pending
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pendingIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 15,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 22,
  },
  pendingHint: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 20,
  },
  // Details
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 24,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  detailLabel: {
    fontSize: 15,
    color: '#757575',
  },
  detailValue: {
    fontSize: 15,
    color: '#212121',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  // Room
  roomCard: {
    backgroundColor: '#6B5B95',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  roomLabel: {
    color: '#E0DFF0',
    fontSize: 14,
  },
  roomNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  rentText: {
    color: '#E0DFF0',
    fontSize: 16,
    marginTop: 8,
  },
  // Dues
  dueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#212121',
  },
  dueLabel: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  statusBadgePending: {
    backgroundColor: '#FFF9C4',
  },
  statusBadgePaid: {
    backgroundColor: '#C8E6C9',
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusTextPending: {
    color: '#FBC02D',
  },
  statusTextPaid: {
    color: '#388E3C',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
