import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const SubscriptionExpiredScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>!</Text>
        </View>
        <Text style={styles.title}>Subscription Expired</Text>
        <Text style={styles.message}>
          Your free trial or subscription plan has ended. You can still view your data, but all management features are temporarily locked.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => alert('Renewal coming soon!')}>
          <Text style={styles.buttonText}>Renew Subscription</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F2', justifyContent: 'center' },
  content: { padding: 24, alignItems: 'center' },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFE4E6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 32, color: '#E11D48', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#BE123C', marginBottom: 16 },
  message: { fontSize: 16, color: '#9F1239', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  button: { backgroundColor: '#E11D48', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' }
});
