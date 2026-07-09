import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IconGlowBadge from '../../components/ui/IconGlowBadge';

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
            <Text style={styles.sectionTitle}>Shortcuts</Text>
            <View style={styles.shortcutGrid}>
                {shortcuts.map((sc) => {
                    return (
                        <TouchableOpacity key={sc.id} style={styles.shortcutItem} onPress={() => navigation.navigate(sc.nav)}>
                            <IconGlowBadge
                                Icon={sc.icon}
                                gradient={sc.gradient}
                                glowColor={sc.color}
                                flatColor={sc.color}
                                flatBg={sc.bg}
                                size="md"
                                entrance
                                style={{ marginBottom: 8 }}
                            />
                            <Text style={styles.shortcutText}>{sc.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 28,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16,
    },
    shortcutGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12,
        paddingHorizontal: 4,
    },
    shortcutItem: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 16,
    },
    shortcutText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
});
