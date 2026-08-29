import React, { useState, useEffect } from 'react';
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
    ActivityIndicator,
    Switch,
    Modal,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    TrendingUp,
    Building2,
    BedDouble,
    Briefcase,
    Receipt,
    Wallet,
    ShieldCheck,
    BarChart3,
    Utensils,
    AlertCircle,
    Megaphone,
    Info,
    Eye,
    EyeOff,
    Sparkles,
    UserCheck,
    Lock,
    ChevronDown,
    Search,
    X,
    KeyRound,
    Phone,
    Mail,
} from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { getResolvedImageUrl } from '../utils/imageHelper';

// ── 1. The 4 Bottom Navigation Bar Tabs ──
const BOTTOM_TABS_CONFIG = [
    {
        key: 'dashboard',
        title: 'Dashboard (Home Tab)',
        subtitle: 'Key hostel metrics, vacancies & quick stats',
        icon: LayoutDashboard,
        color: '#0284C7',
        bg: '#E0F2FE',
        borderActive: '#BAE6FD',
    },
    {
        key: 'students',
        title: 'Students (Students Tab)',
        subtitle: 'Resident list, profiles, room status & check-ins',
        icon: Users,
        color: '#7C3AED',
        bg: '#F5F3FF',
        borderActive: '#DDD6FE',
    },
    {
        key: 'dues',
        title: 'Money (Pending Dues Tab)',
        subtitle: 'Pending rent collection & overdue tracking',
        icon: CreditCard,
        color: '#16A34A',
        bg: '#DCFCE7',
        borderActive: '#BBF7D0',
    },
    {
        key: 'finance',
        title: 'Finance (Overview Tab)',
        subtitle: 'Property revenue, P&L & financial accounts',
        icon: TrendingUp,
        color: '#2563EB',
        bg: '#EFF6FF',
        borderActive: '#BFDBFE',
    },
];

// ── 2. More Screen & Hostel Operations Modules ──
const OPERATIONS_CONFIG = [
    {
        key: 'hostels',
        title: 'Hostel Management',
        subtitle: 'Hostel profile, amenities & property settings',
        icon: Building2,
        color: '#4F46E5',
        bg: '#EEF2FF',
        borderActive: '#C7D2FE',
    },
    {
        key: 'rooms',
        title: 'Rooms & Vacant Beds',
        subtitle: 'Room configuration, vacant bed counters & floor view',
        icon: BedDouble,
        color: '#8B5CF6',
        bg: '#F5F3FF',
        borderActive: '#DDD6FE',
    },
    {
        key: 'staff',
        title: 'Staff Management',
        subtitle: 'Staff team list, wage payments & records',
        icon: Briefcase,
        color: '#0EA5E9',
        bg: '#E0F2FE',
        borderActive: '#BAE6FD',
    },
    {
        key: 'expenses',
        title: 'Hostel Expenses',
        subtitle: 'Record & track daily hostel maintenance expenses',
        icon: Receipt,
        color: '#EF4444',
        bg: '#FEE2E2',
        borderActive: '#FECACA',
    },
    {
        key: 'income',
        title: 'Hostel Income',
        subtitle: 'Record additional receipts & miscellaneous income',
        icon: Wallet,
        color: '#10B981',
        bg: '#D1FAE5',
        borderActive: '#A7F3D0',
    },
    {
        key: 'verify_rent',
        title: 'Verify Rent & Payments',
        subtitle: 'Review & verify online UPI payment proofs',
        icon: ShieldCheck,
        color: '#059669',
        bg: '#ECFDF5',
        borderActive: '#A7F3D0',
    },
    {
        key: 'reports',
        title: 'Analytics & Reports',
        subtitle: 'Download Excel/PDF spreadsheets & financial trends',
        icon: BarChart3,
        color: '#D97706',
        bg: '#FEF3C7',
        borderActive: '#FDE68A',
    },
    {
        key: 'mess',
        title: 'Mess & Food Menu',
        subtitle: 'Daily meal schedule, weekly menu & dining options',
        icon: Utensils,
        color: '#EA580C',
        bg: '#FFF7ED',
        borderActive: '#FED7AA',
    },
    {
        key: 'complaints',
        title: 'Complaints & Maintenance',
        subtitle: 'Track resident tickets & repair maintenance issues',
        icon: AlertCircle,
        color: '#E11D48',
        bg: '#FFE4E6',
        borderActive: '#FECDD3',
    },
    {
        key: 'notices',
        title: 'Notices & Announcements',
        subtitle: 'Post announcements & broadcast notices to residents',
        icon: Megaphone,
        color: '#9333EA',
        bg: '#F3E8FF',
        borderActive: '#E9D5FF',
    },
];

export default function AddTeamMemberScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const { showSuccess, showError, showApiError } = useToast();

    // Staff list from API
    const [staffList, setStaffList] = useState<any[]>([]);
    const [fetchingList, setFetchingList] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

    // Modal state for selecting employee
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');

    // Credentials & permissions state
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Module access state
    const [modules, setModules] = useState<Record<string, boolean>>({
        // Bottom tabs
        dashboard: true,
        students: true,
        dues: true,
        finance: false,
        // Operations
        hostels: true,
        rooms: true,
        staff: false,
        expenses: false,
        income: false,
        verify_rent: false,
        reports: false,
        mess: true,
        complaints: true,
        notices: true,
    });

    // Fetch existing staff on mount
    useEffect(() => {
        loadStaffList();
    }, []);

    const loadStaffList = async () => {
        try {
            setFetchingList(true);
            const res = await api.get('/staff');
            if (res.data?.success) {
                const list = res.data.data || [];
                setStaffList(list);

                // If staffId was passed via route params, auto select that staff member
                const initialStaffId = route.params?.staffId;
                if (initialStaffId) {
                    const match = list.find((s: any) => String(s.staff_id) === String(initialStaffId));
                    if (match) {
                        selectEmployee(match);
                    }
                }
            }
        } catch (e: any) {
            showApiError(e, 'Failed to fetch staff list');
        } finally {
            setFetchingList(false);
        }
    };

    const selectEmployee = (emp: any) => {
        setSelectedStaff(emp);
        setPickerVisible(false);
        setPassword('');
        setShowPassword(false);

        // Populate existing permissions if already configured
        if (emp.permissions) {
            try {
                const parsed = typeof emp.permissions === 'string' ? JSON.parse(emp.permissions) : emp.permissions;
                setModules({
                    dashboard: parsed.dashboard ? parsed.dashboard !== 'none' : true,
                    students: parsed.students ? parsed.students !== 'none' : (parsed.tenants ? parsed.tenants !== 'none' : true),
                    dues: parsed.dues ? parsed.dues !== 'none' : (parsed.finance ? parsed.finance !== 'none' : true),
                    finance: parsed.finance ? parsed.finance !== 'none' : false,
                    hostels: parsed.hostels ? parsed.hostels !== 'none' : true,
                    rooms: parsed.rooms ? parsed.rooms !== 'none' : true,
                    staff: parsed.staff ? parsed.staff !== 'none' : false,
                    expenses: parsed.expenses ? parsed.expenses !== 'none' : false,
                    income: parsed.income ? parsed.income !== 'none' : false,
                    verify_rent: parsed.verify_rent ? parsed.verify_rent !== 'none' : false,
                    reports: parsed.reports ? parsed.reports !== 'none' : false,
                    mess: parsed.mess ? parsed.mess !== 'none' : true,
                    complaints: parsed.complaints ? parsed.complaints !== 'none' : true,
                    notices: parsed.notices ? parsed.notices !== 'none' : true,
                });
            } catch (_) { }
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'Staff@';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(result);
        setShowPassword(true);
    };

    const handleSave = async () => {
        if (!selectedStaff) {
            showError('Please select an employee first');
            return;
        }

        const hasExistingLogin = Boolean(selectedStaff.can_login || selectedStaff.user_id);
        if (!hasExistingLogin && !password.trim()) {
            showError('Please enter a login password for this employee');
            return;
        }

        if (password.trim() && password.trim().length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);

            // Construct granular permissions
            const permissionsPayload = {
                dashboard: modules.dashboard ? 'view' : 'none',
                students: modules.students ? 'manage' : 'none',
                tenants: modules.students ? 'manage' : 'none',
                dues: modules.dues ? 'manage' : 'none',
                finance: modules.finance ? 'manage' : 'none',
                hostels: modules.hostels ? 'manage' : 'none',
                rooms: modules.rooms ? 'manage' : 'none',
                staff: modules.staff ? 'manage' : 'none',
                expenses: modules.expenses ? 'manage' : 'none',
                income: modules.income ? 'manage' : 'none',
                verify_rent: modules.verify_rent ? 'manage' : 'none',
                reports: modules.reports ? 'view' : 'none',
                mess: modules.mess ? 'manage' : 'none',
                complaints: modules.complaints ? 'manage' : 'none',
                notices: modules.notices ? 'manage' : 'none',
            };

            const cleanPhoneDigits = String(selectedStaff.phone).replace(/\D/g, '');
            const fallbackEmail = `${cleanPhoneDigits}@hostix.com`;
            const finalEmail = (email.trim() || selectedStaff.email || fallbackEmail).toLowerCase();

            const payload: any = {
                full_name: selectedStaff.full_name,
                phone: selectedStaff.phone,
                email: finalEmail,
                role: selectedStaff.role || 'Staff',
                can_login: 1,
                permissions: permissionsPayload,
            };

            if (password.trim()) {
                payload.password = password.trim();
            }

            const res = await api.put(`/staff/${selectedStaff.staff_id}`, payload);

            if (res.data?.success) {
                showSuccess(`App access & credentials granted to ${selectedStaff.full_name}!`);
                navigation.goBack();
            } else {
                showError(res.data?.error || 'Failed to update credentials');
            }
        } catch (e: any) {
            showApiError(e, 'Failed to update credentials');
        } finally {
            setLoading(false);
        }
    };

    const filteredPickerStaff = staffList.filter(s => {
        const q = pickerSearch.toLowerCase().trim();
        return !q ||
            s.full_name?.toLowerCase().includes(q) ||
            s.phone?.includes(q) ||
            s.role?.toLowerCase().includes(q);
    });

    const renderModuleCard = (item: any) => {
        const IconComponent = item.icon;
        const isEnabled = Boolean(modules[item.key]);

        return (
            <View
                key={item.key}
                style={[
                    styles.moduleSmallCard,
                    isEnabled && {
                        borderColor: item.borderActive,
                        backgroundColor: '#FFFFFF',
                    },
                ]}
            >
                <View style={[styles.moduleIconBox, { backgroundColor: item.bg }]}>
                    <IconComponent size={20} color={item.color} />
                </View>

                <View style={styles.moduleTextContainer}>
                    <Text style={styles.moduleCardTitle}>{item.title}</Text>
                    <Text
                        style={[
                            styles.moduleCardSubtitle,
                            isEnabled && { color: item.color, fontWeight: '700' },
                        ]}
                    >
                        {isEnabled ? 'Full access' : 'No access'}
                    </Text>
                </View>

                <Switch
                    value={isEnabled}
                    onValueChange={val => setModules(m => ({ ...m, [item.key]: val }))}
                    trackColor={{ false: '#E2E8F0', true: item.color }}
                    thumbColor="#FFFFFF"
                />
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="light-content" />

            {/* ── Branded AppHeader ── */}
            <AppHeader
                title="Employee App Access"
                subtitle="Select staff & assign login credentials"
                showBack={true}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom + 95, 115) },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Top Notification Banner ── */}
                <View style={styles.infoBanner}>
                    <View style={styles.infoIconBox}>
                        <Info size={16} color="#0284C7" />
                    </View>
                    <Text style={styles.infoBannerText}>
                        Select an existing staff member to grant them Hostix mobile login and choose which tabs and modules they can access.
                    </Text>
                </View>

                {/* ── Section 1: SELECT EXISTING EMPLOYEE ── */}
                <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeader}>SELECT EMPLOYEE</Text>
                    <Text style={styles.sectionSub}>Choose which staff member to grant app access</Text>

                    {fetchingList ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator color="#4F46E5" size="small" />
                            <Text style={styles.loadingText}>Loading staff list...</Text>
                        </View>
                    ) : selectedStaff ? (
                        /* Selected Employee Card */
                        <View style={styles.selectedEmployeeCard}>
                            <View style={styles.employeeCardRow}>
                                <View style={styles.employeeAvatarBox}>
                                    {selectedStaff.photo ? (
                                        <Image
                                            source={{ uri: getResolvedImageUrl(selectedStaff.photo)! }}
                                            style={styles.employeeAvatarImg}
                                        />
                                    ) : (
                                        <Text style={styles.employeeInitials}>
                                            {selectedStaff.full_name ? selectedStaff.full_name[0].toUpperCase() : 'S'}
                                        </Text>
                                    )}
                                </View>

                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.employeeNameText} numberOfLines={1}>
                                        {selectedStaff.full_name}
                                    </Text>
                                    <Text style={styles.employeePhoneText}>
                                        📞 {selectedStaff.phone}
                                    </Text>
                                    <View style={styles.employeeBadgeRow}>
                                        <View style={styles.rolePill}>
                                            <Text style={styles.rolePillText}>{selectedStaff.role || 'Staff'}</Text>
                                        </View>
                                        {selectedStaff.can_login ? (
                                            <View style={styles.activeAccessPill}>
                                                <KeyRound size={10} color="#059669" />
                                                <Text style={styles.activeAccessPillText}>Has Login</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.changeBtn}
                                    onPress={() => setPickerVisible(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.changeBtnText}>Change</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* Tap to select button */
                        <TouchableOpacity
                            style={styles.selectTriggerBtn}
                            onPress={() => setPickerVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={styles.selectTriggerIconBox}>
                                    <Users size={18} color="#4F46E5" />
                                </View>
                                <Text style={styles.selectTriggerPlaceholder}>
                                    Tap to select staff member...
                                </Text>
                            </View>
                            <ChevronDown size={20} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Section 2: LOGIN CREDENTIALS ── */}
                {selectedStaff && (
                    <View style={styles.sectionWrap}>
                        <Text style={styles.sectionHeader}>LOGIN CREDENTIALS</Text>
                        <Text style={styles.sectionSub}>Credentials the staff member will use to log into Hostix</Text>

                        {/* Mobile Number (Directly use staff mobile number) */}
                        <View style={styles.inputFieldContainer}>
                            <Text style={styles.fieldLabel}>Staff Login Mobile Number</Text>
                            <View style={[styles.borderedInputWrap, { backgroundColor: '#F8FAFC' }]}>
                                <Phone size={18} color="#4F46E5" style={styles.inputLeadingIcon} />
                                <Text style={styles.readOnlyText}>
                                    {selectedStaff.phone}
                                </Text>
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedBadgeText}>Login ID</Text>
                                </View>
                            </View>
                            <Text style={styles.passwordHintText}>
                                The employee will use this 10-digit mobile number to log into Hostix.
                            </Text>
                        </View>

                        {/* Password */}
                        <View style={styles.inputFieldContainer}>
                            <View style={styles.passwordLabelRow}>
                                <Text style={styles.fieldLabel}>
                                    {selectedStaff.can_login ? 'Change Password (Optional)' : 'Set Password'} <Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    onPress={generatePassword}
                                    style={styles.autoGenBadge}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.autoGenBadgeText}>Auto-Generate</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.borderedInputWrap}>
                                <Lock size={18} color="#64748B" style={styles.inputLeadingIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={selectedStaff.can_login ? 'Leave blank to keep existing' : 'Min. 6 characters'}
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeBtn}
                                    activeOpacity={0.7}
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} color="#64748B" />
                                    ) : (
                                        <Eye size={18} color="#64748B" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.passwordHintText}>
                                The employee will use this password to sign into the Hostix mobile app.
                            </Text>
                        </View>
                    </View>
                )}

                {/* ── Section 3: BOTTOM NAVIGATION TABS (4 Main Tabs) ── */}
                {selectedStaff && (
                    <>
                        <View style={styles.sectionWrap}>
                            <Text style={styles.sectionHeader}>BOTTOM NAVIGATION TABS</Text>
                            <Text style={styles.sectionSub}>Control tabs visible in the staff member's bottom bar</Text>

                            <View style={styles.cardsGrid}>
                                {BOTTOM_TABS_CONFIG.map(renderModuleCard)}
                            </View>
                        </View>

                        {/* ── Section 4: HOSTEL OPERATIONS & MORE FEATURES ── */}
                        <View style={styles.sectionWrap}>
                            <Text style={styles.sectionHeader}>HOSTEL OPERATIONS & FEATURES</Text>
                            <Text style={styles.sectionSub}>Modules accessible from the More screen & drawer</Text>

                            <View style={styles.cardsGrid}>
                                {OPERATIONS_CONFIG.map(renderModuleCard)}
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* ── Fixed Bottom Button ── */}
            {selectedStaff && (
                <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.88}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <UserCheck size={18} color="#FFFFFF" />
                                <Text style={styles.submitBtnText}>
                                    Submit Credentials & Save Access
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Staff Selection Modal ── */}
            <Modal
                visible={pickerVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerSheetContainer}>
                        {/* Header */}
                        <View style={styles.pickerHeader}>
                            <View>
                                <Text style={styles.pickerTitle}>Select Employee</Text>
                                <Text style={styles.pickerSubtitle}>Choose staff member to grant access</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.pickerCloseBtn}
                                onPress={() => setPickerVisible(false)}
                                activeOpacity={0.7}
                            >
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Search in modal */}
                        <View style={styles.pickerSearchWrap}>
                            <Search size={16} color="#94A3B8" />
                            <TextInput
                                style={styles.pickerSearchInput}
                                placeholder="Search by name, role or phone..."
                                placeholderTextColor="#94A3B8"
                                value={pickerSearch}
                                onChangeText={setPickerSearch}
                            />
                        </View>

                        {/* List of staff */}
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
                            {filteredPickerStaff.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>No staff found</Text>
                                </View>
                            ) : (
                                filteredPickerStaff.map(emp => {
                                    const isCurrent = selectedStaff?.staff_id === emp.staff_id;
                                    const hasAccess = Boolean(emp.can_login || emp.user_id);

                                    return (
                                        <TouchableOpacity
                                            key={emp.staff_id}
                                            style={[
                                                styles.pickerItemCard,
                                                isCurrent && styles.pickerItemCardSelected,
                                            ]}
                                            onPress={() => selectEmployee(emp)}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.employeeAvatarBox}>
                                                {emp.photo ? (
                                                    <Image
                                                        source={{ uri: getResolvedImageUrl(emp.photo)! }}
                                                        style={styles.employeeAvatarImg}
                                                    />
                                                ) : (
                                                    <Text style={styles.employeeInitials}>
                                                        {emp.full_name ? emp.full_name[0].toUpperCase() : 'S'}
                                                    </Text>
                                                )}
                                            </View>

                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.employeeNameText} numberOfLines={1}>
                                                    {emp.full_name}
                                                </Text>
                                                <Text style={styles.employeePhoneText}>
                                                    📞 {emp.phone}
                                                </Text>
                                                <View style={styles.employeeBadgeRow}>
                                                    <View style={styles.rolePill}>
                                                        <Text style={styles.rolePillText}>{emp.role || 'Staff'}</Text>
                                                    </View>
                                                    {hasAccess ? (
                                                        <View style={styles.activeAccessPill}>
                                                            <KeyRound size={9} color="#059669" />
                                                            <Text style={styles.activeAccessPillText}>Has Access</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>

                                            {isCurrent ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                                                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Selected</Text>
                                                </View>
                                            ) : (
                                                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    // Notification Banner
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
        gap: 10,
    },
    infoIconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBannerText: {
        flex: 1,
        fontSize: 12.5,
        color: '#1D4ED8',
        fontWeight: '500',
        lineHeight: 18,
    },

    // Section Titles
    sectionWrap: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.6,
        marginBottom: 2,
        marginLeft: 2,
        textTransform: 'uppercase',
    },
    sectionSub: {
        fontSize: 12.5,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 12,
        marginLeft: 2,
    },

    loadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    loadingText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },

    // Select Trigger Button
    selectTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 14,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    selectTriggerIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectTriggerPlaceholder: {
        fontSize: 14.5,
        color: '#64748B',
        fontWeight: '600',
    },

    // Selected Employee Card
    selectedEmployeeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#C7D2FE',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    employeeCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    employeeAvatarBox: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#E0E7FF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    employeeAvatarImg: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    employeeInitials: {
        fontSize: 18,
        fontWeight: '900',
        color: '#4F46E5',
    },
    employeeNameText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 2,
    },
    employeePhoneText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    employeeBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    rolePill: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    rolePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
    },
    activeAccessPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    activeAccessPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#059669',
    },
    changeBtn: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    changeBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#4F46E5',
    },

    // Bordered Input Fields
    inputFieldContainer: {
        marginBottom: 14,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
        marginLeft: 2,
    },
    borderedInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        height: 50,
        paddingHorizontal: 12,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    inputLeadingIcon: {
        marginRight: 10,
    },
    readOnlyText: {
        flex: 1,
        fontSize: 14.5,
        color: '#0F172A',
        fontWeight: '700',
    },
    verifiedBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    verifiedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563EB',
    },
    textInput: {
        flex: 1,
        fontSize: 14.5,
        color: '#0F172A',
        fontWeight: '500',
        height: '100%',
    },
    passwordLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    autoGenBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    autoGenBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4F46E5',
    },
    eyeBtn: {
        padding: 6,
    },
    passwordHintText: {
        fontSize: 11.5,
        color: '#94A3B8',
        marginTop: 5,
        marginLeft: 4,
    },

    // Small Cards Grid
    cardsGrid: {
        gap: 10,
    },
    moduleSmallCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1.5,
    },
    moduleIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    moduleTextContainer: {
        flex: 1,
        paddingRight: 8,
    },
    moduleCardTitle: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    moduleCardSubtitle: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
        lineHeight: 16,
    },

    // Bottom Fixed Action Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 6,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#4F46E5',
        borderRadius: 14,
        paddingVertical: 14,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // Modal Picker Sheet
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    pickerSheetContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '75%',
        borderTopWidth: 1.5,
        borderColor: '#CBD5E1',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 20,
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    pickerSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    pickerCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 12,
        paddingHorizontal: 12,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    pickerSearchInput: {
        flex: 1,
        fontSize: 13,
        color: '#0F172A',
        fontWeight: '500',
    },
    pickerItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    pickerItemCardSelected: {
        borderColor: '#4F46E5',
        backgroundColor: '#EEF2FF',
    },
});
