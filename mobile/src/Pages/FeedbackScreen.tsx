import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../services/api';

const CATEGORIES = [
    { id: 'Bug / Issue', label: 'Report Bug / Issue', icon: 'bug-outline', color: '#EF4444' },
    { id: 'Feature Request', label: 'Feature Request', icon: 'bulb-outline', color: '#F59E0B' },
    { id: 'General Feedback', label: 'General Feedback', icon: 'chatbox-ellipses-outline', color: '#7C3AED' },
    { id: 'Other', label: 'Other Query', icon: 'help-circle-outline', color: '#3B82F6' },
];

export default function FeedbackScreen({ navigation }: any) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [category, setCategory] = useState<string>('Bug / Issue');
    const [message, setMessage] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [contactEmail, setContactEmail] = useState(user?.email || '');
    const [contactPhone, setContactPhone] = useState(user?.phone || '');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const pickImage = async (useCamera: boolean) => {
        if (images.length >= 3) {
            Alert.alert('Limit Reached', 'You can attach up to 3 screenshots.');
            return;
        }

        try {
            let result: ImagePicker.ImagePickerResult;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Camera permission is required to take photos.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    quality: 0.8,
                    allowsEditing: false,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Gallery permission is required to select photos.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                    allowsMultipleSelection: true,
                    selectionLimit: 3 - images.length,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUris = result.assets.map(a => a.uri);
                setImages(prev => [...prev, ...newUris].slice(0, 3));
            }
        } catch (error: any) {
            console.warn('Image picker error:', error);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert('Message Required', 'Please describe the issue or what we need to improve.');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('category', category);
            formData.append('message', message.trim());
            formData.append('contact_email', contactEmail.trim());
            formData.append('contact_phone', contactPhone.trim());
            formData.append('app_version', '1.0.4');

            images.forEach((uri, idx) => {
                const filename = uri.split('/').pop() || `feedback_${idx}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';
                formData.append('images', {
                    uri,
                    name: filename,
                    type,
                } as any);
            });

            const res = await api.post('/feedback', formData);
            if (res.data?.success) {
                setSubmitted(true);
            } else {
                Alert.alert('Submission Failed', res.data?.error || 'Could not submit feedback.');
            }
        } catch (error: any) {
            console.error('Feedback submit error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Gradient Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top > 0 ? insets.top + 8 : 28 }]}>
                <LinearGradient
                    colors={['#7C3AED', '#5F2EEA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>App Feedback & Support</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.headerIntro}>
                    <Text style={styles.headerIntroTitle}>Tell us what we need to improve</Text>
                    <Text style={styles.headerIntroSub}>
                        Please share what issues you faced or what improvements you would like to see.
                    </Text>
                </View>
            </View>

            {submitted ? (
                <View style={styles.successContainer}>
                    <View style={styles.successIconWrap}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.successCircle}
                        >
                            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                        </LinearGradient>
                    </View>
                    <Text style={[styles.successTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                        Feedback Received
                    </Text>
                    <Text style={[styles.successSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        Thank you for your feedback. Our support and development team will review it.
                    </Text>
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#7C3AED', '#5F2EEA']}
                            style={styles.doneButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.doneButtonText}>Back to App</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={[styles.formContent, { paddingBottom: Math.max(insets.bottom, 20) + 30 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Category Selector */}
                        <Text style={[styles.sectionLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                            Select Category
                        </Text>
                        <View style={styles.categoriesRow}>
                            {CATEGORIES.map(cat => {
                                const selected = category === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryChip,
                                            {
                                                backgroundColor: selected
                                                    ? (isDark ? '#312E81' : '#EDE9FE')
                                                    : (isDark ? '#1E293B' : '#FFFFFF'),
                                                borderColor: selected ? '#7C3AED' : (isDark ? '#334155' : '#E2E8F0'),
                                                borderWidth: selected ? 1.5 : 1,
                                            },
                                        ]}
                                        onPress={() => setCategory(cat.id)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={16}
                                            color={selected ? '#7C3AED' : cat.color}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text
                                            style={[
                                                styles.categoryText,
                                                { color: selected ? '#7C3AED' : (isDark ? '#E2E8F0' : '#475569') },
                                                selected && { fontWeight: '800' },
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Description Textarea */}
                        <Text style={[styles.sectionLabel, { color: isDark ? '#CBD5E1' : '#334155', marginTop: 18 }]}>
                            What issues did you face or what can we improve? <Text style={{ color: '#EF4444' }}>*</Text>
                        </Text>
                        <View style={[styles.textAreaContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <TextInput
                                style={[styles.textArea, { color: isDark ? '#F1F5F9' : '#1E293B' }]}
                                placeholder="Describe the issue you encountered or share your suggestions..."
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                value={message}
                                onChangeText={setMessage}
                                maxLength={2000}
                            />
                            <Text style={[styles.charCount, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                                {message.length}/2000
                            </Text>
                        </View>

                        {/* Attach Screenshots */}
                        <Text style={[styles.sectionLabel, { color: isDark ? '#CBD5E1' : '#334155', marginTop: 18 }]}>
                            Attach Screenshots (Optional, max 3)
                        </Text>
                        <View style={styles.imagePickerRow}>
                            {images.map((uri, idx) => (
                                <View key={idx} style={styles.imageThumbnailWrap}>
                                    <Image source={{ uri }} style={styles.imageThumbnail} />
                                    <TouchableOpacity
                                        style={styles.removeImageBtn}
                                        onPress={() => removeImage(idx)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="close" size={14} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {images.length < 3 && (
                                <View style={styles.attachBtnGroup}>
                                    <TouchableOpacity
                                        style={[styles.attachBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                        onPress={() => pickImage(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="images-outline" size={18} color="#7C3AED" />
                                        <Text style={[styles.attachBtnText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                                            Gallery
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.attachBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                        onPress={() => pickImage(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="camera-outline" size={18} color="#7C3AED" />
                                        <Text style={[styles.attachBtnText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                                            Camera
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && { opacity: 0.8 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#7C3AED', '#5F2EEA']}
                                style={styles.submitGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <View style={styles.btnInner}>
                                        <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                                        <Text style={styles.submitButtonText}>Submit Feedback</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerIntro: {
        marginTop: 2,
    },
    headerIntroTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    headerIntroSub: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 18,
        fontWeight: '500',
    },
    formScroll: {
        flex: 1,
    },
    formContent: {
        paddingHorizontal: 16,
        paddingTop: 18,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
    },
    categoriesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    textAreaContainer: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        minHeight: 130,
    },
    textArea: {
        fontSize: 14,
        lineHeight: 20,
        minHeight: 90,
    },
    charCount: {
        fontSize: 11,
        textAlign: 'right',
        marginTop: 4,
        fontWeight: '500',
    },
    imagePickerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        marginTop: 6,
    },
    imageThumbnailWrap: {
        width: 72,
        height: 72,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    imageThumbnail: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 3,
        right: 3,
        backgroundColor: '#EF4444',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachBtnGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    attachBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.2,
        borderStyle: 'dashed',
    },
    attachBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    submitButton: {
        marginTop: 24,
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    submitGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    successIconWrap: {
        marginBottom: 20,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    doneButton: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
    },
    doneButtonGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
