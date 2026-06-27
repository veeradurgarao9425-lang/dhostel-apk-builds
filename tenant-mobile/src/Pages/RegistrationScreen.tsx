import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Phone, FileText, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, radius, spacing, font, shadow } from '../theme';

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
  const [idProofNumber, setIdProofNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateStep = () => {
    if (step === 1 && !firstName.trim()) return 'First name is required.';
    if (step === 2 && (!phone.trim() || phone.trim().length < 10)) return 'A valid 10-digit phone number is required.';
    if (step === 3 && !idProofNumber.trim()) return 'ID proof number is required.';
    return '';
  };

  const handleNext = () => {
    const msg = validateStep();
    if (msg) return setError(msg);
    setError('');
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setError('');
    if (step === 1) navigation.goBack();
    else setStep(s => s - 1);
  };

  const handleRegister = async () => {
    const msg = validateStep();
    if (msg) return setError(msg);

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/tenant/register', {
        identifier, hostel_id, first_name: firstName, last_name: lastName,
        phone, email, gender, guardian_name: guardianName, guardian_phone: guardianPhone,
        permanent_address: permanentAddress, id_proof_type: '1', id_proof_number: idProofNumber,
      });

      if (response.data?.success) {
        const { token, tenant } = response.data.data;
        await updateTokenAndUser(token, tenant);
        await refreshUser();
      } else {
        setError(response.data?.error || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerArea}>
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} disabled={loading} style={styles.backBtn} activeOpacity={0.8}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerStep}>Step {step} of {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <View style={styles.card}>
            {step === 1 && (
              <>
                <View style={styles.iconWrap}><User size={24} color={colors.primary} /></View>
                <Text style={styles.title}>About You</Text>
                <Text style={styles.subtitle}>Let's start with your basic details.</Text>
                
                <Field label="First Name *">
                  <TextInput style={styles.input} placeholder="e.g. Rahul" value={firstName} onChangeText={setFirstName} />
                </Field>
                <Field label="Last Name">
                  <TextInput style={styles.input} placeholder="e.g. Sharma" value={lastName} onChangeText={setLastName} />
                </Field>
                <Field label="Gender *">
                  <View style={styles.genderRow}>
                    {['Male', 'Female'].map(g => (
                      <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)} activeOpacity={0.8}>
                        <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                        {gender === g && <CheckCircle2 size={14} color="#fff" style={{ marginLeft: 6 }} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.iconWrap}><Phone size={24} color={colors.primary} /></View>
                <Text style={styles.title}>Contact Details</Text>
                <Text style={styles.subtitle}>How can the hostel reach you?</Text>
                
                <Field label="Phone Number *">
                  <TextInput style={[styles.input, !isEmail && styles.inputDisabled]} placeholder="10-digit number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} editable={isEmail} />
                </Field>
                <Field label="Email Address">
                  <TextInput style={[styles.input, isEmail && styles.inputDisabled]} placeholder="your.email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!isEmail} />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <View style={styles.iconWrap}><FileText size={24} color={colors.primary} /></View>
                <Text style={styles.title}>ID & Guardian</Text>
                <Text style={styles.subtitle}>Required for hostel administration.</Text>
                
                <Field label="Aadhaar / ID Proof Number *">
                  <TextInput style={styles.input} placeholder="Enter ID number" value={idProofNumber} onChangeText={setIdProofNumber} />
                </Field>
                <Field label="Guardian Name">
                  <TextInput style={styles.input} placeholder="Parent or Guardian Name" value={guardianName} onChangeText={setGuardianName} />
                </Field>
                <Field label="Guardian Phone">
                  <TextInput style={styles.input} placeholder="10-digit number" value={guardianPhone} onChangeText={setGuardianPhone} keyboardType="phone-pad" maxLength={10} />
                </Field>
                <Field label="Permanent Address">
                  <TextInput style={[styles.input, styles.textArea]} placeholder="Full address" value={permanentAddress} onChangeText={setPermanentAddress} multiline numberOfLines={3} />
                </Field>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitBtn} onPress={step === TOTAL_STEPS ? handleRegister : handleNext} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitBtnGrad}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{step === TOTAL_STEPS ? 'Submit Application' : 'Continue'}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Field = ({ label, children }: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerArea: { paddingHorizontal: spacing.xl, paddingTop: 16, paddingBottom: 24, overflow: 'hidden' },
  hCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -20 },
  hCircle2: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerStep: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  progressContainer: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  
  content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, padding: spacing.xl, borderRadius: radius['2xl'], borderWidth: 1, borderColor: colors.border, ...shadow.card },
  
  iconWrap: { width: 56, height: 56, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
  
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSubtle, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 16, height: 52, fontSize: 15, color: colors.text },
  inputDisabled: { backgroundColor: colors.surfaceAlt, color: colors.textSubtle },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, height: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  genderBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  genderTextActive: { color: '#fff', fontWeight: '700' },
  
  errorText: { color: colors.danger, fontSize: 13, marginTop: 4, textAlign: 'center', fontWeight: '500' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 32, borderTopWidth: 1, borderTopColor: colors.border, ...shadow.raised },
  submitBtn: { borderRadius: radius.lg, overflow: 'hidden' },
  submitBtnGrad: { height: 54, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
