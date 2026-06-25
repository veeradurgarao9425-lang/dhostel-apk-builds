import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OTPScreen({ route, navigation }: any) {
  const emailOrPhone = route.params?.emailOrPhone || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const { verifyOtp, signInOtp } = useAuth();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 4) {
      setError('Please enter valid OTP');
      return;
    }
    setLoading(true);
    setError('');
    
    const res = await verifyOtp(emailOrPhone, otp);
    setLoading(false);
    
    if (res.error) {
      setError(res.error);
    } else {
      // The auth context will automatically swap the stack to Main
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    const res = await signInOtp(emailOrPhone);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setCountdown(30);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>Sent to {emailOrPhone}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={[styles.button, otp.length < 4 && styles.buttonDisabled]} 
          onPress={handleVerify}
          disabled={otp.length < 4 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.resendButton} 
          onPress={handleResend}
          disabled={countdown > 0 || loading}
        >
          <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
            {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 24,
  },
  backText: {
    fontSize: 16,
    color: '#6B5B95',
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
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#6B5B95',
    borderRadius: 8,
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
  resendButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: '#6B5B95',
    fontSize: 16,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#BDBDBD',
  },
});
