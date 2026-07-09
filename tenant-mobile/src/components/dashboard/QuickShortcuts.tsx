import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

interface QuickShortcutsProps {
    shortcuts: {
        id: string;
        name: string;
        icon: any;
        nav: string;
        bg: string;
        color: string;
        gradient: [string, string];
    }[];
}

export const QuickShortcuts = ({ shortcuts }: QuickShortcutsProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            </View>

            <View style={styles.shortcutRow}>
                {shortcuts.map((sc) => {
                    return (
                        <TouchableOpacity
                            key={sc.id}
                            style={styles.shortcutItem}
                            onPress={() => navigation.navigate(sc.nav)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconWrap, { backgroundColor: sc.bg }]}>
                                <sc.icon size={24} color={sc.color} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.shortcutText} numberOfLines={1}>{sc.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.textMuted,
        letterSpacing: 1.2,
    },
    shortcutRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    shortcutItem: {
        alignItems: 'center',
        width: '25%', // Exactly 4 items per row
        marginBottom: 16,
    },
    iconWrap: {
        width: 58,
        height: 58,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    shortcutText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        letterSpacing: -0.2,
    },
});
