import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, SHADOW } from '../theme/index';

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
        activeIcon: 'menu' as const,
        inactiveIcon: 'menu-outline' as const,
    },
];

const TAB_BAR_HEIGHT = 60;

// ─── Component ────────────────────────────────────────────────────────────────
const BottomTabNavigator = ({ state, navigation }: any) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 8) },
        ]}>
            {TABS.map((tab, index) => {
                const isActive = state.routes[state.index]?.name === tab.route;
                const iconName = isActive ? tab.activeIcon : tab.inactiveIcon;

                const handlePress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: tab.route,
                        canPreventDefault: true,
                    });
                    if (!isActive && !event.defaultPrevented) {
                        navigation.navigate(tab.route);
                    }
                };

                return (
                    <TouchableOpacity
                        key={index}
                        style={styles.tabItem}
                        onPress={handlePress}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={tab.label}
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
                                color={isActive ? COLORS.primary : COLORS.textMuted}
                            />
                        </View>

                        <Text style={[
                            styles.label,
                            { color: isActive ? COLORS.primary : COLORS.textMuted },
                            isActive && styles.labelActive,
                        ]}>
                            {tab.label}
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
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        minHeight: TAB_BAR_HEIGHT,
        ...SHADOW.sheet,
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
