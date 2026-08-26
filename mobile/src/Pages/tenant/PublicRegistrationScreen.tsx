import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
  Switch,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  MapPin,
  Camera,
  Upload,
  Check,
  CheckCircle,
  X,
  Shield,
  Building,
  Sparkles,
  Copy,
  ChevronDown,
  Info,
  Users,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { appendImageFileToFormData } from '../../utils/imageHelper';
import { colors } from '../../theme/tenantTheme';

const { width } = Dimensions.get('window');

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const PRIMARY = colors.primary || '#6D4AFF';
const PRIMARY_DARK = colors.primaryDark || '#5B39E0';
const PRIMARY_LIGHT = '#8B6BFF';
const PRIMARY_SOFT = colors.primarySoft || '#F4F1FF';
const BG_COLOR = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';
const TEXT_HINT = '#94A3B8';
const BORDER_COLOR = '#E2E8F0';
const BORDER_ACTIVE = '#6D4AFF';
const ERROR_COLOR = '#EF4444';
const SUCCESS_COLOR = '#10B981';

// ─── ID Proof Types Definition ────────────────────────────────────────────────
const ID_PROOF_TYPES = [
  { id: 0, label: 'No ID Proof / Select Later', code: 'NONE', len: 0, placeholder: '' },
  { id: 1, label: 'Aadhaar Card', code: 'AADHAAR', len: 12, placeholder: '12-digit Aadhaar (e.g. 3456 7890 1234)' },
  { id: 2, label: 'PAN Card', code: 'PAN', len: 10, placeholder: '10-character PAN (e.g. ABCDE1234F)' },
  { id: 3, label: 'Voter ID Card', code: 'VOTER', len: 10, placeholder: '10-character EPIC number' },
  { id: 4, label: 'Driving License', code: 'DL', len: 16, placeholder: '15-16 character DL number' },
  { id: 5, label: 'Passport', code: 'PASSPORT', len: 8, placeholder: '8-character Passport number' },
];

const GENDERS = [
  { label: 'Male', val: 'Male', emoji: '👨' },
  { label: 'Female', val: 'Female', emoji: '👩' },
  { label: 'Other', val: 'Other', emoji: '⚧' },
];

const STEPS = [
  { num: 1, title: 'Personal', subtitle: 'Basic Profile' },
  { num: 2, title: 'KYC & ID', subtitle: 'Verification' },
  { num: 3, title: 'Address', subtitle: 'Emergency & Stay' },
];

export default function PublicRegistrationScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const rawHostelId = route?.params?.hostelId || 1;
  const rawHostelCode = route?.params?.code || '';

  // ─── Step State ─────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingHostel, setLoadingHostel] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hostelData, setHostelData] = useState<any>({
    hostel_id: rawHostelId,
    hostel_name: 'Hostix Luxury PG & Coliving',
    hostel_code: rawHostelCode || 'HSTX01',
    address: 'Plot 42, Hitech City, Madhapur',
    city: 'Hyderabad',
  });

  // ─── Form Fields ────────────────────────────────────────────────────────────
  // Step 1: Personal Profile
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [isDobPickerVisible, setDobPickerVisible] = useState(false);
  const [phone, setPhone] = useState('');

  // Step 2: KYC & ID Proof
  const [selectedIdType, setSelectedIdType] = useState<number>(0);
  const [idProofNumber, setIdProofNumber] = useState('');
  const [idFrontUri, setIdFrontUri] = useState<string | null>(null);
  const [idBackUri, setIdBackUri] = useState<string | null>(null);
  const [showIdDropdown, setShowIdDropdown] = useState(false);

  // Step 3: Address & Emergency Contacts
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  // ─── Validation Errors ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ─── Success Celebration Modal State ────────────────────────────────────────
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // ─── Load Hostel Info ───────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchHostelInfo = async () => {
      try {
        setLoadingHostel(true);
        const queryParam = rawHostelCode ? `code=${encodeURIComponent(rawHostelCode)}` : `hostelId=${encodeURIComponent(rawHostelId)}`;
        const res = await api.get(`/public/hostel-info?${queryParam}`).catch(() => null);
        if (isMounted && res?.data?.success && res.data.data) {
          setHostelData(res.data.data);
        }
      } catch (err) {
        console.warn('Failed to load hostel info, using default:', err);
      } finally {
        if (isMounted) setLoadingHostel(false);
      }
    };
    fetchHostelInfo();
    return () => { isMounted = false; };
  }, [rawHostelId, rawHostelCode]);

  // ─── Real-Time Phone Validation ─────────────────────────────────────────────
  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);

    if (digits.length > 0) {
      const firstChar = parseInt(digits[0], 10);
      if (firstChar < 6) {
        setErrors((prev) => ({
          ...prev,
          phone: 'Indian mobile numbers must start with 6, 7, 8, or 9',
        }));
        return;
      }
    }
    if (digits.length > 0 && digits.length < 10) {
      setErrors((prev) => ({
        ...prev,
        phone: 'Please enter all 10 digits',
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const handleGuardianPhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setGuardianPhone(digits);

    if (digits.length > 0) {
      const firstChar = parseInt(digits[0], 10);
      if (firstChar < 6) {
        setErrors((prev) => ({
          ...prev,
          guardianPhone: 'Guardian number must start with 6, 7, 8, or 9',
        }));
        return;
      }
    }
    if (digits.length > 0 && digits.length < 10) {
      setErrors((prev) => ({
        ...prev,
        guardianPhone: 'Please enter all 10 digits',
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.guardianPhone;
        return next;
      });
    }
  };

  // ─── ID Proof Number Formatting & Restriction ───────────────────────────────
  const handleIdNumberChange = (text: string) => {
    const currentCfg = ID_PROOF_TYPES.find((t) => t.id === selectedIdType);
    if (!currentCfg || selectedIdType === 0) return;

    if (selectedIdType === 1) {
      // Aadhaar: digits only, format with space every 4 digits
      const digits = text.replace(/\D/g, '').slice(0, 12);
      const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      setIdProofNumber(formatted);
      if (digits.length > 0 && digits.length < 12) {
        setErrors((p) => ({ ...p, idProofNumber: 'Aadhaar must be exactly 12 digits' }));
      } else {
        setErrors((p) => { const n = { ...p }; delete n.idProofNumber; return n; });
      }
    } else if (selectedIdType === 2) {
      // PAN: 10 alphanumeric uppercase
      const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      setIdProofNumber(clean);
      if (clean.length > 0 && clean.length < 10) {
        setErrors((p) => ({ ...p, idProofNumber: 'PAN must be exactly 10 characters' }));
      } else {
        setErrors((p) => { const n = { ...p }; delete n.idProofNumber; return n; });
      }
    } else {
      const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, currentCfg.len || 16);
      setIdProofNumber(clean);
      if (clean.length > 0 && clean.length < (currentCfg.len || 8)) {
        setErrors((p) => ({ ...p, idProofNumber: `Must be exactly ${currentCfg.len} characters` }));
      } else {
        setErrors((p) => { const n = { ...p }; delete n.idProofNumber; return n; });
      }
    }
  };

  // ─── Photo Picker Action Sheet ──────────────────────────────────────────────
  const pickPhoto = async (target: 'profile' | 'front' | 'back') => {
    Alert.alert(
      'Upload Document / Photo',
      'Choose an option to upload',
      [
        {
          text: 'Take Photo (Camera)',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Camera permission is needed to take a photo.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
              allowsEditing: target === 'profile',
              aspect: target === 'profile' ? [1, 1] : undefined,
            });
            if (!res.canceled && res.assets[0]?.uri) {
              const uri = res.assets[0].uri;
              if (target === 'profile') setProfilePhoto(uri);
              else if (target === 'front') setIdFrontUri(uri);
              else if (target === 'back') setIdBackUri(uri);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Gallery permission is needed to upload photos.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
              allowsEditing: target === 'profile',
              aspect: target === 'profile' ? [1, 1] : undefined,
            });
            if (!res.canceled && res.assets[0]?.uri) {
              const uri = res.assets[0].uri;
              if (target === 'profile') setProfilePhoto(uri);
              else if (target === 'front') setIdFrontUri(uri);
              else if (target === 'back') setIdBackUri(uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ─── Step Validation ────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First Name is required';
    if (!phone.trim()) {
      errs.phone = 'Mobile Number is required';
    } else if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      errs.phone = 'Must be a valid 10-digit number starting with 6, 7, 8, or 9';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address (e.g. name@domain.com)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (selectedIdType > 0) {
      const clean = idProofNumber.replace(/\s+/g, '').trim().toUpperCase();
      if (!clean) {
        errs.idProofNumber = 'ID Proof number is required';
      } else if (selectedIdType === 1 && !/^\d{12}$/.test(clean)) {
        errs.idProofNumber = 'Aadhaar must be exactly 12 digits';
      } else if (selectedIdType === 2 && !/^[A-Z0-9]{10}$/.test(clean)) {
        errs.idProofNumber = 'PAN must be exactly 10 characters';
      } else if (selectedIdType === 3 && !/^[A-Z0-9]{10}$/.test(clean)) {
        errs.idProofNumber = 'Voter ID must be exactly 10 characters';
      } else if (selectedIdType === 4 && !/^[A-Z0-9]{15,16}$/.test(clean)) {
        errs.idProofNumber = 'Driving License must be 15-16 characters';
      } else if (selectedIdType === 5 && !/^[A-Z0-9]{8}$/.test(clean)) {
        errs.idProofNumber = 'Passport must be exactly 8 characters';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!guardianPhone.trim()) {
      errs.guardianPhone = 'Guardian Mobile Number is mandatory';
    } else if (guardianPhone.length !== 10 || !/^[6-9]\d{9}$/.test(guardianPhone)) {
      errs.guardianPhone = 'Must be a valid 10-digit number starting with 6, 7, 8, or 9';
    }
    if (!currentAddress.trim()) {
      errs.currentAddress = 'Current Address is required';
    }
    const perm = sameAsCurrent ? currentAddress : permanentAddress;
    if (!perm.trim()) {
      errs.permanentAddress = 'Permanent Address is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  // ─── Final Form Submission ──────────────────────────────────────────────────
  const handleSubmitRegistration = async () => {
    if (!validateStep3()) return;

    try {
      setSubmitting(true);
      const perm = sameAsCurrent ? currentAddress : permanentAddress;
      const cleanId = idProofNumber.replace(/\s+/g, '').trim().toUpperCase();

      const formData = new FormData();
      formData.append('hostel_id', String(hostelData.hostel_id));
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim());
      formData.append('gender', gender);
      formData.append('email', email.trim().toLowerCase());
      formData.append('phone', phone.trim());
      if (dob) formData.append('date_of_birth', dob.toISOString().split('T')[0]);
      formData.append('guardian_name', guardianName.trim());
      formData.append('guardian_phone', guardianPhone.trim());
      formData.append('present_working_address', currentAddress.trim());
      formData.append('current_address', currentAddress.trim());
      formData.append('permanent_address', perm.trim());
      formData.append('id_proof_type', String(selectedIdType));
      formData.append('id_proof_number', cleanId);

      // Append Profile Photo
      if (profilePhoto) {
        appendImageFileToFormData(formData, 'profile_photo', profilePhoto, 'profile.jpg');
      }

      // Append ID Proof Photos
      if (idFrontUri) {
        appendImageFileToFormData(formData, 'id_proof_front', idFrontUri, 'id_front.jpg');
      }

      if (idBackUri) {
        appendImageFileToFormData(formData, 'id_proof_back', idBackUri, 'id_back.jpg');
      }

      const res = await api.post('/public/qr-signup', formData);

      if (res?.data?.success) {
        setSubmittedData(res.data.data || {
          reference_id: `REG-${hostelData.hostel_code || 'HSTX'}-${Math.floor(1000 + Math.random() * 9000)}`,
          student_name: `${firstName} ${lastName}`.trim(),
          hostel_name: hostelData.hostel_name,
        });

        // Trigger Celebration Animation
        Animated.parallel([
          Animated.spring(successScale, { toValue: 1, friction: 6, useNativeDriver: true }),
          Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      } else {
        throw new Error(res?.data?.error || 'Registration failed. Please check your information.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit registration. Please try again.';
      Alert.alert('Registration Notice', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyReferenceId = async () => {
    if (!submittedData?.reference_id) return;
    await Clipboard.setStringAsync(submittedData.reference_id);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />

      {/* ── Top Dynamic Branding Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#1E1B4B', '#2E1065', '#4C1D95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Top Row: Back & Brand */}
          <View style={styles.headerTopRow}>
            {navigation?.canGoBack?.() ? (
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <ArrowLeft size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}

            <View style={styles.brandTitleBox}>
              <View style={styles.logoBadge}>
                <Building size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.brandName}>HOSTIX</Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {/* Hostel Name Badge */}
          <View style={styles.hostelBadgeRow}>
            <View style={styles.hostelBadge}>
              <MapPin size={13} color="#A78BFA" />
              <Text style={styles.hostelNameText} numberOfLines={1}>
                {hostelData?.hostel_name || 'Hostix Luxury PG'}
              </Text>
            </View>
          </View>

          <Text style={styles.formTitle}>Tenant Registration Form</Text>
          <Text style={styles.formSubtitle}>Join the community in 3 simple steps</Text>

          {/* Stepper Progress Bar */}
          <View style={styles.stepperContainer}>
            {STEPS.map((s, idx) => {
              const isDone = s.num < currentStep;
              const isActive = s.num === currentStep;
              return (
                <React.Fragment key={s.num}>
                  <TouchableOpacity
                    style={styles.stepItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (s.num < currentStep) setCurrentStep(s.num);
                    }}
                  >
                    <View
                      style={[
                        styles.stepBubble,
                        isDone && styles.stepBubbleDone,
                        isActive && styles.stepBubbleActive,
                      ]}
                    >
                      {isDone ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <Text style={[styles.stepNumText, isActive && styles.stepNumTextActive]}>
                          {s.num}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                  {idx < STEPS.length - 1 && (
                    <View style={[styles.stepDivider, isDone && styles.stepDividerDone]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </LinearGradient>
      </View>

      {/* ── Main Form Scroll Area ────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═════════════════════════════════════════════════════════════════════
              STEP 1: PERSONAL PROFILE DETAILS
              ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <User size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                  <Text style={styles.sectionSub}>Your profile & basic identification</Text>
                </View>
              </View>

              {/* Profile Photo Uploader */}
              <View style={styles.photoUploaderBox}>
                <TouchableOpacity
                  style={styles.avatarWrap}
                  activeOpacity={0.8}
                  onPress={() => pickPhoto('profile')}
                >
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Camera size={28} color={PRIMARY} />
                      <Text style={styles.addPhotoLabel}>Add Photo</Text>
                    </View>
                  )}
                  <View style={styles.avatarEditBadge}>
                    <Camera size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.photoHintBox}>
                  <Text style={styles.photoHintTitle}>Profile Picture</Text>
                  <Text style={styles.photoHintText}>Optional • Helps PG owner recognize and allocate your bed</Text>
                  {profilePhoto && (
                    <TouchableOpacity onPress={() => setProfilePhoto(null)} style={styles.removePhotoBtn}>
                      <Text style={styles.removePhotoText}>Remove photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Name Fields (First & Last) */}
              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>
                    First Name <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={[styles.inputBox, errors.firstName && styles.inputBoxError]}>
                    <User size={18} color={TEXT_MUTED} style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Rahul"
                      placeholderTextColor={TEXT_HINT}
                      value={firstName}
                      onChangeText={(t) => {
                        setFirstName(t);
                        if (errors.firstName) setErrors((p) => { const n = { ...p }; delete n.firstName; return n; });
                      }}
                    />
                  </View>
                  {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Sharma"
                      placeholderTextColor={TEXT_HINT}
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>
              </View>

              {/* Gender Selector */}
              <Text style={styles.label}>
                Gender <Text style={styles.reqStar}>*</Text>
              </Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => {
                  const active = gender === g.val;
                  return (
                    <TouchableOpacity
                      key={g.val}
                      style={[styles.genderPill, active && styles.genderPillActive]}
                      onPress={() => setGender(g.val)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.genderEmoji}>{g.emoji}</Text>
                      <Text style={[styles.genderPillText, active && styles.genderPillTextActive]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Email Address */}
              <Text style={styles.label}>
                Email Address <Text style={styles.reqStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
                <Mail size={18} color={TEXT_MUTED} style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor={TEXT_HINT}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n; });
                  }}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

              {/* Mobile Number with Strict First-Digit & 10-Digit Validation */}
              <Text style={styles.label}>
                Mobile Number <Text style={styles.reqStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, errors.phone && styles.inputBoxError]}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="98765 43210"
                  placeholderTextColor={TEXT_HINT}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={handlePhoneChange}
                />
                {phone.length === 10 && !errors.phone && (
                  <CheckCircle size={18} color={SUCCESS_COLOR} style={{ marginRight: 12 }} />
                )}
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

              {/* Date of Birth (Optional) */}
              <Text style={styles.label}>Date of Birth (Optional)</Text>
              <TouchableOpacity
                style={styles.inputBox}
                activeOpacity={0.8}
                onPress={() => setDobPickerVisible(true)}
              >
                <Calendar size={18} color={TEXT_MUTED} style={styles.fieldIcon} />
                <Text style={[styles.dateText, !dob && { color: TEXT_HINT }]}>
                  {dob ? dob.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date of Birth'}
                </Text>
                {dob && (
                  <TouchableOpacity onPress={() => setDob(null)} style={{ padding: 4, marginRight: 8 }}>
                    <X size={16} color={TEXT_MUTED} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <DateTimePickerModal
                isVisible={isDobPickerVisible}
                mode="date"
                maximumDate={new Date()}
                onConfirm={(date) => {
                  setDob(date);
                  setDobPickerVisible(false);
                }}
                onCancel={() => setDobPickerVisible(false)}
              />

              {/* Continue Button */}
              <TouchableOpacity
                style={styles.primaryActionBtn}
                activeOpacity={0.85}
                onPress={handleNextStep}
              >
                <LinearGradient
                  colors={[PRIMARY, PRIMARY_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGrad}
                >
                  <Text style={styles.actionBtnText}>Continue to KYC & ID</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 2: KYC & ID PROOF VERIFICATION
              ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Shield size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>KYC & Identity Proof</Text>
                  <Text style={styles.sectionSub}>Government ID verification for security</Text>
                </View>
              </View>

              {/* ID Type Selector Dropdown */}
              <Text style={styles.label}>Select ID Proof Type</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                activeOpacity={0.8}
                onPress={() => setShowIdDropdown(!showIdDropdown)}
              >
                <CreditCard size={18} color={PRIMARY} style={{ marginRight: 10 }} />
                <Text style={styles.dropdownSelectedText}>
                  {ID_PROOF_TYPES.find((t) => t.id === selectedIdType)?.label || 'Select ID Proof'}
                </Text>
                <ChevronDown size={18} color={TEXT_MUTED} />
              </TouchableOpacity>

              {showIdDropdown && (
                <View style={styles.dropdownList}>
                  {ID_PROOF_TYPES.map((t) => {
                    const isSel = selectedIdType === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.dropdownItem, isSel && styles.dropdownItemActive]}
                        onPress={() => {
                          setSelectedIdType(t.id);
                          setShowIdDropdown(false);
                          setIdProofNumber('');
                          setErrors((p) => { const n = { ...p }; delete n.idProofNumber; return n; });
                        }}
                      >
                        <Text style={[styles.dropdownItemText, isSel && styles.dropdownItemTextActive]}>
                          {t.label}
                        </Text>
                        {isSel && <Check size={16} color={PRIMARY} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Conditionally Display ID Number & Photos ONLY when an ID type is chosen */}
              {selectedIdType > 0 && (
                <View style={styles.conditionalKycBox}>
                  <Text style={styles.label}>
                    {ID_PROOF_TYPES.find((t) => t.id === selectedIdType)?.label} Number <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={[styles.inputBox, errors.idProofNumber && styles.inputBoxError]}>
                    <CreditCard size={18} color={TEXT_MUTED} style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={ID_PROOF_TYPES.find((t) => t.id === selectedIdType)?.placeholder || 'Enter ID number'}
                      placeholderTextColor={TEXT_HINT}
                      autoCapitalize="characters"
                      value={idProofNumber}
                      onChangeText={handleIdNumberChange}
                    />
                  </View>
                  {errors.idProofNumber ? <Text style={styles.errorText}>{errors.idProofNumber}</Text> : null}

                  {/* Document Photos (Front & Back) */}
                  <Text style={[styles.label, { marginTop: 18 }]}>
                    Document Photos <Text style={{ color: TEXT_MUTED, fontWeight: '400' }}>(Optional)</Text>
                  </Text>
                  <View style={styles.rowTwoCols}>
                    {/* Front Document */}
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.docUploadCard, idFrontUri && styles.docUploadCardDone]}
                        activeOpacity={0.8}
                        onPress={() => pickPhoto('front')}
                      >
                        {idFrontUri ? (
                          <>
                            <Image source={{ uri: idFrontUri }} style={styles.docImgPreview} />
                            <TouchableOpacity
                              style={styles.docRemoveBtn}
                              onPress={() => setIdFrontUri(null)}
                            >
                              <X size={12} color="#FFFFFF" />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.docPlaceholder}>
                            <Upload size={22} color={PRIMARY} />
                            <Text style={styles.docPlaceholderTitle}>Front Side</Text>
                            <Text style={styles.docPlaceholderSub}>Tap to upload</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Back Document */}
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        style={[styles.docUploadCard, idBackUri && styles.docUploadCardDone]}
                        activeOpacity={0.8}
                        onPress={() => pickPhoto('back')}
                      >
                        {idBackUri ? (
                          <>
                            <Image source={{ uri: idBackUri }} style={styles.docImgPreview} />
                            <TouchableOpacity
                              style={styles.docRemoveBtn}
                              onPress={() => setIdBackUri(null)}
                            >
                              <X size={12} color="#FFFFFF" />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.docPlaceholder}>
                            <Upload size={22} color={PRIMARY} />
                            <Text style={styles.docPlaceholderTitle}>Back Side</Text>
                            <Text style={styles.docPlaceholderSub}>Tap to upload</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Navigation Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.backStepBtn}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backStepBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { flex: 1 }]}
                  activeOpacity={0.85}
                  onPress={handleNextStep}
                >
                  <LinearGradient
                    colors={[PRIMARY, PRIMARY_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionGrad}
                  >
                    <Text style={styles.actionBtnText}>Address & Contacts</Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 3: ADDRESS & EMERGENCY DETAILS
              ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <MapPin size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Address & Guardian</Text>
                  <Text style={styles.sectionSub}>Emergency contact & residential info</Text>
                </View>
              </View>

              {/* Guardian Name (Optional) */}
              <Text style={styles.label}>
                Guardian / Parent Name <Text style={{ color: TEXT_MUTED, fontWeight: '400' }}>(Optional)</Text>
              </Text>
              <View style={styles.inputBox}>
                <Users size={18} color={TEXT_MUTED} style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Parent / Guardian Name"
                  placeholderTextColor={TEXT_HINT}
                  value={guardianName}
                  onChangeText={setGuardianName}
                />
              </View>

              {/* Guardian Mobile Number (Mandatory) */}
              <Text style={styles.label}>
                Guardian Mobile Number <Text style={styles.reqStar}>*</Text>
              </Text>
              <View style={[styles.inputBox, errors.guardianPhone && styles.inputBoxError]}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="98765 43210"
                  placeholderTextColor={TEXT_HINT}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={guardianPhone}
                  onChangeText={handleGuardianPhoneChange}
                />
                {guardianPhone.length === 10 && !errors.guardianPhone && (
                  <CheckCircle size={18} color={SUCCESS_COLOR} style={{ marginRight: 12 }} />
                )}
              </View>
              {errors.guardianPhone ? <Text style={styles.errorText}>{errors.guardianPhone}</Text> : null}

              {/* Current Address (Mandatory) */}
              <Text style={[styles.label, { marginTop: 14 }]}>
                Current / Office Address <Text style={styles.reqStar}>*</Text>
              </Text>
              <View style={[styles.textAreaBox, errors.currentAddress && styles.inputBoxError]}>
                <TextInput
                  style={styles.textAreaInput}
                  placeholder="Office / College / Current local address"
                  placeholderTextColor={TEXT_HINT}
                  multiline
                  numberOfLines={3}
                  value={currentAddress}
                  onChangeText={(t) => {
                    setCurrentAddress(t);
                    if (errors.currentAddress) setErrors((p) => { const n = { ...p }; delete n.currentAddress; return n; });
                  }}
                />
              </View>
              {errors.currentAddress ? <Text style={styles.errorText}>{errors.currentAddress}</Text> : null}

              {/* Same as Current Address Switch */}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Permanent address is same as current</Text>
                <Switch
                  value={sameAsCurrent}
                  onValueChange={(val) => {
                    setSameAsCurrent(val);
                    if (val) setPermanentAddress(currentAddress);
                  }}
                  trackColor={{ false: '#CBD5E1', true: PRIMARY }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Permanent Address (Mandatory) */}
              {!sameAsCurrent && (
                <View>
                  <Text style={styles.label}>
                    Permanent Home Address <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={[styles.textAreaBox, errors.permanentAddress && styles.inputBoxError]}>
                    <TextInput
                      style={styles.textAreaInput}
                      placeholder="Native / Permanent residential address"
                      placeholderTextColor={TEXT_HINT}
                      multiline
                      numberOfLines={3}
                      value={permanentAddress}
                      onChangeText={(t) => {
                        setPermanentAddress(t);
                        if (errors.permanentAddress) setErrors((p) => { const n = { ...p }; delete n.permanentAddress; return n; });
                      }}
                    />
                  </View>
                  {errors.permanentAddress ? <Text style={styles.errorText}>{errors.permanentAddress}</Text> : null}
                </View>
              )}

              {/* Navigation Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.backStepBtn}
                  onPress={() => setCurrentStep(2)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backStepBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { flex: 1 }]}
                  activeOpacity={0.85}
                  disabled={submitting}
                  onPress={handleSubmitRegistration}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionGrad}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Sparkles size={18} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Submit Registration</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ═════════════════════════════════════════════════════════════════════
          CELEBRATION SUCCESS MODAL
          ═════════════════════════════════════════════════════════════════════ */}
      {submittedData && (
        <View style={styles.celebrationOverlay}>
          <Animated.View
            style={[
              styles.celebrationCard,
              {
                transform: [{ scale: successScale }],
                opacity: successOpacity,
              },
            ]}
          >
            {/* Glowing Success Badge */}
            <View style={styles.successIconCircle}>
              <CheckCircle size={52} color="#10B981" />
            </View>

            <Text style={styles.celebrationTitle}>Admission Submitted!</Text>
            <Text style={styles.celebrationSubtitle}>
              Your admission application has been received by <Text style={{ fontWeight: '700', color: TEXT_MAIN }}>{submittedData.hostel_name}</Text>.
            </Text>

            {/* Registration Details Card */}
            <View style={styles.refCard}>
              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Applicant Name</Text>
                <Text style={styles.refVal}>{submittedData.student_name}</Text>
              </View>

              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Registration Ref ID</Text>
                <TouchableOpacity style={styles.copyPill} activeOpacity={0.7} onPress={copyReferenceId}>
                  <Text style={styles.copyPillText}>{submittedData.reference_id}</Text>
                  <Copy size={13} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              {copiedRef && <Text style={styles.copiedHint}>Copied to clipboard!</Text>}

              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Status</Text>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusPillText}>Pending Owner Approval</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoNoteBox}>
              <Info size={16} color={PRIMARY} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.infoNoteText}>
                The hostel warden/owner will verify your details and assign your room. You can show your Reference ID at the hostel desk.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              activeOpacity={0.85}
              onPress={() => {
                setSubmittedData(null);
                if (navigation?.canGoBack?.()) navigation.goBack();
              }}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1B4B',
  },
  header: {
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
    paddingBottom: 22,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  hostelBadgeRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  hostelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  hostelNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDD6FE',
    marginLeft: 6,
    maxWidth: width * 0.7,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#C4B5FD',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },

  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepBubbleActive: {
    backgroundColor: PRIMARY,
    borderColor: '#FFFFFF',
  },
  stepBubbleDone: {
    backgroundColor: SUCCESS_COLOR,
    borderColor: SUCCESS_COLOR,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  stepNumTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A5B4FC',
  },
  stepLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stepDivider: {
    width: 36,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 18,
    marginHorizontal: 6,
  },
  stepDividerDone: {
    backgroundColor: SUCCESS_COLOR,
  },

  // Content Area
  contentScroll: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_MAIN,
  },
  sectionSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 1,
  },

  // Photo Uploader
  photoUploaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarImg: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: PRIMARY,
    marginTop: 2,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  photoHintBox: {
    flex: 1,
    marginLeft: 14,
  },
  photoHintTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  photoHintText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 16,
  },
  removePhotoBtn: {
    marginTop: 6,
  },
  removePhotoText: {
    fontSize: 12,
    color: ERROR_COLOR,
    fontWeight: '600',
  },

  // Form Fields
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  reqStar: {
    color: ERROR_COLOR,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 12,
  },
  inputBoxError: {
    borderColor: ERROR_COLOR,
    backgroundColor: '#FEF2F2',
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_MAIN,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 11,
    color: ERROR_COLOR,
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '600',
  },
  countryCodeBadge: {
    paddingRight: 8,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_MAIN,
    fontWeight: '500',
  },

  // Gender Pills
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    backgroundColor: '#F8FAFC',
  },
  genderPillActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_SOFT,
  },
  genderEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  genderPillTextActive: {
    color: PRIMARY,
    fontWeight: '700',
  },

  // Dropdown Selector
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  dropdownSelectedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: PRIMARY_SOFT,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_MAIN,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: PRIMARY,
  },

  // KYC Conditional Box
  conditionalKycBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docUploadCard: {
    height: 110,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PRIMARY_LIGHT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  docUploadCardDone: {
    borderStyle: 'solid',
    borderColor: SUCCESS_COLOR,
  },
  docPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPlaceholderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MAIN,
    marginTop: 4,
  },
  docPlaceholderSub: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  docImgPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  docRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text Area
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 70,
  },
  textAreaInput: {
    fontSize: 13,
    color: TEXT_MAIN,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MAIN,
    flex: 1,
    marginRight: 10,
  },

  // Buttons & Stepper Actions
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  backStepBtn: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  backStepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  primaryActionBtn: {
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 20,
  },
  actionGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Celebration Modal
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_MAIN,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 18,
  },
  refCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  refLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  refVal: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY_SOFT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY,
  },
  copiedHint: {
    fontSize: 10,
    color: SUCCESS_COLOR,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 2,
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  infoNoteBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 18,
  },
  infoNoteText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
    flex: 1,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
