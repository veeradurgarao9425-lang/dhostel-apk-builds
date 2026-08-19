import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TABS = [
  {
    label: 'Overview',
    route: 'DevDashboardTab',
    activeIcon: 'speedometer' as const,
    inactiveIcon: 'speedometer-outline' as const,
  },
  {
    label: 'Hostels',
    route: 'DevHostelsTab',
    activeIcon: 'business' as const,
    inactiveIcon: 'business-outline' as const,
  },
  {
    label: 'Owners',
    route: 'DevOwnersTab',
    activeIcon: 'people' as const,
    inactiveIcon: 'people-outline' as const,
  },
  {
    label: 'Students',
    route: 'DevStudentsTab',
    activeIcon: 'school' as const,
    inactiveIcon: 'school-outline' as const,
  },
  {
    label: 'Control',
    route: 'DevControlTab',
    activeIcon: 'apps' as const,
    inactiveIcon: 'apps-outline' as const,
  },
];

export const DeveloperBottomTabNavigator = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 24 : 14),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const tabConfig = TABS.find((t) => t.route === route.name);
        if (!tabConfig) return null;

        const isActive = state.index === index;
        const iconName = isActive ? tabConfig.activeIcon : tabConfig.inactiveIcon;

        const handlePress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={handlePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={tabConfig.label}
          >
            {/* Active indicator capsule */}
            {isActive && <View style={styles.topCapsule} />}

            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={iconName}
                size={21}
                color={isActive ? '#EA580C' : '#6B7280'}
              />
            </View>
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {tabConfig.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
    gap: 2,
  },
  tabItemActive: {
    transform: [{ scale: 1.02 }],
  },
  topCapsule: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#EA580C',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  labelInactive: {
    color: '#6B7280',
  },
});
