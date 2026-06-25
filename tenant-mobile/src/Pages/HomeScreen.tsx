import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen({ navigation }: any) {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name || 'Tenant'}</Text>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dueCard}>
          <Text style={styles.dueAmount}>₹5,000</Text>
          <Text style={styles.dueLabel}>Due on: 28th June 2024</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending ⚠️</Text>
          </View>
          <TouchableOpacity 
            style={styles.payButton}
            onPress={() => navigation.navigate('Payments')}
          >
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Latest from Owner:</Text>
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Your June rent is due on 28th...</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
            <Text style={styles.viewMessageLink}>View Message →</Text>
          </TouchableOpacity>
        </View>

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
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#FF5252',
    fontWeight: '600',
  },
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
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  statusText: {
    color: '#FBC02D',
    fontWeight: 'bold',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  messageText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 12,
  },
  viewMessageLink: {
    color: '#6B5B95',
    fontWeight: '600',
  },
});
