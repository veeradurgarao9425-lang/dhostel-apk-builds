import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    TextInput,
    Keyboard,
    Image,
    ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { getResolvedImageUrl } from '../utils/imageHelper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import {
    Check,
    Megaphone,
    Type,
    AlignLeft,
    Image as ImageIcon,
    Tag,
    Plus,
    RotateCcw,
    CheckCircle2,
    X,
    Search,
    ChevronRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { appendImageFileToFormData } from '../utils/imageHelper';

const DEFAULT_CATEGORIES = [
    { category_name: 'General', emoji: '📢', color: '#6366F1' },
    { category_name: 'Important', emoji: '🚨', color: '#DC2626' },
    { category_name: 'Maintenance', emoji: '🔧', color: '#D97706' },
    { category_name: 'Food', emoji: '🍽️', color: '#16A34A' },
];

const NOTICE_TEMPLATES = [
    {
        title: "Late Night Entry Restriction",
        content: "Dear occupants, please note that the main gate will be locked at 10:30 PM. Any late entry must be pre-approved by the hostel warden. Please cooperate to maintain safety and security.",
        notice_type: "Important",
        emoji: "🚨",
        color: "#DC2626",
    },
    {
        title: "Power & Water Outage Notice",
        content: "Dear residents, please note that scheduled maintenance will take place this Sunday from 10:00 AM to 2:00 PM. Water supply and power will be temporarily unavailable during this period. We regret the inconvenience caused.",
        notice_type: "Maintenance",
        emoji: "🔧",
        color: "#D97706",
    },
    {
        title: "Rent Payment Reminder",
        content: "Dear students, this is a friendly reminder that the monthly rent is due by the 5th of this month. Please clear your dues on time to avoid any late fees. Thank you.",
        notice_type: "Important",
        emoji: "🚨",
        color: "#DC2626",
    },
    {
        title: "Special Dinner on Festival Occasion",
        content: "Dear residents, a special festive dinner has been arranged tonight at the dining hall starting from 8:00 PM. The mess will serve special cuisines. We look forward to seeing everyone there! Happy Festival!",
        notice_type: "Food",
        emoji: "🍽️",
        color: "#16A34A",
    },
    {
        title: "WIFI Upgrade Notice",
        content: "Dear students, the hostel Wi-Fi network will be offline for a system upgrade tonight between 12:00 AM and 2:00 AM. Thank you for your patience and understanding.",
        notice_type: "Maintenance",
        emoji: "🔧",
        color: "#D97706",
    },
    {
        title: "Routine Room Inspection Notice",
        content: "Dear residents, the management will conduct a routine safety and cleanliness room inspection on Saturday between 11:00 AM and 4:00 PM. Please ensure your rooms are accessible. Thank you.",
        notice_type: "General",
        emoji: "📢",
        color: "#6366F1",
    },
    {
        title: "Mess Menu Changes",
        content: "Dear students, please note that the mess menu has been updated for the next week based on your feedback. The new menu has been posted on the dining hall notice board. Please have a look.",
        notice_type: "Food",
        emoji: "🍽️",
        color: "#16A34A",
    },
];

export const AddNoticeScreen = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { triggerRefresh } = useRefresh();
    const isEdit = route?.params?.isEdit || false;
    const noticeToEdit = route?.params?.notice || null;

    const [activeTab, setActiveTab] = useState<'custom' | 'templates'>('custom');
    const [templateSearch, setTemplateSearch] = useState('');
    const [selectedTemplateCat, setSelectedTemplateCat] = useState('All');

    const [loading, setLoading] = useState(false);
    const [savingCategory, setSavingCategory] = useState(false);
    const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [customCategoryInput, setCustomCategoryInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);

    const initialFormState = {
        title: noticeToEdit?.title || '',
        content: noticeToEdit?.content || '',
        notice_type: noticeToEdit?.notice_type || 'General',
        image: null as any,
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/notices/categories');
            if (response.data.success && response.data.data.length > 0) {
                const custom = response.data.data;
                const merged = [...DEFAULT_CATEGORIES];
                
                custom.forEach((c: any) => {
                    if (!merged.find(m => m.category_name.toLowerCase() === c.category_name.toLowerCase())) {
                        merged.push({
                            category_name: c.category_name,
                            emoji: c.emoji || '📌',
                            color: c.color || '#8B5CF6'
                        });
                    }
                });
                
                if (noticeToEdit && !merged.find(m => m.category_name === noticeToEdit.notice_type)) {
                    merged.push({
                        category_name: noticeToEdit.notice_type,
                        emoji: '📌',
                        color: '#64748B'
                    });
                }
                
                setCategories(merged);
            }
        } catch (error) {
            console.error('Error fetching notice categories:', error);
            const merged = [...DEFAULT_CATEGORIES];
            if (noticeToEdit && !merged.find(m => m.category_name === noticeToEdit.notice_type)) {
                merged.push({
                    category_name: noticeToEdit.notice_type,
                    emoji: '📌',
                    color: '#64748B'
                });
            }
            setCategories(merged);
        }
    };

    const addCustomCategory = async () => {
        const trimmed = customCategoryInput.trim();
        if (!trimmed) return;

        const alreadyExists = categories.find(c => c.category_name.toLowerCase() === trimmed.toLowerCase());
        if (alreadyExists) {
            setFormData(prev => ({ ...prev, notice_type: alreadyExists.category_name }));
            setCustomCategoryInput('');
            setShowCustomInput(false);
            return;
        }

        setSavingCategory(true);
        try {
            await api.post('/notices/categories', { category_name: trimmed });
            const newCat = { category_name: trimmed, emoji: '📌', color: '#8B5CF6' };
            setCategories(prev => [...prev, newCat]);
            setFormData(prev => ({ ...prev, notice_type: trimmed }));
            Toast.show({ type: 'success', text1: 'Category Saved' });
        } catch (error) {
            const newCat = { category_name: trimmed, emoji: '📌', color: '#8B5CF6' };
            setCategories(prev => [...prev, newCat]);
            setFormData(prev => ({ ...prev, notice_type: trimmed }));
        } finally {
            setSavingCategory(false);
            setCustomCategoryInput('');
            setShowCustomInput(false);
        }
    };

    const deleteCustomCategory = async (catName: string) => {
        try {
            await api.delete(`/notices/categories/${encodeURIComponent(catName)}`);
            setCategories(prev => prev.filter(c => c.category_name !== catName));
            if (formData.notice_type === catName) {
                setFormData(p => ({ ...p, notice_type: 'General' }));
            }
            Toast.show({ type: 'success', text1: 'Category Deleted' });
        } catch (error) {
            setCategories(prev => prev.filter(c => c.category_name !== catName));
            if (formData.notice_type === catName) {
                setFormData(p => ({ ...p, notice_type: 'General' }));
            }
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setFormData(prev => ({ ...prev, image: result.assets[0] }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.content.trim()) newErrors.content = 'Message content is required';
        if (!formData.notice_type) newErrors.notice_type = 'Category is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleReset = () => {
        setFormData(initialFormState);
        setErrors({});
        setShowCustomInput(false);
        setCustomCategoryInput('');
    };

    const handleSave = async () => {
        if (!validate()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please complete the highlighted fields before saving.',
            });
            return;
        }
        setLoading(true);
        try {
            let response;
            const targetHostelId = user?.hostel_id ? String(user.hostel_id) : undefined;

            if (formData.image?.uri) {
                const formDataPayload = new FormData();
                formDataPayload.append('title', formData.title.trim());
                formDataPayload.append('content', formData.content.trim());
                formDataPayload.append('notice_type', formData.notice_type || 'General');
                if (targetHostelId) {
                    formDataPayload.append('hostel_id', targetHostelId);
                }
                
                appendImageFileToFormData(formDataPayload, 'image', formData.image.uri, 'notice.jpg');

                response = isEdit
                    ? await api.put(`/notices/${noticeToEdit.notice_id}`, formDataPayload)
                    : await api.post('/notices', formDataPayload);
            } else {
                const jsonPayload: Record<string, any> = {
                    title: formData.title.trim(),
                    content: formData.content.trim(),
                    notice_type: formData.notice_type || 'General',
                };
                if (targetHostelId) {
                    jsonPayload.hostel_id = targetHostelId;
                }

                response = isEdit
                    ? await api.put(`/notices/${noticeToEdit.notice_id}`, jsonPayload)
                    : await api.post('/notices', jsonPayload);
            }

            if (response.data.success || response.status === 200 || response.status === 201) {
                Toast.show({ type: 'success', text1: 'Success', text2: `Notice ${isEdit ? 'updated' : 'posted'} successfully!` });
                triggerRefresh({ lastNoticeUpdate: Date.now() });
                navigation.goBack();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: response.data?.error || 'Failed to save notice' });
            }
        } catch (error: any) {
            console.error('Error saving notice:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save notice';
            Toast.show({ type: 'error', text1: 'Error', text2: errMsg });
        } finally {
            setLoading(false);
        }
    };

    const FooterButtons = ({ pb = 12 }: { pb?: number }) => (
        <View style={[styles.footer, {
            backgroundColor: theme.cardBg,
            borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
            paddingBottom: pb,
        }]}>
            <TouchableOpacity
                style={[styles.resetBtn, { borderColor: isDark ? '#334155' : '#CBD5E1', backgroundColor: isDark ? theme.background : '#FFF' }]}
                onPress={handleReset}
                activeOpacity={0.7}
                disabled={loading}
            >
                <RotateCcw size={15} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={[styles.resetBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: '#7C3AED', opacity: loading ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
            >
                <CheckCircle2 size={18} color="#FFF" />
                <Text style={styles.createBtnText}>{isEdit ? 'Update Notice' : 'Post Notice'}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader
                title={isEdit ? 'Edit Notice' : 'New Notice'}
                subtitle="Broadcast announcement to all tenants"
                alignLeft={true}
            />
            <FullScreenLoader visible={loading} />

            <ScrollView
                ref={scrollViewRef}
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: isKeyboardVisible ? 220 : 120,
                    paddingHorizontal: 16,
                    paddingTop: 16,
                }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Tab Switcher */}
                <View style={[styles.tabBar, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === 'custom' && [styles.activeTabItem, { backgroundColor: theme.primary }]
                        ]}
                        onPress={() => setActiveTab('custom')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'custom' ? '#FFF' : theme.textSecondary }
                        ]}>
                            Custom Notice
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === 'templates' && [styles.activeTabItem, { backgroundColor: theme.primary }]
                        ]}
                        onPress={() => setActiveTab('templates')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'templates' ? '#FFF' : theme.textSecondary }
                        ]}>
                            Notice Templates
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'templates' ? (
                    <View style={{ gap: 16 }}>
                        {/* Search box & filter pills */}
                        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                            <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.textPrimary }]}
                                    placeholder="Search templates..."
                                    placeholderTextColor="#94A3B8"
                                    value={templateSearch}
                                    onChangeText={setTemplateSearch}
                                />
                            </View>

                            {/* Category Filter Horizontal Scroll */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
                                {['All', 'Important', 'Maintenance', 'Food', 'General'].map((cat) => {
                                    const isSelected = selectedTemplateCat === cat;
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.filterPill,
                                                isSelected 
                                                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                                    : { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }
                                            ]}
                                            onPress={() => setSelectedTemplateCat(cat)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.filterPillText, { color: isSelected ? '#FFF' : theme.textSecondary }]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* List of Templates */}
                        {NOTICE_TEMPLATES.filter(tmpl => {
                            const matchesSearch = tmpl.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
                                                  tmpl.content.toLowerCase().includes(templateSearch.toLowerCase());
                            const matchesCat = selectedTemplateCat === 'All' || tmpl.notice_type === selectedTemplateCat;
                            return matchesSearch && matchesCat;
                        }).map((tmpl, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.tmplCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                onPress={() => {
                                    setFormData({
                                        title: tmpl.title,
                                        content: tmpl.content,
                                        notice_type: tmpl.notice_type,
                                        image: null,
                                    });
                                    setActiveTab('custom');
                                    Toast.show({ type: 'success', text1: 'Template Applied', text2: 'Feel free to edit before posting.' });
                                }}
                                activeOpacity={0.8}
                            >
                                {/* Left Category Color Ribbon */}
                                <View style={[styles.tmplRibbon, { backgroundColor: tmpl.color }]} />

                                <View style={styles.tmplContent}>
                                    <View style={styles.tmplHeaderRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                            <Text style={styles.tmplEmoji}>{tmpl.emoji}</Text>
                                            <Text style={[styles.tmplTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                                {tmpl.title}
                                            </Text>
                                        </View>
                                        <View style={[styles.tmplBadge, { backgroundColor: tmpl.color + '15' }]}>
                                            <Text style={[styles.tmplBadgeText, { color: tmpl.color }]}>
                                                {tmpl.notice_type}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.tmplDesc, { color: theme.textSecondary }]} numberOfLines={3}>
                                        {tmpl.content}
                                    </Text>
                                    
                                    <View style={styles.tmplActionRow}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>Use Template</Text>
                                        <ChevronRight size={14} color={theme.primary} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <>
                        {/* ── Category Card ──────────────────────────────────── */}
                        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.cardIconWrap, { backgroundColor: '#FEF3C7' }]}>
                                    <Tag size={18} color="#D97706" />
                                </View>
                                <View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Category</Text>
                                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Select notice type</Text>
                                </View>
                            </View>

                            <View style={styles.categoriesGrid}>
                                {categories.map((cat, index) => {
                                    const isActive = formData.notice_type === cat.category_name;
                                    const isCustom = !DEFAULT_CATEGORIES.find(d => d.category_name === cat.category_name);
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.categoryItem,
                                                {
                                                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                                    borderColor: isActive ? cat.color : (isDark ? '#334155' : '#E8EAF6'),
                                                    borderWidth: isActive ? 1.5 : 1,
                                                }
                                            ]}
                                            onPress={() => {
                                                setFormData(p => ({ ...p, notice_type: cat.category_name }));
                                                if (errors.notice_type) setErrors(e => { const n = { ...e }; delete n.notice_type; return n; });
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.catEmoji}>{cat.emoji}</Text>
                                            <Text
                                                style={[styles.catName, { color: isActive ? cat.color : theme.textSecondary }]}
                                                numberOfLines={1}
                                            >
                                                {cat.category_name}
                                            </Text>
                                            {isCustom ? (
                                                <TouchableOpacity 
                                                    style={styles.deleteCustomCatBtn} 
                                                    onPress={(e) => { e.stopPropagation(); deleteCustomCategory(cat.category_name); }}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <X size={14} color={isActive ? cat.color : "#94A3B8"} />
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={[
                                                    styles.radio,
                                                    {
                                                        borderColor: isActive ? cat.color : (isDark ? '#475569' : '#CBD5E1'),
                                                        backgroundColor: isActive ? cat.color : 'transparent',
                                                    }
                                                ]}>
                                                    {isActive && <View style={styles.radioInner} />}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}

                                {!showCustomInput && (
                                    <TouchableOpacity
                                        style={[styles.addCustomBtn, { borderColor: '#7C3AED' }]}
                                        onPress={() => setShowCustomInput(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Plus size={14} color="#7C3AED" />
                                        <Text style={styles.addCustomText}>Custom</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {showCustomInput && (
                                <View style={styles.customCategoryWrapper}>
                                    <TextInput
                                        style={[styles.customCategoryInput, { color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                                        placeholder="Enter custom category..."
                                        placeholderTextColor="#94A3B8"
                                        value={customCategoryInput}
                                        onChangeText={setCustomCategoryInput}
                                        autoFocus
                                        onSubmitEditing={addCustomCategory}
                                        editable={!savingCategory}
                                    />
                                    <TouchableOpacity onPress={addCustomCategory} style={[styles.customCategorySaveBtn, { backgroundColor: '#7C3AED' }]} disabled={savingCategory}>
                                        {savingCategory ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.customCategorySaveText}>Add</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setShowCustomInput(false); setCustomCategoryInput(''); }} style={styles.customCategoryCancelBtn}>
                                        <X size={20} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* ── Notice Content Card ───────────────────────────────── */}
                        <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                                    <Megaphone size={18} color="#7C3AED" />
                                </View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Notice Details</Text>
                            </View>

                            <Text style={[styles.label, { color: theme.textSecondary }]}>
                                Title <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: errors.title ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                            }]}>
                                <Type size={16} color={errors.title ? '#EF4444' : '#94A3B8'} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary }]}
                                    placeholder="e.g. Water Supply Interruption Tomorrow"
                                    placeholderTextColor="#94A3B8"
                                    value={formData.title}
                                    maxLength={120}
                                    onChangeText={text => {
                                        setFormData(p => ({ ...p, title: text }));
                                        if (errors.title) setErrors(e => { const n = { ...e }; delete n.title; return n; });
                                    }}
                                />
                            </View>
                            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

                            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 8 }]}>
                                Message <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputBox, styles.textAreaBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: errors.content ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                            }]}>
                                <AlignLeft size={16} color={errors.content ? '#EF4444' : '#94A3B8'} style={[styles.inputIcon, { marginTop: 14 }]} />
                                <TextInput
                                    style={[styles.inputText, styles.textArea, { color: theme.textPrimary }]}
                                    placeholder="Write the full notice here..."
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                    textAlignVertical="top"
                                    value={formData.content}
                                    onChangeText={text => {
                                        setFormData(p => ({ ...p, content: text }));
                                        if (errors.content) setErrors(e => { const n = { ...e }; delete n.content; return n; });
                                    }}
                                />
                            </View>
                            {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}

                            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 8 }]}>
                                Attachment (Optional)
                            </Text>
                            
                            {formData.image || (isEdit && noticeToEdit?.image_url) ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image
                                        source={{ uri: formData.image ? formData.image.uri : (getResolvedImageUrl(noticeToEdit.image_url) || '') }}
                                        style={styles.imagePreview}
                                    />
                                    <TouchableOpacity
                                        style={styles.removeImageBtn}
                                        onPress={() => setFormData(p => ({ ...p, image: null }))}
                                    >
                                        <X size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.imageUploadBtn, {
                                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                        borderColor: isDark ? '#334155' : '#E8EAF6'
                                    }]}
                                    onPress={handlePickImage}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.imageUploadInner}>
                                        <ImageIcon size={24} color="#7C3AED" />
                                        <Text style={[styles.imageUploadText, { color: theme.textSecondary }]}>
                                            Tap to upload image
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}

                <View style={{ height: 8 }} />
            </ScrollView>

            <FooterButtons pb={insets.bottom + 12} />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    cardIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
    required: { color: '#EF4444' },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    textAreaBox: {
        height: 120,
        alignItems: 'flex-start',
    },
    inputIcon: { marginRight: 8 },
    inputText: { flex: 1, fontSize: 14, fontWeight: '500' },
    textArea: {
        height: '100%',
        paddingTop: 14,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: -10,
        marginBottom: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        minWidth: '47%',
    },
    catEmoji: { fontSize: 14, marginRight: 6 },
    catName: { fontSize: 13, fontWeight: '600', flex: 1 },
    radio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
    },
    deleteCustomCatBtn: {
        padding: 4,
        marginLeft: 4,
        marginRight: -4,
    },
    addCustomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    addCustomText: { fontSize: 12, fontWeight: '600', color: '#7C3AED', marginLeft: 4 },
    customCategoryWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    customCategoryInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 44,
        fontSize: 14,
    },
    customCategorySaveBtn: {
        paddingHorizontal: 20,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customCategorySaveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    customCategoryCancelBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageUploadBtn: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 12,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageUploadInner: {
        alignItems: 'center',
        gap: 8,
    },
    imageUploadText: {
        fontSize: 13,
        fontWeight: '500',
    },
    imagePreviewContainer: {
        width: '100%',
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 12,
    },
    resetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    resetBtnText: { fontSize: 15, fontWeight: '600' },
    createBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 12,
        gap: 8,
    },
    createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    tabBar: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    activeTabItem: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        padding: 0,
    },
    filterPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    tmplCard: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 110,
        elevation: 2,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tmplRibbon: {
        width: 5,
        height: '100%',
    },
    tmplContent: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between',
    },
    tmplHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    tmplEmoji: {
        fontSize: 14,
    },
    tmplTitle: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },
    tmplBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    tmplBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    tmplDesc: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        marginBottom: 10,
    },
    tmplActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 2,
    },
});

export default AddNoticeScreen;
