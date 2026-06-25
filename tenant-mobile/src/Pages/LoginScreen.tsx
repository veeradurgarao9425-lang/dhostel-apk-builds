import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }: any) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signInOtp, connectedHostel, disconnectHostel } = useAuth();

  const handleSendOtp = async () => {
    if (!emailOrPhone) {
      setError('Please enter email or phone number');
      return;
    }
    setLoading(true);
    setError('');
    
    const res = await signInOtp(emailOrPhone);
    setLoading(false);
    
    if (res.error) {
      setError(res.error);
    } else {
      navigation.navigate('OTP', { emailOrPhone });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hostelBadge}>
          <Text style={styles.hostelBadgeText}>
            Connecting to: {connectedHostel?.hostel_name}
          </Text>
          <TouchableOpacity onPress={disconnectHostel}>
            <Text style={styles.changeHostelText}>Change</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Welcome to Stayvix</Text>
        <Text style={styles.subtitle}>Enter your email or phone number</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={[styles.button, !emailOrPhone && styles.buttonDisabled]} 
          onPress={handleSendOtp}
          disabled={!emailOrPhone || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF5252',
    marginBottom: 16,
    textAlign: 'center',
  },
  hostelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  hostelBadgeText: {
    color: '#4338CA',
    fontWeight: '600',
    flex: 1,
  },
  changeHostelText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    marginLeft: 12,
  },
});
