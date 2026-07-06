import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, SHADOW } from '../theme/index';
import { useTranslation } from 'react-i18next';

// ─── Tab Config ───────────────────────────────────────────────────────────────
const TABS = [
    {
        label: 'Home',
        route: 'HomeTab',
        activeIcon: 'home' as const,
        inactiveIcon: 'home-outline' as const,
    },
    {
        label: 'Dues',
        route: 'PendingDuesTab',
        activeIcon: 'wallet' as const,
        inactiveIcon: 'wallet-outline' as const,
    },
    {
        label: 'Overview',
        route: 'OverviewTab',
        activeIcon: 'bar-chart' as const,
        inactiveIcon: 'bar-chart-outline' as const,
    },
    {
        label: 'More',
        route: 'MoreTab',
        activeIcon: 'apps' as const,
        inactiveIcon: 'apps-outline' as const,
    },
];

const TAB_BAR_HEIGHT = 60;

// ─── Component ────────────────────────────────────────────────────────────────
const BottomTabNavigator = ({ state, descriptors, navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    return (
        <View style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 8) },
        ]}>
            {state.routes.map((route: any, index: number) => {
                const tabConfig = TABS.find(t => t.route === route.name);
                if (!tabConfig) return null;

                const isActive = state.index === index;
                const iconName = isActive ? tabConfig.activeIcon : tabConfig.inactiveIcon;

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
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={tabConfig.label}
                    >
                        {/* Active indicator pill at top */}
                        {isActive && (
                            <View style={styles.topPill} />
                        )}

                        {/* Icon with subtle highlight background when active */}
                        <View style={[
                            styles.iconWrap,
                            isActive && styles.iconWrapActive,
                        ]}>
                            <Ionicons
                                name={iconName}
                                size={22}
                                color={isActive ? COLORS.primary : COLORS.textSecondary}
                            />
                        </View>

                        <Text style={[
                            styles.label,
                            { color: isActive ? COLORS.primary : COLORS.textSecondary },
                            isActive && styles.labelActive,
                        ]}>
                            {t(`tabs.${tabConfig.label.toLowerCase()}`)}
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
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.08)',
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        minHeight: TAB_BAR_HEIGHT,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 2,
        gap: 3,
        position: 'relative',
        minHeight: TAB_BAR_HEIGHT - 8,
    },
    topPill: {
        position: 'absolute',
        top: -8,
        width: 28,
        height: 3,
        borderRadius: COLORS.primary.length, // just full
        backgroundColor: COLORS.primary,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },
    iconWrap: {
        width: 42,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapActive: {
        backgroundColor: COLORS.primaryLight,
    },
    label: {
        fontSize: FONT.xs,
        letterSpacing: 0.1,
        fontWeight: FONT.medium,
    },
    labelActive: {
        fontWeight: FONT.semiBold,
    },
});

export default BottomTabNavigator;
