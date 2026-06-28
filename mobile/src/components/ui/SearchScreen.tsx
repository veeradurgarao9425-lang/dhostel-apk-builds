import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../contexts/ThemeContext';

export interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    amount?: number;
    status?: string;
    date?: string;
    type?: string;
}

interface SearchUIProps {
    visible: boolean;
    onClose: () => void;
    onResultPress?: (item: SearchResult) => void;
    // mock data generator or api fetcher
    fetchResults?: (query: string) => Promise<SearchResult[]>;
}

const RECENT_SEARCHES_KEY = '@recent_searches';

export function SearchUI({ visible, onClose, onResultPress, fetchResults }: SearchUIProps) {
    const { theme, isDark } = useTheme();
    const primary = theme?.primary || '#8B291A';

    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [results, setResults] = useState<SearchResult[] | null>(null);

    const popularSearches = [
        { title: 'Dues', icon: 'wallet-outline' },
        { title: 'Expenses', icon: 'receipt-outline' },
        { title: 'Complaints', icon: 'chatbubbles-outline' },
        { title: 'Notices', icon: 'notifications-outline' },
        { title: 'Rooms', icon: 'bed-outline' },
        { title: 'Profile', icon: 'person-outline' },
    ];

    useEffect(() => {
        if (visible) {
            loadRecentSearches();
            setQuery('');
            setResults(null);
            setSuggestions([]);
        }
    }, [visible]);

    const loadRecentSearches = async () => {
        try {
            const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (data) setRecentSearches(JSON.parse(data));
        } catch (e) { console.error('Failed to load recent searches', e); }
    };

    const saveRecentSearch = async (term: string) => {
        if (!term.trim()) return;
        try {
            let filtered = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
            filtered = [term, ...filtered].slice(0, 5); // Keep top 5
            setRecentSearches(filtered);
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
        } catch (e) { console.error('Failed to save recent search', e); }
    };

    const clearRecentSearches = async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const handleSearch = async (term: string) => {
        if (!term.trim()) return;
        Keyboard.dismiss();
        setQuery(term);
        saveRecentSearch(term);
        setIsSearching(true);
        setSuggestions([]);
        
        // Fetch or Mock results
        if (fetchResults) {
            const res = await fetchResults(term);
            setResults(res);
        } else {
            // Mock default
            if (term.toLowerCase() === 'xyzabc') {
                setResults([]);
            } else {
                setResults([
                    { id: '1', title: 'Mess Charges - May 2026', subtitle: '14 May 2026', amount: 3650, status: 'Unpaid' },
                    { id: '2', title: 'Mess Charges - April 2026', subtitle: '14 Apr 2026', amount: 3650, status: 'Paid' },
                ]);
            }
        }
        setIsSearching(false);
    };

    const handleTextChange = (text: string) => {
        setQuery(text);
        if (text.length > 0) {
            setResults(null);
            // mock suggestions
            setSuggestions([
                `${text} Charges`,
                `${text} Advance`,
                `${text} Menu`,
                `${text} Bill`
            ]);
        } else {
            setSuggestions([]);
            setResults(null);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <KeyboardAvoidingView style={[S.container, { backgroundColor: isDark ? '#0F172A' : '#FAFAFA' }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                
                {/* Search Bar Header */}
                <View style={[S.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                    <TouchableOpacity onPress={onClose} style={S.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? '#F8FAFC' : '#0F172A'} />
                    </TouchableOpacity>
                    
                    <View style={[S.searchBox, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <Ionicons name="search" size={20} color="#94A3B8" />
                        <TextInput 
                            style={[S.searchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                            placeholder="Search anything..."
                            placeholderTextColor="#94A3B8"
                            autoFocus
                            value={query}
                            onChangeText={handleTextChange}
                            onSubmitEditing={() => handleSearch(query)}
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => handleTextChange('')}>
                                <Ionicons name="close-circle" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <ScrollView style={S.scrollWrap} showsVerticalScrollIndicator={false}>
                    
                    {/* STATE 1: DEFAULT (Empty query) */}
                    {query.length === 0 && results === null && (
                        <View style={S.contentBlock}>
                            {recentSearches.length > 0 && (
                                <View style={S.section}>
                                    <View style={S.sectionHeader}>
                                        <Text style={[S.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Recent Searches</Text>
                                        <TouchableOpacity onPress={clearRecentSearches}>
                                            <Text style={[S.clearText, { color: primary }]}>Clear All</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {recentSearches.map((item, i) => (
                                        <TouchableOpacity key={i} style={S.recentRow} onPress={() => handleSearch(item)}>
                                            <View style={S.recentRowLeft}>
                                                <Ionicons name="time-outline" size={20} color="#94A3B8" />
                                                <Text style={[S.recentText, { color: isDark ? '#CBD5E1' : '#475569' }]}>{item}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <View style={S.section}>
                                <Text style={[S.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Popular Searches</Text>
                                <View style={S.popularGrid}>
                                    {popularSearches.map((pop, i) => (
                                        <TouchableOpacity key={i} style={[S.popularCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => handleSearch(pop.title)}>
                                            <View style={[S.popularIconBox, { backgroundColor: primary + '15' }]}>
                                                <Ionicons name={pop.icon as any} size={20} color={primary} />
                                            </View>
                                            <Text style={[S.popularText, { color: isDark ? '#CBD5E1' : '#475569' }]}>{pop.title}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* STATE 2: SUGGESTIONS (Typing) */}
                    {query.length > 0 && results === null && (
                        <View style={S.contentBlock}>
                            <Text style={[S.sectionTitle, { color: '#94A3B8', marginBottom: 12 }]}>Suggestions</Text>
                            {suggestions.map((sug, i) => (
                                <TouchableOpacity key={i} style={S.suggestionRow} onPress={() => handleSearch(sug)}>
                                    <Ionicons name="search-outline" size={20} color="#94A3B8" />
                                    <Text style={[S.suggestionText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{sug}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* STATE 3: RESULTS FOUND */}
                    {results && results.length > 0 && (
                        <View style={S.contentBlock}>
                            <View style={S.sectionHeader}>
                                <Text style={[S.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Results ({results.length})</Text>
                                <TouchableOpacity style={S.filterBtn}>
                                    <Ionicons name="options-outline" size={16} color="#64748B" />
                                    <Text style={S.filterBtnText}>Filter</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {results.map((res, i) => (
                                <TouchableOpacity 
                                    key={i} 
                                    style={[S.resultCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                    onPress={() => onResultPress && onResultPress(res)}
                                >
                                    <View style={[S.resultIconBox, { backgroundColor: primary + '10' }]}>
                                        <Ionicons name="document-text-outline" size={24} color={primary} />
                                    </View>
                                    <View style={S.resultMid}>
                                        <Text style={[S.resultTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{res.title}</Text>
                                        {res.subtitle && <Text style={S.resultSub}>{res.subtitle}</Text>}
                                    </View>
                                    <View style={S.resultRight}>
                                        {res.amount !== undefined && <Text style={[S.resultAmt, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>₹ {res.amount.toLocaleString()}</Text>}
                                        {res.status && (
                                            <Text style={[S.resultStatus, { color: res.status.toLowerCase() === 'paid' ? '#22C55E' : '#EF4444' }]}>
                                                {res.status}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* STATE 4: NO RESULTS */}
                    {results && results.length === 0 && (
                        <View style={S.noResultsWrap}>
                            <View style={S.noResultIconBox}>
                                <Ionicons name="search" size={60} color="#CBD5E1" />
                                <Ionicons name="sad" size={30} color="#F59E0B" style={S.sadFace} />
                            </View>
                            <Text style={[S.noResultTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>No Results Found</Text>
                            <Text style={S.noResultSub}>We couldn't find anything matching "{query}".</Text>

                            <TouchableOpacity style={[S.tryBtn, { backgroundColor: primary }]} onPress={() => handleTextChange('')}>
                                <Text style={S.tryBtnText}>Try Another Search</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[S.clearBtn, { borderColor: primary }]} onPress={() => { setQuery(''); setResults(null); }}>
                                <Text style={[S.clearBtnText, { color: primary }]}>Clear Search</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const S = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        elevation: 2,
    },
    backBtn: { marginRight: 16 },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    scrollWrap: { flex: 1, paddingHorizontal: 20 },
    contentBlock: { paddingTop: 20 },
    section: { marginBottom: 30 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800' },
    clearText: { fontSize: 13, fontWeight: '700' },
    recentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    recentRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    recentText: { fontSize: 15, fontWeight: '500' },
    popularGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    popularCard: {
        width: '31%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    popularIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    popularText: { fontSize: 12, fontWeight: '600' },
    
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    suggestionText: { fontSize: 15, fontWeight: '500' },
    
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
    },
    filterBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    resultIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    resultMid: { flex: 1 },
    resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    resultSub: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
    resultRight: { alignItems: 'flex-end' },
    resultAmt: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
    resultStatus: { fontSize: 12, fontWeight: '700' },

    noResultsWrap: { alignItems: 'center', paddingTop: 60 },
    noResultIconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    sadFace: { position: 'absolute', bottom: -5, right: -5 },
    noResultTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
    noResultSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
    tryBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    tryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    clearBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    clearBtnText: { fontSize: 16, fontWeight: '700' },
});
