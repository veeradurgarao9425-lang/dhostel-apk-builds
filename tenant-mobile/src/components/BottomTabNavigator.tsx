import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, shadow } from '../theme/index';

// ── Tab configuration ─────────────────────────────────────────────────────────
const TABS = [
  {
    label: 'Home',
    route: 'Home',
    activeIcon: 'home' as const,
    inactiveIcon: 'home-outline' as const,
  },
  {
    label: 'Dues',
    route: 'Dues',
    activeIcon: 'document-text' as const,
    inactiveIcon: 'document-text-outline' as const,
  },
  {
    label: 'Expenses',
    route: 'Expenses',
    activeIcon: 'pie-chart' as const,
    inactiveIcon: 'pie-chart-outline' as const,
  },
  {
    label: 'Updates',
    route: 'Notices',
    activeIcon: 'megaphone' as const,
    inactiveIcon: 'megaphone-outline' as const,
  },
];

const TAB_BAR_HEIGHT = 64;

const BottomTabNavigator = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 6) },
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
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tabConfig.label}
            accessibilityState={{ selected: isActive }}
          >
            {/* Top indicator pill — visible only on active */}
            <View style={[styles.topIndicator, isActive && styles.topIndicatorActive]} />

            {/* Icon with active background pill */}
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={iconName}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    minHeight: TAB_BAR_HEIGHT,
    ...shadow.header,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 0,
    gap: 3,
    position: 'relative',
    minHeight: TAB_BAR_HEIGHT - 6,
  },
  // Top indicator pill — Material 3 style
  topIndicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  topIndicatorActive: {
    backgroundColor: colors.primary,
  },
  // Icon container — active gets a soft purple pill bg
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontSize: font.tiny,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});

export default BottomTabNavigator;
