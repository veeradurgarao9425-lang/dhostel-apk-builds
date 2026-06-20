import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle, Rect, Path, G, Ellipse, Line, Defs, RadialGradient, Stop,
} from 'react-native-svg';
import { AppButton } from './AppButton';
import { COLORS, FONT, SPACING } from '../../theme/index';

// ─── Types ────────────────────────────────────────────────────────────────────
type EmptyVariant = 'noStudents' | 'noRooms' | 'noResults' | 'noData' | 'noInternet';

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// ─── SVG Illustrations ────────────────────────────────────────────────────────
const NoStudentsSvg = () => (
  <Svg width="160" height="130" viewBox="0 0 160 130">
    {/* Ground */}
    <Ellipse cx="80" cy="118" rx="60" ry="8" fill={COLORS.primaryLight} />
    {/* Body 1 */}
    <Circle cx="55" cy="60" r="16" fill={COLORS.primaryLight} />
    <Circle cx="55" cy="38" r="12" fill={COLORS.primary} opacity="0.5" />
    <Rect x="43" y="72" width="24" height="32" rx="8" fill={COLORS.primaryLight} />
    {/* Body 2 */}
    <Circle cx="105" cy="62" r="16" fill={COLORS.primaryLight} />
    <Circle cx="105" cy="40" r="12" fill={COLORS.primary} opacity="0.5" />
    <Rect x="93" y="74" width="24" height="32" rx="8" fill={COLORS.primaryLight} />
    {/* Plus icon */}
    <Circle cx="80" cy="75" r="16" fill={COLORS.primary} />
    <Rect x="75" y="69" width="10" height="3" rx="1.5" fill="white" />
    <Rect x="78.5" y="65.5" width="3" height="10" rx="1.5" fill="white" />
  </Svg>
);

const NoRoomsSvg = () => (
  <Svg width="160" height="130" viewBox="0 0 160 130">
    <Ellipse cx="80" cy="118" rx="60" ry="8" fill={COLORS.primaryLight} />
    {/* House */}
    <Path d="M80 30 L120 65 L120 105 L40 105 L40 65 Z" fill={COLORS.primaryLight} />
    <Path d="M80 22 L130 68 L115 68 L80 38 L45 68 L30 68 Z" fill={COLORS.primary} opacity="0.4" />
    {/* Door */}
    <Rect x="68" y="80" width="24" height="25" rx="4" fill={COLORS.primary} opacity="0.5" />
    {/* Windows */}
    <Rect x="46" y="72" width="16" height="16" rx="3" fill={COLORS.primary} opacity="0.3" />
    <Rect x="98" y="72" width="16" height="16" rx="3" fill={COLORS.primary} opacity="0.3" />
    {/* Plus */}
    <Circle cx="117" cy="38" r="13" fill={COLORS.primary} />
    <Rect x="112" y="34" width="10" height="3" rx="1.5" fill="white" />
    <Rect x="115.5" y="30.5" width="3" height="10" rx="1.5" fill="white" />
  </Svg>
);

const NoResultsSvg = () => (
  <Svg width="160" height="130" viewBox="0 0 160 130">
    <Ellipse cx="80" cy="118" rx="55" ry="7" fill={COLORS.primaryLight} />
    {/* Magnifier */}
    <Circle cx="72" cy="58" r="32" fill={COLORS.primaryLight} stroke={COLORS.primary} strokeWidth="3" strokeOpacity="0.4" />
    <Circle cx="72" cy="58" r="22" fill={COLORS.surface} />
    {/* X inside */}
    <Line x1="64" y1="50" x2="80" y2="66" stroke={COLORS.primary} strokeWidth="3" strokeLinecap="round" />
    <Line x1="80" y1="50" x2="64" y2="66" stroke={COLORS.primary} strokeWidth="3" strokeLinecap="round" />
    {/* Handle */}
    <Rect x="95" y="82" width="20" height="7" rx="3.5" fill={COLORS.primary} opacity="0.6" transform="rotate(45 95 82)" />
  </Svg>
);

const NoDataSvg = () => (
  <Svg width="160" height="130" viewBox="0 0 160 130">
    <Ellipse cx="80" cy="118" rx="55" ry="7" fill={COLORS.primaryLight} />
    {/* Box */}
    <Rect x="35" y="55" width="90" height="60" rx="8" fill={COLORS.primaryLight} />
    <Path d="M35 63 L80 85 L125 63" stroke={COLORS.primary} strokeWidth="2" strokeOpacity="0.4" fill="none" />
    {/* Lid */}
    <Path d="M30 55 L80 35 L130 55 L80 75 Z" fill={COLORS.primary} opacity="0.3" />
    {/* Question mark */}
    <Circle cx="80" cy="88" r="10" fill={COLORS.primary} opacity="0.15" />
    <Text style={{ fontSize: 14 }}>
      <Path d="M77 83 Q80 79 83 83 Q83 86 80 87" stroke={COLORS.primary} strokeWidth="2" fill="none" />
    </Text>
  </Svg>
);

const NoInternetSvg = () => (
  <Svg width="160" height="130" viewBox="0 0 160 130">
    <Ellipse cx="80" cy="118" rx="55" ry="7" fill={COLORS.primaryLight} />
    {/* WiFi arcs */}
    <Path d="M52 72 Q80 52 108 72" stroke={COLORS.primary} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.2" />
    <Path d="M62 84 Q80 70 98 84" stroke={COLORS.primary} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.4" />
    <Path d="M70 96 Q80 88 90 96" stroke={COLORS.primary} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />
    <Circle cx="80" cy="105" r="4" fill={COLORS.primary} opacity="0.6" />
    {/* Slash */}
    <Line x1="42" y1="48" x2="115" y2="112" stroke={COLORS.error} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    {/* Cloud outline */}
    <Path d="M45 58 Q44 40 62 40 Q65 30 80 30 Q100 30 100 48 Q115 48 115 62 Q115 76 100 76 L60 76 Q45 76 45 62 Z" fill={COLORS.primaryLight} opacity="0.6" />
  </Svg>
);

// ─── Variant config ───────────────────────────────────────────────────────────
const VARIANTS: Record<EmptyVariant, { title: string; subtitle: string; Illustration: React.FC }> = {
  noStudents: {
    title: 'No Students Yet',
    subtitle: 'Add your first tenant to get started managing your hostel.',
    Illustration: NoStudentsSvg,
  },
  noRooms: {
    title: 'No Rooms Found',
    subtitle: 'Create rooms to start allocating tenants and tracking occupancy.',
    Illustration: NoRoomsSvg,
  },
  noResults: {
    title: 'No Results Found',
    subtitle: 'Try a different search term or clear your filters.',
    Illustration: NoResultsSvg,
  },
  noData: {
    title: 'Nothing Here Yet',
    subtitle: 'Data will appear here once activity starts.',
    Illustration: NoDataSvg,
  },
  noInternet: {
    title: 'No Internet Connection',
    subtitle: 'Check your connection and tap retry to load.',
    Illustration: NoInternetSvg,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'noData',
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const config = VARIANTS[variant];
  const { Illustration } = config;

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <Illustration />
      </View>
      <Text style={styles.title}>{title ?? config.title}</Text>
      <Text style={styles.subtitle}>{subtitle ?? config.subtitle}</Text>
      {actionLabel && onAction && (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          size="md"
          style={styles.cta}
          fullWidth={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.xxl,
  },
  illustration: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  cta: {
    paddingHorizontal: SPACING.xxl,
  },
});

export default EmptyState;
