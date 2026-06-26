import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, FileText, PieChart, Megaphone, User } from 'lucide-react-native';
import { colors, font, shadow, radius } from '../theme/index';

// ── 5-tab configuration ───────────────────────────────────────────────────────
const TABS = [
  {
    label: 'Home',
    route: 'Home',
    Icon: Home,
  },
  {
    label: 'Dues',
    route: 'Dues',
    Icon: FileText,
  },
  {
    label: 'Expenses',
    route: 'Expenses',
    Icon: PieChart,
  },
  {
    label: 'Notices',
    route: 'Notices',
    Icon: Megaphone,
  },
  {
    label: 'Profile',
    route: 'Profile',
    Icon: User,
  },
];

const TAB_BAR_HEIGHT = 68;

const BottomTabNavigator = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {TABS.map((tab, index) => {
        // Find the corresponding route index
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.route);
        if (routeIndex === -1) return null;

        const isActive = state.index === routeIndex;
        const { Icon } = tab;

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
            {/* Icon with active pill background */}
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
                strokeWidth={isActive ? 2 : 1.5}
              />
            </View>

            {/* Label */}
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.primary : colors.textMuted },
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    minHeight: TAB_BAR_HEIGHT,
    ...shadow.header,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
    minHeight: TAB_BAR_HEIGHT - 8,
  },
  // Icon container — active gets soft purple pill bg
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});

export default BottomTabNavigator;
