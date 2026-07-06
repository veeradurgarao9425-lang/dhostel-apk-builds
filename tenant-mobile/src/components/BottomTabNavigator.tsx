import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Wallet, TrendingUp, Megaphone, House, BadgeIndianRupee, ReceiptText, HandCoins, FileSpreadsheet, ClipboardList, MessageSquareWarning, BellDot, Sparkles, CircleDollarSign, Landmark } from 'lucide-react-native';

// ── 4-tab configuration ───────────────────────────────────────────────────────
const TABS = [
  { label: "Home", route: "Home", Icon: House },
  { label: "Dues", route: "Dues", Icon: HandCoins },
  { label: "Expenses", route: "Expenses", Icon: ReceiptText },
  { label: "Notices", route: "Notices", Icon: Megaphone },
];

const TAB_BAR_HEIGHT = 64;
const PRIMARY_BLUE = '#2952F3';
const PRIMARY_SOFT = '#EEF2FF';
const GREY = '#6B7280';

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
                color={isActive ? PRIMARY_BLUE : GREY}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            </View>

            {/* Label */}
            <Text
              style={[
                styles.label,
                { color: isActive ? PRIMARY_BLUE : GREY },
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
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
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: PRIMARY_SOFT,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
});

export default BottomTabNavigator;
