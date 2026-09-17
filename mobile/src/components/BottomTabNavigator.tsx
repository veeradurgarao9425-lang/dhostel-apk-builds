import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT } from '../theme/index';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Tab Config with High-Level Professional Icons & Badges ───────────────────
interface TabConfig {
    label: string;
    route: string;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
    getBadge?: (duesBadge: number) => { text: string; color: string } | null;
}

const TABS: TabConfig[] = [
    {
        label: 'Home',
        route: 'HomeTab',
        activeIcon: 'home',
        inactiveIcon: 'home-outline',
    },
    {
        label: 'Money',
        route: 'PendingDuesTab',
        activeIcon: 'wallet',
        inactiveIcon: 'wallet-outline',
        getBadge: (duesBadge: number) => {
            if (duesBadge > 0) {
                return {
                    text: duesBadge > 99 ? '99+ DUE' : `${duesBadge} DUE`,
                    color: '#EF4444',
                };
            }
            return null;
        },
    },
    {
        label: 'Students',
        route: 'StudentsTab',
        activeIcon: 'people',
        inactiveIcon: 'people-outline',
        getBadge: () => ({
            text: 'NEW',
            color: '#E11D48',
        }),
    },
    {
        label: 'Finance',
        route: 'OverviewTab',
        activeIcon: 'stats-chart',
        inactiveIcon: 'stats-chart-outline',
        getBadge: () => ({
            text: 'P&L',
            color: '#F59E0B',
        }),
    },
];

const TAB_BAR_HEIGHT = 62;

// ─── Component ────────────────────────────────────────────────────────────────
const BottomTabNavigator = ({ state, descriptors, navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const [duesBadge, setDuesBadge] = useState(0);

    const activeColor = theme?.primary || COLORS.primary || '#4F46E5';
    const inactiveColor = isDark ? '#94A3B8' : '#64748B';
    const barBg = isDark ? '#0F172A' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const pillBorderColor = isDark ? '#0F172A' : '#FFFFFF';

    useEffect(() => {
        // Fetch pending dues count for the Dues tab badge (only for owners/staff)
        if (user && user.role !== 'TENANT') {
            api.get('/monthly-fees/summary', { params: { onlyPending: 'true', page: 1, limit: 1 } })
                .then(res => {
                    const counts = res.data?.data?.tab_counts;
                    if (counts) setDuesBadge(counts.overdue || 0);
                })
                .catch(() => {});
        }
    }, [user?.role]);

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: barBg,
                borderTopColor: borderColor,
                paddingBottom: Math.max(insets.bottom, 8),
            },
        ]}>
            {state.routes.map((route: any, index: number) => {
                const tabConfig = TABS.find(t => t.route === route.name);
                if (!tabConfig) return null;

                // Dynamic Staff Tab Visibility Filtering
                const isStaff = user?.role === 'STAFF' || user?.role_id === 4;
                if (isStaff) {
                    let perms = (user as any)?.permissions;
                    if (typeof perms === 'string') {
                        try { perms = JSON.parse(perms); } catch (_) { perms = {}; }
                    }
                    perms = perms || {};

                    const hasAccess = (k: string) => {
                        const v = perms[k];
                        return v === 'manage' || v === 'view' || v === true || v === '1' || v === 1;
                    };

                    // Money / Dues Tab
                    if (route.name === 'PendingDuesTab' && !hasAccess('dues') && !hasAccess('finance')) {
                        return null;
                    }

                    // Students Tab
                    if (route.name === 'StudentsTab' && !hasAccess('students') && !hasAccess('tenants')) {
                        return null;
                    }

                    // Finance / Analytics Tab
                    if (route.name === 'OverviewTab' && !hasAccess('income') && !hasAccess('reports')) {
                        return null;
                    }
                }

                const isActive = state.index === index;
                const iconName = isActive ? tabConfig.activeIcon : tabConfig.inactiveIcon;
                const badgeInfo = tabConfig.getBadge ? tabConfig.getBadge(duesBadge) : null;

                const handlePress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isActive && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        style={styles.tabItem}
                        onPress={handlePress}
                        activeOpacity={0.72}
                        accessibilityRole="button"
                        accessibilityLabel={tabConfig.label}
                    >
                        {/* Subtle top indicator bar */}
                        {isActive && (
                            <View style={[styles.topIndicator, { backgroundColor: activeColor }]} />
                        )}

                        {/* High-level Icon with overlapping micro-badge */}
                        <View style={styles.iconContainer}>
                            <Ionicons
                                name={iconName}
                                size={24}
                                color={isActive ? activeColor : inactiveColor}
                            />

                            {/* Consumer-app style micro capsule pill badge */}
                            {badgeInfo && (
                                <View style={[
                                    styles.microBadge,
                                    {
                                        backgroundColor: badgeInfo.color,
                                        borderColor: pillBorderColor,
                                    },
                                ]}>
                                    <Text style={styles.microBadgeText}>
                                        {badgeInfo.text}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Tab Label */}
                        <Text
                            style={[
                                styles.label,
                                { color: isActive ? activeColor : inactiveColor },
                                isActive && styles.labelActive,
                            ]}
                            numberOfLines={1}
                        >
                            {t(`tabs.${tabConfig.label.toLowerCase()}`, { defaultValue: tabConfig.label })}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: StyleSheet.hairlineWidth * 1.5,
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        minHeight: TAB_BAR_HEIGHT,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 16,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 3,
        position: 'relative',
        minHeight: TAB_BAR_HEIGHT - 8,
    },
    topIndicator: {
        position: 'absolute',
        top: -6,
        width: 22,
        height: 3,
        borderRadius: 2,
    },
    iconContainer: {
        width: 44,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    label: {
        fontSize: 11,
        letterSpacing: 0.2,
        fontWeight: '600',
        marginTop: 2,
    },
    labelActive: {
        fontWeight: '800',
    },
    microBadge: {
        position: 'absolute',
        bottom: -5,
        alignSelf: 'center',
        paddingHorizontal: 4.5,
        paddingVertical: 1,
        borderRadius: 8,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 4,
    },
    microBadgeText: {
        color: '#FFFFFF',
        fontSize: 7.5,
        fontWeight: '900',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
});

export default BottomTabNavigator;

