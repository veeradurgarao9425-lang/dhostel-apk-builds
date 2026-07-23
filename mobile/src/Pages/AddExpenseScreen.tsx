import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StatusBar,
    Pressable,
    Modal,
    Image,
    Alert,
    Dimensions,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
    Calendar,
    ChevronDown,
    IndianRupee,
    CreditCard,
    User,
    FileText,
    Building2,
    UploadCloud,
    X,
    Search,
    Plus,
    Check,
} from 'lucide-react-native';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { SPACING } from '../theme/index';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { CardWatermark } from '../components/ui/CardWatermark';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

const CashIcon = () => (
    <Svg width="24" height="18" viewBox="0 0 24 18">
        <G transform="rotate(-8 12 9)">
            <Rect x="1" y="2" width="18" height="11" rx="1.5" fill="#81C784" opacity="0.7" />
        </G>
        <Rect x="3" y="4.5" width="18" height="11" rx="1.5" fill="#4CAF50" stroke="#2E7D32" strokeWidth="0.75" />
        <Circle cx="12" cy="10" r="2.5" fill="#2E7D32" />
        <Circle cx="5" cy="6.5" r="0.75" fill="#FFF" />
        <Circle cx="19" cy="6.5" r="0.75" fill="#FFF" />
        <Circle cx="5" cy="13.5" r="0.75" fill="#FFF" />
        <Circle cx="19" cy="13.5" r="0.75" fill="#FFF" />
    </Svg>
);

const GPayIcon = () => (
    <Svg width="24" height="12" viewBox="0 0 24 12">
        <Rect x="1" y="1" width="4" height="10" rx="2" fill="#4285F4" />
        <Rect x="7" y="1" width="4" height="10" rx="2" fill="#34A853" />
        <Rect x="13" y="1" width="4" height="10" rx="2" fill="#FBBC05" />
        <Rect x="19" y="1" width="4" height="10" rx="2" fill="#EA4335" />
    </Svg>
);

const PhonePeIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 20 20">
        <Rect x="0" y="0" width="20" height="20" rx="5" fill="#5F259F" />
        <Rect x="5" y="4" width="3" height="12" rx="0.75" fill="#FFF" />
        <Circle cx="11" cy="7.5" r="3.5" fill="#FFF" />
        <Circle cx="11" cy="7.5" r="1.75" fill="#5F259F" />
        <Path d="M11,7.5 L14.5,14.5" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

const PaytmIcon = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontWeight: '900', color: '#002E6E', fontSize: 11, letterSpacing: -0.5 }}>pay</Text>
        <Text style={{ fontWeight: '900', color: '#00B9F5', fontSize: 11, letterSpacing: -0.5 }}>tm</Text>
    </View>
);

const UpiIcon = () => (
    <Svg width="24" height="10" viewBox="0 0 24 10">
        <Path d="M1,5 L4,2 L5.5,3.5 L2.5,6.5 Z" fill="#FF9933" />
        <Path d="M9,5 L6,8 L4.5,6.5 L7.5,3.5 Z" fill="#000080" />
        <Text style={{ fontWeight: '900', color: '#000080', fontSize: 8, fontStyle: 'italic' } as any} {...{ x: "10", y: "8" } as any}>UPI</Text>
    </Svg>
);

const BankIcon = () => (
    <Svg width="20" height="18" viewBox="0 0 20 18">
        <Path d="M10,1.5 L1,5.5 L19,5.5 Z" fill="#1E3A8A" />
        <Rect x="3" y="6.5" width="2.5" height="7.5" fill="#1E3A8A" />
        <Rect x="8.75" y="6.5" width="2.5" height="7.5" fill="#1E3A8A" />
        <Rect x="14.5" y="6.5" width="2.5" height="7.5" fill="#1E3A8A" />
        <Rect x="0.5" y="15" width="19" height="2.5" fill="#1E3A8A" />
    </Svg>
);

const ChequeIcon = () => (
    <Svg width="22" height="14" viewBox="0 0 22 14">
        <Rect x="0.5" y="0.5" width="21" height="13" rx="1" fill="#E0F2FE" stroke="#0D9488" strokeWidth="0.75" />
        <Path d="M3,4 L19,4" stroke="#0D9488" strokeWidth="0.75" strokeDasharray="1.5,1.5" />
        <Path d="M3,7.5 L14,7.5" stroke="#0D9488" strokeWidth="0.75" />
        <Rect x="16" y="6" width="4" height="3" stroke="#0D9488" strokeWidth="0.75" fill="none" />
    </Svg>
);

const CardIcon = () => (
    <Svg width="22" height="15" viewBox="0 0 22 15">
        <Rect x="0.5" y="0.5" width="21" height="14" rx="1.5" fill="#D97706" stroke="#B45309" strokeWidth="0.75" />
        <Rect x="0.5" y="3" width="21" height="3" fill="#78350F" />
        <Rect x="3" y="8" width="4" height="3.5" rx="0.5" fill="#FEF08A" />
    </Svg>
);

const OthersIcon = () => (
    <Svg width="22" height="18" viewBox="0 0 22 18">
        <Rect x="0.5" y="0.5" width="21" height="17" rx="1.5" fill="#64748B" stroke="#475569" strokeWidth="0.75" />
        <Circle cx="5" cy="9" r="1.5" fill="#FFF" />
        <Circle cx="11" cy="9" r="1.5" fill="#FFF" />
        <Circle cx="17" cy="9" r="1.5" fill="#FFF" />
    </Svg>
);


const getCategoryDetails = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('electric') || n.includes('current') || n.includes('power')) {
        return { icon: 'flash-outline', bg: '#FEF08A', color: '#CA8A04' }; // Yellow
    }
    if (n.includes('water')) {
        return { icon: 'water-outline', bg: '#E0F2FE', color: '#0284C7' }; // Blue
    }
    if (n.includes('rent') || n.includes('building') || n.includes('property')) {
        return { icon: 'home-outline', bg: '#DCFCE7', color: '#15803D' }; // Green
    }
    if (n.includes('salary') || n.includes('staff') || n.includes('wage') || n.includes('employee')) {
        return { icon: 'people-outline', bg: '#F3E8FF', color: '#7E22CE' }; // Purple
    }
    if (n.includes('grocery') || n.includes('groceries') || n.includes('food') || n.includes('drink') || n.includes('kitchen')) {
        return { icon: 'cart-outline', bg: '#FFEDD5', color: '#EA580C' }; // Orange
    }
    if (n.includes('internet') || n.includes('wifi') || n.includes('network')) {
        return { icon: 'wifi-outline', bg: '#E2FDF5', color: '#00838F' }; // Cyan
    }
    if (n.includes('cleaning') || n.includes('washroom') || n.includes('sweep') || n.includes('hygiene')) {
        return { icon: 'brush-outline', bg: '#FCE7F3', color: '#DB2777' }; // Pink
    }
    if (n.includes('maintenance') || n.includes('repair') || n.includes('appliance') || n.includes('construct')) {
        return { icon: 'build-outline', bg: '#FEE2E2', color: '#DC2626' }; // Red
    }
    if (n.includes('emi') || n.includes('loan') || n.includes('insurance')) {
        return { icon: 'card-outline', bg: '#E0E7FF', color: '#4338CA' }; // Indigo
    }
    if (n.includes('tax') || n.includes('gst') || n.includes('fee')) {
        return { icon: 'calculator-outline', bg: '#CCFBF1', color: '#0F766E' }; // Teal
    }
    if (n.includes('marketing') || n.includes('ads') || n.includes('promotion')) {
        return { icon: 'megaphone-outline', bg: '#FFE4E6', color: '#E11D48' }; // Rose
    }
    if (n.includes('travel') || n.includes('fuel') || n.includes('car') || n.includes('bike')) {
        return { icon: 'car-outline', bg: '#ECFDF5', color: '#047857' }; // Emerald
    }
    if (n.includes('office') || n.includes('supplies') || n.includes('stationery')) {
        return { icon: 'document-text-outline', bg: '#F1F5F9', color: '#475569' }; // Slate
    }
    return { icon: 'grid-outline', bg: '#F1F5F9', color: '#475569' };
};

const formatExpenseDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = date.getDate();
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${d} ${m} ${y}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const toDbDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
};

// ─── Live Digital Receipt Mockup Component ─────────────────────────────────────
const LiveReceiptPreview = ({ amount, categoryName, date, vendorName, selectedMode, theme, isDark, fontSize }: any) => {
    const details = getCategoryDetails(categoryName || 'Other');
    const displayAmount = amount ? parseFloat(amount).toLocaleString('en-IN') : '0.00';
    
    return (
        <View style={[styles.receiptCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
            <CardWatermark opacity={isDark ? 0.08 : 0.05} color={theme.primary} />
            
            <View style={styles.receiptHeader}>
                <View style={[styles.receiptBadge, { backgroundColor: details.bg }]}>
                    <Ionicons name={details.icon as any} size={20} color={details.color} />
                </View>
                <View>
                    <Text style={[styles.receiptTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>
                        {categoryName || 'Select Category'}
                    </Text>
                    <Text style={[styles.receiptSubtitle, { color: theme.textSecondary, fontSize: fontSize - 3 }]}>
                        {formatExpenseDate(date)}
                    </Text>
                </View>
                <View style={styles.receiptModeContainer}>
                    <Text style={[styles.receiptModeText, { color: theme.primary, fontSize: fontSize - 3 }]}>
                        {selectedMode}
                    </Text>
                </View>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptBody}>
                <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>Paid To</Text>
                    <Text style={[styles.receiptVal, { color: theme.textPrimary, fontSize: fontSize - 1 }]} numberOfLines={1}>
                        {vendorName || '—'}
                    </Text>
                </View>
                <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>Total Amount</Text>
                    <Text style={[styles.receiptAmount, { color: theme.textPrimary, fontSize: fontSize + 4 }]}>
                        ₹{displayAmount}
                    </Text>
                </View>
            </View>
            
            <View style={[styles.receiptDotLeft, { backgroundColor: theme.background }]} />
            <View style={[styles.receiptDotRight, { backgroundColor: theme.background }]} />
        </View>
    );
};

export const AddExpenseScreen = ({ route, navigation }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const { width: screenWidth } = Dimensions.get('window');
    const modeChipWidth = (screenWidth - 32 - 16) / 4.3; 
    const { expense } = route.params || {};
    const { user } = useAuth();
    const { triggerRefresh } = useRefresh();
    const scrollRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const [expenseDate, setExpenseDate] = useState<Date>(new Date());
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [dbPaymentModes, setDbPaymentModes] = useState<any[]>([]);
    const [selectedExpenseMode, setSelectedExpenseMode] = useState('Cash'); 

    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category_id: '',
        payment_mode_id: '1',
        description: '',
        vendor_name: '',
        bill_number: '',
    });

    const insets = useSafeAreaInsets();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const [staffList, setStaffList] = useState<any[]>([]);
    const [showStaffPicker, setShowStaffPicker] = useState(false);
    const [isOtherStaff, setIsOtherStaff] = useState(false);

    useEffect(() => {
        fetchCategories();
        fetchStaff();
        loadPaymentModes();
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const loadPaymentModes = async () => {
        try {
            const response = await api.get('/monthly-fees/payment-modes');
            if (response.data.success) {
                setDbPaymentModes(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching payment modes:', error);
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await api.get('/staff');
            if (response.data.success) {
                setStaffList(response.data.data.filter((s: any) => s.is_active));
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };
    useEffect(() => {
        const unsubscribe = navigation?.addListener('focus', () => {
            fetchStaff();
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        if (expense) {
            setFormData({
                title: expense.description || '',
                amount: expense.amount.toString(),
                category_id: expense.category_id.toString(),
                payment_mode_id: expense.payment_mode_id?.toString() || '1',
                description: expense.description || '',
                vendor_name: expense.vendor_name || '',
                bill_number: expense.bill_number || '',
            });
            if (expense.expense_date) {
                setExpenseDate(new Date(expense.expense_date));
            }
        }
    }, [expense]);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/expenses/categories');
            if (response.data.success) {
                setCategories(response.data.data);
                if (response.data.data.length > 0 && !expense) {
                    setFormData(prev => ({ ...prev, category_id: response.data.data[0].category_id.toString() }));
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // Sync custom modes GPay/PhonePe/Paytm -> UPI / Online
    useEffect(() => {
        if (dbPaymentModes.length > 0) {
            if (expense && formData.payment_mode_id) {
                const matchedDbMode = dbPaymentModes.find(m => m.payment_mode_id.toString() === formData.payment_mode_id);
                if (matchedDbMode) {
                    const name = matchedDbMode.payment_mode_name || '';
                    if (name.includes('Cash')) setSelectedExpenseMode('Cash');
                    else if (name.includes('Bank') || name.includes('Transfer')) setSelectedExpenseMode('Bank');
                    else if (name.includes('Cheque')) setSelectedExpenseMode('Cheque');
                    else if (name.includes('Bank') || name.includes('Transfer')) setSelectedExpenseMode('Bank');
                    else setSelectedExpenseMode('Others');
                }
            }
        }
    }, [expense, dbPaymentModes]);

    useEffect(() => {
        if (dbPaymentModes.length > 0) {
            let targetModeName = 'Cash';
            if (['GPay', 'PhonePe', 'Paytm', 'UPI'].includes(selectedExpenseMode)) {
                targetModeName = 'UPI';
            } else if (['Bank', 'Card'].includes(selectedExpenseMode)) {
                targetModeName = 'Bank Transfer';
            } else if (selectedExpenseMode === 'Cheque') {
                targetModeName = 'Cheque';
            } else {
                targetModeName = 'Online';
            }

            const matched = dbPaymentModes.find(m => 
                m.payment_mode_name?.toLowerCase().includes(targetModeName.toLowerCase()) ||
                targetModeName.toLowerCase().includes(m.payment_mode_name?.toLowerCase())
            );

            if (matched) {
                setFormData(p => ({ ...p, payment_mode_id: matched.payment_mode_id.toString() }));
            }
        }
    }, [selectedExpenseMode, dbPaymentModes]);

    const handleConfirmDate = (date: Date) => {
        setExpenseDate(date);
        setDatePickerVisibility(false);
    };

    const handleReset = () => {
        setFormData({
            title: '',
            amount: '',
            category_id: categories.length > 0 ? categories[0].category_id.toString() : '',
            payment_mode_id: '1',
            description: '',
            vendor_name: '',
            bill_number: '',
        });
        setExpenseDate(new Date());
        setSelectedExpenseMode('Cash');
        setAttachment(null);
    };

    const handleSaveNewCategory = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        const exists = categories.some(cat => cat.category_name?.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            const existing = categories.find(cat => cat.category_name?.toLowerCase() === trimmed.toLowerCase());
            setFormData(p => ({ ...p, category_id: existing.category_id.toString() }));
            setIsAddingCategory(false);
            setNewCategoryName('');
            setCategoryModalVisible(false);
            return;
        }

        try {
            const response = await api.post('/expenses/categories', { category_name: trimmed });
            if (response.data.success) {
                const saved = response.data.data;
                setCategories(prev => [...prev, saved]);
                setFormData(p => ({ ...p, category_id: saved.category_id.toString() }));
                Toast.show({ type: 'success', text1: 'Category Added', text2: `"${trimmed}" is ready to use.` });
            }
        } catch (error) {
            const mock = { category_id: Date.now(), category_name: trimmed };
            setCategories(prev => [...prev, mock]);
            setFormData(p => ({ ...p, category_id: mock.category_id.toString() }));
        } finally {
            setNewCategoryName('');
            setIsAddingCategory(false);
            setCategoryModalVisible(false);
        }
    };

    const handlePickAttachment = async () => {
        Alert.alert(
            "Upload Invoice / Receipt",
            "Choose a source for your receipt attachment:",
            [
                {
                    text: "Take Photo (Camera)",
                    onPress: async () => {
                        const permission = await ImagePicker.requestCameraPermissionsAsync();
                        if (permission.status !== 'granted') {
                            Alert.alert("Permission Denied", "Camera permission is required to capture receipt.");
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            quality: 0.7,
                            allowsEditing: true,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setAttachment(result.assets[0]);
                        }
                    }
                },
                {
                    text: "Choose from Gallery",
                    onPress: async () => {
                        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (permission.status !== 'granted') {
                            Alert.alert("Permission Denied", "Media library access is required to pick receipt.");
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            quality: 0.7,
                            allowsEditing: true,
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setAttachment(result.assets[0]);
                        }
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const validateForm = () => {
        const nextErrors: Record<string, string> = {};
        if (!formData.category_id) nextErrors.category_id = 'Please select a category';
        if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) nextErrors.amount = 'Amount must be greater than 0';
        if (!formData.vendor_name || !formData.vendor_name.trim()) nextErrors.vendor_name = 'Name is required';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please add all required fields.' });
            return;
        }

        setLoading(true);
        try {
            let prefix = `[${selectedExpenseMode}] `;
            let desc = formData.description.trim();
            if (desc) {
                desc = desc.replace(/^\[[^\]]+\]\s*/, ''); 
                desc = prefix + desc;
            } else {
                desc = prefix + 'Expense record';
            }

            if (attachment) {
                desc += ` (Attachment: ${attachment.uri.split('/').pop()})`;
            }

            const payload = {
                hostel_id: user?.hostel_id,
                category_id: parseInt(formData.category_id),
                expense_date: toDbDateStr(expenseDate),
                amount: parseFloat(formData.amount),
                payment_mode_id: parseInt(formData.payment_mode_id),
                vendor_name: formData.vendor_name.trim(),
                description: desc,
                bill_number: formData.bill_number.trim(),
            };

            let response;
            if (expense) {
                response = await api.put(`/expenses/${expense.expense_id}`, payload);
            } else {
                response = await api.post('/expenses', payload);
            }

            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: expense ? 'Expense updated successfully!' : 'Expense recorded successfully!',
                });
                triggerRefresh();
                navigation?.goBack();
            }
        } catch (error: any) {
            console.error('Error saving expense:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to save expense',
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedCategory = categories.find(c => c.category_id.toString() === formData.category_id);
    const selectedCategoryName = selectedCategory?.category_name || '';

    const filteredCategories = categories.filter(c => 
        c.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredStaff = staffList.filter(s => 
        s.name?.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        s.role?.toLowerCase().includes(staffSearchQuery.toLowerCase())
    );

    const renderLabel = (text: string) => {
        if (text.includes('*')) {
            const parts = text.split('*');
            return (
                <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                    {parts[0]}<Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>{parts[1]}
                </Text>
            );
        }
        return <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{text}</Text>;
    };

    const paymentModesList = [
        { name: 'Cash', icon: 'cash-outline', color: '#10B981', bg: '#DCFCE7', customIcon: <CashIcon /> },
        { 
            name: 'GPay', 
            icon: 'logo-google', 
            color: '#4285F4', 
            bg: '#E8F0FE',
            customIcon: <GPayIcon />
        },
        { 
            name: 'PhonePe', 
            icon: 'wallet-outline', 
            color: '#5F259F', 
            bg: '#F3E8FF',
            customIcon: <PhonePeIcon />
        },
        { 
            name: 'Paytm', 
            icon: 'phone-portrait-outline', 
            color: '#00B9F5', 
            bg: '#E0F7FA',
            customIcon: <PaytmIcon />
        },
        { 
            name: 'UPI', 
            icon: 'swap-horizontal-outline', 
            color: '#0ea5e9', 
            bg: '#e0f2fe',
            customIcon: <UpiIcon />
        },
        { 
            name: 'Bank', 
            icon: 'business-outline', 
            color: '#1E3A8A', 
            bg: '#DBEAFE', 
            customIcon: <BankIcon />
        },
        { 
            name: 'Card', 
            icon: 'card-outline', 
            color: '#D97706', 
            bg: '#FEF3C7', 
            customIcon: <CardIcon />
        },
        { 
            name: 'Cheque', 
            icon: 'document-attach-outline', 
            color: '#0D9488', 
            bg: '#CCFBF1', 
            customIcon: <ChequeIcon />
        },
        { name: 'Others', icon: 'ellipsis-horizontal-outline', color: '#64748B', bg: '#F1F5F9', customIcon: <OthersIcon /> },
    ];

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: theme.background }]} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
            <StatusBar barStyle="dark-content" />
            <AppHeader 
                alignLeft={true} 
                title={expense ? "Edit Expense" : "Add Expense"} 
                subtitle="Record hostel bills and maintenance costs" 
            />
            <FullScreenLoader visible={loading} />
            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.scrollContent, { paddingBottom: (isKeyboardVisible ? 280 : 120) + insets.bottom }]}
            >
                {/* ── Receipt Live Preview ── */}
                <LiveReceiptPreview
                    amount={formData.amount}
                    categoryName={selectedCategoryName}
                    date={expenseDate}
                    vendorName={formData.vendor_name}
                    selectedMode={selectedExpenseMode}
                    theme={theme}
                    isDark={isDark}
                    fontSize={fontSize}
                />

                {/* ── Card 1: Amount Picker ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                    {renderLabel("Amount (₹) *")}
                    <View style={[styles.amountInputContainer, { borderColor: errors.amount ? '#EF4444' : (isDark ? '#334155' : theme.primary + '30') }]}>
                        <Text style={[styles.currencySymbol, { color: theme.textPrimary }]}>₹</Text>
                        <TextInput
                            style={[styles.amountInput, { color: theme.textPrimary, fontSize: fontSize + 12 }]}
                            placeholder="0"
                            placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                            keyboardType="numeric"
                            value={formData.amount}
                            onChangeText={(text: string) => {
                                setFormData({ ...formData, amount: text });
                                if (errors.amount) setErrors(prev => { const next = { ...prev }; delete next.amount; return next; });
                            }}
                        />
                    </View>
                    {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
                </View>

                {/* ── Card 2: Date & Category Selectors ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>📅 Date & Category</Text>

                    {/* Date */}
                    {renderLabel("Date & Time *")}
                    <TouchableOpacity
                        style={[styles.selectorBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        onPress={() => setDatePickerVisibility(true)}
                        activeOpacity={0.7}
                    >
                        <Calendar size={18} color={theme.primary} />
                        <Text style={[styles.selectorBtnText, { color: theme.textPrimary, fontSize }]}>{formatExpenseDate(expenseDate)}</Text>
                        <Ionicons name="chevron-down-outline" size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    {/* Category */}
                    <View style={{ marginTop: 14 }}>
                        {renderLabel("Category *")}
                    </View>
                    <TouchableOpacity
                        style={[styles.selectorBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: errors.category_id ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0') }]}
                        onPress={() => setCategoryModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        {selectedCategoryName ? (
                            <View style={[styles.iconBadge, { backgroundColor: getCategoryDetails(selectedCategoryName).bg, marginRight: 8 }]}>
                                <Ionicons name={getCategoryDetails(selectedCategoryName).icon as any} size={14} color={getCategoryDetails(selectedCategoryName).color} />
                            </View>
                        ) : (
                            <Ionicons name="grid-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                        )}
                        <Text style={[styles.selectorBtnText, { color: selectedCategoryName ? theme.textPrimary : '#94A3B8', fontSize }]}>
                            {selectedCategoryName || 'Select Expense Category'}
                        </Text>
                        <Ionicons name="chevron-down-outline" size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                    {errors.category_id ? <Text style={styles.errorText}>{errors.category_id}</Text> : null}

                    {/* Inline Form: Add Custom Category */}
                    {isAddingCategory && (
                        <View style={[styles.inlineAddRow, { borderColor: theme.primary, marginTop: 8 }]}>
                            <TextInput
                                style={[styles.inlineAddInput, { color: theme.textPrimary }]}
                                placeholder="Enter custom category name"
                                placeholderTextColor="#94A3B8"
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                                autoFocus
                            />
                            <TouchableOpacity style={[styles.inlineAddBtn, { backgroundColor: theme.primary }]} onPress={handleSaveNewCategory}>
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => { setIsAddingCategory(false); setNewCategoryName(''); }}>
                                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ── Card 3: Paid To / Paid By / Property Info ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>👤 Payer & Receiver</Text>

                    {/* Paid By - Read-only */}
                    {renderLabel("Paid By")}
                    <View style={[styles.readOnlyContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <User size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.readOnlyText, { color: theme.textPrimary, fontSize }]}>Owner / Admin</Text>
                    </View>

                    {/* Paid To - Vendor/Staff */}
                    {(() => {
                        const isSalary = selectedCategoryName.toLowerCase().includes('salary') || selectedCategoryName.toLowerCase().includes('staff');
                        const hasStaff = staffList.length > 0;
                        
                        return (
                            <View style={{ marginTop: 14 }}>
                                {isSalary && isOtherStaff && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                                        <TouchableOpacity onPress={() => setIsOtherStaff(false)}>
                                            <Text style={{ color: theme.primary, fontSize: fontSize - 2, fontWeight: '700' }}>Choose from list</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {isSalary && !isOtherStaff ? (
                                    <View>
                                        {renderLabel("Paid To (Staff) *")}
                                        <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: errors.vendor_name ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0') }]} onPress={() => setShowStaffPicker(true)} activeOpacity={0.7}>
                                            <User size={16} color={theme.primary} style={{ marginRight: 8 }} />
                                            <Text style={[styles.selectorBtnText, { color: formData.vendor_name ? theme.textPrimary : '#94A3B8', fontSize }]}>
                                                {formData.vendor_name || (hasStaff ? "Choose Staff Member" : "No staff found. Tap to Add")}
                                            </Text>
                                            <ChevronDown size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                                        </TouchableOpacity>
                                        {errors.vendor_name && <Text style={styles.errorText}>{errors.vendor_name}</Text>}
                                    </View>
                                ) : (
                                    <View style={{ marginBottom: -4 }}>
                                        {renderLabel("Paid To (Vendor / Name) *")}
                                        <View style={[styles.amountInputContainer, { height: 48, paddingHorizontal: 12, borderColor: errors.vendor_name ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0') }]}>
                                            <User size={16} color={theme.primary} style={{ marginRight: 8 }} />
                                            <TextInput
                                                style={{ flex: 1, color: theme.textPrimary, fontSize, fontWeight: '500' }}
                                                placeholder={isSalary ? "Enter staff name" : "Enter vendor or supplier name"}
                                                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                                value={formData.vendor_name}
                                                onChangeText={(text) => {
                                                    setFormData({ ...formData, vendor_name: text });
                                                    if (errors.vendor_name) setErrors(prev => { const next = { ...prev }; delete next.vendor_name; return next; });
                                                }}
                                            />
                                        </View>
                                        {errors.vendor_name && <Text style={styles.errorText}>{errors.vendor_name}</Text>}
                                    </View>
                                )}
                            </View>
                        );
                    })()}

                    {/* Property - Active Hostel */}
                    <View style={{ marginTop: 14 }}>
                        {renderLabel("Property (Hostel)")}
                    </View>
                    <View style={[styles.readOnlyContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <Building2 size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.readOnlyText, { color: theme.textPrimary, fontSize, fontWeight: '700' }]}>{user?.hostel_name || 'My Hostel'}</Text>
                    </View>
                </View>

                {/* ── Card 4: Expense Mode Selection ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>💳 Expense Payment Mode</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.modeScrollContent}
                    >
                        {paymentModesList.map((mode) => {
                            const isSelected = selectedExpenseMode === mode.name;
                            return (
                                <TouchableOpacity
                                    key={mode.name}
                                    style={[
                                        styles.modeScrollChip,
                                        { width: modeChipWidth }
                                    ]}
                                    onPress={() => setSelectedExpenseMode(mode.name)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.modeIconCircle, 
                                        { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                                        isSelected && { borderColor: mode.color, borderWidth: 2 }
                                    ]}>
                                        {mode.customIcon}
                                    </View>
                                    <Text style={[
                                        styles.modeScrollText, 
                                        { fontSize: fontSize - 3, color: isDark ? '#94A3B8' : '#475569' }, 
                                        isSelected && { color: mode.color, fontWeight: '800' }
                                    ]} numberOfLines={1}>
                                        {mode.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ── Card 5: Reference & Attachments ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>📎 Attachments & Notes</Text>

                    <View style={{ marginBottom: 14 }}>
                        {renderLabel("Bill / Reference Number (optional)")}
                        <View style={[styles.amountInputContainer, { height: 48, paddingHorizontal: 12, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <FileText size={16} color={theme.primary} style={{ marginRight: 8 }} />
                            <TextInput
                                style={{ flex: 1, color: theme.textPrimary, fontSize, fontWeight: '500' }}
                                placeholder="e.g. INV-2026-042"
                                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                value={formData.bill_number}
                                onChangeText={(text) => setFormData({ ...formData, bill_number: text })}
                            />
                        </View>
                    </View>

                    {/* Upload Attachments Area */}
                    {renderLabel("Upload attachments")}
                    {attachment ? (
                        <View style={[styles.imagePreviewContainer, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setAttachment(null)}>
                                <Ionicons name="close" size={16} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.imageSizeText} numberOfLines={1}>
                                {attachment.uri.split('/').pop()}
                            </Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={[styles.uploadCard, { borderColor: theme.primary + '50' }]} onPress={handlePickAttachment} activeOpacity={0.8}>
                            <UploadCloud size={28} color={theme.primary} style={{ marginBottom: 6 }} />
                            <Text style={[styles.uploadTitle, { color: theme.textPrimary }]}>Upload Bill Receipt</Text>
                            <Text style={styles.uploadSubtitle}>Capture camera photo or select from gallery</Text>
                        </TouchableOpacity>
                    )}

                    {/* Description Text area */}
                    <View style={{ marginTop: 14 }}>
                        {renderLabel("Description / Notes")}
                        <TextInput
                            style={[
                                styles.textArea,
                                {
                                    color: theme.textPrimary,
                                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                    borderColor: isDark ? '#334155' : '#E2E8F0',
                                    fontSize,
                                } as any
                            ]}
                            placeholder="Enter description here..."
                            placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                            value={formData.description}
                            onChangeText={(text: string) => setFormData({ ...formData, description: text })}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollRef.current?.scrollToEnd({ animated: true });
                                }, 200);
                            }}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View style={[styles.stickyFooter, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: isKeyboardVisible ? SPACING.md : (insets.bottom + SPACING.md) }]}>
                <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#CBD5E1' }]}
                    onPress={handleReset}
                    disabled={loading}
                >
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={styles.submitButtonText}>{expense ? "Update Expense" : "Save"}</Text>
                </TouchableOpacity>
            </View>

            {/* Date-time picker */}
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="datetime"
                date={expenseDate}
                maximumDate={new Date()}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
            />

            {/* Searchable Slide-up Staff Modal (Aligned with NoticesScreen drawer structure) */}
            <Modal
                visible={showStaffPicker}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setShowStaffPicker(false)}
            >
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowStaffPicker(false)} />
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.handle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Staff Member</Text>
                            <TouchableOpacity onPress={() => setShowStaffPicker(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sheetBody}>
                            {/* Search Box for Staff */}
                            <View style={[styles.searchBarContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                                <Search size={18} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.textPrimary, fontSize }]}
                                    placeholder="Type to search staff"
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    value={staffSearchQuery}
                                    onChangeText={setStaffSearchQuery}
                                />
                            </View>

                            {/* Options to Add Staff */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                                <TouchableOpacity 
                                    style={[styles.addCategoryTrigger, { borderColor: theme.primary, borderWidth: 1, borderRadius: 10, flex: 1 }]} 
                                    onPress={() => {
                                        setShowStaffPicker(false);
                                        navigation?.navigate('AddStaff');
                                    }}
                                >
                                    <View style={[styles.triggerPlusBadge, { backgroundColor: theme.primary }]}>
                                        <Plus size={12} color="#FFF" />
                                    </View>
                                    <Text style={[styles.triggerText, { color: theme.primary, fontSize: fontSize - 1 }]} numberOfLines={1}>Add Staff</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.addCategoryTrigger, { borderColor: theme.textSecondary, borderWidth: 1, borderRadius: 10, flex: 1.2 }]} 
                                    onPress={() => {
                                        setIsOtherStaff(true);
                                        setFormData({ ...formData, vendor_name: '' });
                                        setShowStaffPicker(false);
                                    }}
                                >
                                    <View style={[styles.triggerPlusBadge, { backgroundColor: theme.textSecondary }]}>
                                        <User size={12} color="#FFF" />
                                    </View>
                                    <Text style={[styles.triggerText, { color: theme.textSecondary, fontSize: fontSize - 1 }]} numberOfLines={1}>Manual Enter</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Scrollable Staff List */}
                            <ScrollView style={styles.categoryScrollList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {filteredStaff.map((staffMember) => {
                                    const isSelected = formData.vendor_name === staffMember.name;
                                    return (
                                        <TouchableOpacity
                                            key={staffMember.staff_id || staffMember.name}
                                            style={[styles.categoryItemRow, isSelected && { backgroundColor: theme.primary + '10' }]}
                                            onPress={() => {
                                                setFormData({ ...formData, vendor_name: staffMember.name });
                                                setIsOtherStaff(false);
                                                setShowStaffPicker(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.itemIconBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                                                <User size={16} color={theme.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.itemText, { color: theme.textPrimary, fontSize }, isSelected && { fontWeight: '800', color: theme.primary }]}>
                                                    {staffMember.name}
                                                </Text>
                                                <Text style={{ fontSize: fontSize - 3, color: theme.textSecondary, marginTop: 1 }}>
                                                    {staffMember.role || 'Staff'}
                                                </Text>
                                            </View>
                                            {isSelected && <Check size={16} color={theme.primary} style={{ marginLeft: 'auto' }} />}
                                        </TouchableOpacity>
                                    );
                                })}
                                {filteredStaff.length === 0 && (
                                    <Text style={[styles.emptyText, { fontSize: fontSize - 1 }]}>No staff member matching "{staffSearchQuery}"</Text>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Searchable Slide-up Category Modal (Aligned with NoticesScreen drawer structure) */}
            <Modal
                visible={categoryModalVisible}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => { setCategoryModalVisible(false); setIsAddingCategory(false); }}
            >
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setCategoryModalVisible(false); setIsAddingCategory(false); }} />
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.handle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Expense Category</Text>
                            <TouchableOpacity onPress={() => { setCategoryModalVisible(false); setIsAddingCategory(false); }} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sheetBody}>
                            {/* Search Box */}
                            <View style={[styles.searchBarContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                                <Search size={18} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.textPrimary, fontSize }]}
                                    placeholder="Type to search"
                                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>

                            {/* Options to Add Category */}
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 6 }}>
                                {!isAddingCategory && (
                                    <TouchableOpacity style={styles.addCategoryTrigger} onPress={() => { setIsAddingCategory(true); }}>
                                        <View style={[styles.triggerPlusBadge, { backgroundColor: theme.primary }]}>
                                            <Plus size={12} color="#FFF" />
                                        </View>
                                        <Text style={[styles.triggerText, { color: theme.primary, fontSize: fontSize - 1 }]}>Add Category</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Inline Form: Add Single Category */}
                            {isAddingCategory && (
                                <View style={[styles.inlineAddRow, { borderColor: theme.primary }]}>
                                    <TextInput
                                        style={[styles.inlineAddInput, { color: theme.textPrimary }]}
                                        placeholder="Category Name"
                                        placeholderTextColor="#94A3B8"
                                        value={newCategoryName}
                                        onChangeText={setNewCategoryName}
                                        autoFocus
                                    />
                                    <TouchableOpacity style={[styles.inlineAddBtn, { backgroundColor: theme.primary }]} onPress={handleSaveNewCategory}>
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => setIsAddingCategory(false)}>
                                        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Scrollable Categories List */}
                            <ScrollView style={styles.categoryScrollList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {filteredCategories.map((cat) => {
                                    const details = getCategoryDetails(cat.category_name);
                                    const isSelected = formData.category_id === cat.category_id.toString();
                                    return (
                                        <TouchableOpacity
                                            key={cat.category_id}
                                            style={[styles.categoryItemRow, isSelected && { backgroundColor: theme.primary + '10' }]}
                                            onPress={() => {
                                                setFormData({ ...formData, category_id: cat.category_id.toString() });
                                                setCategoryModalVisible(false);
                                                setIsAddingCategory(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.itemIconBadge, { backgroundColor: details.bg }]}>
                                                <Ionicons name={details.icon as any} size={18} color={details.color} />
                                            </View>
                                            <Text style={[styles.itemText, { color: theme.textPrimary, fontSize }, isSelected && { fontWeight: '800', color: theme.primary }]}>
                                                {cat.category_name}
                                            </Text>
                                            {isSelected && <Check size={16} color={theme.primary} style={{ marginLeft: 'auto' }} />}
                                        </TouchableOpacity>
                                    );
                                })}
                                {filteredCategories.length === 0 && (
                                    <Text style={[styles.emptyText, { fontSize: fontSize - 1 }]}>No category matching "{searchQuery}"</Text>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, flexGrow: 1 },
    formCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1.5,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: {
        fontWeight: '800',
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1.5,
    },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14, marginTop: 4 },
    catButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    catButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    inputLabel: { fontWeight: '700', marginBottom: 8 },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
    },
    currencySymbol: {
        fontSize: 28,
        fontWeight: '800',
        marginLeft: 14,
        marginRight: 6,
    },
    amountInput: {
        flex: 1,
        height: 60,
        fontWeight: '800',
        paddingRight: 14,
    },
    selectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        height: 48,
        borderWidth: 1.5,
        paddingHorizontal: 12,
    },
    selectorBtnText: {
        fontWeight: '600',
        marginLeft: 8,
    },
    iconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    readOnlyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        height: 48,
        borderWidth: 1.5,
        paddingHorizontal: 12,
    },
    readOnlyText: {
        fontWeight: '600',
    },
    modeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
    },
    modeScrollContent: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        gap: 8,
    },
    modeScrollChip: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    modeIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1.5,
        marginBottom: 6,
    },
    modeScrollText: {
        fontWeight: '700',
    },
    uploadCard: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 14,
        height: 110,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.03)',
    },
    uploadTitle: {
        fontWeight: '700',
        fontSize: 14,
    },
    uploadSubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 2,
    },
    imagePreviewContainer: {
        height: 140,
        borderRadius: 14,
        borderWidth: 1.5,
        overflow: 'hidden',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageSizeText: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#FFF',
        fontSize: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        maxWidth: '85%',
    },
    textArea: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        minHeight: 90,
        fontWeight: '500',
        lineHeight: 18,
    },
    stickyFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: { fontWeight: '600', fontSize: 15 },
    submitButton: {
        flex: 2.2,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    disabledButton: { opacity: 0.7 },
    errorText: { color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 4, marginLeft: 4 },
    
    // Receipt UI Card
    receiptCard: {
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    receiptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    receiptBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    receiptTitle: {
        fontWeight: '800',
    },
    receiptSubtitle: {
        fontWeight: '500',
        marginTop: 2,
    },
    receiptModeContainer: {
        marginLeft: 'auto',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
    },
    receiptModeText: {
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    receiptDivider: {
        height: 1,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginVertical: 14,
    },
    receiptBody: {
        gap: 8,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    receiptLabel: {
        fontWeight: '600',
    },
    receiptVal: {
        fontWeight: '700',
        maxWidth: '65%',
    },
    receiptAmount: {
        fontWeight: '900',
    },
    receiptDotLeft: {
        position: 'absolute',
        left: -10,
        top: '44%',
        width: 20,
        height: 20,
        borderRadius: 10,
        zIndex: 5,
    },
    receiptDotRight: {
        position: 'absolute',
        right: -10,
        top: '44%',
        width: 20,
        height: 20,
        borderRadius: 10,
        zIndex: 5,
    },

    // Drawer styles matching NoticesScreen
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    modalContent: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        width: '100%', maxHeight: '85%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5, overflow: 'hidden'
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16, marginTop: 4 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    closeBtn: { padding: 4 },
    sheetBody: { paddingBottom: 30 },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontWeight: '600',
        marginLeft: 8,
    },
    addCategoryTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    triggerPlusBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    triggerText: {
        fontWeight: '700',
    },
    inlineAddRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        gap: 8,
        marginBottom: 10,
    },
    inlineAddInput: {
        flex: 1,
        height: '100%',
        fontWeight: '700',
    },
    inlineAddBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    inlineCancelBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    categoryScrollList: {
        maxHeight: Dimensions.get('window').height * 0.40,
    },
    categoryItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginVertical: 1,
    },
    itemIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemText: {
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94A3B8',
        marginVertical: 30,
        fontWeight: '500',
    },
});

export default AddExpenseScreen;
