import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
    activeIcon: 'person-circle' as const,
    inactiveIcon: 'person-circle-outline' as const,
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
          paddingBottom: Math.max(insets.bottom + 14, Platform.OS === 'ios' ? 32 : 24),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const tabConfig = TABS.find((t) => t.route === route.name);
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
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={tabConfig.label}
          >
            {/* Active indicator pill at top */}
            {isActive && <View style={styles.topPill} />}

            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={iconName}
                size={22}
                color={isActive ? '#C2410C' : '#8C7A6B'}
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
    borderTopColor: '#EFE7DC',
    paddingTop: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
    gap: 3,
  },
  topPill: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C2410C',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    transform: [{ scale: 1.06 }],
  },
  label: {
    fontSize: 10.5,
    marginTop: 1,
    fontWeight: '600',
  },
  labelActive: {
    color: '#C2410C',
    fontWeight: '800',
  },
  labelInactive: {
    color: '#8C7A6B',
  },
});
