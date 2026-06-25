import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Key } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export const HostelKeyScreen = () => {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { connectHostel } = useAuth();

  const handleConnect = async () => {
    if (key.length < 3) {
      Alert.alert('Invalid Key', 'Please enter a valid Hostel Key.');
      return;
    }

    setIsLoading(true);
    const { error, data } = await connectHostel(key.toUpperCase());
    setIsLoading(false);

    if (error) {
      Alert.alert('Connection Failed', error);
    } else {
      Alert.alert('Connected!', `Successfully connected to ${data?.hostel_name}.`);
      // AuthContext state will update, which triggers AppNavigator to show LoginScreen
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Key size={48} color="#6366f1" />
          </View>

          <Text style={styles.title}>Connect to Hostel</Text>
          <Text style={styles.subtitle}>
            Enter the Hostel Key provided by your owner to connect to your hostel.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. HX9A2B"
              placeholderTextColor="#9ca3af"
              value={key}
              onChangeText={(text) => setKey(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (key.length < 3 || isLoading) && styles.buttonDisabled
            ]}
            onPress={handleConnect}
            disabled={key.length < 3 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
