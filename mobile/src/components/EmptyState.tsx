/**
 * EmptyState.tsx — Shared empty/no-data display for all list screens.
 *
 * Before: Each screen had its own empty card with hard-coded emoji, title, subtitle.
 * After: <EmptyState icon="📭" title="No Transactions" subtitle="Try a different filter." />
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface EmptyStateProps {
    /** Emoji or text icon shown large at the top */
    icon?: string;
    /** Image source name for illustration */
    illustration?: 'megaphone' | 'pinboard' | 'bell' | 'mailbox' | 'clipboard';
    title: string;
    subtitle?: string;
    /** Extra content to render below subtitle (e.g. a retry button) */
    children?: React.ReactNode;
}

const illustrations = {
    megaphone: require('../../assets/images/empty_megaphone.jpg'),
    pinboard: require('../../assets/images/empty_pinboard.jpg'),
    bell: require('../../assets/images/empty_bell.jpg'),
    mailbox: require('../../assets/images/empty_mailbox.jpg'),
    clipboard: require('../../assets/images/empty_clipboard.jpg'),
};

export function EmptyState({ icon = '📭', illustration, title, subtitle, children }: EmptyStateProps) {
    return (
        <View style={styles.container}>
            {illustration ? (
                <Image source={illustrations[illustration]} style={styles.illustration} resizeMode="contain" />
            ) : (
                <Text style={styles.icon}>{icon}</Text>
            )}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginHorizontal: 2,
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    illustration: {
        width: 140,
        height: 140,
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
});
