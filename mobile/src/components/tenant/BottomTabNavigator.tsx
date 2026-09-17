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

        const badgeText = tab.route === 'Dues' ? 'DUE' : tab.route === 'Notices' ? 'NEW' : null;
        const badgeColor = tab.route === 'Dues' ? '#EF4444' : '#E11D48';

        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tabItem}
            onPress={handlePress}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            {/* Active top line */}
            {isActive && (
              <View style={[styles.topIndicator, { backgroundColor: theme.colors.primary }]} />
            )}

            {/* High-level Icon with overlapping micro-badge */}
            <View style={styles.iconWrap}>
              <Ionicons
                name={iconName as any}
                size={23}
                color={isActive ? theme.colors.primary : theme.colors.textMuted}
              />
              {badgeText && (
                <View style={[styles.microBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.microBadgeText}>{badgeText}</Text>
                </View>
              )}
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
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
    borderTopColor: theme.colors.borderSoft,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: TAB_BAR_HEIGHT,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 16,
  },
  containerNight: {
    backgroundColor: '#0F172A',
    borderTopColor: '#334155',
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
  iconWrap: {
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
    color: theme.colors.primary,
  },
  microBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
