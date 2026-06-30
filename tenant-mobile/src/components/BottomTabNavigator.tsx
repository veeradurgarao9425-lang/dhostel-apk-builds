import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CreditCard, PieChart, Megaphone } from 'lucide-react-native';
import { colors, shadow, radius } from '../theme/index';

// ── 4-tab configuration ───────────────────────────────────────────────────────
const TABS = [
  { label: 'Home',     route: 'Home',     Icon: Home     },
  { label: 'Dues',     route: 'Dues',     Icon: CreditCard },
  { label: 'Expenses', route: 'Expenses', Icon: PieChart  },
  { label: 'Notices',  route: 'Notices',  Icon: Megaphone },
];

const TAB_BAR_HEIGHT = 64;

const BottomTabNavigator = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();

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
            {/* Icon */}
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon
                size={24}
                color={isActive ? colors.primary : colors.textMuted}
                strokeWidth={isActive ? 2.5 : 1.8}
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
    gap: 4,
    position: 'relative',
    minHeight: TAB_BAR_HEIGHT - 8,
  },
  // Active pill background (soft brown)
  iconWrap: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '800',
    color: colors.primary,
  },
});

export default BottomTabNavigator;
