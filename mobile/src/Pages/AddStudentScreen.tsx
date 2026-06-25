import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
    Image,
    Alert,
    Animated,
    ActivityIndicator,
    Keyboard,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User, Phone, Mail, Home, MapPin,
    CreditCard, Users, Fingerprint, Check,
    ChevronDown, Camera, X, BedDouble, Calendar, Search,
    Upload, AlertTriangle, Info, Plus
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { COLORS, FONT, SPACING } from '../theme/index';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';

// ─── Smooth bottom-sheet modal ────────────────────────────────────────────────
const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    const { theme } = useTheme();
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(anim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(anim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const backdropOpacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    const sheetTranslateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [600, 0],
    });

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[
                    styles.sheet,
                    { maxHeight, backgroundColor: theme.cardBg || '#FFF', transform: [{ translateY: sheetTranslateY }] }
                ]}>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── Custom Alert Modal ───────────────────────────────────────────────────────
const CustomAlertModal = ({ visible, title, message, onClose, primaryAction, secondaryAction, icon: Icon = AlertTriangle }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{ backgroundColor: isDark ? '#1E293B' : '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <Icon size={32} color="#EF4444" />
                    </View>
                    <Text style={{ fontSize: fontSize + 2, fontWeight: '800', color: theme.textPrimary, marginBottom: 12, textAlign: 'center' }}>{title}</Text>
                    <Text style={{ fontSize: fontSize, color: theme.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>{message}</Text>
                    
                    {primaryAction || secondaryAction ? (
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            {secondaryAction && (
                                <TouchableOpacity onPress={secondaryAction.onPress} activeOpacity={0.8} style={{ flex: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
                                    <Text style={{ color: theme.textSecondary, fontSize: fontSize, fontWeight: '700' }}>{secondaryAction.label}</Text>
                                </TouchableOpacity>
                            )}
                            {primaryAction && (
                                <TouchableOpacity onPress={primaryAction.onPress} activeOpacity={0.8} style={{ flex: 1, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
                                    <Text style={{ color: '#FFF', fontSize: fontSize, fontWeight: '700' }}>{primaryAction.label}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{ width: '100%', backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontSize: fontSize, fontWeight: '700' }}>Okay, I understand</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

// ─── Reusable form components ─────────────────────────────────────────────────
const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, multiline, error, onFocus, onBlur, autoCapitalize }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#F1F5F9' }, multiline && styles.multilineContainer, error && styles.inputError]}>
                <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>
                <TextInput
                    style={[styles.input, { color: theme.textPrimary, fontSize }, multiline && styles.multilineInput]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    autoCapitalize={autoCapitalize}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const SelectField = ({ label, value, placeholder, icon: Icon, onPress, error }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <TouchableOpacity style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#F1F5F9' }, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
                <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>
                <Text style={[styles.inputText, { color: theme.textPrimary, fontSize }, !value && { color: isDark ? '#475569' : '#BBBBBB' }]}>{value || placeholder}</Text>
                <ChevronDown size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const Selector = ({ label, options, selected, onSelect }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const selectedIndex = options.indexOf(selected);
    const anim = useRef(new Animated.Value(selectedIndex >= 0 ? selectedIndex : 0)).current;

    useEffect(() => {
        if (selectedIndex >= 0) {
            Animated.spring(anim, {
                toValue: selectedIndex,
                useNativeDriver: false,
                tension: 80,
                friction: 12,
            }).start();
        }
    }, [selectedIndex]);

    const [containerWidth, setContainerWidth] = useState(0);
    const numOptions = options.length;
    const itemWidth = containerWidth ? (containerWidth - 8) / numOptions : 0;

    const translateX = anim.interpolate({
        inputRange: [0, numOptions - 1],
        outputRange: [0, (numOptions - 1) * itemWidth],
    });

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <View 
                style={[
                    styles.selectorContainer, 
                    { 
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9', 
                        borderColor: isDark ? '#334155' : '#E2E8F0' 
                    }
                ]}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
                {itemWidth > 0 && (
                    <Animated.View 
                        style={[
                            styles.selectorPill, 
                            { 
                                width: itemWidth, 
                                backgroundColor: theme.primary,
                                transform: [{ translateX }] 
                            }
                        ]}
                    />
                )}
                {options.map((opt: string) => {
                    const isAct = selected === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={styles.selectorTab}
                            onPress={() => onSelect(opt)}
                            activeOpacity={0.8}
                        >
                            <Text 
                                style={[
                                    styles.selectorTabText, 
                                    { fontSize: fontSize, color: isAct ? '#FFF' : theme.textSecondary },
                                    isAct && { fontWeight: '800' }
                                ]}
                            >
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// ─── Simple options drawer (gender, proof, relation) ─────────────────────────
const OptionsDrawer = ({ visible, title, data, selectedId, onSelect, onClose, keyExtractor, labelExtractor, searchable }: any) => {
    const { theme, isDark } = useTheme();
    const [search, setSearch] = React.useState('');
    const filtered = React.useMemo(() => {
        if (!searchable || !search) return data;
        return data.filter((item: any) => labelExtractor(item).toLowerCase().includes(search.toLowerCase()));
    }, [data, search, searchable, labelExtractor]);

    return (
        <ModalSheet visible={visible} onClose={() => { setSearch(''); onClose(); }} maxHeight="70%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{title}</Text>
                <TouchableOpacity onPress={() => { setSearch(''); onClose(); }} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}><Text style={[styles.doneBtnText, { color: theme.primary }]}>Done</Text></TouchableOpacity>
            </View>
            {searchable && (
                <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                    <TextInput style={[styles.searchInput, { backgroundColor: isDark ? '#334155' : '#F1F5F9', color: theme.textPrimary }]} placeholder="Search..." placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={search} onChangeText={setSearch} />
                </View>
            )}
            <FlatList
                data={filtered}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isSelected = selectedId === keyExtractor(item);
                    return (
                        <TouchableOpacity style={[styles.optionRow, { borderBottomColor: isDark ? '#334155' : '#F8FAFC' }, isSelected && (isDark ? { backgroundColor: theme.primary + '20' } : styles.optionRowActive)]} onPress={() => { onSelect(item); setSearch(''); onClose(); }} activeOpacity={0.7}>
                            <Text style={[styles.optionLabel, { color: theme.textPrimary }, isSelected && styles.optionLabelActive, isSelected && { color: theme.primary }]}>{labelExtractor(item)}</Text>
                            {isSelected && <Check size={18} color={theme.primary} />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: theme.textSecondary, fontSize: 14 }}>No options</Text></View>}
                contentContainerStyle={{ paddingBottom: 40 }}
            />
        </ModalSheet>
    );
};

const SectionHeader = ({ number, title }: { number: number; title: string }) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={[styles.sectionHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={[styles.sectionBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.sectionBadgeText}>{number}</Text>
            </View>
            <Text style={[styles.sectionHeaderText, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>{title}</Text>
        </View>
    );
};

const ImageSourceDrawer = ({ visible, onClose, onSelectCamera, onSelectGallery, title }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="45%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>{title || 'Choose Source'}</Text>
                <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}>
                    <Text style={[styles.doneBtnText, { color: theme.primary, fontSize }]}>Cancel</Text>
                </TouchableOpacity>
            </View>
            <View style={{ padding: 24, paddingBottom: Math.max(insets.bottom, 24) + 20, gap: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
                <TouchableOpacity 
                    style={[styles.sourceOptionBtn, { backgroundColor: isDark ? '#1E293B' : '#F3EEFF', borderColor: theme.primary }]}
                    onPress={() => { onSelectCamera(); onClose(); }}
                    activeOpacity={0.75}
                >
                    <View style={[styles.sourceIconBg, { backgroundColor: theme.primary }]}>
                        <Camera size={24} color="#FFF" />
                    </View>
                    <Text style={[styles.sourceOptionText, { color: theme.textPrimary, fontSize }]}>Use Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.sourceOptionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    onPress={() => { onSelectGallery(); onClose(); }}
                    activeOpacity={0.75}
                >
                    <View style={[styles.sourceIconBg, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}>
                        <Upload size={24} color={isDark ? '#FFF' : '#475569'} />
                    </View>
                    <Text style={[styles.sourceOptionText, { color: theme.textPrimary, fontSize }]}>Choose Gallery</Text>
                </TouchableOpacity>
            </View>
        </ModalSheet>
    );
};

const DocumentUploadBox = ({ label, uri, onCapture, onRemove, isFront, error }: { label: string; uri: string | null; onCapture: (uri: string) => void; onRemove: () => void; isFront: boolean; error?: string }) => {
    const { theme, isDark } = useTheme();
    const [pickerVisible, setPickerVisible] = useState(false);
    const [permError, setPermError] = useState({ visible: false, title: '', message: '' });

    const onSelectCamera = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
            setPermError({ visible: true, title: 'Permission Required', message: 'Camera permission is needed to upload documents. Please enable it in your device settings.' });
            return;
        }
        const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!r.canceled) onCapture(r.assets[0].uri);
    };

    const onSelectGallery = async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) {
            setPermError({ visible: true, title: 'Permission Required', message: 'Media library permission is needed to upload documents. Please enable it in your device settings.' });
            return;
        }
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
        if (!r.canceled) onCapture(r.assets[0].uri);
    };

    return (
        <>
            <View style={[styles.docUploadBox, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: error ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0'), borderStyle: 'dashed' }]}>
                {uri ? (
                    <View style={styles.docPreviewContainer}>
                        <Image source={{ uri }} style={styles.docPreviewImage} />
                        <TouchableOpacity style={styles.docRemoveBtn} onPress={onRemove}>
                            <X size={14} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.docRetakeRow, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={() => setPickerVisible(true)}>
                            <Camera size={12} color="#FFF" />
                            <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700', marginLeft: 4 }}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                        <View style={styles.docBoxTopRow}>
                            {/* Skeleton Card Illustration */}
                            <View style={[styles.skeletonCard, { borderColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]}>
                                {isFront ? (
                                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', height: '100%' }}>
                                        <View style={[styles.skeletonAvatar, { backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        <View style={{ flex: 1, gap: 3 }}>
                                            <View style={[styles.skeletonLine, { width: '80%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                            <View style={[styles.skeletonLine, { width: '60%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ justifyContent: 'center', height: '100%', gap: 3 }}>
                                        <View style={[styles.skeletonLine, { width: '90%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        <View style={[styles.skeletonLine, { width: '80%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        <View style={[styles.skeletonLine, { width: '40%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                    </View>
                                )}
                            </View>

                            {/* Top Right Upload Circle */}
                            <View style={[styles.uploadCircle, { backgroundColor: error ? '#FEE2E2' : (isDark ? '#2D1B6B' : '#F3EEFF') }]}>
                                <Upload size={14} color={error ? '#EF4444' : theme.primary} />
                            </View>
                        </View>

                        <View style={{ marginTop: 8 }}>
                            <Text style={[styles.docBoxTitle, { color: error ? '#EF4444' : (isDark ? '#F1F5F9' : '#1E293B') }]}>{label}</Text>
                            <Text style={styles.docBoxSubtitle}>JPG, PNG or PDF{"\n"}Max. 5MB</Text>
                        </View>

                        <TouchableOpacity 
                            style={[styles.docUploadBtn, { borderColor: error ? '#EF4444' : theme.primary }]}
                            onPress={() => setPickerVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Upload size={12} color={error ? '#EF4444' : theme.primary} />
                            <Text style={[styles.docUploadBtnText, { color: error ? '#EF4444' : theme.primary }]}>Upload</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {error && <Text style={{ color: '#EF4444', fontSize: 9, marginTop: 4, fontWeight: '600', textAlign: 'center' }}>{error}</Text>}
            </View>

            <ImageSourceDrawer 
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelectCamera={onSelectCamera}
                onSelectGallery={onSelectGallery}
                title={`Upload ${label}`}
            />
            <CustomAlertModal 
                visible={permError.visible}
                title={permError.title}
                message={permError.message}
                onClose={() => setPermError({ ...permError, visible: false })}
            />
        </>
    );
};

const IdentityUploadCard = ({ 
    title, 
    frontUri, 
    backUri, 
    onCaptureFront, 
    onCaptureBack, 
    onRemoveFront, 
    onRemoveBack,
    frontError,
    backError
}: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={[styles.idUploadCard, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={styles.idUploadHeader}>
                <View style={[styles.idHeaderIconContainer, { backgroundColor: isDark ? '#2D1B6B' : '#F3EEFF' }]}>
                    <Fingerprint size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.idCardTitle, { color: theme.textPrimary, fontSize }]}>{title} Card</Text>
                        <View style={styles.requiredBadge}>
                            <Text style={styles.requiredBadgeText}>Required</Text>
                        </View>
                    </View>
                    <Text style={[styles.idCardSubtitle, { color: theme.textSecondary }]}>Upload both sides of {title} card</Text>
                </View>
            </View>

            <View style={styles.idUploadBoxesRow}>
                <DocumentUploadBox 
                    label="Front Side" 
                    uri={frontUri} 
                    onCapture={onCaptureFront} 
                    onRemove={onRemoveFront} 
                    isFront={true} 
                    error={frontError}
                />
                <DocumentUploadBox 
                    label="Back Side" 
                    uri={backUri} 
                    onCapture={onCaptureBack} 
                    onRemove={onRemoveBack} 
                    isFront={false} 
                    error={backError}
                />
            </View>
        </View>
    );
};

// ─── Profile avatar capture at top ───────────────────────────────────────────
const ProfilePhotoCapture = ({ uri, onCapture, onRemove, error }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const [permError, setPermError] = useState({ visible: false, title: '', message: '' });

    const openCamera = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
            setPermError({ visible: true, title: 'Permission Required', message: 'Camera permission is needed to take a profile photo.' });
            return;
        }
        const r = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
        if (!r.canceled) onCapture(r.assets[0].uri);
    };

    const openGallery = async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) {
            setPermError({ visible: true, title: 'Permission Required', message: 'Media library permission is needed to pick a profile photo.' });
            return;
        }
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });
        if (!r.canceled) onCapture(r.assets[0].uri);
    };

    return (
        <View style={[styles.profilePhotoCard, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: error ? '#EF4444' : (isDark ? '#334155' : 'transparent'), borderWidth: (isDark || error) ? 1 : 0 }]}>
            <TouchableOpacity onPress={openCamera} activeOpacity={0.85} style={styles.profileAvatarContainer}>
                {uri ? (
                    <View style={styles.profileAvatarWrapper}>
                        <Image source={{ uri }} style={[styles.profileAvatar, { borderColor: error ? '#EF4444' : theme.primary }]} />
                        <View style={[styles.profileEditBadge, { backgroundColor: theme.primary }]}>
                            <Camera size={12} color="#FFF" />
                        </View>
                        <TouchableOpacity style={styles.profileRemoveBtn} onPress={onRemove}>
                            <X size={10} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.profileAvatarPlaceholder, { backgroundColor: isDark ? '#2D1B6B' : '#F3EEFF', borderColor: error ? '#EF4444' : theme.primary }]}>
                        <User size={32} color={error ? '#EF4444' : theme.primary} />
                        <View style={[styles.profileEditBadge, { backgroundColor: theme.primary }]}>
                            <Camera size={12} color="#FFF" />
                        </View>
                    </View>
                )}
            </TouchableOpacity>
            
            <View style={styles.profileDetailsContainer}>
                <Text style={[styles.profilePhotoTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>Add Profile Photo *</Text>
                <Text style={[styles.profilePhotoSubtitle, { color: theme.textSecondary }]}>Upload a clear photo of the tenant</Text>
                {error && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>{error}</Text>}
                <TouchableOpacity 
                    style={[styles.profileUploadBtn, { borderColor: error ? '#EF4444' : theme.primary }]}
                    onPress={openGallery}
                    activeOpacity={0.7}
                >
                    <Upload size={14} color={error ? '#EF4444' : theme.primary} />
                    <Text style={[styles.profileUploadBtnText, { color: error ? '#EF4444' : theme.primary }]}>{uri ? 'Change Photo' : 'Upload Photo'}</Text>
                </TouchableOpacity>
            </View>

            <CustomAlertModal 
                visible={permError.visible}
                title={permError.title}
                message={permError.message}
                onClose={() => setPermError({ ...permError, visible: false })}
            />
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AddStudentScreen = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const { theme, isDark, fontSize } = useTheme();
    const { triggerRefresh } = useRefresh();
    const { student, isEdit, roomId, bedId } = route.params || {};
    const { showSuccess, showError, showApiError } = useToast();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
    const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        first_name: '', last_name: '', gender: 'Male', phone: '', email: '',
        date_of_birth: '', id_proof_number: '', id_proof_type_id: '',
        guardian_name: '', guardian_phone: '', guardian_relation_id: '',
        admission_date: new Date().toISOString().split('T')[0],
        admission_fee: '0', admission_status: 'Paid', permanent_address: '',
        room_id: '', bed_id: '', floor_number: '', monthly_rent: '',
    });

    const [idProofTypes, setIdProofTypes] = useState<any[]>([]);
    const [relations, setRelations] = useState<any[]>([]);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [bedsLoading, setBedsLoading] = useState(false);

    const [roomModal, setRoomModal] = useState(false);
    const [bedModal, setBedModal] = useState(false);
    const [genderModal, setGenderModal] = useState(false);
    const [proofModal, setProofModal] = useState(false);
    const [relationModal, setRelationModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateMode, setDateMode] = useState<'dob' | 'admission'>('dob');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [pageAlert, setPageAlert] = useState<any>({ visible: false, title: '', message: '' });

    const validateField = (name: string, value: any, currentIdProofId?: string) => {
        let err = '';
        if (name === 'first_name') {
            if (!value || !value.trim()) err = 'First name is required';
        } else if (name === 'date_of_birth') {
            if (!value) err = 'Date of birth is required';
        } else if (name === 'phone') {
            if (!value) err = 'Mobile number is required';
            else if (!/^[6-9]/.test(value)) err = 'Must start with 6, 7, 8, or 9';
            else if (value.length !== 10) err = 'Must be exactly 10 digits';
        } else if (name === 'email') {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = 'Invalid email format';
        } else if (name === 'id_proof_type_id') {
            if (!value) err = 'ID Proof type is required';
        } else if (name === 'id_proof_number') {
            if (!value || !value.trim()) {
                err = 'ID Proof number is required';
            } else {
                const proofId = currentIdProofId !== undefined ? currentIdProofId : formData.id_proof_type_id;
                const proofTypeName = idProofTypes.find(t => t.id.toString() === proofId)?.name || '';
                if (proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar')) {
                    if (value.length !== 12) err = 'Aadhaar must be exactly 12 digits';
                    else if (!/^\d{12}$/.test(value)) err = 'Aadhaar must be numeric';
                } else if (proofTypeName.toLowerCase().includes('pan')) {
                    if (value.length !== 10) err = 'PAN must be exactly 10 characters';
                    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(value)) err = 'Invalid PAN format. Must be like ABCDE1234F';
                }
            }
        } else if (name === 'guardian_phone') {
            if (value) {
                if (!/^[6-9]/.test(value)) err = 'Must start with 6, 7, 8, or 9';
                else if (value.length !== 10) err = 'Must be exactly 10 digits';
            }
        } else if (name === 'admission_date') {
            if (!value) err = 'Admission date is required';
        } else if (name === 'permanent_address') {
            if (!value || !value.trim()) err = 'Address is required';
        } else if (name === 'profilePhoto') {
            if (!value) err = 'Profile photo is required';
        } else if (name === 'aadhaarFront') {
            const proofId = currentIdProofId !== undefined ? currentIdProofId : formData.id_proof_type_id;
            const proofTypeName = idProofTypes.find(t => t.id.toString() === proofId)?.name || '';
            const isPhotoReq = proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar') || proofTypeName.toLowerCase().includes('pan');
            if (isPhotoReq && !value) err = 'Front side image is required';
        } else if (name === 'aadhaarBack') {
            const proofId = currentIdProofId !== undefined ? currentIdProofId : formData.id_proof_type_id;
            const proofTypeName = idProofTypes.find(t => t.id.toString() === proofId)?.name || '';
            const isPhotoReq = proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar') || proofTypeName.toLowerCase().includes('pan');
            if (isPhotoReq && !value) err = 'Back side image is required';
        }

        setErrors(prev => {
            if (err) {
                return { ...prev, [name]: err };
            } else {
                const copy = { ...prev };
                delete copy[name];
                return copy;
            }
        });
        return err;
    };

    const getFieldError = (name: string) => {
        const err = errors[name];
        if (!err) return '';
        if (name === 'profilePhoto' || name === 'aadhaarFront' || name === 'aadhaarBack') {
            if (touched[name]) return err;
            return '';
        }
        const val = formData[name as keyof typeof formData];
        if (name === 'phone' || name === 'guardian_phone' || name === 'id_proof_number') {
            if (val && val.length > 0) return err;
        }
        if (touched[name]) return err;
        return '';
    };

    const markTouched = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        validateField(name, formData[name as keyof typeof formData]);
    };

    const selectedRoom = availableRooms.find(r => r.room_id?.toString() === formData.room_id);
    const selectedBed = beds.find(b => b.bed_id?.toString() === formData.bed_id);

    const selectedIdProofName = idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || '';
    const cleanIdLabel = (() => {
        const lowerName = selectedIdProofName.toLowerCase();
        if (lowerName.includes('aadhar') || lowerName.includes('aadhaar')) return 'Aadhaar';
        if (lowerName.includes('pan')) return 'PAN';
        return selectedIdProofName || 'ID';
    })();
    const showIdPhotos = selectedIdProofName.toLowerCase().includes('aadhar') || selectedIdProofName.toLowerCase().includes('aadhaar') || selectedIdProofName.toLowerCase().includes('pan');

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [user?.hostel_id]);

    useEffect(() => {
        if (isEdit && student) {
            setFormData({
                first_name: student.first_name || '',
                last_name: student.last_name || '',
                gender: student.gender || 'Male',
                phone: student.phone ? student.phone.replace(/\D/g, '').slice(0, 10) : '',
                email: student.email || '',
                date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                id_proof_number: student.id_proof_number || '',
                id_proof_type_id: student.id_proof_type ? student.id_proof_type.toString() : '',
                guardian_name: student.guardian_name || '',
                guardian_phone: student.guardian_phone && student.guardian_phone !== '0000000000' ? student.guardian_phone.replace(/\D/g, '').slice(0, 10) : '',
                guardian_relation_id: student.guardian_relation ? student.guardian_relation.toString() : '',
                admission_date: student.admission_date ? new Date(student.admission_date).toISOString().split('T')[0] : '',
                admission_fee: student.admission_fee ? student.admission_fee.toString() : '0',
                admission_status: student.admission_status === 1 ? 'Paid' : 'Unpaid',
                permanent_address: student.permanent_address || '',
                room_id: student.room_id ? student.room_id.toString() : '',
                bed_id: student.bed_id ? student.bed_id.toString() : '',
                floor_number: student.floor_number ? student.floor_number.toString() : '',
                monthly_rent: student.monthly_rent ? student.monthly_rent.toString() : '',
            });
            if (student.photo) setProfilePhoto(student.photo);
        }
    }, [isEdit, student]);

    const fetchInitialData = async () => {
        try {
            const [proofRes, relRes, roomsRes, hostelRes] = await Promise.all([
                api.get('/id-proof-types'),
                api.get('/relations'),
                api.get(`/rooms?hostelId=${user?.hostel_id}&limit=200`),
                user?.hostel_id ? api.get(`/hostels/${user.hostel_id}`) : Promise.resolve(null),
            ]);
            if (proofRes.data.success) setIdProofTypes(proofRes.data.data);
            if (relRes.data.success) setRelations(relRes.data.data);
            if (roomsRes.data.success) {
                const roomsData = roomsRes.data.data;
                setAvailableRooms(roomsData);
                
                // If roomId was passed in params, pre-select it and fetch its beds
                if (roomId && !isEdit) {
                    const matchedRoom = roomsData.find((r: any) => r.room_id?.toString() === roomId.toString());
                    if (matchedRoom) {
                        setFormData(p => ({
                            ...p,
                            room_id: roomId.toString(),
                            floor_number: matchedRoom.floor_number?.toString() || '0',
                            monthly_rent: matchedRoom.rent_per_bed?.toString() || '',
                        }));
                        // Pass matchedRoom directly so fetchBeds doesn't depend on stale availableRooms state
                        fetchBeds(roomId.toString(), matchedRoom);
                    }
                }
            }
            if (hostelRes && hostelRes.data?.success) {
                const hostelData = hostelRes.data.data;
                const defaultFee = hostelData?.admission_fee ? hostelData.admission_fee.toString() : '0';
                if (!isEdit) {
                    setFormData(p => ({
                        ...p,
                        admission_fee: defaultFee
                    }));
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchBeds = useCallback(async (roomId: string, roomData?: any) => {
        setBedsLoading(true);
        try {
            const res = await api.get(`/rooms/${roomId}/beds`);
            if (res.data.success) { setBeds(res.data.data); setBedsLoading(false); return; }
        } catch { }
        // Fallback: generate fake beds from room data
        // Use passed roomData first, then search availableRooms
        const room = roomData || availableRooms.find(r => r.room_id?.toString() === roomId);
        const cap = room?.total_capacity ?? room?.capacity ?? 4;
        const occupiedCount = room?.occupied_beds ?? 0;
        const fake = Array.from({ length: Number(cap) }, (_, i) => ({
            bed_id: `${roomId}_${i + 1}`,
            bed_name: `Bed ${i + 1}`,
            status: i >= occupiedCount ? 'available' : 'occupied',
            student_id: i >= occupiedCount ? null : 1,
        }));
        setBeds(fake);
        setBedsLoading(false);
    }, [availableRooms]);

    const validate = () => {
        const e: Record<string, string> = {};
        
        // Touch all validated fields
        const allTouched = {
            first_name: true,
            phone: true,
            email: true,
            date_of_birth: true,
            id_proof_type_id: true,
            id_proof_number: true,
            guardian_phone: true,
            admission_date: true,
            permanent_address: true,
            profilePhoto: true,
            aadhaarFront: true,
            aadhaarBack: true,
        };
        setTouched(allTouched);

        if (!profilePhoto) {
            e.profilePhoto = 'Profile photo is required';
        }

        if (showIdPhotos && formData.id_proof_type_id) {
            if (!aadhaarFront) {
                e.aadhaarFront = 'Front side image is required';
            }
            if (!aadhaarBack) {
                e.aadhaarBack = 'Back side image is required';
            }
        }

        if (!formData.first_name || !formData.first_name.trim()) {
            e.first_name = 'First name is required';
        }
        if (!formData.date_of_birth) {
            e.date_of_birth = 'Date of birth is required';
        }
        if (!formData.phone) {
            e.phone = 'Mobile number is required';
        } else {
            if (!/^[6-9]/.test(formData.phone)) e.phone = 'Must start with 6, 7, 8, or 9';
            else if (formData.phone.length !== 10) e.phone = 'Must be exactly 10 digits';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            e.email = 'Invalid email format';
        }
        if (!formData.id_proof_type_id) {
            e.id_proof_type_id = 'ID Proof type is required';
        }
        if (!formData.id_proof_number || !formData.id_proof_number.trim()) {
            e.id_proof_number = 'ID Proof number is required';
        } else if (formData.id_proof_type_id) {
            const proofTypeName = idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || '';
            if (proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar')) {
                if (formData.id_proof_number.length !== 12) e.id_proof_number = 'Aadhaar must be exactly 12 digits';
                else if (!/^\d{12}$/.test(formData.id_proof_number)) e.id_proof_number = 'Aadhaar must be numeric';
            } else if (proofTypeName.toLowerCase().includes('pan')) {
                if (formData.id_proof_number.length !== 10) e.id_proof_number = 'PAN must be exactly 10 characters';
                else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.id_proof_number)) e.id_proof_number = 'Invalid PAN format. Must be like ABCDE1234F';
            }
        }
        if (formData.guardian_phone) {
            if (!/^[6-9]/.test(formData.guardian_phone)) e.guardian_phone = 'Must start with 6, 7, 8, or 9';
            else if (formData.guardian_phone.length !== 10) e.guardian_phone = 'Must be exactly 10 digits';
        }
        if (!formData.admission_date) {
            e.admission_date = 'Admission date is required';
        }
        if (!formData.permanent_address || !formData.permanent_address.trim()) {
            e.permanent_address = 'Address is required';
        }

        setErrors(e);
        return e;
    };

    const handleSave = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            const fieldLabels: Record<string, string> = {
                profilePhoto: 'Profile Photo',
                first_name: 'First Name',
                date_of_birth: 'Date of Birth',
                phone: 'Mobile Number',
                id_proof_type_id: 'ID Proof Type',
                id_proof_number: 'ID Proof Number',
                admission_date: 'Admission Date',
                permanent_address: 'Permanent Address',
                aadhaarFront: 'ID Front Image',
                aadhaarBack: 'ID Back Image',
                email: 'Email',
                guardian_phone: 'Guardian Phone',
            };
            const missed = Object.keys(validationErrors)
                .map(k => fieldLabels[k] || k)
                .join(', ');
            showError(`Please fix or fill: ${missed}`);
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...formData,
                hostel_id: user?.hostel_id,
                guardian_phone: formData.guardian_phone || null,
                guardian_name: formData.guardian_name || null,
                admission_fee: parseFloat(formData.admission_fee || '0'),
                admission_status: formData.admission_status === 'Paid' ? 1 : 0,
                status: isEdit ? student.status : 1,
                room_id: formData.room_id ? parseInt(formData.room_id) : null,
                bed_id: formData.bed_id || null,
                floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
                id_proof_type: formData.id_proof_type_id || null,
                guardian_relation: formData.guardian_relation_id || null,
                id_proof_status: 1,
                monthly_rent: parseFloat(formData.monthly_rent || '0'),
            };
            const res = isEdit ? await api.put(`/students/${student.student_id}`, payload) : await api.post('/students', payload);
            if (res.data.success) {
                triggerRefresh();

                // If a NEW tenant was added without a room, prompt to allocate now.
                // Billing only starts once a room is allocated, so this keeps the rent roll clean.
                if (!isEdit && !payload.room_id) {
                    const newId = res.data.data?.student_id;
                    setPageAlert({
                        visible: true,
                        title: 'Tenant Added',
                        message: 'Billing starts only after you allocate a room. Would you like to allocate one now?',
                        icon: Info,
                        secondaryAction: { label: 'Later', onPress: () => { setPageAlert({ visible: false }); navigation.goBack(); } },
                        primaryAction: {
                            label: 'Allocate Now',
                            onPress: () => {
                                setPageAlert({ visible: false });
                                navigation.replace('AddStudent', {
                                    student: { ...payload, student_id: newId, photo: profilePhoto },
                                    isEdit: true,
                                });
                            }
                        }
                    });
                } else {
                    showSuccess(`Tenant ${isEdit ? 'updated' : 'registered'} successfully!`);
                    navigation.goBack();
                }
            }
        } catch (error: any) {
            showApiError(error, 'Failed to save tenant');
        } finally { setLoading(false); }
    };

    const handleReset = () => {
        setFormData({ first_name: '', last_name: '', gender: 'Male', phone: '', email: '', date_of_birth: '', id_proof_number: '', id_proof_type_id: '', guardian_name: '', guardian_phone: '', guardian_relation_id: '', admission_date: new Date().toISOString().split('T')[0], admission_fee: '0', admission_status: 'Paid', permanent_address: '', room_id: '', bed_id: '', floor_number: '', monthly_rent: '' });
        setProfilePhoto(null); setAadhaarFront(null); setAadhaarBack(null); setErrors({}); setTouched({});
        setRoomModal(false); setBedModal(false); setGenderModal(false); setProofModal(false); setRelationModal(false); setShowDatePicker(false);
    };

    const up = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: theme.background }]}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <AppHeader title={isEdit ? 'Edit Tenant' : 'Add Tenant'} />
            <FullScreenLoader visible={loading} />

            <ScrollView
                ref={scrollViewRef}
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: (isKeyboardVisible ? 180 : 100) + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
            >

                {/* ── Profile Photo ── */}
                <ProfilePhotoCapture 
                    uri={profilePhoto} 
                    onCapture={(uri: string) => {
                        setProfilePhoto(uri);
                        setTouched(prev => ({ ...prev, profilePhoto: true }));
                        validateField('profilePhoto', uri);
                    }} 
                    onRemove={() => {
                        setProfilePhoto(null);
                        setTouched(prev => ({ ...prev, profilePhoto: true }));
                        validateField('profilePhoto', null);
                    }} 
                    error={getFieldError('profilePhoto')}
                />

                {/* ── Basic Info ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={1} title="Basic Information" />
                    <FormInput 
                        label="First Name *" 
                        icon={User} 
                        placeholder="e.g. Ravi" 
                        value={formData.first_name} 
                        error={getFieldError('first_name')}
                        onBlur={() => markTouched('first_name')}
                        onChangeText={(t: string) => { 
                            const clean = t.replace(/[^a-zA-Z0-9\s]/g, '');
                            up('first_name', clean); 
                            validateField('first_name', clean);
                        }} 
                    />
                    <FormInput label="Last Name" icon={User} placeholder="e.g. Kumar" value={formData.last_name} onChangeText={(t: string) => up('last_name', t.replace(/[^a-zA-Z0-9\s]/g, ''))} />
                    <Selector label="Gender *" options={['Male', 'Female', 'Other']} selected={formData.gender} onSelect={(v: string) => up('gender', v)} />
                    <SelectField 
                        label="Date of Birth *" 
                        icon={Calendar} 
                        placeholder="Pick date" 
                        value={formData.date_of_birth} 
                        error={getFieldError('date_of_birth')}
                        onPress={() => { 
                            setDateMode('dob'); 
                            setShowDatePicker(true); 
                        }} 
                    />
                    <FormInput 
                        label="Mobile Number *" 
                        icon={Phone} 
                        placeholder="9876543210" 
                        keyboardType="phone-pad" 
                        value={formData.phone} 
                        error={getFieldError('phone')}
                        onBlur={() => markTouched('phone')}
                        onChangeText={(t: string) => { 
                            const c = t.replace(/\D/g, '').slice(0, 10); 
                            up('phone', c); 
                            validateField('phone', c); 
                        }} 
                    />
                    <FormInput 
                        label="Email" 
                        icon={Mail} 
                        placeholder="tenant@email.com" 
                        keyboardType="email-address" 
                        value={formData.email} 
                        error={getFieldError('email')}
                        onBlur={() => markTouched('email')}
                        onChangeText={(t: string) => {
                            const clean = t.trim();
                            up('email', clean);
                            validateField('email', clean);
                        }} 
                    />
                </View>

                {/* ── Identity & Aadhaar ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={2} title="Identity & Documents" />
                    <SelectField 
                        label="ID Proof Type *" 
                        value={idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name} 
                        placeholder="Select ID Type" 
                        icon={Fingerprint} 
                        error={getFieldError('id_proof_type_id')}
                        onPress={() => setProofModal(true)} 
                    />
                    {formData.id_proof_type_id ? (
                        <FormInput
                            label={`${cleanIdLabel} Number *`}
                            icon={CreditCard}
                            placeholder={(selectedIdProofName.toLowerCase().includes('aadhar') || selectedIdProofName.toLowerCase().includes('aadhaar')) 
                                ? '12-digit Aadhaar number' 
                                : selectedIdProofName.toLowerCase().includes('pan') 
                                    ? '10-character PAN number' 
                                    : 'Enter ID number'}
                            value={formData.id_proof_number}
                            keyboardType={(selectedIdProofName.toLowerCase().includes('aadhar') || selectedIdProofName.toLowerCase().includes('aadhaar')) ? 'number-pad' : 'default'}
                            autoCapitalize={selectedIdProofName.toLowerCase().includes('pan') ? 'characters' : 'none'}
                            error={getFieldError('id_proof_number')}
                            onBlur={() => markTouched('id_proof_number')}
                            onChangeText={(t: string) => {
                                let clean = t;
                                if (selectedIdProofName.toLowerCase().includes('aadhar') || selectedIdProofName.toLowerCase().includes('aadhaar')) {
                                    clean = t.replace(/\D/g, '').slice(0, 12);
                                } else if (selectedIdProofName.toLowerCase().includes('pan')) {
                                    clean = t.slice(0, 10);
                                }
                                up('id_proof_number', clean);
                                validateField('id_proof_number', clean);
                            }}
                        />
                    ) : null}

                    {showIdPhotos && formData.id_proof_type_id && (
                        <IdentityUploadCard
                            title={cleanIdLabel}
                            frontUri={aadhaarFront}
                            backUri={aadhaarBack}
                            onCaptureFront={(uri: string) => {
                                setAadhaarFront(uri);
                                setTouched(prev => ({ ...prev, aadhaarFront: true }));
                                validateField('aadhaarFront', uri);
                            }}
                            onCaptureBack={(uri: string) => {
                                setAadhaarBack(uri);
                                setTouched(prev => ({ ...prev, aadhaarBack: true }));
                                validateField('aadhaarBack', uri);
                            }}
                            onRemoveFront={() => {
                                setAadhaarFront(null);
                                setTouched(prev => ({ ...prev, aadhaarFront: true }));
                                validateField('aadhaarFront', null);
                            }}
                            onRemoveBack={() => {
                                setAadhaarBack(null);
                                setTouched(prev => ({ ...prev, aadhaarBack: true }));
                                validateField('aadhaarBack', null);
                            }}
                            frontError={getFieldError('aadhaarFront')}
                            backError={getFieldError('aadhaarBack')}
                        />
                    )}
                </View>

                {/* ── Guardian (Optional) ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={3} title="Guardian (Optional)" />
                    <SelectField label="Relation" value={relations.find(r => r.relation_id.toString() === formData.guardian_relation_id)?.relation_name} placeholder="Relation" icon={Users} onPress={() => setRelationModal(true)} />
                    <FormInput label="Guardian Name" icon={User} placeholder="Parent / Guardian" value={formData.guardian_name} onChangeText={(t: string) => up('guardian_name', t.replace(/[^a-zA-Z0-9\s]/g, ''))} />
                    <FormInput 
                        label="Guardian Phone" 
                        icon={Phone} 
                        placeholder="9876543211" 
                        keyboardType="phone-pad" 
                        value={formData.guardian_phone} 
                        error={getFieldError('guardian_phone')}
                        onBlur={() => markTouched('guardian_phone')}
                        onChangeText={(t: string) => { 
                            const c = t.replace(/\D/g, '').slice(0, 10); 
                            up('guardian_phone', c); 
                            validateField('guardian_phone', c); 
                        }} 
                    />
                </View>

                {/* ── Admission ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={4} title="Admission Details" />
                    <SelectField 
                        label="Admission Date *" 
                        icon={Calendar} 
                        placeholder="Pick date" 
                        value={formData.admission_date} 
                        error={getFieldError('admission_date')} 
                        onPress={() => { 
                            setDateMode('admission'); 
                            setShowDatePicker(true); 
                        }} 
                    />
                    <FormInput label="Admission Fee (₹)" icon={CreditCard} placeholder="0" keyboardType="numeric" value={formData.admission_fee} onChangeText={(t: string) => up('admission_fee', t.replace(/\D/g, ''))} />
                    <Selector label="Payment Status" options={['Paid', 'Unpaid']} selected={formData.admission_status} onSelect={(v: string) => up('admission_status', v)} />
                </View>

                {/* ── Room & Bed ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={5} title="Room & Bed Allocation" />
                    {selectedRoom && (
                        <View style={[styles.allocationSummary, { backgroundColor: isDark ? '#1E293B' : COLORS.primaryLight, borderColor: isDark ? '#334155' : COLORS.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Room</Text>
                                <Text style={[styles.allocationValue, { color: theme.textPrimary }]}>Room {selectedRoom.room_number}</Text>
                                <Text style={[styles.allocationMeta, { color: theme.textSecondary }]}>Floor {selectedRoom.floor_number ?? '—'}  •  ₹{selectedRoom.rent_per_bed ?? '—'}/bed</Text>
                            </View>
                            <View style={[styles.allocationDivider, { backgroundColor: isDark ? '#334155' : COLORS.border }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Bed</Text>
                                <Text style={[styles.allocationValue, { color: theme.textPrimary }, !selectedBed && { color: theme.textSecondary, fontSize: 14 }]}>
                                    {selectedBed ? (selectedBed.bed_name ?? `Bed`) : 'Not selected'}
                                </Text>
                                {selectedBed && <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>● Available</Text>}
                            </View>
                        </View>
                    )}
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity style={[styles.allocationBtn, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedRoom && { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight, borderColor: theme.primary }]} onPress={() => setRoomModal(true)} activeOpacity={0.8}>
                            <Home size={17} color={selectedRoom ? theme.primary : theme.textSecondary} />
                            <Text style={[styles.allocationBtnText, { color: theme.textSecondary }, selectedRoom && { color: theme.primary }]} numberOfLines={1}>{selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}</Text>
                            <ChevronDown size={15} color={selectedRoom ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.allocationBtn, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedBed && { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight, borderColor: theme.primary }, !selectedRoom && styles.allocationBtnDisabled]}
                            onPress={() => { if (!selectedRoom) { setPageAlert({ visible: true, title: 'Select Room First', message: 'Please pick a room first.' }); return; } setBedModal(true); }} activeOpacity={0.8}>
                            <BedDouble size={17} color={selectedBed ? theme.primary : !selectedRoom ? (isDark ? '#334155' : '#CBD5E1') : theme.textSecondary} />
                            <Text style={[styles.allocationBtnText, { color: theme.textSecondary }, selectedBed && { color: theme.primary }, !selectedRoom && { color: isDark ? '#334155' : '#CBD5E1' }]} numberOfLines={1}>{selectedBed ? (selectedBed.bed_name ?? 'Bed') : 'Select Bed'}</Text>
                            <ChevronDown size={15} color={selectedBed ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {selectedRoom && (
                        <TouchableOpacity onPress={() => { up('room_id', ''); up('bed_id', ''); up('floor_number', ''); up('monthly_rent', ''); setBeds([]); }} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>✕ Clear allocation</Text>
                        </TouchableOpacity>
                    )}
                    <FormInput label="Monthly Rent (₹)" icon={CreditCard} placeholder="Auto-filled from room" keyboardType="numeric" value={formData.monthly_rent}
                        onChangeText={(t: string) => up('monthly_rent', t.replace(/\D/g, ''))} />
                </View>

                {/* ── Address ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={6} title="Address" />
                    <FormInput
                        label="Permanent Address *"
                        icon={MapPin}
                        placeholder="Full home address..."
                        multiline
                        value={formData.permanent_address}
                        error={getFieldError('permanent_address')}
                        onBlur={() => markTouched('permanent_address')}
                        onChangeText={(t: string) => {
                            up('permanent_address', t);
                            validateField('permanent_address', t);
                        }}
                        onFocus={() => {
                            setTimeout(() => {
                                scrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                        }}
                    />
                </View>

                {/* ── Buttons (scroll content) ── */}
                <View style={{ height: 8 }} />
            </ScrollView>

            {/* ─── Sticky Footer ───────────────────────────────────────────────────── */}
            <View style={[styles.stickyFooter, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: Math.max(insets.bottom, 28) }]}>
                <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#CBD5E1' }]}
                    onPress={handleReset}
                    disabled={loading}
                >
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={loading ? ['#BBB', '#999'] : [theme.gradientStart, theme.gradientEnd]}
                        style={styles.submitGradient}
                    >
                        {loading
                            ? <ActivityIndicator color="#FFF" size="small" />
                            : <Text style={styles.submitText}>{isEdit ? 'Update Tenant' : 'Add Tenant'}</Text>
                        }
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* ── Drawers ── */}
            <OptionsDrawer visible={genderModal} title="Select Gender" data={['Male', 'Female', 'Other']} selectedId={formData.gender} keyExtractor={(i: string) => i} labelExtractor={(i: string) => i} onSelect={(i: string) => up('gender', i)} onClose={() => setGenderModal(false)} />
            <OptionsDrawer visible={proofModal} title="ID Proof Type" data={idProofTypes} selectedId={formData.id_proof_type_id} keyExtractor={(i: any) => i.id.toString()} labelExtractor={(i: any) => i.name} 
                onSelect={(i: any) => {
                    const newId = i.id.toString();
                    up('id_proof_type_id', newId);
                    setTouched(prev => ({ ...prev, id_proof_type_id: true }));
                    validateField('id_proof_type_id', newId);
                    validateField('id_proof_number', formData.id_proof_number, newId);
                    
                    const proofTypeName = i.name || '';
                    const isPhotoReq = proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar') || proofTypeName.toLowerCase().includes('pan');
                    if (isPhotoReq) {
                        validateField('aadhaarFront', aadhaarFront, newId);
                        validateField('aadhaarBack', aadhaarBack, newId);
                    } else {
                        setErrors(prev => {
                            const copy = { ...prev };
                            delete copy.aadhaarFront;
                            delete copy.aadhaarBack;
                            return copy;
                        });
                    }
                }} 
                onClose={() => setProofModal(false)} />
            <OptionsDrawer visible={relationModal} title="Relation" data={relations} selectedId={formData.guardian_relation_id} keyExtractor={(i: any) => i.relation_id.toString()} labelExtractor={(i: any) => i.relation_name} onSelect={(i: any) => up('guardian_relation_id', i.relation_id.toString())} onClose={() => setRelationModal(false)} />

            <RoomPickerDrawer visible={roomModal} rooms={availableRooms} selectedRoomId={formData.room_id}
                navigation={navigation}
                onSelectRoom={(room: any) => { up('room_id', room.room_id.toString()); up('floor_number', room.floor_number?.toString() || ''); up('monthly_rent', room.rent_per_bed?.toString() || room.base_rent?.toString() || formData.monthly_rent); up('bed_id', ''); setBeds([]); fetchBeds(room.room_id.toString()); }}
                onClose={() => setRoomModal(false)} />

            <BedPickerDrawer visible={bedModal} room={selectedRoom} beds={beds} selectedBedId={formData.bed_id} loading={bedsLoading}
                onSelectBed={(bed: any) => up('bed_id', bed.bed_id?.toString())} onClose={() => setBedModal(false)} />

            <DateTimePickerModal isVisible={showDatePicker} mode="date"
                date={(() => { try { const d = dateMode === 'dob' ? (formData.date_of_birth ? new Date(formData.date_of_birth) : new Date(2000, 0, 1)) : (formData.admission_date ? new Date(formData.admission_date) : new Date()); return isNaN(d.getTime()) ? new Date() : d; } catch { return new Date(); } })()}
                onConfirm={(d: Date) => { 
                    setShowDatePicker(false); 
                    const s = d.toISOString().split('T')[0]; 
                    if (dateMode === 'dob') {
                        up('date_of_birth', s); 
                        setTouched(prev => ({ ...prev, date_of_birth: true }));
                        validateField('date_of_birth', s);
                    } else {
                        up('admission_date', s); 
                        setTouched(prev => ({ ...prev, admission_date: true }));
                        validateField('admission_date', s);
                    }
                }}
                onCancel={() => setShowDatePicker(false)} />

            <CustomAlertModal
                visible={pageAlert.visible}
                title={pageAlert.title}
                message={pageAlert.message}
                icon={pageAlert.icon}
                primaryAction={pageAlert.primaryAction}
                secondaryAction={pageAlert.secondaryAction}
                onClose={() => setPageAlert({ ...pageAlert, visible: false })}
            />
        </KeyboardAvoidingView>
    );
};

// ── Floor-grouped room picker ────────────────────────────────────────────────
const RoomPickerDrawer = ({ visible, rooms, selectedRoomId, onSelectRoom, onClose, navigation }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const [search, setSearch] = useState('');
    const [selectedFloor, setSelectedFloor] = useState('All');

    const uniqueFloors = React.useMemo(() => {
        const floorsSet = new Set<number>();
        rooms.forEach((r: any) => {
            if (r.floor_number !== undefined && r.floor_number !== null) {
                floorsSet.add(r.floor_number);
            }
        });
        const sorted = Array.from(floorsSet).sort((a, b) => a - b);
        return ['All', ...sorted.map(f => f.toString())];
    }, [rooms]);

    useEffect(() => {
        if (!uniqueFloors.includes(selectedFloor)) {
            setSelectedFloor('All');
        }
    }, [rooms, uniqueFloors]);

    const grouped = React.useMemo(() => {
        let f = search ? rooms.filter((r: any) => r.room_number?.toString().includes(search)) : rooms;
        if (selectedFloor !== 'All') {
            f = f.filter((r: any) => (r.floor_number?.toString() || '0') === selectedFloor);
        }
        const map: Record<number, any[]> = {};
        f.forEach((r: any) => { const fl = r.floor_number ?? 0; if (!map[fl]) map[fl] = []; map[fl].push(r); });
        return Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(fl => {
            const floorRooms = map[Number(fl)];
            floorRooms.sort((a: any, b: any) => {
                const aAvail = (a.available_beds ?? 0) > 0;
                const bAvail = (b.available_beds ?? 0) > 0;
                if (aAvail && !bAvail) return -1;
                if (!aAvail && bAvail) return 1;
                return (a.room_number ?? '').toString().localeCompare((b.room_number ?? '').toString(), undefined, { numeric: true });
            });
            return { floor: Number(fl), rooms: floorRooms };
        });
    }, [rooms, search, selectedFloor]);

    const statusColor = (r: any) => r.status === 'MAINTENANCE' ? '#F97316' : (r.available_beds ?? 0) > 0 ? '#16A34A' : '#DC2626';

    return (
        <ModalSheet visible={visible} onClose={() => { setSearch(''); onClose(); }} maxHeight="90%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Select Room</Text>
                <TouchableOpacity onPress={() => { setSearch(''); onClose(); }} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}><Text style={[styles.doneBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 8 }}>
                <View style={[styles.searchBarWrap, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Search color={isDark ? '#94A3B8' : '#64748B'} size={18} style={{ marginRight: 8 }} />
                    <TextInput style={{ flex: 1, fontSize: 15, color: theme.textPrimary }} placeholder="Search room..." placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={search} onChangeText={setSearch} />
                </View>
            </View>
            {uniqueFloors.length > 1 && (
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {uniqueFloors.map((floor) => {
                            const isSel = selectedFloor === floor;
                            const label = floor === 'All' ? 'All Floors' : `Floor ${floor}`;
                            return (
                                <TouchableOpacity
                                    key={floor}
                                    onPress={() => setSelectedFloor(floor)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 7,
                                        borderRadius: 20,
                                        borderWidth: 1.5,
                                        borderColor: isSel ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                                        backgroundColor: isSel ? theme.primary : (isDark ? '#1E293B' : '#FFF'),
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: isSel ? '#FFF' : theme.textSecondary,
                                    }}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 16 }}>
                {grouped.length === 0 && (
                    <View style={{ padding: 40, alignItems: 'center', gap: 14 }}>
                        <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: fontSize }}>No rooms available in this hostel.</Text>
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: theme.primary,
                                paddingVertical: 10,
                                paddingHorizontal: 18,
                                borderRadius: 12,
                                marginTop: 8,
                            }}
                            onPress={() => {
                                onClose();
                                navigation.navigate('AddRoom');
                            }}
                            activeOpacity={0.8}
                        >
                            <Plus size={16} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Add Room</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {grouped.map(({ floor, rooms: fr }) => (
                    <View key={floor}>
                        <View style={[styles.floorChip, { backgroundColor: isDark ? '#334155' : '#EDE9FE' }]}>
                            <Text style={[styles.floorChipText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>FLOOR {floor}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {fr.map((room: any) => {
                                const isSel = selectedRoomId === room.room_id?.toString();
                                const avail = room.available_beds ?? 0;
                                const isFull = avail <= 0;
                                return (
                                    <TouchableOpacity key={room.room_id}
                                        style={[
                                            styles.roomCard,
                                            {
                                                backgroundColor: isSel
                                                    ? (isDark ? '#4C1D95' : '#7C3AED')
                                                    : (isDark ? '#1E293B' : '#FFF'),
                                                borderColor: isSel ? '#7C3AED' : (isDark ? '#334155' : '#E2E8F0'),
                                                width: '47%',
                                                padding: 14,
                                                marginBottom: 10,
                                                borderWidth: isSel ? 2 : 1.5,
                                                borderRadius: 14,
                                                elevation: isSel ? 4 : 1,
                                                shadowColor: isSel ? '#7C3AED' : '#000',
                                                shadowOpacity: isSel ? 0.18 : 0.03,
                                                shadowRadius: isSel ? 8 : 3,
                                                shadowOffset: { width: 0, height: isSel ? 3 : 1 },
                                            },
                                            isFull && !isSel && { opacity: 0.55 }
                                        ]}
                                        onPress={() => { onSelectRoom(room); setSearch(''); onClose(); }} activeOpacity={0.75}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={{ fontSize: fontSize + 2, fontWeight: '800', color: isSel ? '#FFF' : theme.textPrimary }}>Room {room.room_number}</Text>
                                            {isSel
                                                ? <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: 3 }}><Check size={13} color="#FFF" /></View>
                                                : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor(room) }} />
                                            }
                                        </View>
                                        <View style={{ gap: 3 }}>
                                            <Text style={{ fontSize: fontSize - 2, color: isSel ? 'rgba(255,255,255,0.75)' : theme.textSecondary }} numberOfLines={1}>
                                                {room.room_type_name ? room.room_type_name.replace(/share|sharing|sh/gi, '').trim() : 'Standard'}
                                            </Text>
                                            <Text style={{ fontSize: fontSize - 2, color: isSel ? '#A7F3D0' : statusColor(room), fontWeight: '700' }}>
                                                {avail} of {room.capacity ?? '—'} beds free
                                            </Text>
                                            <Text style={{ fontSize: fontSize - 1, color: isSel ? '#FFF' : theme.textPrimary, fontWeight: '700', marginTop: 2 }}>
                                                ₹{room.rent_per_bed ?? room.base_rent ?? '—'}/bed
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </ModalSheet>
    );
};

// ─── Bed picker ───────────────────────────────────────────────────────────────
const BedPickerDrawer = ({ visible, room, beds, selectedBedId, onSelectBed, onClose, loading }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="65%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Beds in Room {room?.room_number}</Text>
                <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}><Text style={[styles.doneBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            {room && (
                <View style={{ paddingHorizontal: 16, marginBottom: 4, marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <View style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>Total Beds</Text>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginTop: 2 }}>{room.total_capacity ?? room.capacity ?? beds.length}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600' }}>Available</Text>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A', marginTop: 2 }}>{room.available_beds ?? beds.filter((b: any) => !b.student_id || b.status === 'available').length}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#FFF0F0', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Occupied</Text>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#DC2626', marginTop: 2 }}>{room.occupied_beds ?? beds.filter((b: any) => b.student_id && b.status !== 'available').length}</Text>
                        </View>
                    </View>
                </View>
            )}
            {loading ? (
                <ActivityIndicator color={theme.primary} size="large" style={{ marginVertical: 40 }} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150, paddingTop: 14 }}>
                    {beds.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: theme.textSecondary }}>No beds in this room</Text></View>}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {beds.map((bed: any) => {
                            const isAvail = !bed.student_id || bed.status === 'available';
                            const isSel = selectedBedId === bed.bed_id?.toString();
                            return (
                                <TouchableOpacity key={bed.bed_id}
                                    style={[
                                        styles.bedCard,
                                        {
                                            backgroundColor: isSel
                                                ? (isDark ? '#4C1D95' : '#7C3AED')
                                                : isAvail
                                                    ? (isDark ? '#1E293B' : '#F0FDF4')
                                                    : (isDark ? '#0F172A' : '#F8FAFC'),
                                            borderColor: isSel ? '#7C3AED' : isAvail ? '#86EFAC' : (isDark ? '#1E293B' : '#E2E8F0'),
                                            borderWidth: isSel ? 2 : 1.5,
                                            opacity: !isAvail && !isSel ? 0.6 : 1,
                                        }
                                    ]}
                                    onPress={() => { if (!isAvail) return; onSelectBed(bed); onClose(); }} activeOpacity={0.75}>
                                    <BedDouble size={22} color={isSel ? '#FFF' : !isAvail ? (isDark ? '#334155' : '#CBD5E1') : '#22C55E'} />
                                    <Text style={[styles.bedName, { fontSize: fontSize + 1, color: isSel ? '#FFF' : theme.textPrimary }]}>
                                        {bed.bed_name ?? `Bed ${bed.bed_number ?? ''}`}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isAvail ? '#22C55E' : '#EF4444' }} />
                                        <Text style={{ fontSize: fontSize - 3, fontWeight: '700', color: isSel ? 'rgba(255,255,255,0.8)' : isAvail ? '#16A34A' : '#DC2626' }}>
                                            {isAvail ? 'AVAILABLE' : 'OCCUPIED'}
                                        </Text>
                                    </View>
                                    {isSel && (
                                        <View style={{ position: 'absolute', top: 6, right: 6 }}>
                                            <Check size={12} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </ModalSheet>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

    // Profile photo
    profilePhotoWrap: { alignItems: 'center', marginVertical: 20 },
    profileAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
    profileAvatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderStyle: 'dashed' },
    profileEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
    profileRemoveBtn: { position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
    profilePhotoHint: { marginTop: 8, fontWeight: '500' },

    formCard: { borderRadius: 18, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    sectionTitle: { fontWeight: '700', marginBottom: 16, borderBottomWidth: 1, paddingBottom: 10 },
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontWeight: '600', marginBottom: 7, marginLeft: 2 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1 },
    inputError: { backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1.5 },
    multilineContainer: { height: 100, alignItems: 'flex-start', paddingTop: 12 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1 },
    inputText: { flex: 1, fontWeight: '500' },
    multilineInput: { textAlignVertical: 'top', height: 80 },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500' },
    selectorRow: { flexDirection: 'row', gap: 10 },
    selectorItem: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    selectorText: { color: '#64748B', fontWeight: '500' },
    row: { flexDirection: 'row' },

    // Aadhaar photo
    photoSectionLabel: { fontWeight: '700' },
    photoLabel: { fontWeight: '600', marginBottom: 7 },
    photoCaptureBtn: { flex: 1 },
    photoCaptureText: { fontWeight: '600' },
    photoCaptureHint: { marginTop: 2 },
    photoPreviewWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
    photoPreview: { width: '100%', height: 110, borderRadius: 12 },
    photoRemoveBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.9)', alignItems: 'center', justifyContent: 'center' },
    photoRetakeRow: { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },

    allocationSummary: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1 },
    allocationLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 3 },
    allocationValue: { fontSize: 16, fontWeight: '700' },
    allocationMeta: { fontSize: 11, marginTop: 2 },
    allocationDivider: { width: 1, marginHorizontal: 14 },
    allocationBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, gap: 6 },
    allocationBtnDisabled: { opacity: 0.45 },
    allocationBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },

    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
    sheetTitle: { fontSize: 17, fontWeight: '700' },
    doneBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 },
    doneBtnText: { fontWeight: '700', fontSize: 14 },
    searchInput: { borderRadius: 10, padding: 12, fontSize: 15 },
    searchBarWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },

    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1 },
    optionRowActive: { backgroundColor: COLORS.primaryLight },
    optionLabel: { color: '#334155', fontWeight: '500' },
    optionLabelActive: { fontWeight: '700' },

    floorChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, marginTop: 8 },
    floorChipText: { fontSize: 11, fontWeight: '700' },
    roomCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, position: 'relative' },
    roomCardSel: {},
    roomNum: { fontWeight: '700' },
    roomCap: { fontWeight: '600' },
    roomAvail: { fontWeight: '700', marginTop: 4 },
    roomRent: { marginTop: 3 },
    selectedBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    selectedBadgeText: { fontSize: 11, fontWeight: '700' },

    bedCard: { borderRadius: 12, padding: 14, borderWidth: 1.5, width: '47%', alignItems: 'center', gap: 6 },
    bedCardSel: {},
    bedCardOcc: { opacity: 0.65 },
    bedName: { fontWeight: '700' },

    // Buttons & sticky footer
    stickyFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
    cancelButtonText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    submitButton: { flex: 2, height: 50, borderRadius: 12, overflow: 'hidden' },
    disabledButton: { opacity: 0.7 },
    submitGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    selectorContainer: {
        flexDirection: 'row',
        position: 'relative',
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        height: 48,
        alignItems: 'center',
    },
    selectorPill: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        borderRadius: 10,
    },
    selectorTab: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    selectorTabText: {
        fontWeight: '600',
    },
    // New Section Header styles
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 10,
        marginBottom: 16,
        borderBottomWidth: 1,
    },
    sectionBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    sectionBadgeText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    sectionHeaderText: {
        fontWeight: 'bold',
    },

    // Document & Identity card upload
    idUploadCard: {
        borderRadius: 16,
        padding: 16,
        marginTop: 14,
        borderWidth: 1,
    },
    idUploadHeader: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    idHeaderIconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    idCardTitle: {
        fontWeight: '700',
    },
    requiredBadge: {
        backgroundColor: '#DCFCE7',
        borderRadius: 4,
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    requiredBadgeText: {
        color: '#15803D',
        fontSize: 10,
        fontWeight: 'bold',
    },
    idCardSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    idUploadBoxesRow: {
        flexDirection: 'row',
        gap: 12,
    },
    docUploadBox: {
        flex: 1,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 12,
        height: 165,
    },
    docPreviewContainer: {
        flex: 1,
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
    },
    docPreviewImage: {
        width: '100%',
        height: '100%',
    },
    docRemoveBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    docRetakeRow: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 4,
    },
    docBoxTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skeletonCard: {
        width: 65,
        height: 40,
        borderRadius: 6,
        borderWidth: 1,
        padding: 4,
    },
    skeletonAvatar: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    skeletonLine: {
        height: 3,
        borderRadius: 1.5,
    },
    uploadCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docBoxTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    docBoxSubtitle: {
        fontSize: 9,
        color: '#94A3B8',
        lineHeight: 12,
    },
    docUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 6,
    },
    docUploadBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Profile Photo row redesign
    profilePhotoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        gap: 16,
        marginBottom: 14,
    },
    profileAvatarContainer: {
        position: 'relative',
    },
    profileAvatarWrapper: {
        position: 'relative',
    },
    profileDetailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    profilePhotoTitle: {
        fontWeight: '700',
        marginBottom: 4,
    },
    profilePhotoSubtitle: {
        fontSize: 12,
        marginBottom: 12,
    },
    profileUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    profileUploadBtnText: {
        fontWeight: '700',
        fontSize: 13,
    },
    // Custom Image Source Drawer styles
    sourceOptionBtn: {
        flex: 1,
        height: 100,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    sourceIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sourceOptionText: {
        fontWeight: '700',
        fontSize: 14,
    },
});

export default AddStudentScreen;