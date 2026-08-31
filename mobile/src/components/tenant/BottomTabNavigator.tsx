import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/tenantTheme';

// ── Dashboard 4-tab configuration ─────────────────────────────────────────────
const DASHBOARD_TABS = [
  { label: "Home", route: "Home", icon: "home" as const, color: "#7C3AED" },
  { label: "Dues", route: "Dues", icon: "wallet" as const, color: "#7C3AED" },
  { label: "Expenses", route: "Expenses", icon: "receipt" as const, color: "#7C3AED" },
  { label: "Notices", route: "Notices", icon: "megaphone" as const, color: "#7C3AED" },
];

// ── Growth Journey 4-tab configuration ────────────────────────────────────────
const GROWTH_TABS = [
  { label: "Learn", route: "GrowthLearn", icon: "sparkles" as const, color: "#6D4AFF" },
  { label: "Saved", route: "GrowthSavedStories", icon: "bookmark" as const, color: "#F59E0B" },
  { label: "Vocab", route: "GrowthVocabularyList", icon: "book" as const, color: "#7C3AED" },
  { label: "Progress", route: "GrowthStats", icon: "stats-chart" as const, color: "#10B981" },
];

const TAB_BAR_HEIGHT = 64;

const BottomTabNavigator = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeSwipePage, setActiveSwipePage] = useState(0);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TENANT_ACTIVE_PAGE', (pageIndex: number) => {
      setActiveSwipePage(pageIndex);
    });
    return () => sub.remove();
  }, []);

  // Growth Mode is active when on Growth screens or Home page 1
  const currentRouteName = state.routes[state.index]?.name;
  const isGrowthScreen = currentRouteName === 'GrowthSavedStories' || currentRouteName === 'GrowthVocabularyList' || currentRouteName === 'GrowthStats';
  const isGrowthMode = isGrowthScreen || (currentRouteName === 'Home' && activeSwipePage === 1);

  if (isGrowthMode) {
    return (
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {GROWTH_TABS.map((tab) => {
          const isLearn = tab.route === 'GrowthLearn';
          const isTabActive = isLearn
            ? (currentRouteName === 'Home' && activeSwipePage === 1)
            : (currentRouteName === tab.route);

          const iconName = isLearn
            ? (isTabActive ? 'sparkles' : 'sparkles-outline')
            : (isTabActive ? tab.icon : (`${tab.icon}-outline` as const));

          const handleGrowthPress = () => {
            if (isLearn) {
              if (currentRouteName !== 'Home') {
                navigation.navigate('Home');
              }
              DeviceEventEmitter.emit('TENANT_SCROLL_TO_PAGE', 1);
            } else {
              navigation.navigate(tab.route);
            }
          };

          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabItem}
              onPress={handleGrowthPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isTabActive }}
            >
              <View style={[styles.iconWrap, isTabActive && styles.iconWrapActive]}>
                <Ionicons
                  name={iconName as any}
                  size={22}
                  color={isTabActive ? (tab.color || theme.colors.primary) : theme.colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isTabActive ? (tab.color || theme.colors.primary) : theme.colors.textMuted },
                  isTabActive && styles.labelActive,
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

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {DASHBOARD_TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.route);
        if (routeIndex === -1) return null;

        const isHome = tab.route === 'Home';
        const isActive = isHome
          ? (currentRouteName === 'Home' && activeSwipePage === 0)
          : (state.index === routeIndex);

        const iconName = isActive ? tab.icon : (`${tab.icon}-outline` as const);

        const handlePress = () => {
          if (isHome) {
            if (currentRouteName !== 'Home') {
              navigation.navigate('Home');
            }
            DeviceEventEmitter.emit('TENANT_SCROLL_TO_PAGE', 0);
          } else {
            const route = state.routes[routeIndex];
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
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
