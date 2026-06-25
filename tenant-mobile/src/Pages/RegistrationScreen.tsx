import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

export default function RegistrationScreen({ route, navigation }: any) {
  const { identifier, hostel_id } = route.params;
  const { updateTokenAndUser } = useAuth();
  
  const isEmail = identifier.includes('@');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(isEmail ? '' : identifier);
  const [email, setEmail] = useState(isEmail ? identifier : '');
  const [gender, setGender] = useState('Male'); // Default
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [idProofType, setIdProofType] = useState('1'); // Assuming 1 is Aadhaar
  const [idProofNumber, setIdProofNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!firstName.trim() || !phone.trim() || !idProofNumber.trim()) {
      setError('First name, Phone, and ID Proof are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/tenant/register', {
        identifier,
        hostel_id,
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        gender,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        permanent_address: permanentAddress,
        id_proof_type: idProofType,
        id_proof_number: idProofNumber,
      });

      setLoading(false);

      if (response.data?.success) {
        Alert.alert('Success', 'Registration successful! Awaiting owner approval.');
        const token = response.data.data.token;
        const tenantData = response.data.data.tenant;
        
        await updateTokenAndUser(token, tenantData);
      } else {
        setError(response.data?.error || 'Registration failed.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Network error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Complete Registration</Text>
        <Text style={styles.subtitle}>Welcome! Please complete your profile to request admission to the hostel.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sharma"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={[styles.input, !isEmail && styles.inputDisabled]}
            placeholder="10-digit mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            editable={isEmail}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, isEmail && styles.inputDisabled]}
            placeholder="your.email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEmail}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity 
              style={[styles.genderButton, gender === 'Male' && styles.genderButtonActive]}
              onPress={() => setGender('Male')}
            >
              <Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.genderButton, gender === 'Female' && styles.genderButtonActive]}
              onPress={() => setGender('Female')}
            >
              <Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Aadhaar / ID Proof Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter ID number"
            value={idProofNumber}
            onChangeText={setIdProofNumber}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Permanent Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Full address"
            value={permanentAddress}
            onChangeText={setPermanentAddress}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Guardian Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Parent or Guardian Name"
            value={guardianName}
            onChangeText={setGuardianName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Guardian Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            value={guardianPhone}
            onChangeText={setGuardianPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 32,
    lineHeight: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#9E9E9E',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#6B5B95',
    backgroundColor: 'rgba(107, 91, 149, 0.1)',
  },
  genderText: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  genderTextActive: {
    color: '#6B5B95',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#6B5B95',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
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
});
