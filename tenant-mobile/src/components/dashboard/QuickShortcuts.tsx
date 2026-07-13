import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const SECTION_H_PAD = 16;
const PAGE_W = SCREEN_W - SECTION_H_PAD * 2;

interface ShortcutItem {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    nav: string;
    bg: string;
    color: string;
}

interface QuickShortcutsProps {
    shortcuts: ShortcutItem[];
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

export const QuickShortcuts = ({ shortcuts }: QuickShortcutsProps) => {
    const navigation = useNavigation<any>();
    const flatListRef = useRef<FlatList>(null);
    const [currentPage, setCurrentPage] = useState(0);

    const pages = chunk(shortcuts, 4);
    const totalPages = pages.length;

    const renderPage = ({ item }: { item: ShortcutItem[] }) => (
        <View style={[styles.page, { width: PAGE_W }]}>
            {item.map((sc) => (
                <TouchableOpacity
                    key={sc.id}
                    style={styles.item}
                    onPress={() => navigation.navigate(sc.nav)}
                    activeOpacity={0.72}
                >
                    <View style={[styles.iconCircle, { backgroundColor: sc.bg }]}>
                        <Ionicons name={sc.icon} size={22} color={sc.color} />
                    </View>
                    <Text style={styles.itemLabel} numberOfLines={2}>{sc.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={styles.section}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.sectionTitleRow}>
                    <Ionicons name="flash" size={12} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                </View>
            </View>

            {/* Paged FlatList — 4 per page */}
            <FlatList
                ref={flatListRef}
                data={pages}
                keyExtractor={(_, idx) => `page-${idx}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={PAGE_W}
                snapToAlignment="start"
                decelerationRate="fast"
                bounces={false}
                renderItem={renderPage}
                onMomentumScrollEnd={(e) => {
                    const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
                    setCurrentPage(page);
                }}
            />

            {/* Dot indicators */}
            {totalPages > 1 && (
                <View style={styles.dotsRow}>
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            activeOpacity={0.7}
                            onPress={() => {
                                flatListRef.current?.scrollToIndex({ index: i, animated: true });
                                setCurrentPage(i);
                            }}
                        >
                            <View
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: i === currentPage ? theme.colors.primary : '#CBD5E1',
                                        width: i === currentPage ? 16 : 5,
                                    },
                                ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: SECTION_H_PAD,
        paddingTop: 14,
        paddingBottom: 10,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.textMuted,
        letterSpacing: 0.5,
    },
    page: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    },
    item: {
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: 14,
        width: '25%',
        marginBottom: 20,
    },
    iconCircle: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    itemLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 14,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 0,
    },
    dot: {
        height: 4,
        borderRadius: 2,
        marginHorizontal: 3,
    },
});
