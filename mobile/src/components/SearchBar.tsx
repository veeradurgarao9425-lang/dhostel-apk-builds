/**
 * SearchBar.tsx — Shared search input used across all list screens.
 *
 * Before: Each screen had its own copy of this 20-line block:
 *   <View style={searchBarContainer}>
 *     <Ionicons name="search" .../>
 *     <TextInput .../>
 *     {query && <TouchableOpacity onPress={clear}><Ionicons name="close-circle"/></TouchableOpacity>}
 *   </View>
 *
 * After: Just <SearchBar value={q} onChangeText={setQ} placeholder="..." />
 */

import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    /** Optional icon or element shown on the right side (e.g. a calendar picker trigger) */
    rightElement?: React.ReactNode;
    containerStyle?: any;
}

export function SearchBar({
    value,
    onChangeText,
    placeholder = 'Search...',
    rightElement,
    containerStyle,
}: SearchBarProps) {
    return (
        <View style={[styles.container, containerStyle]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChangeText}
                autoCorrect={false}
                autoCapitalize="none"
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
            )}
            {rightElement}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },
});
