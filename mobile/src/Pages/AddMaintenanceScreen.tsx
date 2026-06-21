import React, { useState, useEffect, useRef } from 'react';
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
    Keyboard,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { SPACING } from '../theme/index';

const CATEGORIES = ['Electrical', 'Plumbing', 'Furniture', 'Pest', 'Paint', 'Cleaning', 'Door/Lock', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];

export default function AddMaintenanceScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(false);

    // Form inputs
    const [room, setRoom] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Electrical');
    const [priority, setPriority] = useState('Medium');
    const [cost, setCost] = useState('');
    const [description, setDescription] = useState('');

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'High': return '#EF4444';
            case 'Medium': return '#F97316';
            case 'Low': return '#3B82F6';
            default: return '#64748B';
        }
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!room.trim()) errs.room = 'Room Number is required';
        if (!title.trim()) errs.title = 'Title is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = () => {
        if (!validate()) {
            Alert.alert('Validation Error', 'Please fill in the required fields.');
            return;
        }

        setLoading(true);
        try {
            const issue = {
                id: Date.now().toString(),
                room: room.trim(),
                title: title.trim(),
                category,
                priority,
                description: description.trim() || null,
                cost: cost.trim() || '0',
                status: 'Open',
                date: new Date().toISOString().split('T')[0]
            };

            // Return to Maintenance screen with issue data
            navigation.navigate('Maintenance', { newIssue: issue });
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to save maintenance issue');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setRoom('');
        setTitle('');
        setCategory('Electrical');
        setPriority('Medium');
        setCost('');
        setDescription('');
        setErrors({});
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader title="New Issue" onBack={() => navigation.goBack()} />

            <ScrollView
                ref={scrollRef}
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Basic Details Card */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>🛠️ Issue Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Room Number *</Text>
                        <View style={[styles.inputContainer, errors.room && styles.inputError]}>
                            <Ionicons name="business-outline" size={18} color={errors.room ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 204"
                                placeholderTextColor="#A0AEC0"
                                value={room}
                                onChangeText={setRoom}
                            />
                        </View>
                        {errors.room && <Text style={styles.errorText}>{errors.room}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Title / Issue *</Text>
                        <View style={[styles.inputContainer, errors.title && styles.inputError]}>
                            <Ionicons name="alert-circle-outline" size={18} color={errors.title ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Fan Not Working"
                                placeholderTextColor="#A0AEC0"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>
                </View>

                {/* Category Selection Card */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📁 Category *</Text>
                    <View style={styles.pillContainer}>
                        {CATEGORIES.map(cat => {
                            const isSelected = category === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.optionPill,
                                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                                    ]}
                                    onPress={() => setCategory(cat)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        isSelected && { color: '#FFF' }
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Priority Selection Card */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>⚡ Priority *</Text>
                    <View style={styles.pillContainer}>
                        {PRIORITIES.map(p => {
                            const isSelected = priority === p;
                            const priorityColor = getPriorityColor(p);
                            return (
                                <TouchableOpacity
                                    key={p}
                                    style={[
                                        styles.optionPill,
                                        isSelected && { backgroundColor: priorityColor, borderColor: priorityColor }
                                    ]}
                                    onPress={() => setPriority(p)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        isSelected && { color: '#FFF' },
                                        !isSelected && { color: priorityColor }
                                    ]}>{p}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Cost Estimation Card */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>💰 Financials</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Cost Estimate (Optional)</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="cash-outline" size={18} color={theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="numeric"
                                value={cost}
                                onChangeText={setCost}
                            />
                        </View>
                    </View>
                </View>

                {/* Description Card */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📝 Description</Text>
                    <View style={[styles.inputContainer, { height: 100, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <Ionicons name="document-text-outline" size={18} color={theme.primary} style={[styles.inputIcon, { marginTop: 2 }]} />
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Add details about the issue, location, urgency..."
                            placeholderTextColor="#A0AEC0"
                            multiline
                            value={description}
                            onChangeText={setDescription}
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
            <View style={[styles.stickyFooter, { paddingBottom: isKeyboardVisible ? SPACING.md : (insets.bottom + SPACING.md) }]}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={resetForm}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Text style={styles.submitButtonText}>Save Issue</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

    formCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 14, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 8, 
        elevation: 2 
    },
    sectionTitle: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: '#1E293B', 
        marginBottom: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9', 
        paddingBottom: 10 
    },

    inputGroup: { marginBottom: 14 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginLeft: 2 },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC', 
        borderRadius: 12, 
        paddingHorizontal: 12, 
        height: 48, 
        borderWidth: 1, 
        borderColor: '#E2E8F0' 
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },
    inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500', marginLeft: 4 },

    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionPill: { 
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        backgroundColor: '#FFF' 
    },
    optionText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

    // Sticky Footer
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF'
    },
    cancelButtonText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    submitButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});
