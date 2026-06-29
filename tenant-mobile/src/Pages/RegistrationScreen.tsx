import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Image, Alert, StatusBar, Dimensions, Keyboard, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft, ArrowRight, User, Phone, Mail, FileText,
  Camera, Upload, Check, ChevronDown, Shield, Calendar,
  CreditCard, MapPin,
} from 'lucide-react-native';
import api from '../services/api';

const { width } = Dimensions.get('window');

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const BLUE       = '#2245D4';
const BLUE_LIGHT = '#3b5ee6';
const BLUE_SOFT  = '#EEF3FF';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#0D1B3E';
const TEXT_MID   = '#4A5568';
const TEXT_HINT  = '#A0AEC0';
const BORDER     = '#E2E8F0';
const BG         = '#F8FAFC';
const DANGER     = '#EF4444';
const GREEN      = '#10B981';

const STEPS = [
  { label: 'Basic Info' },
  { label: 'Additional Info' },
  { label: 'Verification' },
];

// ─── Stepper ──────────────────────────────────────────────────────────────────
const Stepper = ({ step }: { step: number }) => (
  <View style={st.stepperRow}>
    {STEPS.map((s, i) => {
      const num   = i + 1;
      const done  = num < step;
      const active = num === step;
      return (
        <React.Fragment key={num}>
          <View style={st.stepItem}>
            <View style={[
              st.stepCircle,
              done   && { backgroundColor: BLUE, borderColor: BLUE },
              active && { backgroundColor: BLUE, borderColor: BLUE },
            ]}>
              {done
                ? <Check size={13} color={WHITE} strokeWidth={3} />
                : <Text style={[st.stepNum, (done || active) && { color: WHITE }]}>{num}</Text>}
            </View>
            <Text style={[st.stepLabel, active && { color: BLUE, fontWeight: '700' }]}>{s.label}</Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[st.stepLine, done && { backgroundColor: BLUE }]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }: any) => (
  <View style={st.fieldWrap}>
    <Text style={st.fieldLabel}>
      {label}
      {required && <Text style={{ color: DANGER }}> *</Text>}
    </Text>
    {children}
    {error ? <Text style={st.fieldErr}>{error}</Text> : null}
  </View>
);

// ─── Input row with icon ───────────────────────────────────────────────────────
const InputRow = ({ icon: Icon, placeholder, value, onChangeText, keyboardType, editable = true, multiline = false, maxLength, error }: any) => (
  <View style={[st.inputRow, !editable && st.inputDisabled, error && { borderColor: DANGER, borderWidth: 1.5 }, multiline && { height: 88, alignItems: 'flex-start', paddingVertical: 12 }]}>
    <Icon size={18} color={error ? DANGER : TEXT_HINT} style={{ marginTop: multiline ? 2 : 0 }} />
    <TextInput
      style={[st.inputText, multiline && { flex: 1, textAlignVertical: 'top' }, error && { color: DANGER }]}
      placeholder={placeholder}
      placeholderTextColor={error ? '#FCA5A5' : TEXT_HINT}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      editable={editable}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      maxLength={maxLength}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
    />
  </View>
);

// ─── Select row with icon + chevron ────────────────────────────────────────────
const SelectRow = ({ icon: Icon, value, placeholder, onPress }: any) => (
  <TouchableOpacity style={st.inputRow} onPress={onPress} activeOpacity={0.7}>
    <Icon size={18} color={TEXT_HINT} />
    <Text style={[st.inputText, !value && { color: TEXT_HINT }]}>{value || placeholder}</Text>
    <ChevronDown size={18} color={TEXT_HINT} />
  </TouchableOpacity>
);

// ─── Photo Upload Widget ───────────────────────────────────────────────────────
const PhotoUpload = ({ uri, onCapture, label = 'Add Photo' }: any) => {
  const pick = () => {
    Alert.alert('Upload Photo', 'Choose an option', [
      { text: 'Camera', onPress: async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access.'); return; }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
        if (!res.canceled) onCapture(res.assets[0].uri);
      }},
      { text: 'Gallery', onPress: async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Allow media access.'); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
        if (!res.canceled) onCapture(res.assets[0].uri);
      }},
      { text: 'Cancel', style: 'cancel' }
    ]);
  };
  return (
    <TouchableOpacity onPress={pick} activeOpacity={0.8} style={st.photoWrap}>
      <View style={[st.photoCircle, uri && { borderColor: BLUE }]}>
        {uri
          ? <Image source={{ uri }} style={st.photoImg} />
          : <Camera size={28} color={BLUE} />}
        <View style={st.photoBadge}>
          <Camera size={12} color={WHITE} />
        </View>
      </View>
      <Text style={st.photoLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── ID Document Upload Box ────────────────────────────────────────────────────
const DocBox = ({ label, uri, onCapture, onRemove }: any) => {
  const pick = () => {
    Alert.alert('Upload Document', 'Choose an option', [
      { text: 'Camera', onPress: async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access.'); return; }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!res.canceled) onCapture(res.assets[0].uri);
      }},
      { text: 'Gallery', onPress: async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Allow media access.'); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
        if (!res.canceled) onCapture(res.assets[0].uri);
      }},
      { text: 'Cancel', style: 'cancel' }
    ]);
  };
  return (
    <TouchableOpacity style={st.docBox} onPress={pick} activeOpacity={0.8}>
      {uri ? (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri }} style={st.docImg} resizeMode="cover" />
          <TouchableOpacity style={st.docRemove} onPress={onRemove}><Text style={{ color: WHITE, fontSize: 10, fontWeight: '700' }}>✕</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={st.docIconCircle}><Upload size={18} color={BLUE} /></View>
          <Text style={st.docLabel}>{label}</Text>
          <Text style={st.docSub}>Tap to upload</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RegistrationScreen({ route, navigation }: any) {
  const { identifier, hostel_id } = route.params;
  const { updateTokenAndUser, refreshUser } = useAuth();
  const { showError, showSuccess } = useToast();
  const isEmail = identifier.includes('@');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Step 1 – Basic Info ──
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [phone, setPhone]               = useState(isEmail ? '' : identifier);
  const ID_PROOF_TYPES = ['Aadhaar', 'PAN', 'Driving License', 'Voter ID', 'Passport'];

  // ── Step 2 – Additional Info ──
  const [gender, setGender]           = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [guardianName, setGuardianName]   = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [genderOpen, setGenderOpen]   = useState(false);

  // ── Step 3 – Verification ──
  const [idProofType, setIdProofType]             = useState('Aadhaar');
  const [idProofTypeOpen, setIdProofTypeOpen]     = useState(false);
  const [idProofNumber, setIdProofNumber]         = useState('');
  const [permanentAddress, setPermanentAddress]   = useState('');
  const [aadhaarFront, setAadhaarFront]           = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack]             = useState<string | null>(null);

  // ── Keyboard State ──
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    const newErrors: Record<string, string> = {};
    if (s === 1) {
      if (!profilePhoto) newErrors.profilePhoto = 'Profile photo is required.';
      if (!firstName.trim() || firstName.trim().length < 3) newErrors.firstName = 'First name must be at least 3 characters.';
      if (!phone.trim()) newErrors.phone = 'Mobile number is required.';
      else if (!/^[6-9]/.test(phone)) newErrors.phone = 'Mobile number must start with 6, 7, 8, or 9.';
      else if (phone.trim().length !== 10) newErrors.phone = 'Mobile number must be exactly 10 digits.';
    }
    if (s === 2) {
      if (!gender) newErrors.gender = 'Please select your gender.';
      if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required.';
      if (guardianPhone.trim() && guardianPhone.trim().length < 10) newErrors.guardianPhone = 'A valid guardian phone number is required.';
    }
    if (s === 3) {
      if (!idProofNumber.trim()) newErrors.idProofNumber = `${idProofType} number is required.`;
      else if (idProofType === 'Aadhaar' && (idProofNumber.length !== 12 || !/^\d+$/.test(idProofNumber))) newErrors.idProofNumber = 'Aadhaar must be exactly 12 digits.';
      else if (idProofType === 'PAN' && idProofNumber.length !== 10) newErrors.idProofNumber = 'PAN must be exactly 10 characters.';
      
      if (!permanentAddress.trim()) newErrors.permanentAddress = 'Address is required.';
      if (!aadhaarFront) newErrors.docFront = 'Front side of ID document is required.';
      if (!aadhaarBack) newErrors.docBack = 'Back side of ID document is required.';
    }
    setErrors(newErrors);
    
    const keys = Object.keys(newErrors);
    if (keys.length > 0) return newErrors[keys[0]];
    return null;
  };

  const handleNext = () => {
    const msg = validateStep(step);
    if (msg) {
      showError(msg);
      return;
    }
    setErrors({});
    setStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setErrors({});
    if (step === 1) navigation.goBack();
    else setStep(s => s - 1);
  };

  const handleRegister = async () => {
    const msg = validateStep(3);
    if (msg) {
      showError(msg);
      return;
    }
    setLoading(true);
    setErrors({});

    // ── Test Mode bypass ──
    const testEmail = 'veeradurgarao@gmail.com';
    const testPhone = '6303359425';
    if (
      identifier === testEmail || identifier === testPhone ||
      phone === testPhone
    ) {
      setTimeout(async () => {
        await updateTokenAndUser('mock-test-token-123', {
          id: 9999,
          name: `${firstName} ${lastName}`.trim(),
          email: isEmail ? identifier : testEmail,
          phone: phone || testPhone,
          hostel_id,
          is_allocated: false,
          room_number: null,
          monthly_rent: 0,
          outstanding_due: 0,
        });
        setLoading(false);
      }, 800);
      return;
    }
    // ─────────────────────

    try {
      const response = await api.post('/auth/tenant/register', {
        identifier,
        hostel_id,
        first_name: firstName,
        last_name: lastName,
        phone,
        email: isEmail ? identifier : '',
        gender,
        date_of_birth: dateOfBirth,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        permanent_address: permanentAddress,
        id_proof_type: 'Aadhaar',
        id_proof_number: idProofNumber,
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* ── Top bar ── */}
      <View style={st.topBar}>
        <TouchableOpacity onPress={handleBack} style={st.backBtn} disabled={loading} activeOpacity={0.7}>
          <ArrowLeft size={20} color={BLUE} />
        </TouchableOpacity>
        <View style={st.topTitle}>
          <Text style={st.titleText}>Create Your Account</Text>
          <Text style={st.titleSub}>Complete your profile to continue.</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Stepper ── */}
      <Stepper step={step} />

      {/* ── Content ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[st.scrollContent, { paddingBottom: isKeyboardVisible ? 240 : 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ────────────────── STEP 1: BASIC INFO ────────────────── */}
          {step === 1 && (
            <View style={st.formContainer}>
              {/* Section header */}
              <View style={st.sectionHead}>
                <View style={st.sectionIcon}><User size={20} color={BLUE} /></View>
                <View>
                  <Text style={st.sectionTitle}>Basic Information</Text>
                  <Text style={st.sectionSub}>Let's start with your basic details.</Text>
                </View>
              </View>

              {/* Profile photo */}
              <View style={st.photoCenterWrap}>
                <PhotoUpload
                  uri={profilePhoto}
                  onCapture={setProfilePhoto}
                  label="Add Photo"
                  sublabel="Optional"
                />
              </View>

              <Field label="First Name" required>
                <InputRow icon={User} placeholder="Enter first name" value={firstName} onChangeText={setFirstName} />
              </Field>
              <Field label="Last Name" required>
                <InputRow icon={User} placeholder="Enter last name" value={lastName} onChangeText={setLastName} />
              </Field>
              <Field label="Mobile Number" required>
                <InputRow
                  icon={Phone}
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={isEmail}
                  maxLength={10}
                />
              </Field>
            </View>
          )}

          {/* ────────────────── STEP 2: ADDITIONAL INFO ────────────────── */}
          {step === 2 && (
            <View style={st.formContainer}>
              <View style={st.sectionHead}>
                <View style={st.sectionIcon}><FileText size={20} color={BLUE} /></View>
                <View>
                  <Text style={st.sectionTitle}>Additional Information</Text>
                  <Text style={st.sectionSub}>Tell us a bit more about you.</Text>
                </View>
              </View>

              <Field label="Gender" required>
                <SelectRow
                  icon={User}
                  value={gender}
                  placeholder="Select gender"
                  onPress={() => setGenderOpen(!genderOpen)}
                />
                {genderOpen && (
                  <View style={st.dropdown}>
                    {['Male', 'Female', 'Other'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[st.dropItem, gender === g && st.dropItemActive]}
                        onPress={() => { setGender(g); setGenderOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[st.dropItemText, gender === g && { color: BLUE, fontWeight: '700' }]}>{g}</Text>
                        {gender === g && <Check size={16} color={BLUE} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>

              <Field label="Date of Birth" required>
                <SelectRow
                  icon={Calendar}
                  value={dateOfBirth || ''}
                  placeholder="Select date of birth"
                  onPress={() => setShowDatePicker(true)}
                />
                <DateTimePickerModal
                  isVisible={showDatePicker}
                  mode="date"
                  maximumDate={new Date()}
                  onConfirm={(date) => {
                    setDateOfBirth(date.toISOString().split('T')[0]);
                    setShowDatePicker(false);
                  }}
                  onCancel={() => setShowDatePicker(false)}
                />
              </Field>

              <Field label="Guardian Name">
                <InputRow icon={User} placeholder="Enter guardian name" value={guardianName} onChangeText={setGuardianName} />
              </Field>
              <Field label="Guardian Mobile Number">
                <InputRow
                  icon={Phone}
                  placeholder="Enter 10-digit mobile number"
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </Field>
            </View>
          )}

          {/* ────────────────── STEP 3: VERIFICATION ────────────────── */}
          {step === 3 && (
            <View style={st.formContainer}>
              <View style={st.sectionHead}>
                <View style={st.sectionIcon}><Shield size={20} color={BLUE} /></View>
                <View>
                  <Text style={st.sectionTitle}>Verification Details</Text>
                  <Text style={st.sectionSub}>Help us verify your identity.</Text>
                </View>
              </View>

              <Field label="ID Proof Type" required>
                <SelectRow icon={Shield} value={idProofType} placeholder="Select ID Type" onPress={() => setIdProofTypeOpen(!idProofTypeOpen)} />
                {idProofTypeOpen && (
                  <View style={st.dropdown}>
                    {ID_PROOF_TYPES.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[st.dropItem, idProofType === type && st.dropItemActive]}
                        onPress={() => { setIdProofType(type); setIdProofTypeOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[st.dropItemText, idProofType === type && { color: BLUE, fontWeight: '700' }]}>{type}</Text>
                        {idProofType === type && <Check size={16} color={BLUE} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>

              <Field label={`${idProofType} Number`} required error={errors.idProofNumber}>
                <InputRow
                  icon={CreditCard}
                  placeholder={`Enter ${idProofType} number`}
                  value={idProofNumber}
                  onChangeText={(t: string) => { setIdProofNumber(t); setErrors(p => ({...p, idProofNumber: ''})) }}
                  keyboardType={idProofType === 'Aadhaar' ? 'number-pad' : 'default'}
                  autoCapitalize={idProofType === 'PAN' ? 'characters' : 'none'}
                  error={!!errors.idProofNumber}
                />
              </Field>
              
              <Field label="Address" required error={errors.permanentAddress}>
                <InputRow
                  icon={MapPin}
                  placeholder="Enter your full address"
                  value={permanentAddress}
                  onChangeText={(t: string) => { setPermanentAddress(t); setErrors(p => ({...p, permanentAddress: ''})) }}
                  multiline
                  error={!!errors.permanentAddress}
                />
              </Field>

              {/* ID Document upload */}
              <Text style={st.docSectionLabel}>ID Document *</Text>
              <View style={st.docRow}>
                <View style={{ flex: 1 }}>
                  <DocBox
                    label="Front Side"
                    uri={aadhaarFront}
                    onCapture={(uri: string) => { setAadhaarFront(uri); setErrors(p => ({...p, docFront: ''})) }}
                    onRemove={() => setAadhaarFront(null)}
                  />
                  {errors.docFront ? <Text style={st.fieldErr}>{errors.docFront}</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <DocBox
                    label="Back Side"
                    uri={aadhaarBack}
                    onCapture={(uri: string) => { setAadhaarBack(uri); setErrors(p => ({...p, docBack: ''})) }}
                    onRemove={() => setAadhaarBack(null)}
                  />
                  {errors.docBack ? <Text style={st.fieldErr}>{errors.docBack}</Text> : null}
                </View>
              </View>
            </View>
          )}



          {/* ── Footer ── */}
          <View style={st.footer}>
            {step === 3 ? (
              <View style={{ width: '100%' }}>
                <TouchableOpacity
                  style={[st.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={WHITE} />
                    : (
                      <View style={st.btnRow}>
                        <Text style={st.primaryBtnText}>Create Account</Text>
                        <ArrowRight size={20} color={WHITE} />
                      </View>
                    )
                  }
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <TouchableOpacity style={st.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
                  <View style={st.btnRow}>
                    <Text style={st.primaryBtnText}>Continue</Text>
                    <ArrowRight size={18} color={WHITE} />
                  </View>
                </TouchableOpacity>
              </View>
            )}
            
            {step === 3 && (
              <View style={{ marginTop: 16 }}>
                <Text style={st.termsText}>
                  By continuing, you agree to our <Text style={{ color: BLUE, fontWeight: '700' }}>Terms of Service</Text>
                </Text>
                <View style={st.secureRow}>
                  <Shield size={14} color={BLUE} />
                  <Text style={st.secureText}>Your data is 100% safe and secure</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { flex: 1, alignItems: 'center' },
  titleText: { fontSize: 17, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 },
  titleSub: { fontSize: 12, color: TEXT_MID, marginTop: 1 },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  stepItem: { alignItems: 'center', gap: 4, minWidth: 72 },
  stepCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 13, fontWeight: '700', color: TEXT_MID },
  stepLabel: { fontSize: 11, fontWeight: '500', color: TEXT_MID, textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: BORDER, marginBottom: 14 },

  // Scroll
  scrollContent: { padding: 16 },

  // Form container
  formContainer: {
    backgroundColor: WHITE,
    paddingHorizontal: 4,
    paddingBottom: 20,
    marginBottom: 16,
  },

  // Section header inside card
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  sectionIcon: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: BLUE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  sectionSub: { fontSize: 12, color: TEXT_MID, marginTop: 2 },

  // Photo
  photoCenterWrap: { alignItems: 'center', marginBottom: 20 },
  photoWrap: { alignItems: 'center', gap: 6 },
  photoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BLUE_SOFT,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  photoImg: { width: 80, height: 80, borderRadius: 40 },
  photoBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: WHITE,
  },
  photoLabel: { fontSize: 13, fontWeight: '700', color: BLUE },
  photoSub: { fontSize: 11, color: TEXT_HINT },

  // Field
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 6 },
  fieldErr: { fontSize: 11, color: DANGER, marginTop: 4, fontWeight: '500' },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: WHITE,
    gap: 10,
  },
  inputText: { flex: 1, fontSize: 14, color: TEXT_DARK, fontWeight: '400' },
  inputDisabled: { backgroundColor: BG },

  // Dropdown
  dropdown: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    backgroundColor: WHITE, marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BG,
  },
  dropItemActive: { backgroundColor: BLUE_SOFT },
  dropItemText: { fontSize: 14, color: TEXT_DARK, fontWeight: '500' },

  // Document upload
  docSectionLabel: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 10, marginTop: 4 },
  docRow: { flexDirection: 'row', gap: 12 },
  docBox: {
    flex: 1, height: 110, borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed',
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
    padding: 10, overflow: 'hidden',
  },
  docImg: { width: '100%', height: '100%', borderRadius: 8 },
  docRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: DANGER, borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  docIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE_SOFT,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  docLabel: { fontSize: 12, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  docSub: { fontSize: 11, color: TEXT_HINT, textAlign: 'center' },

  // Error banner
  errBanner: {
    fontSize: 13, color: DANGER, fontWeight: '600',
    textAlign: 'center', marginBottom: 8,
    backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8,
  },

  // Footer
  footer: { 
    paddingTop: 12, 
    paddingHorizontal: 4, 
    paddingBottom: 20,
    backgroundColor: WHITE 
  },
  navRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    height: 52, width: '100%', alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  primaryBtnText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 48, paddingHorizontal: 16, borderRadius: 10,
    borderWidth: 1.5, borderColor: BLUE, backgroundColor: BLUE_SOFT,
  },
  outlineBtnText: { color: BLUE, fontSize: 15, fontWeight: '700' },

  // Terms + secure
  termsText: { fontSize: 12, color: TEXT_MID, textAlign: 'center', marginTop: 12 },
  secureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 10,
    backgroundColor: BLUE_SOFT, padding: 10, borderRadius: 10,
  },
  secureText: { fontSize: 12, color: BLUE, fontWeight: '600' },
});
