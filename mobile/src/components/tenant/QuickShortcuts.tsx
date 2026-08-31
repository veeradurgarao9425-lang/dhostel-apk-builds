import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_PADDING = 12;
// Page width is exactly the usable inner card width
const PAGE_W = SCREEN_W - (CARD_MARGIN * 2) - (CARD_PADDING * 2);

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

const NAV_MAP: Record<string, string> = {
    Dues: 'Dues',
    Splits: 'Splits',
    Complaints: 'Complaints',
    RoomInfo: 'RoomInfo',
    VisitorPass: 'VisitorPass',
    GatePass: 'VisitorPass',
    Documents: 'TenantDocuments',
    Notes: 'TenantNotes',
};

export const QuickShortcuts = ({ shortcuts }: QuickShortcutsProps) => {
    const navigation = useNavigation<any>();
    const [currentPage, setCurrentPage] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Chunk shortcuts into pages of 4 items each
    const pages: ShortcutItem[][] = [];
    for (let i = 0; i < shortcuts.length; i += 4) {
        pages.push(shortcuts.slice(i, i + 4));
    }
    const totalPages = pages.length;

    const handlePress = (targetNav: string) => {
        const dest = NAV_MAP[targetNav] || targetNav;
        navigation.navigate(dest);
    };

    const renderPage = ({ item }: { item: ShortcutItem[] }) => (
        <View style={[styles.pageRow, { width: PAGE_W }]}>
            {item.map((sc) => (
                <TouchableOpacity
                    key={sc.id}
                    style={styles.item}
                    onPress={() => handlePress(sc.nav)}
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
                    <Ionicons name="flash" size={12} color="#7C3AED" />
                    <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                </View>
            </View>

            {/* Paged FlatList — 4 items per page */}
            <FlatList
                ref={flatListRef}
                data={pages}
                keyExtractor={(_, idx) => `page-${idx}`}
                horizontal
                pagingEnabled
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
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

            {/* Page indicator dots */}
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
                                        backgroundColor: i === currentPage ? '#7C3AED' : '#CBD5E1',
                                        width: i === currentPage ? 16 : 6,
                                    }
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
        marginHorizontal: CARD_MARGIN,
        paddingTop: 14,
        paddingBottom: 10,
        paddingHorizontal: CARD_PADDING,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    pageRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    item: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    itemLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 14,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
    },
    dot: {
        height: 5,
        borderRadius: 3,
    },
});

export default QuickShortcuts;




