import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

export interface SelectionItem {
    id: string;
    label: string;
    subLabel?: string;
}

export interface SelectionModalProps {
    visible: boolean;
    title: string;
    items: SelectionItem[];
    selectedId?: string;
    onClose: () => void;
    onConfirm: (item: SelectionItem) => void;
}

export function SelectionModal({ visible, title, items, selectedId, onClose, onConfirm }: SelectionModalProps) {
    const { theme } = useTheme();
    const primary = theme?.primary || '#8B291A';

    const [search, setSearch] = useState('');
    const [currentSelection, setCurrentSelection] = useState<string | undefined>(selectedId);

    const filteredItems = items.filter(item => 
        item.label.toLowerCase().includes(search.toLowerCase()) || 
        (item.subLabel && item.subLabel.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={S.modalOverlay}>
                <View style={S.container}>
                    {/* Header */}
                    <View style={S.header}>
                        <Text style={S.headerTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={S.searchWrap}>
                        <Ionicons name="search" size={20} color="#94A3B8" />
                        <TextInput 
                            style={S.searchInput}
                            placeholder={`Search ${title.toLowerCase().replace('select', '').trim()}...`}
                            placeholderTextColor="#94A3B8"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {/* List */}
                    <ScrollView style={S.listWrap} showsVerticalScrollIndicator={false}>
                        {filteredItems.map((item, index) => {
                            const isSelected = currentSelection === item.id;
                            
                            return (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={[
                                        S.itemRow, 
                                        index !== filteredItems.length - 1 && S.itemBorder
                                    ]}
                                    onPress={() => setCurrentSelection(item.id)}
                                >
                                    <Text style={[S.itemLabel, isSelected && { color: primary }]}>{item.label}</Text>
                                    
                                    <View style={S.rightWrap}>
                                        {item.subLabel && (
                                            <Text style={S.subLabel}>{item.subLabel}</Text>
                                        )}
                                        <View style={[S.radioCircle, isSelected && { borderColor: primary }]}>
                                            {isSelected && <View style={[S.radioInner, { backgroundColor: primary }]} />}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Footer Button */}
                    <View style={S.footer}>
                        <TouchableOpacity 
                            style={[S.confirmBtn, { backgroundColor: primary }]}
                            onPress={() => {
                                const selItem = items.find(i => i.id === currentSelection);
                                if (selItem) onConfirm(selItem);
                            }}
                        >
                            <Text style={S.confirmBtnText}>Confirm Selection</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const S = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        marginHorizontal: 20,
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#0F172A',
    },
    listWrap: {
        paddingHorizontal: 20,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    itemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    itemLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    rightWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    subLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#94A3B8',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    footer: {
        padding: 20,
    },
    confirmBtn: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    confirmBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    }
});
