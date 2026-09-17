import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HostixBrand } from './HostixBrand';
import { APP_VERSION, APP_BUILD, APP_TAGLINE } from '../constants/appVersion';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck } from 'lucide-react-native';

interface AppVersionFooterProps {
    showTagline?: boolean;
    style?: any;
}

export const AppVersionFooter: React.FC<AppVersionFooterProps> = ({
    showTagline = true,
    style,
}) => {
    const { isDark, theme } = useTheme();
    const { showSuccess } = useToast();

    const handlePress = () => {
        showSuccess(`Hostix v${APP_VERSION} (Build ${APP_BUILD}) · Official Play Store Release`);
    };

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <HostixBrand fontSize={22} subtitle="PG OS" lightTheme={!isDark} />

            <View style={styles.badgeRow}>
                <View style={[
                    styles.versionPill,
                    {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                ]}>
                    <View style={styles.statusDot} />
                    <Text style={[styles.versionText, { color: theme.textPrimary }]}>
                        v{APP_VERSION} ({APP_BUILD})
                    </Text>
                    <View style={styles.pillDivider} />
                    <ShieldCheck size={12} color="#10B981" />
                    <Text style={styles.releaseText}>Official</Text>
                </View>
            </View>

            {showTagline && (
                <Text style={[styles.tagline, { color: theme.textSecondary }]}>
                    {APP_TAGLINE}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
        gap: 6,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    versionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    versionText: {
        fontSize: 11,
        fontWeight: '700',
    },
    pillDivider: {
        width: 1,
        height: 10,
        backgroundColor: '#CBD5E1',
    },
    releaseText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#10B981',
    },
    tagline: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default AppVersionFooter;
