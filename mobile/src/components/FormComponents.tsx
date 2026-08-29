import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, FlatList, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, multiline, error, style }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[styles.inputContainer, multiline && styles.multilineContainer, error && styles.inputError, style]}>
            {Icon && <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : '#64748B'} /></View>}
            <TextInput
                style={[styles.input, multiline && styles.multilineInput]}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                numberOfLines={multiline ? 4 : 1}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

export const SelectField = ({ label, value, placeholder, icon: Icon, onPress, error }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity style={[styles.inputContainer, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
            {Icon && <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : '#64748B'} /></View>}
            <Text style={[styles.inputText, !value && { color: '#94A3B8' }]}>{value || placeholder}</Text>
            <ChevronDown size={18} color="#94A3B8" />
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

export const Selector = ({ label, options, selected, onSelect }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.selectorRow}>
            {options.map((opt: string) => (
                <TouchableOpacity key={opt} style={[styles.selectorItem, selected === opt && styles.selectorItemActive]} onPress={() => onSelect(opt)} activeOpacity={0.7}>
                    <Text style={[styles.selectorText, selected === opt && styles.selectorTextActive]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

export const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    const { isDark, theme } = useTheme();
    const [shouldRender, setShouldRender] = useState(visible);
    const translateY = useRef(new Animated.Value(600)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                if (e && e.endCoordinates && e.endCoordinates.height) {
                    setKeyboardHeight(e.endCoordinates.height);
                }
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, damping: 28, stiffness: 280, mass: 0.8, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 600, duration: 160, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished) {
                    setShouldRender(false);
                }
            });
        }
    }, [visible]);

    if (!shouldRender) return null;
    return (
        <Modal transparent visible={visible || shouldRender} animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15, 23, 42, 0.35)', opacity }]}>
                        <Pressable style={{ flex: 1 }} onPress={onClose} />
                    </Animated.View>
                    <Animated.View style={[
                        styles.sheet,
                        { 
                            maxHeight, 
                            transform: [{ translateY }],
                            backgroundColor: isDark ? '#1E293B' : '#FFF',
                            marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
                        }
                    ]}>
                        <View style={styles.sheetHandle} />
                        {children}
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export const OptionsDrawer = ({ visible, title, data, selectedId, onSelect, onClose, keyExtractor, labelExtractor, searchable, onCustomAdd }: any) => {
    const [search, setSearch] = useState('');
    const filtered = React.useMemo(() => {
        if (!searchable || !search) return data;
        return data.filter((item: any) => labelExtractor(item).toLowerCase().includes(search.toLowerCase()));
    }, [data, search, searchable, labelExtractor]);

    return (
        <ModalSheet visible={visible} onClose={() => { setSearch(''); onClose(); }} maxHeight="78%">
            <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{title}</Text>
                <TouchableOpacity onPress={() => { setSearch(''); onClose(); }} style={styles.doneBtn}><Text style={styles.doneBtnText}>Done</Text></TouchableOpacity>
            </View>
            {searchable && (
                <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                    <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
                </View>
            )}
            <FlatList
                data={filtered}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isSelected = selectedId === keyExtractor(item);
                    return (
                        <TouchableOpacity style={[styles.optionRow, isSelected && styles.optionRowActive]} onPress={() => { onSelect(item); setSearch(''); onClose(); }} activeOpacity={0.7}>
                            <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{labelExtractor(item)}</Text>
                            {isSelected && <Check size={18} color="#7C3AED" />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 14, marginBottom: 12 }}>No options available</Text>
                        {onCustomAdd && (
                            <TouchableOpacity style={{ backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }} onPress={() => { onCustomAdd(search || 'Custom'); setSearch(''); onClose(); }}>
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Add Custom {search ? `"${search}"` : 'Option'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                ListFooterComponent={
                    (onCustomAdd && data && data.length > 0) ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <TouchableOpacity style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#7C3AED' }} onPress={() => { onCustomAdd(search || 'Custom'); setSearch(''); onClose(); }}>
                                <Text style={{ color: '#7C3AED', fontWeight: 'bold' }}>+ Add Custom {search ? `"${search}"` : 'Option'}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 60 }}
            />
        </ModalSheet>
    );
};

const styles = StyleSheet.create({
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#E2E8F0' },
    inputError: { backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1.5 },
    multilineContainer: { height: 120, alignItems: 'flex-start', paddingTop: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '500' },
    inputText: { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '500' },
    multilineInput: { textAlignVertical: 'top', height: 100 },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600', marginLeft: 4 },
    
    selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    selectorItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
    selectorItemActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
    selectorText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    selectorTextActive: { color: '#7C3AED', fontWeight: '700' },
    
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 16, paddingBottom: 28, minHeight: 260 },
    sheetHandle: { width: 44, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 18 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    doneBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#F5F3FF' },
    doneBtnText: { color: '#7C3AED', fontWeight: '700', fontSize: 14 },
    searchInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1E293B', fontWeight: '500' },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', minHeight: 60 },
    optionRowActive: { backgroundColor: '#F5F3FF' },
    optionLabel: { fontSize: 15, color: '#334155', fontWeight: '500' },
    optionLabelActive: { color: '#7C3AED', fontWeight: '700' },
});
