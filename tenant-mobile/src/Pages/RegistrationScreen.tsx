import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const TOTAL_STEPS = 3;

export default function RegistrationScreen({ route, navigation }: any) {
  const { identifier, hostel_id } = route.params;
  const { updateTokenAndUser, refreshUser } = useAuth();

  const isEmail = identifier.includes('@');

  const [step, setStep] = useState(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(isEmail ? '' : identifier);
  const [email, setEmail] = useState(isEmail ? identifier : '');
  const [gender, setGender] = useState('Male');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const idProofType = '1'; // 1 = Aadhaar
  const [idProofNumber, setIdProofNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate only the fields on the current step before advancing.
  const validateStep = () => {
    if (step === 1) {
      if (!firstName.trim()) return 'Please enter your first name.';
    }
    if (step === 2) {
      if (!phone.trim() || phone.trim().length < 10) return 'Please enter a valid 10-digit phone number.';
    }
    if (step === 3) {
      if (!idProofNumber.trim()) return 'Please enter your ID proof number.';
    }
    return '';
  };

  const handleNext = () => {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setError('');
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleRegister = async () => {
    const msg = validateStep();
    if (msg) {
      setError(msg);
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

      if (response.data?.success) {
        const token = response.data.data.token;
        const tenantData = response.data.data.tenant;
        await updateTokenAndUser(token, tenantData);
        // Pull the full live profile so the dashboard's pending state is accurate.
        await refreshUser();
        // Auth context now has a user → AppNavigator swaps to the dashboard,
        // which shows the "waiting for room allocation" state.
      } else {
        setLoading(false);
        setError(response.data?.error || 'Registration failed.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Network error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header + progress */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} disabled={loading}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepCount}>Step {step} of {TOTAL_STEPS}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              <Text style={styles.title}>About you</Text>
              <Text style={styles.subtitle}>Let's start with your name and gender.</Text>

              <Field label="First Name *">
                <TextInput style={styles.input} placeholder="e.g. Rahul" value={firstName} onChangeText={setFirstName} />
              </Field>

              <Field label="Last Name">
                <TextInput style={styles.input} placeholder="e.g. Sharma" value={lastName} onChangeText={setLastName} />
              </Field>

              <Field label="Gender *">
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderButton, gender === g && styles.genderButtonActive]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>Contact</Text>
              <Text style={styles.subtitle}>How can the hostel reach you?</Text>

              <Field label="Phone Number *">
                <TextInput
                  style={[styles.input, !isEmail && styles.inputDisabled]}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={isEmail}
                />
              </Field>

              <Field label="Email Address">
                <TextInput
                  style={[styles.input, isEmail && styles.inputDisabled]}
                  placeholder="your.email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isEmail}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.title}>ID & guardian</Text>
              <Text style={styles.subtitle}>Required for hostel records.</Text>

              <Field label="Aadhaar / ID Proof Number *">
                <TextInput style={styles.input} placeholder="Enter ID number" value={idProofNumber} onChangeText={setIdProofNumber} />
              </Field>

              <Field label="Permanent Address">
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Full address"
                  value={permanentAddress}
                  onChangeText={setPermanentAddress}
                  multiline
                  numberOfLines={3}
                />
              </Field>

              <Field label="Guardian Name">
                <TextInput style={styles.input} placeholder="Parent or Guardian Name" value={guardianName} onChangeText={setGuardianName} />
              </Field>

              <Field label="Guardian Phone">
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </Field>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        {/* Sticky footer action */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={step === TOTAL_STEPS ? handleRegister : handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{step === TOTAL_STEPS ? 'Submit Application' : 'Continue'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#6B5B95',
    fontWeight: '600',
  },
  stepCount: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 24,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#6B5B95',
    borderRadius: 3,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 6,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#757575',
    marginBottom: 28,
    lineHeight: 22,
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
  footer: {
    padding: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  button: {
    backgroundColor: '#6B5B95',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF5252',
    marginTop: 8,
    textAlign: 'center',
  },
});
