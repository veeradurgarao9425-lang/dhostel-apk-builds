import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    House, AlertCircle, MoreHorizontal,
    Home, BellDot, LayoutGrid,
} from 'lucide-react-native';

const TABS = [
    {
        label: 'Home',
        route: 'HomeTab',
        ActiveIcon: House,
        InactiveIcon: Home,
        activeColor: '#7C3AED',
        activeBg: '#EDE9FE',
    },
    {
        label: 'Pending',
        route: 'PendingTab',
        ActiveIcon: BellDot,
        InactiveIcon: AlertCircle,
        activeColor: '#DC2626',
        activeBg: '#FEE2E2',
    },
    {
        label: 'More',
        route: 'MoreTab',
        ActiveIcon: LayoutGrid,
        InactiveIcon: MoreHorizontal,
        activeColor: '#7C3AED',
        activeBg: '#EDE9FE',
    },
];

const INACTIVE_COLOR = '#94A3B8';

const BottomTabNavigator = ({ state, navigation }: any) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 4 }]}>
            {TABS.map((tab, index) => {
                const isActive = state.routes[state.index]?.name === tab.route;
                const IconComp = isActive ? tab.ActiveIcon : tab.InactiveIcon;

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
                    >
                        {/* Active top pill indicator */}
                        {isActive && (
                            <View style={[styles.topPill, { backgroundColor: tab.activeColor }]} />
                        )}

                        {/* Icon container with glow background when active */}
                        <View style={[
                            styles.iconWrap,
                            isActive && { backgroundColor: tab.activeBg },
                        ]}>
                            <IconComp
                                size={22}
                                color={isActive ? tab.activeColor : INACTIVE_COLOR}
                                strokeWidth={isActive ? 2.2 : 1.8}
                            />
                        </View>

                        <Text style={[
                            styles.label,
                            {
                                color: isActive ? tab.activeColor : INACTIVE_COLOR,
                                fontWeight: isActive ? '700' : '500',
                            },
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
        bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1E8FF',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 6,
        gap: 4,
        position: 'relative',
        minHeight: 56,
    },
    topPill: {
        position: 'absolute',
        top: 0,
        width: 32,
        height: 3,
        borderRadius: 2,
    },
    iconWrap: {
        width: 44,
        height: 34,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 10,
        letterSpacing: 0.2,
        marginBottom: 2,
    },
});

export default BottomTabNavigator;
