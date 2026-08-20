/**
 * DevHeader — the one header used by every Developer / Master Admin screen.
 *
 * Replaces the per-screen copy of the near-black gradient + drop shadow + two
 * translucent "orb" overlays. That combination was the source of the dark shade
 * that looked like it was overlapping the content below the header:
 *   - the gradient itself was almost pure black (#18181B → #1C1917);
 *   - `shadowRadius: 12, shadowOpacity: 0.15, elevation: 8` on a rounded dark
 *     block bled a grey band over the first card on the screen;
 *   - the orbs were absolutely-positioned translucent circles that read as
 *     blotches rather than as lighting.
 * All three are gone. What is left is a deep-navy surface, a hairline bottom
 * border, and a 2px brand rule — nothing paints outside the header's own box.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { devColors, devRadius } from '../../theme/devTheme';

export interface DevHeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Renders a small dot on the icon. A number > 0 renders a count pill. */
  badge?: number | boolean;
  accessibilityLabel?: string;
  tint?: string;
}

interface DevHeaderProps {
  /** Small uppercase eyebrow above the title, e.g. "HOSTIX MASTER HQ". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Shows a back chevron on the left. */
  onBack?: () => void;
  /** Icon buttons on the right, laid out in order. */
  actions?: DevHeaderAction[];
  /** Initials avatar at the far right (usually the developer's). */
  avatarInitials?: string;
  onAvatarPress?: () => void;
  /** Rendered under the title row — search bars, segmented tabs, filter chips. */
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const DevHeader: React.FC<DevHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  onBack,
  actions,
  avatarInitials,
  onAvatarPress,
  children,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={devColors.headerTop} />
      <LinearGradient
        colors={[devColors.headerTop, devColors.headerBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 8) },
          style,
        ]}
      >
        <View style={styles.titleRow}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={20} color={devColors.onHeader} />
            </TouchableOpacity>
          )}

          <View style={styles.titleBlock}>
            {!!eyebrow && (
              <View style={styles.eyebrowRow}>
                <View style={styles.liveDot} />
                <Text style={styles.eyebrow} numberOfLines={1}>
                  {eyebrow}
                </Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          <View style={styles.actionsRow}>
            {(actions || []).map((action, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={action.onPress}
                style={styles.actionBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel || action.icon}
              >
                <Ionicons name={action.icon} size={18} color={action.tint || devColors.onHeader} />
                {typeof action.badge === 'number' && action.badge > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {action.badge > 9 ? '9+' : action.badge}
                    </Text>
                  </View>
                ) : action.badge === true ? (
                  <View style={styles.dotBadge} />
                ) : null}
              </TouchableOpacity>
            ))}

            {!!avatarInitials && (
              <TouchableOpacity
                onPress={onAvatarPress}
                style={styles.avatarBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Developer profile"
              >
                <Text style={styles.avatarText}>{avatarInitials}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {children}
      </LinearGradient>
      {/* Brand rule: a deliberate 2px separator instead of a bleeding shadow. */}
      <View style={styles.brandRule} />
    </>
  );
};

/** Search field styled for the header surface. Used by list screens. */
export const DevHeaderSurface: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.headerSurface, style]}>{children}</View>;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: devRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: devColors.onHeaderSubtle,
    borderWidth: 1,
    borderColor: devColors.onHeaderSubtleBorder,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: devColors.brandLight,
  },
  eyebrow: {
    color: devColors.brandLight,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  title: {
    color: devColors.onHeader,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: devColors.onHeaderMuted,
    fontSize: 11.5,
    marginTop: 1,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: devRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: devColors.onHeaderSubtle,
    borderWidth: 1,
    borderColor: devColors.onHeaderSubtleBorder,
  },
  dotBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: devColors.brandLight,
    borderWidth: 1.5,
    borderColor: devColors.headerTop,
  },
  countBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 8.5,
    backgroundColor: devColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: devColors.headerTop,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: devRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234, 88, 12, 0.22)',
    borderWidth: 1.5,
    borderColor: devColors.brandLight,
  },
  avatarText: {
    color: devColors.brandLight,
    fontSize: 12.5,
    fontWeight: '900',
  },
  brandRule: {
    height: 2,
    backgroundColor: devColors.brand,
  },
  headerSurface: {
    backgroundColor: devColors.onHeaderSubtle,
    borderWidth: 1,
    borderColor: devColors.onHeaderSubtleBorder,
    borderRadius: devRadius.md,
  },
});

export default DevHeader;
