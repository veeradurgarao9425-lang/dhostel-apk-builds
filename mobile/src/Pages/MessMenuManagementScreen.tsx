import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Coffee, Soup, Moon, X, Edit2 } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { showErrorToast, showSuccessToast } from '../hooks/Toastconfig';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'];

const MEAL_CONFIG = {
    Breakfast: { icon: Coffee, gradient: ['#F59E0B', '#F97316'] as const, emoji: '☕' },
    Lunch:     { icon: Soup,   gradient: ['#10B981', '#059669'] as const, emoji: '🍛' },
    Dinner:    { icon: Moon,   gradient: ['#6366F1', '#8B5CF6'] as const, emoji: '🌙' }
};

export default function MessMenuManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState('Mon');
    
    // modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMeal, setEditingMeal] = useState('Breakfast');
    const [items, setItems] = useState('');
    const [timing, setTiming] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Store menu locally
    const [menuData, setMenuData] = useState<any>({});

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
        setItems(menuData[key]?.items || '');
        setTiming(menuData[key]?.timing || '');
        setModalVisible(true);
    };

    const saveMenu = async () => {
        if (!user?.hostel_id) return;
        if (!items.trim()) {
            Alert.alert('Error', 'Items cannot be empty');
            return;
        }

        setSaving(true);
        try {
            const res = await api.post(`/mess-menu/${user.hostel_id}`, {
                day_of_week: selectedDay,
                meal_type: editingMeal,
                items: items.trim(),
                timing: timing.trim()
            });

            if (res.data.success) {
                showSuccessToast('Saved', 'Menu updated successfully');
                const key = `${selectedDay}_${editingMeal}`;
                setMenuData({ ...menuData, [key]: { items: items.trim(), timing: timing.trim() } });
                setModalVisible(false);
            }
        } catch (e) {
            console.error('Save menu error:', e);
            showErrorToast('Error', 'Failed to save menu');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Mess Menu" subtitle="Manage weekly food schedule" onBack={() => navigation.goBack()} />
            
            <View style={styles.daysScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {DAYS.map(day => (
                        <TouchableOpacity 
                            key={day} 
                            style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
                            onPress={() => setSelectedDay(day)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{day}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>
                    {MEALS.map((meal) => {
                        const config = MEAL_CONFIG[meal as keyof typeof MEAL_CONFIG];
                        const Icon = config.icon;
                        const key = `${selectedDay}_${meal}`;
                        const currentData = menuData[key];

                        return (
                            <View key={meal} style={styles.mealCard}>
                                <View style={styles.mealHeader}>
                                    <View style={styles.mealTitleRow}>
                                        <View style={[styles.iconBox, { backgroundColor: config.gradient[0] + '15' }]}>
                                            <Icon size={18} color={config.gradient[0]} />
                                        </View>
                                        <Text style={styles.mealTitle}>{meal}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.editBtn} 
                                        activeOpacity={0.7}
                                        onPress={() => openEditModal(meal)}
                                    >
                                        <Edit2 size={14} color="#7C3AED" />
                                        <Text style={styles.editBtnText}>Edit</Text>
                                    </TouchableOpacity>
                                </View>

                                {currentData && currentData.items ? (
                                    <View style={styles.mealContent}>
                                        <Text style={styles.mealItems}>{currentData.items}</Text>
                                        <View style={styles.timeBadge}>
                                            <Text style={styles.timeBadgeText}>⏱ {currentData.timing || 'Time not set'}</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={[styles.mealContent, { alignItems: 'center' }]}>
                                        <Text style={[styles.mealItems, { fontStyle: 'italic', color: '#94A3B8' }]}>No menu set for {meal}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit {editingMeal}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.modalSubtitle}>For {selectedDay}</Text>

                        <Text style={styles.label}>Menu Items</Text>
                        <TextInput
                            style={styles.inputMultiline}
                            multiline
                            placeholder="e.g. Idli, Sambar, Chutney..."
                            value={items}
                            onChangeText={setItems}
                        />

                        <Text style={styles.label}>Timing (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 7:30 - 9:30 AM"
                            value={timing}
                            onChangeText={setTiming}
                        />

                        <TouchableOpacity 
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                            onPress={saveMenu}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Menu</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    daysScroll: { paddingHorizontal: 16, marginTop: 12, paddingBottom: 16 },
    dayTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    dayTabActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
    dayText: { fontWeight: '700', color: '#64748B', fontSize: 14 },
    dayTextActive: { color: '#FFF' },
    
    cardsContainer: { paddingHorizontal: 16, gap: 12, paddingBottom: 32 },
    mealCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    mealTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    editBtnText: { color: '#7C3AED', fontWeight: '700', fontSize: 12 },
    mealContent: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    mealItems: { color: '#334155', fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 8 },
    timeBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    timeBadgeText: { color: '#64748B', fontWeight: '700', fontSize: 11 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
    modalSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 20, marginTop: 4 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B', fontWeight: '500' },
    inputMultiline: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B', minHeight: 120, textAlignVertical: 'top', fontWeight: '500' },
    saveBtn: { backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24, elevation: 4, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});
