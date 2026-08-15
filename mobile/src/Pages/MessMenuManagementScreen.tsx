import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Platform, Modal,
    SafeAreaView, StatusBar, LayoutAnimation, UIManager, KeyboardAvoidingView
} from 'react-native';
import { 
    Coffee, Soup, Moon, Edit2, ChevronLeft, Calendar, 
    Utensils, Check, GripVertical, Trash2, ChevronDown, 
    ConciergeBell, Eye, Search, X, Plus
} from 'lucide-react-native';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { showErrorToast, showSuccessToast } from '../hooks/Toastconfig';
import { AppHeader } from '../components/AppHeader';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../theme/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'];

const PREDEFINED_ITEMS = {
    Breakfast: ['Idly', 'Sambar', 'Chutney', 'Puri', 'Kurma', 'Punugulu', 'Upma', 'Lemon Rice', 'Noodles', 'Dosa', 'Pongal', 'Uggani', 'Tomato Rice', 'Uthappam', 'Vada', 'Bonda', 'Poha'],
    Lunch: ['Rice', 'Dal', 'Cabbage', 'Beetroot', 'Lady Finger', 'Dondakaya', 'Bendakaya', 'Carrot', 'Tomato Dal', 'Thotakura Dal', 'Palakura Dal', 'Biryani', 'Pulav', 'Chicken Curry', 'Fish Curry', 'Egg Curry', 'Paneer Butter Masala', 'Rasam', 'Sambar', 'Curd'],
    Dinner: ['Chapathi', 'Dal', 'Chutney', 'Rajma', 'Egg Curry', 'Tomato Dosakaya', 'Chicken Curry', 'Rasam', 'Capsicum', 'Sambar', 'Meal Maker', 'Curd', 'Fried Rice', 'Puri', 'Kurma']
};

const MEAL_CONFIG = {
    Breakfast: { 
        icon: Coffee, 
        color: '#F59E0B', 
        bg: '#FFFBEB',
        subtitle: 'Start your day with\na healthy meal'
    },
    Lunch: { 
        icon: Soup, 
        color: '#10B981', 
        bg: '#ECFDF5',
        subtitle: 'Nutritious food for\na productive day'
    },
    Dinner: { 
        icon: Moon, 
        color: '#8B5CF6', 
        bg: '#F5F3FF',
        subtitle: 'Light & wholesome\nevening meal'
    }
};

export default function MessMenuManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState('Mon');
    const [search, setSearch] = useState('');
    const [showAllSuggestions, setShowAllSuggestions] = useState(false);
    
    // modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMeal, setEditingMeal] = useState('Breakfast');
    
    // Store menu locally
    const [menuData, setMenuData] = useState<any>({});
    const [localItems, setLocalItems] = useState<string[]>([]);
    const [newItemText, setNewItemText] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchMenu = useCallback(async () => {
        if (!user?.hostel_id) return;
        setLoading(true);
        try {
            const res = await api.get(`/mess-menu/${user.hostel_id}`);
            if (res.data.success && res.data.menu) {
                const map: any = {};
                res.data.menu.forEach((m: any) => {
                    const key = `${m.day_of_week}_${m.meal_type}`;
                    map[key] = { items: m.items, timing: m.timing };
                });
                setMenuData(map);
            }
        } catch (e) {
            console.error('Failed to fetch menu:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.hostel_id]);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    const openEditModal = (meal: string) => {
        setEditingMeal(meal);
        const key = `${selectedDay}_${meal}`;
        const itemsStr = menuData[key]?.items || '';
        const itemsArr = itemsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
        setLocalItems(itemsArr);
        setNewItemText('');
        setShowAllSuggestions(false);
        setModalVisible(true);
    };

    const suggestedItems = useMemo(() => {
        const base = PREDEFINED_ITEMS[editingMeal as keyof typeof PREDEFINED_ITEMS] || [];
        const existing = new Set<string>();
        Object.keys(menuData).forEach(key => {
            if (key.includes(editingMeal)) {
                const items = menuData[key]?.items?.split(',') || [];
                items.forEach((i: string) => existing.add(i.trim()));
            }
        });
        const all = Array.from(new Set([...base, ...Array.from(existing)]));
        return all.filter(item => item && !localItems.map(i => i.toLowerCase()).includes(item.toLowerCase()));
    }, [editingMeal, menuData, localItems]);

    const filteredSuggestions = useMemo(() => {
        if (!newItemText.trim()) return suggestedItems;
        return suggestedItems.filter(item => item.toLowerCase().includes(newItemText.trim().toLowerCase()));
    }, [suggestedItems, newItemText]);

    const visibleSuggestions = useMemo(() => {
        return showAllSuggestions ? filteredSuggestions : filteredSuggestions.slice(0, 8);
    }, [filteredSuggestions, showAllSuggestions]);

    const addFoodItem = (textStr: string) => {
        if (!textStr.trim()) return;
        const formattedItem = textStr.trim();
        if (localItems.map(i => i.toLowerCase()).includes(formattedItem.toLowerCase())) {
            showErrorToast('Duplicate', 'Item already exists in menu');
            return;
        }
        setLocalItems([...localItems, formattedItem]);
        setNewItemText('');
    };

    const removeFoodItem = (index: number) => {
        const arr = [...localItems];
        arr.splice(index, 1);
        setLocalItems(arr);
    };

    const saveMenu = async () => {
        if (!user?.hostel_id) return;
        if (localItems.length === 0) {
            showErrorToast('Error', 'Please add at least one food item before saving.');
            return;
        }

        setSaving(true);
        try {
            const itemsStr = localItems.join(', ');
            const res = await api.post(`/mess-menu/${user.hostel_id}`, {
                day_of_week: selectedDay,
                meal_type: editingMeal,
                items: itemsStr,
                timing: ''
            });

            if (res.data.success) {
                showSuccessToast('Saved', 'Menu updated successfully');
                const key = `${selectedDay}_${editingMeal}`;
                setMenuData({ ...menuData, [key]: { items: itemsStr, timing: '' } });
                setModalVisible(false);
            }
        } catch (e) {
            console.error('Save menu error:', e);
            showErrorToast('Error', 'Failed to save menu');
        } finally {
            setSaving(false);
        }
    };

    const filteredMeals = useMemo(() => {
        if (!search.trim()) return MEALS;
        const q = search.toLowerCase();
        return MEALS.filter(meal => {
            if (meal.toLowerCase().includes(q)) return true;
            const key = `${selectedDay}_${meal}`;
            const itemsStr = menuData[key]?.items || '';
            return itemsStr.toLowerCase().includes(q);
        });
    }, [search, selectedDay, menuData]);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />

            <AppHeader
                title="Mess Menu"
                subtitle="Manage weekly food schedule"
                showBack={navigation.canGoBack()}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <HeaderNotification navigation={navigation} />
                        <View style={{ width: 12 }} />
                        <ProfileMenu />
                    </View>
                }
            >
                <View style={styles.searchBox}>
                    <Search color="rgba(255,255,255,0.7)" size={18} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search meals or items..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={18} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabScroll}
                    contentContainerStyle={styles.tabScrollContent}
                >
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            style={[
                                styles.pillBtn,
                                selectedDay === day ? styles.activePillBtn : styles.inactivePillBtn
                            ]}
                            onPress={() => {
                                if (selectedDay === day) return;
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSelectedDay(day);
                            }}
                        >
                            <Text style={[
                                styles.pillLabel,
                                selectedDay === day ? { color: COLORS.primary } : { color: '#FFF' }
                            ]}>
                                {day}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </AppHeader>

            <View style={styles.body}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                        {filteredMeals.length === 0 ? (
                            <View style={styles.emptySearch}>
                                <Text style={[styles.emptySearchText, { color: theme.textSecondary }]}>No meals found for "{search}"</Text>
                            </View>
                        ) : null}
                        
                        {filteredMeals.map((meal) => {
                            const config = MEAL_CONFIG[meal as keyof typeof MEAL_CONFIG];
                            const Icon = config.icon;
                            const key = `${selectedDay}_${meal}`;
                            const currentData = menuData[key];
                            const hasMenu = currentData && currentData.items && currentData.items.trim().length > 0;

                            return (
                                <View key={meal} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardHeaderLeft}>
                                            <View style={[styles.cardIconBox, { backgroundColor: isDark ? config.color + '20' : config.bg }]}>
                                                <Icon color={config.color} size={24} />
                                            </View>
                                            <View>
                                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{meal}</Text>
                                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{config.subtitle}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity style={[styles.editBtnOutline, { borderColor: config.color }]} onPress={() => openEditModal(meal)}>
                                            <Edit2 color={config.color} size={14} />
                                            <Text style={[styles.editBtnOutlineText, { color: config.color }]}>Edit</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {!hasMenu ? (
                                        <View style={[styles.emptyBox, { borderColor: config.color + '60', backgroundColor: isDark ? config.color + '15' : config.bg + '40' }]}>
                                            <ConciergeBell color={config.color} size={28} style={{ opacity: 0.8 }} />
                                            <View style={{ marginLeft: 12 }}>
                                                <Text style={[styles.emptyBoxTitle, { color: theme.textPrimary }]}>No menu set for {meal}</Text>
                                                <Text style={[styles.emptyBoxSubtitle, { color: theme.textSecondary }]}>Tap "Edit" to add dishes</Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={[styles.emptyBox, { borderColor: config.color + '60', backgroundColor: isDark ? config.color + '15' : config.bg + '40', flexDirection: 'column', alignItems: 'flex-start' }]}>
                                            <Text style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 24, fontWeight: '500' }}>
                                                {currentData.items.split(',').map((item: string) => item.trim()).join(' • ')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                )}
            </View>

            {/* FULL SCREEN EDIT OVERLAY (Replaces Modal to allow Toast rendering) */}
            {modalVisible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                    style={[styles.modalContainer, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}
                >
                    <AppHeader
                        title={`Edit ${editingMeal}`}
                        subtitle={`${selectedDay} Menu`}
                        onBack={() => setModalVisible(false)}
                        showBack={true}
                    />

                    <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.dropdownsRow}>
                            <View style={styles.dropdownWrap}>
                                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                    <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Meal Type</Text>
                                </View>
                                <View style={[styles.dropdownBox, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Coffee color={theme.primary} size={18} />
                                        <Text style={[styles.dropdownText, { color: theme.textPrimary, marginLeft: 8 }]}>{editingMeal}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={styles.dropdownWrap}>
                                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                    <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Day</Text>
                                </View>
                                <View style={[styles.dropdownBox, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Calendar color={theme.primary} size={18} />
                                        <Text style={[styles.dropdownText, { color: theme.textPrimary, marginLeft: 8 }]}>{selectedDay}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.addFoodSection}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Search color={theme.textPrimary} size={18} />
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginLeft: 8 }]}>Search or Add Items</Text>
                            </View>
                            <View style={styles.addInputRow}>
                                <TextInput
                                    style={[styles.addInput, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0', color: theme.textPrimary }]}
                                    placeholder="Search predefined dishes..."
                                    placeholderTextColor={theme.textSecondary}
                                    value={newItemText}
                                    onChangeText={setNewItemText}
                                />
                            </View>

                            {newItemText.trim().length > 0 && (
                                <View style={{ marginTop: 12, marginBottom: 16 }}>
                                    <TouchableOpacity 
                                        style={[styles.createCustomBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]} 
                                        onPress={() => addFoodItem(newItemText)}
                                    >
                                        <Plus color={theme.primary} size={20} />
                                        <Text style={[styles.createCustomBtnText, { color: theme.primary }]}>
                                            Create new dish: "{newItemText.trim()}"
                                        </Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.customNote, { color: theme.textSecondary }]}>
                                        * Custom dishes are securely stored and only visible to your hostel.
                                    </Text>
                                </View>
                            )}

                            {filteredSuggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    {visibleSuggestions.map((item, idx) => (
                                        <TouchableOpacity key={idx} style={[styles.suggestionPill, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={() => addFoodItem(item)}>
                                            <Plus color={theme.textSecondary} size={14} />
                                            <Text style={[styles.suggestionPillText, { color: theme.textSecondary, marginLeft: 4 }]}>{item}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    {!showAllSuggestions && filteredSuggestions.length > 8 && (
                                        <TouchableOpacity style={[styles.suggestionPill, { backgroundColor: theme.primary + '20' }]} onPress={() => setShowAllSuggestions(true)}>
                                            <Text style={[styles.suggestionPillText, { color: theme.primary }]}>+ {filteredSuggestions.length - 8} More</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>

                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Utensils color={theme.textPrimary} size={18} />
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginLeft: 8 }]}>Selected Menu</Text>
                            </View>
                            <View style={[styles.itemsCountBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                                <Text style={[styles.itemsCountText, { color: isDark ? '#34D399' : '#059669' }]}>{localItems.length} Items</Text>
                            </View>
                        </View>
                        <Text style={[styles.dragText, { color: theme.textSecondary }]}>Menu dishes for this meal</Text>

                        <View style={styles.foodList}>
                            {localItems.length === 0 ? (
                                <View style={[styles.emptyBox, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#1E293B' : '#F8FAFC', padding: 24, justifyContent: 'center' }]}>
                                    <ConciergeBell color={theme.textSecondary} size={24} />
                                    <Text style={{ color: theme.textSecondary, marginTop: 8, fontSize: 14 }}>No items added yet</Text>
                                </View>
                            ) : (
                                localItems.map((item, index) => (
                                    <View key={index} style={[styles.foodListItem, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                        <View style={styles.foodListItemLeft}>
                                            <GripVertical color={isDark ? '#475569' : '#CBD5E1'} size={20} />
                                            <View style={[styles.foodIconBox, { backgroundColor: isDark ? theme.background : '#F1F5F9', marginLeft: 12 }]}>
                                                <Coffee color={theme.textPrimary} size={16} />
                                            </View>
                                            <Text style={[styles.foodItemName, { color: theme.textPrimary, marginLeft: 12 }]}>{item}</Text>
                                        </View>
                                        <View style={styles.foodListItemRight}>
                                            <TouchableOpacity style={styles.iconActionBtn} onPress={() => removeFoodItem(index)}><Trash2 color="#EF4444" size={18} /></TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>

                    <View style={[styles.bottomBar, { backgroundColor: isDark ? theme.cardBg : '#FFF', borderTopColor: isDark ? '#334155' : 'rgba(0,0,0,0.05)', paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }]}>
                        <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={() => setModalVisible(false)}>
                            <Text style={[styles.btnSecondaryText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <View style={{ width: 16 }} />
                        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: theme.primary }]} onPress={saveMenu} disabled={saving}>
                            {saving ? <ActivityIndicator color="#FFF" /> : (
                                <>
                                    <Check color="#FFF" size={20} />
                                    <Text style={styles.btnPrimaryText}>Save Menu</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    body: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header extensions
    searchBox: {
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 48,
        marginBottom: 15
    },
    input: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#FFF' },
    tabScroll: {
        marginTop: 6,
        width: '100%',
    },
    tabScrollContent: {
        paddingHorizontal: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pillBtn: {
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8
    },
    activePillBtn: {
        backgroundColor: '#FFF',
    },
    inactivePillBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    pillLabel: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Cards
    contentContainer: { padding: 16, paddingBottom: 100 },
    emptySearch: { paddingVertical: 40, alignItems: 'center' },
    emptySearchText: { fontSize: 15 },
    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    cardIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2, lineHeight: 18 },
    editBtnOutline: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    editBtnOutlineText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
    emptyBox: { borderStyle: 'dashed', borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
    emptyBoxTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    emptyBoxSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

    menuItemsListRow: { flexDirection: 'row', flexWrap: 'wrap' },
    menuItemBadge: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)', marginBottom: 8, marginRight: 8 },
    menuItemBadgeText: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },

    // MODAL
    modalContainer: { flex: 1 },
    modalScroll: { flex: 1 },
    dropdownsRow: { flexDirection: 'row', marginBottom: 24 },
    dropdownWrap: { flex: 1 },
    formLabel: { fontSize: 13, fontWeight: '700' },
    dropdownBox: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dropdownText: { fontSize: 15, fontWeight: '600' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    sectionTitle: { fontSize: 16, fontWeight: '800' },
    itemsCountBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    itemsCountText: { color: '#059669', fontSize: 12, fontWeight: '700' },
    dragText: { fontSize: 13, color: '#94A3B8', marginBottom: 12 },

    foodList: { marginBottom: 24 },
    foodListItem: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    foodListItemLeft: { flexDirection: 'row', alignItems: 'center' },
    foodIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    foodItemName: { fontSize: 15, fontWeight: '700' },
    foodListItemRight: { flexDirection: 'row' },
    iconActionBtn: { padding: 6 },

    addFoodSection: { marginBottom: 24 },
    addInputRow: { flexDirection: 'row' },
    addInput: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, paddingVertical: 14 },
    addItemBtn: { justifyContent: 'center', paddingHorizontal: 24, borderRadius: 14 },
    addItemText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    createCustomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
    createCustomBtnText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
    customNote: { fontSize: 12, textAlign: 'center', fontStyle: 'italic', opacity: 0.8 },
    
    suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    suggestionPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    suggestionPillText: { fontSize: 13, fontWeight: '600' },

    // Add Student Bottom Bar styles
    bottomBar: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, flexDirection: 'row', borderTopWidth: 1, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
    btnSecondary: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    btnSecondaryText: { fontSize: 16, fontWeight: '700' },
    btnPrimary: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 }
});
