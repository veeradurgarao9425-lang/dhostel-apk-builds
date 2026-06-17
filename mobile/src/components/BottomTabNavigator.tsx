import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 4 tabs — each one is a UNIQUE destination not accessible from any home shortcut:
 *
 *  Home      → Dashboard overview
 *  Pending   → Dedicated pending-dues page (reminder + collect)
 *  Rooms     → Browse / search all rooms
 *  More      → Everything else (tenants list, finance, settings, profile…)
 *
 * Quick Management on Home = CREATE actions (Add Tenant form, Add Room form, Bills filter)
 * These tabs        = BROWSE / MANAGE destinations
 */

const TABS = [
    { label: 'Home',    icon: 'home',             iconOut: 'home-outline',            route: 'HomeTab'     },
    { label: 'Pending', icon: 'alert-circle',      iconOut: 'alert-circle-outline',    route: 'PendingTab'  },
    { label: 'More',    icon: 'grid',              iconOut: 'grid-outline',            route: 'MoreTab'     },
];

const ACTIVE   = '#7C3AED';
const INACTIVE = '#94A3B8';

const BottomTabNavigator = ({ state, navigation }: any) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 6 }]}>
            {TABS.map((tab, index) => {
                const isActive = state.routes[state.index]?.name === tab.route;
                const isPending = tab.route === 'PendingTab';

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
                        activeOpacity={0.7}
                    >
                        {/* Active pill at top */}
                        {isActive && <View style={styles.activePill} />}

                        <Ionicons
                            name={(isActive ? tab.icon : tab.iconOut) as any}
                            size={22}
                            color={isActive ? ACTIVE : (isPending ? '#DC2626' : INACTIVE)}
                        />

                        <Text style={[
                            styles.label,
                            {
                                color: isActive ? ACTIVE : (isPending ? '#DC2626' : INACTIVE),
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
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1E8FF',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 4,
        gap: 3,
        position: 'relative',
    },
    activePill: {
        position: 'absolute',
        top: -10,
        width: 28, height: 3,
        borderRadius: 2,
        backgroundColor: ACTIVE,
    },
    label: { fontSize: 9, marginTop: 1, letterSpacing: 0.2 },
});

export default BottomTabNavigator;
