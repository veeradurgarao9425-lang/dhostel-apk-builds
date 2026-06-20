import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, ActivityIndicator, LayoutAnimation, Platform, UIManager,
    Alert, Linking, Modal, ScrollView, Animated, SectionList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Staff Categories ────────────────────────────────────────────────────────
const CATEGORIES = [
    { key: 'All',          label: 'Management',  icon: 'briefcase',          color: '#4F46E5', bg: '#EEF2FF' },
    { key: 'Cook',         label: 'Kitchen',     icon: 'restaurant',         color: '#D97706', bg: '#FEF3C7' },
    { key: 'Housekeeping', label: 'Housekeeping',icon: 'brush',              color: '#059669', bg: '#D1FAE5' },
    { key: 'Security',     label: 'Security',    icon: 'shield-checkmark',   color: '#DC2626', bg: '#FEE2E2' },
    { key: 'Others',       label: 'Others',      icon: 'ellipsis-horizontal',color: '#475569', bg: '#F1F5F9' },
];

const ROLES = ['Cook', 'Housekeeping', 'Security', 'Warden', 'Cleaner', 'Others'];

// ─── Staff Card Component ───────────────────────────────────────────────────
const StaffCard = React.memo(({ item, onCall, onWhatsApp, onToggleStatus }: any) => {
    const isActive = item.status === 'ACTIVE';
    const initials = item.full_name ? item.full_name[0].toUpperCase() : 'S';

    return (
        <View style={s.card}>
            <View style={s.cardMain}>
                <View style={s.avatarBox}>
                    <Text style={s.avatarInitials}>{initials}</Text>
                </View>
                <View style={s.infoContainer}>
                    <Text style={s.nameText} numberOfLines={1}>{item.full_name}</Text>
                    <Text style={s.phoneText}>{item.phone}</Text>
                    {item.monthly_salary && (
                        <Text style={s.salaryText}>₹ {parseFloat(item.monthly_salary).toLocaleString('en-IN')}</Text>
                    )}
                    <View style={s.badgeRow}>
                        <View style={s.roleBadge}>
                            <Text style={s.roleBadgeText}>{item.role}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => onToggleStatus(item)}
                            style={[s.statusBadge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}
                        >
                            <Text style={[s.statusBadgeText, { color: isActive ? '#16A34A' : '#EF4444' }]}>
                                {item.status}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={s.actionColumn}>
                    <TouchableOpacity
                        onPress={() => onCall(item.phone)}
                        style={s.iconCircle}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="call" size={16} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onWhatsApp(item.phone, item.full_name)}
                        style={s.iconCircle}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="logo-whatsapp" size={16} color="#22C55E" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StaffScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { user } = useAuth();

    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

    // Form inputs
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Cook');
    const [status, setStatus] = useState('ACTIVE');
    const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
    const [monthlySalary, setMonthlySalary] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [notes, setNotes] = useState('');
    
    // Mock uploads state
    const [selfieCaptured, setSelfieCaptured] = useState(false);
    const [aadhaarFrontUploaded, setAadhaarFrontUploaded] = useState(false);
    const [aadhaarBackUploaded, setAadhaarBackUploaded] = useState(false);
    
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // ── Fetch Staff list ─────────────────────────────────────────────────────
    const fetchStaff = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await api.get('/staff');
            if (res.data.success) {
                setStaffList(res.data.data);
            }
        } catch (e) {
            console.error('Error fetching staff:', e);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch staff list' });
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStaff();
        }, [])
    );

    // ── Group filtered staff by role category ──────────────────────────────────
    const groupedStaff = useMemo(() => {
        const q = search.toLowerCase().trim();
        const filtered = staffList.filter(item => {
            return !q ||
                item.full_name?.toLowerCase().includes(q) ||
                item.phone?.includes(q) ||
                item.role?.toLowerCase().includes(q);
        });

        const groups: Record<string, { title: string; icon: string; color: string; bg: string; data: any[] }> = {
            Management: { title: 'Management', icon: 'briefcase', color: '#4F46E5', bg: '#EEF2FF', data: [] },
            Kitchen: { title: 'Kitchen Staff', icon: 'restaurant', color: '#D97706', bg: '#FEF3C7', data: [] },
            Housekeeping: { title: 'Housekeeping & Cleaning', icon: 'brush', color: '#059669', bg: '#D1FAE5', data: [] },
            Security: { title: 'Security', icon: 'shield-checkmark', color: '#DC2626', bg: '#FEE2E2', data: [] },
            Others: { title: 'Others', icon: 'ellipsis-horizontal', color: '#475569', bg: '#F1F5F9', data: [] }
        };

        filtered.forEach(item => {
            const role = (item.role || '').toLowerCase();
            if (role === 'warden' || role === 'manager') {
                groups.Management.data.push(item);
            } else if (role === 'cook') {
                groups.Kitchen.data.push(item);
            } else if (role === 'housekeeping' || role === 'cleaner' || role === 'laundry') {
                groups.Housekeeping.data.push(item);
            } else if (role === 'security') {
                groups.Security.data.push(item);
            } else {
                groups.Others.data.push(item);
            }
        });

        return Object.values(groups).filter(sec => sec.data.length > 0);
    }, [staffList, search]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleCall = useCallback((num: string) => {
        Linking.openURL(`tel:${num}`);
    }, []);

    const handleWhatsApp = useCallback((num: string, name: string) => {
        const msg = `Hi ${name}, hope you are doing well! 🏠`;
        Linking.openURL(`whatsapp://send?phone=91${num}&text=${encodeURIComponent(msg)}`);
    }, []);

    const handleToggleStatus = useCallback(async (item: any) => {
        const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        Alert.alert(
            `Update Status`,
            `Change ${item.full_name}'s status to ${nextStatus}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            const res = await api.put(`/staff/${item.staff_id}`, { status: nextStatus });
                            if (res.data.success) {
                                fetchStaff(true);
                                Toast.show({ type: 'success', text1: 'Status Updated successfully' });
                            }
                        } catch (e) {
                            Alert.alert('Error', 'Failed to update status');
                        }
                    }
                }
            ]
        );
    }, []);

    const handleAddStaff = async () => {
        if (!fullName || !phone || !role || !joinDate) {
            Alert.alert('Required Fields', 'Please fill Full Name, Phone, Role, and Join Date');
            return;
        }

        try {
            setFormLoading(true);
            const payload = {
                hostel_id: user?.hostel_id,
                full_name: fullName,
                phone,
                email: email || null,
                role,
                status,
                join_date: joinDate,
                monthly_salary: monthlySalary ? parseFloat(monthlySalary) : null,
                aadhaar_number: aadhaarNumber || null,
                notes: notes || null,
                photo: selfieCaptured ? 'https://via.placeholder.com/150' : null,
                aadhaar_front: aadhaarFrontUploaded ? 'uploaded' : null,
                aadhaar_back: aadhaarBackUploaded ? 'uploaded' : null
            };

            const res = await api.post('/staff', payload);
            if (res.data.success) {
                setIsAddModalVisible(false);
                resetForm();
                fetchStaff(true);
                Toast.show({ type: 'success', text1: '✓ Staff Added!', text2: `${fullName} registered successfully` });
            }
        } catch (e: any) {
            Alert.alert('Registration Failed', e.response?.data?.error || 'Could not register staff member');
        } finally {
            setFormLoading(false);
        }
    };

    const resetForm = () => {
        setFullName('');
        setPhone('');
        setEmail('');
        setRole('Cook');
        setStatus('ACTIVE');
        setJoinDate(new Date().toISOString().split('T')[0]);
        setMonthlySalary('');
        setAadhaarNumber('');
        setNotes('');
        setSelfieCaptured(false);
        setAadhaarFrontUploaded(false);
        setAadhaarBackUploaded(false);
    };

    // ── Rendering helper for list items ──────────────────────────────────────
    const renderItem = useCallback(({ item }: any) => (
        <StaffCard
            item={item}
            onCall={handleCall}
            onWhatsApp={handleWhatsApp}
            onToggleStatus={handleToggleStatus}
        />
    ), [handleCall, handleWhatsApp, handleToggleStatus]);

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                <View style={s.headerTop}>
                    {navigation.canGoBack() && (
                        <TouchableOpacity
                            style={s.backBtn}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chevron-back" size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Staff Management</Text>
                        <Text style={s.headerSubtitle}>{staffList.length} Total Members</Text>
                    </View>
                    <View style={s.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                </View>

                {/* Search box */}
                <View style={s.searchContainer}>
                    <Ionicons name="search" size={18} color="#94A3B8" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search staffs..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

            </LinearGradient>

            {/* Content List */}
            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
            ) : (
                <SectionList
                    sections={groupedStaff}
                    keyExtractor={(item) => item.staff_id.toString()}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title, icon, color, bg, data } }) => (
                        <View style={[s.sectionHeaderContainer, { backgroundColor: bg }]}>
                            <View style={[s.sectionIconContainer, { backgroundColor: color }]}>
                                <Ionicons name={icon as any} size={13} color="#FFF" />
                            </View>
                            <Text style={[s.sectionHeaderTitle, { color }]}>{title}</Text>
                            <View style={[s.sectionHeaderBadge, { backgroundColor: color }]}>
                                <Text style={s.sectionHeaderBadgeText}>{data.length}</Text>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <Text style={{ fontSize: 50, marginBottom: 10 }}>👥</Text>
                            <Text style={s.emptyText}>No staff members found</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button (FAB) to Add Staff */}
            <TouchableOpacity
                style={[s.fab, { backgroundColor: theme.primary }]}
                onPress={() => setIsAddModalVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" color="#FFF" size={30} />
            </TouchableOpacity>

            {/* Sliding Form Modal — Add Staff */}
            <Modal visible={isAddModalVisible} transparent animationType="slide" onRequestClose={() => setIsAddModalVisible(false)}>
                <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setIsAddModalVisible(false)} />
                <View style={s.drawerContainer}>
                    <View style={s.drawerContent}>
                        <View style={s.drawerHandle} />
                        <View style={s.drawerHeader}>
                            <Text style={s.drawerTitle}>Add Staff</Text>
                            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
                            
                            {/* Profile Selfie Capture Option */}
                            <Text style={s.formLabel}>Profile Photo *</Text>
                            <TouchableOpacity 
                                style={[s.selfieBox, selfieCaptured && { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]} 
                                onPress={() => { setSelfieCaptured(true); Toast.show({ type: 'success', text1: 'Selfie Captured ✓' }); }}
                            >
                                <Ionicons name={selfieCaptured ? 'checkbox' : 'camera-outline'} size={32} color={selfieCaptured ? '#10B981' : '#EC4899'} />
                                <Text style={[s.selfieLabel, selfieCaptured && { color: '#16A34A' }]}>
                                    {selfieCaptured ? 'Selfie Captured' : 'Capture Selfie'}
                                </Text>
                                <Text style={s.selfieSub}>Take a clear photo for verification</Text>
                            </TouchableOpacity>

                            <Text style={s.formLabel}>Full Name *</Text>
                            <TextInput style={s.formInput} placeholder="Enter full name" value={fullName} onChangeText={setFullName} />

                            <Text style={s.formLabel}>Phone Number *</Text>
                            <TextInput style={s.formInput} placeholder="Enter 10-digit phone number" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />

                            <Text style={s.formLabel}>Email Address *</Text>
                            <TextInput style={s.formInput} placeholder="Enter email" keyboardType="email-address" value={email} onChangeText={setEmail} />

                            <Text style={s.formLabel}>Role *</Text>
                            <View style={s.roleSelector}>
                                {ROLES.map((r) => (
                                    <TouchableOpacity 
                                        key={r} 
                                        style={[s.roleChip, role === r && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                        onPress={() => setRole(r)}
                                    >
                                        <Text style={[s.roleChipText, role === r && { color: '#FFF' }]}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={s.formLabel}>Staff Status *</Text>
                            <View style={s.statusSelector}>
                                {['ACTIVE', 'INACTIVE'].map((st) => (
                                    <TouchableOpacity 
                                        key={st} 
                                        style={[s.statusChip, status === st && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                        onPress={() => setStatus(st)}
                                    >
                                        <Text style={[s.statusChipText, status === st && { color: '#FFF' }]}>{st}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={s.formLabel}>Join Date *</Text>
                            <TouchableOpacity style={s.dateField} onPress={() => setDatePickerVisible(true)}>
                                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                                <Text style={s.dateText}>{joinDate}</Text>
                            </TouchableOpacity>

                            <Text style={s.formLabel}>Monthly Salary *</Text>
                            <TextInput style={s.formInput} placeholder="Enter monthly salary (optional)" keyboardType="numeric" value={monthlySalary} onChangeText={setMonthlySalary} />

                            <Text style={s.formLabel}>Aadhaar Number *</Text>
                            <TextInput style={s.formInput} placeholder="Enter 12-digit Aadhaar Number" keyboardType="numeric" maxLength={12} value={aadhaarNumber} onChangeText={setAadhaarNumber} />

                            {/* Aadhaar Upload Row */}
                            <View style={s.uploadRow}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={s.formLabel}>Aadhaar Front *</Text>
                                    <TouchableOpacity 
                                        style={[s.uploadButton, aadhaarFrontUploaded && { backgroundColor: '#10B981' }]} 
                                        onPress={() => { setAadhaarFrontUploaded(true); Toast.show({ type: 'success', text1: 'Front Uploaded ✓' }); }}
                                    >
                                        <Ionicons name={aadhaarFrontUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color="#FFF" />
                                        <Text style={s.uploadBtnText}>{aadhaarFrontUploaded ? 'Uploaded' : 'Upload'}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={s.formLabel}>Aadhaar Back *</Text>
                                    <TouchableOpacity 
                                        style={[s.uploadButton, aadhaarBackUploaded && { backgroundColor: '#10B981' }]} 
                                        onPress={() => { setAadhaarBackUploaded(true); Toast.show({ type: 'success', text1: 'Back Uploaded ✓' }); }}
                                    >
                                        <Ionicons name={aadhaarBackUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color="#FFF" />
                                        <Text style={s.uploadBtnText}>{aadhaarBackUploaded ? 'Uploaded' : 'Upload'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={s.formLabel}>Notes *</Text>
                            <TextInput style={[s.formInput, { height: 60, textAlignVertical: 'top' }]} placeholder="Add additional notes (optional)" multiline value={notes} onChangeText={setNotes} />

                            {/* Add Employee Confirm Button */}
                            <TouchableOpacity 
                                style={[s.submitBtn, { backgroundColor: theme.primary }, formLoading && { opacity: 0.6 }]}
                                onPress={handleAddStaff}
                                disabled={formLoading}
                            >
                                {formLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="add" size={18} color="#FFF" />
                                        <Text style={s.submitBtnText}>Add Employee</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </View>

                {/* Join Date Picker */}
                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={(d) => { setJoinDate(d.toISOString().split('T')[0]); setDatePickerVisible(false); }}
                    onCancel={() => setDatePickerVisible(false)}
                />
            </Modal>
        </View>
    );
}

// ─── Stylesheet ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    headerActions: { flexDirection: 'row', gap: 12 },

    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },

    searchContainer: { backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 46 },
    searchInput: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#1E293B' },

    // Section Headers
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 8,
        gap: 8
    },
    sectionIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        flex: 1
    },
    sectionHeaderBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionHeaderBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900'
    },

    listContent: { padding: 16, paddingBottom: 180 },
    
    // Cards
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
    },
    cardMain: { flex: 1, padding: 15, flexDirection: 'row', alignItems: 'center' },
    avatarBox: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitials: { fontSize: 20, fontWeight: '900', color: '#4F46E5' },
    infoContainer: { flex: 1, marginLeft: 15 },
    nameText: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
    phoneText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
    salaryText: { fontSize: 12, color: '#475569', fontWeight: '800', marginBottom: 6 },
    badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    roleBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6
    },
    roleBadgeText: { fontSize: 9, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6
    },
    statusBadgeText: { fontSize: 9, fontWeight: '900' },

    actionColumn: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#F1F5F9'
    },

    fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },

    // Modal Drawer
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerContainer: { flex: 1, justifyContent: 'flex-end' },
    drawerContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, height: '88%' },
    drawerHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    drawerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },

    formLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6, marginTop: 12 },
    formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, fontSize: 14, color: '#1E293B', fontWeight: '600' },
    
    // Selfie box
    selfieBox: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FFF5F5', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    selfieLabel: { fontSize: 13, fontWeight: '800', color: '#EC4899', marginTop: 8 },
    selfieSub: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginTop: 2 },

    roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    roleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
    roleChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

    statusSelector: { flexDirection: 'row', gap: 8, marginTop: 4 },
    statusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', alignItems: 'center' },
    statusChipText: { fontSize: 12, fontWeight: '800', color: '#64748B' },

    dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 10 },
    dateText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

    uploadRow: { flexDirection: 'row', marginTop: 4 },
    uploadButton: { height: 42, backgroundColor: '#4F46E5', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    uploadBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

    submitBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 24, shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }
});
