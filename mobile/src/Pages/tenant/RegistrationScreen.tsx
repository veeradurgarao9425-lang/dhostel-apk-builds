import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Image, Alert, StatusBar, Dimensions, Keyboard, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import {
  ArrowLeft, ArrowRight, User, Phone, Mail, FileText,
  Camera, Upload, Check, ChevronDown, Shield, Calendar,
  CreditCard, MapPin,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { colors } from '../../theme/tenantTheme';

const { width } = Dimensions.get('window');

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const PURPLE      = colors.primary;       // #6D4AFF
const PURPLE_DARK = colors.primaryDark;   // #5B39E0
const PURPLE_SOFT = colors.primarySoft;   // #F4F1FF
const BLUE        = PURPLE;               // alias for backward compat
const BLUE_LIGHT  = '#8B6BFF';
const BLUE_SOFT   = PURPLE_SOFT;
const WHITE       = '#FFFFFF';
const TEXT_DARK   = '#0D1B3E';
const TEXT_MID    = '#4A5568';
const TEXT_HINT   = '#A0AEC0';
const BORDER      = '#E2E8F0';
const BG          = '#F8FAFC';
const DANGER      = '#EF4444';
const GREEN       = '#10B981';

const STEPS = [
  { label: 'Basic Info' },
  { label: 'Additional Info' },
  { label: 'Verification' },
];

// ─── Stepper ──────────────────────────────────────────────────────────────────
const Stepper = ({ step }: { step: number }) => (
  <View style={st.stepperRow}>
    {STEPS.map((s, i) => {
      const num    = i + 1;
      const done   = num < step;
      const active = num === step;
      return (
        <React.Fragment key={num}>
          <View style={st.stepItem}>
            <View style={[
              st.stepCircle,
              done   && { borderColor: PURPLE },
              active && { borderColor: PURPLE },
            ]}>
              {(done || active) ? (
                <LinearGradient
                  colors={[PURPLE, PURPLE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.stepCircleGrad}
                >
                  {done
                    ? <Check size={15} color={WHITE} strokeWidth={3} />
                    : <Text style={[st.stepNum, { color: WHITE }]}>{num}</Text>}
                </LinearGradient>
              ) : (
                <Text style={st.stepNum}>{num}</Text>
              )}
            </View>
            <Text style={[st.stepLabel, active && { color: PURPLE, fontWeight: '700' }]}>{s.label}</Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[st.stepLine, done && { backgroundColor: PURPLE }]} />
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
const InputRow = ({ icon: Icon, placeholder, value, onChangeText, onBlur, keyboardType, editable = true, multiline = false, maxLength, error }: any) => (
  <View style={[st.inputRow, !editable && st.inputDisabled, error && { borderColor: DANGER, borderWidth: 1.5 }, multiline && { height: 88, alignItems: 'flex-start', paddingVertical: 12 }]}>
    <Icon size={18} color={error ? DANGER : TEXT_HINT} style={{ marginTop: multiline ? 2 : 0 }} />
    <TextInput
      style={[st.inputText, multiline && { flex: 1, textAlignVertical: 'top' }, error && { color: DANGER }]}
      placeholder={placeholder}
      placeholderTextColor={error ? '#FCA5A5' : TEXT_HINT}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
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
        const res = await ImagePicker.launchCameraAsync({ quality: 0.8, aspect: [1, 1] });
        if (!res.canceled) onCapture(res.assets[0].uri);
      }},
      { text: 'Gallery', onPress: async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Allow media access.'); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, aspect: [1, 1] });
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
const DocBox = ({ label, uri, onCapture, onRemove, error }: any) => {
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
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={[st.docBox, error && { borderColor: DANGER, backgroundColor: '#FEE2E2' }]} onPress={pick} activeOpacity={0.8}>
        {uri ? (
          <View style={StyleSheet.absoluteFill}>
            <Image source={{ uri }} style={st.docImg} resizeMode="cover" />
            <TouchableOpacity style={st.docRemove} onPress={onRemove}><Text style={{ color: WHITE, fontSize: 10, fontWeight: '700' }}>✕</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[st.docIconCircle, error && { backgroundColor: DANGER }]}><Upload size={18} color={error ? WHITE : BLUE} /></View>
            <Text style={[st.docLabel, error && { color: DANGER }]}>{label}</Text>
            <Text style={[st.docSub, error && { color: DANGER }]}>Tap to upload</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

// ─── Modal Options Drawer ───────────────────────────────────────────────────────
const OptionsDrawer = ({ visible, title, data, selectedItem, onSelect, onClose }: any) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' }}>
          <View style={{ width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 16 }}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {data.map((item: string) => (
              <TouchableOpacity
                key={item}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BG }}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, color: selectedItem === item ? BLUE : TEXT_DARK, fontWeight: selectedItem === item ? '700' : '500' }}>{item}</Text>
                {selectedItem === item && <Check size={20} color={BLUE} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  const [emailAddress, setEmailAddress] = useState(isEmail ? identifier : '');
  const [phone, setPhone]               = useState(isEmail ? '' : identifier);
  
  // ID Proof Types from Backend
  const [idProofTypesList, setIdProofTypesList] = useState<any[]>([]);
  useEffect(() => {
    api.get('/id-proof-types')
      .then(res => {
        if (res.data?.success) {
          setIdProofTypesList(res.data.data);
        }
      })
      .catch(err => console.log('Failed to fetch ID proof types:', err));
  }, []);
  
  const idProofOptions = [...idProofTypesList.map(t => t.name), 'Custom'];

  // ── Step 2 – Additional Info ──
  const [gender, setGender]           = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [guardianName, setGuardianName]   = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [genderOpen, setGenderOpen]   = useState(false);

  // ── Step 3 – Verification ──
  const [idProofType, setIdProofType]             = useState('');
  const [customIdProofType, setCustomIdProofType] = useState('');
  const [idProofTypeOpen, setIdProofTypeOpen]     = useState(false);
  const [idProofNumber, setIdProofNumber]         = useState('');
  const [currentAddress, setCurrentAddress]       = useState('');
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
      if (!firstName.trim() || firstName.trim().length < 3) newErrors.firstName = 'First name must be at least 3 characters.';
      
      if (!emailAddress.trim()) newErrors.emailAddress = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(emailAddress)) newErrors.emailAddress = 'Enter a valid email address.';
      
      if (!phone.trim()) newErrors.phone = 'Mobile number is required.';
      else if (!/^[6-9]/.test(phone)) newErrors.phone = 'Mobile number must start with 6, 7, 8, or 9.';
      else if (phone.trim().length !== 10) newErrors.phone = 'Mobile number must be exactly 10 digits.';
    }
    if (s === 2) {
      if (!gender) newErrors.gender = 'Please select your gender.';
      if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required.';
      if (guardianPhone.trim()) {
        if (!/^[6-9]/.test(guardianPhone)) newErrors.guardianPhone = 'Must start with 6, 7, 8, or 9.';
        else if (guardianPhone.trim().length !== 10) newErrors.guardianPhone = 'Must be exactly 10 digits.';
      }
    }
    if (s === 3) {
      if (!currentAddress.trim()) newErrors.currentAddress = 'Current Address is required.';
      if (!permanentAddress.trim()) newErrors.permanentAddress = 'Permanent Address is required.';
      if (!idProofType) {
        newErrors.idProofType = 'Please select ID Proof Type.';
      } else if (idProofType === 'Custom' && !customIdProofType.trim()) {
        newErrors.customIdProofType = 'Please enter ID proof name.';
      } else if (!idProofNumber.trim()) {
        newErrors.idProofNumber = `${idProofType} number is required.`;
      } else {
        const selectedProof = idProofTypesList.find(t => t.name === idProofType);
        if (selectedProof) {
          if (selectedProof.min_length && idProofNumber.length < selectedProof.min_length) {
            newErrors.idProofNumber = `${idProofType} must be at least ${selectedProof.min_length} characters.`;
          } else if (selectedProof.max_length && idProofNumber.length > selectedProof.max_length) {
            newErrors.idProofNumber = `${idProofType} must be at most ${selectedProof.max_length} characters.`;
          } else if (selectedProof.regex_pattern) {
            try {
              const regex = new RegExp(selectedProof.regex_pattern, 'i');
              if (!regex.test(idProofNumber)) {
                newErrors.idProofNumber = `Invalid ${idProofType} format.`;
              }
            } catch (e) {}
          }
        }
      }
      
      if (idProofType) {
        if (!aadhaarFront) newErrors.docFront = 'Front side of ID document is required.';
        if (!aadhaarBack) newErrors.docBack = 'Back side of ID document is required.';
      }
    }
    setErrors(newErrors);
    
    const keys = Object.keys(newErrors);
    if (keys.length > 0) return newErrors[keys[0]];
    return null;
  };

  const [stepLoading, setStepLoading] = useState(false);

  const handleNext = () => {
    const msg = validateStep(step);
    if (msg) {
      showError(msg);
      return;
    }
    setStepLoading(true);
    setTimeout(() => {
      setStepLoading(false);
      setStep(prev => prev + 1);
    }, 400);
  };

  const handleBack = () => {
    setErrors({});
    if (step === 1) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('LoginScreen');
      }
    } else {
      setStep(s => s - 1);
    }
  };

  const handleRegister = async () => {
    const msg = validateStep(3);
    if (msg) {
      showError(msg);
      return;
    }
    setLoading(true);
    setErrors({});

    try {
      const response = await api.post('/auth/tenant/register', {
        identifier,
        hostel_id,
        first_name: firstName,
        last_name: lastName,
        phone,
        email: emailAddress,
        gender,
        date_of_birth: dateOfBirth,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        current_address: currentAddress,
        permanent_address: permanentAddress,
        id_proof_type: idProofType === 'Custom' ? customIdProofType : (idProofTypesList.find(t => t.name === idProofType)?.id || idProofType),
        id_proof_number: idProofNumber,
      });

      if (response.data?.success) {
        const { token, tenant } = response.data.data;
        await updateTokenAndUser(token, tenant);
        await refreshUser();
      } else {
        showError(response.data?.error || 'Registration failed.');
      }
    } catch (err: any) {
      showError(err.response?.data?.error || err.message || 'Network error');
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
        {step > 1 ? (
          <TouchableOpacity onPress={handleBack} style={st.backBtn} disabled={loading} activeOpacity={0.7}>
            <ArrowLeft size={20} color={BLUE} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <View style={st.topTitle}>
          <Text style={st.titleText}>Create Your Account</Text>
          <Text style={st.titleSub}>Complete your profile to continue.</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Stepper ── */}
      <Stepper step={step} />

      {/* ── Content ── */}
      {(loading || stepLoading) && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }]}>
          <View style={{ backgroundColor: WHITE, padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={{ marginTop: 12, fontWeight: '600', color: TEXT_DARK }}>
              {loading ? 'Creating account...' : 'Please wait...'}
            </Text>
          </View>
        </View>
      )}
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[st.scrollContent, { paddingBottom: isKeyboardVisible ? 240 : 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ────────────────── STEP 1: BASIC INFO ────────────────── */}
          {step === 1 && (
            <View style={st.formContainer}>
              <View style={st.sectionHead}>
                <View style={st.sectionIcon}><User size={20} color={BLUE} /></View>
                <View>
                  <Text style={st.sectionTitle}>Basic Information</Text>
                  <Text style={st.sectionSub}>Let's start with your basic details.</Text>
                </View>
              </View>

              <View style={st.photoCenterWrap}>
                <PhotoUpload
                  uri={profilePhoto}
                  onCapture={(uri: string) => { setProfilePhoto(uri); setErrors(p => ({...p, profilePhoto: ''})); }}
                  label="Add Profile Photo"
                />
                {errors.profilePhoto ? <Text style={st.fieldErr}>{errors.profilePhoto}</Text> : null}
              </View>

              <Field label="First Name" required error={errors.firstName}>
                <InputRow icon={User} placeholder="Enter first name" value={firstName} onChangeText={(t: string) => { setFirstName(t.replace(/[^a-zA-Z\s]/g, '')); setErrors(p => ({...p, firstName: ''})); }} onBlur={() => { if (!firstName.trim()) setErrors(p => ({...p, firstName: 'First name is required.'})); else if (firstName.trim().length < 3) setErrors(p => ({...p, firstName: 'First name must be at least 3 characters.'})); }} error={!!errors.firstName} />
              </Field>
              <Field label="Last Name">
                <InputRow icon={User} placeholder="Enter last name" value={lastName} onChangeText={(t: string) => setLastName(t.replace(/[^a-zA-Z\s]/g, ''))} />
              </Field>
              <Field label="Email Address" required error={errors.emailAddress}>
                <InputRow
                  icon={Mail}
                  placeholder="Enter email address"
                  value={emailAddress}
                  onChangeText={(t: string) => { setEmailAddress(t); setErrors(p => ({...p, emailAddress: ''})); }}
                  onBlur={() => {
                    if (!emailAddress.trim()) setErrors(p => ({...p, emailAddress: 'Email is required.'}));
                    else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(emailAddress)) {
                      setErrors(p => ({...p, emailAddress: 'Enter a valid email address.'}));
                    }
                  }}
                  keyboardType="email-address"
                  editable={!isEmail}
                  error={!!errors.emailAddress}
                />
              </Field>
              <Field label="Mobile Number" required error={errors.phone}>
                <InputRow
                  icon={Phone}
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChangeText={(t: string) => { 
                    const val = t.replace(/\D/g, '').slice(0, 10);
                    setPhone(val); 
                    if (val.length > 0 && !/^[6-9]/.test(val)) {
                      setErrors(p => ({...p, phone: 'Mobile number must start with 6, 7, 8, or 9.'}));
                    } else {
                      setErrors(p => ({...p, phone: ''}));
                    }
                  }}
                  onBlur={() => {
                    if (!phone.trim()) {
                      setErrors(p => ({...p, phone: 'Mobile number is required.'}));
                    } else if (!/^[6-9]/.test(phone)) {
                      setErrors(p => ({...p, phone: 'Mobile number must start with 6, 7, 8, or 9.'}));
                    } else if (phone.length !== 10) {
                      setErrors(p => ({...p, phone: 'Mobile number must be exactly 10 digits.'}));
                    }
                  }}
                  keyboardType="phone-pad"
                  editable={isEmail}
                  maxLength={10}
                  error={!!errors.phone}
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

              <Field label="Gender" required error={errors.gender}>
                <SelectRow
                  icon={User}
                  value={gender}
                  placeholder="Select gender"
                  onPress={() => setGenderOpen(true)}
                />
                <OptionsDrawer 
                  visible={genderOpen} 
                  title="Select Gender" 
                  data={['Male', 'Female', 'Other']} 
                  selectedItem={gender} 
                  onSelect={(v: string) => { setGender(v); setErrors(p => ({...p, gender: ''})); }} 
                  onClose={() => setGenderOpen(false)} 
                />
              </Field>

              <Field label="Date of Birth" required error={errors.dateOfBirth}>
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
                  date={dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1)}
                  onConfirm={(date) => {
                    setDateOfBirth(date.toISOString().split('T')[0]);
                    setShowDatePicker(false);
                    setErrors(p => ({...p, dateOfBirth: ''}));
                  }}
                  onCancel={() => setShowDatePicker(false)}
                />
              </Field>

              <Field label="Guardian Name">
                <InputRow icon={User} placeholder="Enter guardian name" value={guardianName} onChangeText={(t: string) => setGuardianName(t.replace(/[^a-zA-Z\s]/g, ''))} />
              </Field>
              <Field label="Guardian Mobile Number" error={errors.guardianPhone}>
                <InputRow
                  icon={Phone}
                  placeholder="Enter 10-digit mobile number"
                  value={guardianPhone}
                  onChangeText={(t: string) => { setGuardianPhone(t.replace(/\D/g, '').slice(0, 10)); setErrors(p => ({...p, guardianPhone: ''})); }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={!!errors.guardianPhone}
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

              <Field label="ID Proof Type" required error={errors.idProofType}>
                <SelectRow icon={Shield} value={idProofType} placeholder="Select ID Type" onPress={() => setIdProofTypeOpen(true)} />
                <OptionsDrawer 
                  visible={idProofTypeOpen} 
                  title="Select ID Proof Type" 
                  data={idProofOptions} 
                  selectedItem={idProofType} 
                  onSelect={(v: string) => { 
                    setIdProofType(v); 
                    setIdProofNumber('');
                    setErrors(p => ({...p, idProofType: '', idProofNumber: ''})); 
                  }} 
                  onClose={() => setIdProofTypeOpen(false)} 
                />
              </Field>

              {idProofType === 'Custom' && (
                <Field label="Custom ID Proof Name" required error={errors.customIdProofType}>
                   <InputRow icon={FileText} placeholder="Enter ID Proof Name" value={customIdProofType} onChangeText={(t: string) => { setCustomIdProofType(t); setErrors(p => ({...p, customIdProofType: ''})); }} />
                </Field>
              )}

              {idProofType ? (
                <>
                  <Field label={`${idProofType} Number`} required error={errors.idProofNumber}>
                    <InputRow
                      icon={CreditCard}
                      placeholder={
                        idProofType === 'Aadhaar' ? 'e.g. 123456789012' : 
                        idProofType === 'PAN' ? 'e.g. ABCDE1234F' : 
                        `Enter ${idProofType} number`
                      }
                      value={idProofNumber}
                      onChangeText={(t: string) => { 
                        let clean = t;
                        if (idProofType === 'Aadhaar') clean = t.replace(/\D/g, '').slice(0, 12);
                        else if (idProofType === 'PAN') clean = t.toUpperCase().slice(0, 10);
                        else if (idProofType === 'Driving License') clean = t.toUpperCase().slice(0, 16);
                        else if (idProofType === 'Voter ID') clean = t.toUpperCase().slice(0, 10);
                        else if (idProofType === 'Passport') clean = t.toUpperCase().slice(0, 8);
                        setIdProofNumber(clean); 
                        
                        if (idProofType === 'Aadhaar' && clean.length > 0 && !/^\d+$/.test(clean)) {
                          setErrors(p => ({...p, idProofNumber: 'Aadhaar must contain only digits.'}));
                        } else if (idProofType === 'PAN' && clean.length > 0 && !/^[A-Z0-9]+$/.test(clean)) {
                          setErrors(p => ({...p, idProofNumber: 'PAN must be alphanumeric.'}));
                        } else {
                          setErrors(p => ({...p, idProofNumber: ''})); 
                        }
                      }}
                      onBlur={() => {
                        if (!idProofNumber.trim()) {
                          setErrors(p => ({...p, idProofNumber: `${idProofType} number is required.`}));
                        } else {
                          if (idProofType === 'Aadhaar') {
                            if (idProofNumber.length !== 12) setErrors(p => ({...p, idProofNumber: 'Aadhaar must be exactly 12 digits.'}));
                          } else if (idProofType === 'PAN') {
                            if (idProofNumber.length !== 10) setErrors(p => ({...p, idProofNumber: 'PAN must be exactly 10 characters.'}));
                            else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(idProofNumber)) setErrors(p => ({...p, idProofNumber: 'Invalid PAN format. Must be like ABCDE1234F'}));
                          } else if (idProofType === 'Driving License') {
                            if (idProofNumber.length < 10) setErrors(p => ({...p, idProofNumber: 'Driving License must be at least 10 characters.'}));
                          } else if (idProofType === 'Voter ID') {
                            if (idProofNumber.length < 10) setErrors(p => ({...p, idProofNumber: 'Voter ID must be at least 10 characters.'}));
                          } else if (idProofType === 'Passport') {
                            if (idProofNumber.length < 8) setErrors(p => ({...p, idProofNumber: 'Passport must be at least 8 characters.'}));
                          }
                        }
                      }}
                      keyboardType={idProofType === 'Aadhaar' ? 'numeric' : 'default'}
                      autoCapitalize={idProofType === 'PAN' || idProofType === 'Driving License' || idProofType === 'Voter ID' || idProofType === 'Passport' ? 'characters' : 'none'}
                      error={!!errors.idProofNumber}
                    />
                  </Field>
                  
                  {/* ID Document upload */}
                  <Text style={st.docSectionLabel}>
                    {idProofType ? `${idProofType} Document` : 'ID Document'} <Text style={{ color: DANGER }}>*</Text>
                  </Text>
                  <View style={st.docRow}>
                    <DocBox
                      label="Front Side"
                      uri={aadhaarFront}
                      onCapture={(uri: string) => { setAadhaarFront(uri); setErrors(p => ({...p, docFront: ''})) }}
                      onRemove={() => setAadhaarFront(null)}
                      error={!!errors.docFront}
                    />
                    <DocBox
                      label="Back Side"
                      uri={aadhaarBack}
                      onCapture={(uri: string) => { setAadhaarBack(uri); setErrors(p => ({...p, docBack: ''})) }}
                      onRemove={() => setAadhaarBack(null)}
                      error={!!errors.docBack}
                    />
                  </View>
                  {(errors.docFront || errors.docBack) && (
                    <Text style={[st.fieldErr, { marginTop: 8, marginBottom: 16 }]}>Both sides of the ID document are required.</Text>
                  )}
                </>
              ) : null}

              <View style={{ marginTop: 12 }}>
                <Field label="Current Address" required error={errors.currentAddress}>
                  <InputRow
                    icon={MapPin}
                    placeholder="Enter your current address"
                    value={currentAddress}
                    onChangeText={(t: string) => { setCurrentAddress(t); setErrors(p => ({...p, currentAddress: ''})) }}
                    onBlur={() => { if (!currentAddress.trim()) setErrors(p => ({...p, currentAddress: 'Current Address is required.'})); }}
                    multiline
                    error={!!errors.currentAddress}
                  />
                </Field>
                <View style={{ height: 12 }} />
                <Field label="Permanent Address" required error={errors.permanentAddress}>
                  <InputRow
                    icon={MapPin}
                    placeholder="Enter your permanent address"
                    value={permanentAddress}
                    onChangeText={(t: string) => { setPermanentAddress(t); setErrors(p => ({...p, permanentAddress: ''})) }}
                    onBlur={() => { if (!permanentAddress.trim()) setErrors(p => ({...p, permanentAddress: 'Permanent Address is required.'})); }}
                    multiline
                    error={!!errors.permanentAddress}
                  />
                </Field>
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
                  <LinearGradient
                    colors={[PURPLE, PURPLE_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={st.primaryBtnGrad}
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
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                <TouchableOpacity style={st.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[PURPLE, PURPLE_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={st.primaryBtnGrad}
                  >
                    <View style={st.btnRow}>
                      <Text style={st.primaryBtnText}>Continue</Text>
                      <ArrowRight size={18} color={WHITE} />
                    </View>
                  </LinearGradient>
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
  topTitle: { flex: 1, alignItems: 'center', marginTop: 12 },
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  stepCircleGrad: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '700', color: TEXT_MID },
  stepLabel: { fontSize: 11, fontWeight: '500', color: TEXT_MID, textAlign: 'center' },
  stepLine: { flex: 1, height: 3, backgroundColor: BORDER, marginBottom: 18 },

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
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
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
    borderRadius: 14,
    height: 54, width: '100%', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryBtnGrad: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14,
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
