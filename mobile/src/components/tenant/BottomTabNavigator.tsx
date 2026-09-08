import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../theme/tenantTheme';

// ── Standard 4-tab configuration for Dashboard ───────────────────────────────
const TABS = [
  { label: "Home", route: "Home", icon: "home" as const },
  { label: "Dues", route: "Dues", icon: "wallet" as const },
  { label: "Expenses", route: "Expenses", icon: "receipt" as const },
  { label: "Notices", route: "Notices", icon: "megaphone" as const },
];

const TAB_BAR_HEIGHT = 64;

const BottomTabNavigator = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [isGrowthMode, setIsGrowthMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('growth_night_mode').then((val) => {
      if (val !== null) setIsNightMode(val === '1');
    });

    const subPage = DeviceEventEmitter.addListener('TENANT_ACTIVE_PAGE', (page: string) => {
      setIsGrowthMode(page === 'growth');
    });

    const subNight = DeviceEventEmitter.addListener('GROWTH_NIGHT_MODE_CHANGED', (night: boolean) => {
      setIsNightMode(night);
    });

    return () => {
      subPage.remove();
      subNight.remove();
    };
  }, []);

  const currentRouteName = state.routes[state.index]?.name;
  const isGrowthRoute = currentRouteName === 'GrowthSavedStories' || currentRouteName === 'GrowthStats' || (isGrowthMode && currentRouteName === 'Home');

  // ── Growth Journey Bottom Bar: Switches dynamically when user is in Growth Journey or its sub-screens ──
  if (isGrowthRoute) {
    const growthTabs = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'grid-outline',
        color: '#6D28D9',
        onPress: () => {
          navigation.navigate('Home');
          DeviceEventEmitter.emit('SWITCH_TENANT_PAGE', 0);
        },
      },
      {
        id: 'night',
        label: isNightMode ? 'Day' : 'Night',
        icon: isNightMode ? 'sunny' : 'moon-outline',
        color: isNightMode ? '#FBBF24' : '#6D4AFF',
        onPress: () => {
          const next = !isNightMode;
          setIsNightMode(next);
          AsyncStorage.setItem('growth_night_mode', next ? '1' : '0');
          DeviceEventEmitter.emit('TOGGLE_GROWTH_NIGHT');
        },
      },
      {
        id: 'saved',
        label: 'Saved',
        icon: 'bookmark-outline',
        color: '#F59E0B',
        onPress: () => {
          navigation.navigate('GrowthSavedStories', { tab: 'saved' });
        },
      },
      {
        id: 'progress',
        label: 'Progress',
        icon: 'stats-chart-outline',
        color: '#10B981',
        onPress: () => {
          navigation.navigate('GrowthStats');
        },
      },
    ];

    return (
      <View
        style={[
          styles.container,
          isNightMode && styles.containerNight,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        {growthTabs.map((tab) => {
          const isActive =
            (tab.id === 'saved' && currentRouteName === 'GrowthSavedStories') ||
            (tab.id === 'progress' && currentRouteName === 'GrowthStats');
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={tab.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isNightMode ? (isActive ? '#334155' : '#1E293B') : (isActive ? '#EDE9FE' : '#F4F1FF') },
                ]}
              >
                <Ionicons name={tab.icon as any} size={20} color={tab.color} />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isNightMode ? (isActive ? '#F8FAFC' : '#94A3B8') : (isActive ? theme.colors.primary : '#64748B') },
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Standard Dashboard Bottom Bar ──────────────────────────────────────────
  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.route);
        if (routeIndex === -1) return null;

        const isActive = state.index === routeIndex;
        const iconName = isActive ? tab.icon : (`${tab.icon}-outline` as const);

        const handlePress = () => {
          const route = state.routes[routeIndex];
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
            key={tab.route}
            style={styles.tabItem}
            onPress={handlePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            {/* Icon */}
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={iconName as any}
                size={22}
                color={isActive ? theme.colors.primary : theme.colors.textMuted}
              />
            </View>

            {/* Label */}
            <Text
              style={[
                styles.label,
                { color: isActive ? theme.colors.primary : theme.colors.textMuted },
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
            >
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
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    minHeight: TAB_BAR_HEIGHT,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 8,
  },
  containerNight: {
    backgroundColor: '#0F172A',
    borderTopColor: '#334155',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    minHeight: TAB_BAR_HEIGHT - 8,
  },
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
});

export default BottomTabNavigator;
