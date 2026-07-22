import React from 'react';
import { ViewStyle } from 'react-native';
import { getCategoryTheme } from '../../constants/';
import IconGlowBadge, { GlowBadgeSize } from './IconGlowBadge';

interface CategoryGlowBadgeProps {
  category: string;
  size?: GlowBadgeSize;
  active?: boolean;
  pulse?: boolean;
  entrance?: boolean;
  style?: ViewStyle;
}

/** Category-themed gradient/glow icon badge — looks up gradient, glow color, and icon from categoryTheme. */
export default function CategoryGlowBadge({
  category, size = 'md', active = true, pulse = false, entrance = false, style,
}: CategoryGlowBadgeProps) {
  const theme = getCategoryTheme(category);
  return (
    <IconGlowBadge
      Icon={theme.Icon}
      gradient={theme.gradient}
      glowColor={theme.glowColor}
      flatColor={theme.color}
      flatBg={theme.bg}
      premium={theme.premium}
      size={size}
      active={active}
      pulse={pulse}
      entrance={entrance}
      style={style}
    />
  );
}
