/**
 * DevCharts — the visual vocabulary for developer financial + network data.
 *
 * Deliberately a small, fixed set so the dashboard, the money screen and the
 * assistant's chat answers all speak the same language:
 *
 *   DevRankBar      ranked horizontal bars — "who pays the most / least"
 *   DevTrendChart   grouped monthly columns — income vs expense over time
 *   DevDonut        one-or-many-segment ring — composition of a whole
 *   DevSplitBar     a single 100%-wide stacked bar — paid vs pending
 *   DevGauge        semicircle gauge — a single rate (collection %, occupancy %)
 *
 * All are pure SVG (react-native-svg is already a dependency), size to their
 * container via a `width` prop, and degrade to an inline "no data yet" line
 * rather than rendering an empty axis.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Rect, Path, Line } from 'react-native-svg';
import { devColors, devRadius, inrCompact } from '../../theme/devTheme';

const NoData: React.FC<{ label?: string }> = ({ label = 'No data recorded yet' }) => (
  <View style={s.noData}>
    <Text style={s.noDataText}>{label}</Text>
  </View>
);

// ─── Ranked horizontal bars ──────────────────────────────────────────────────
export interface RankItem {
  label: string;
  value: number;
  /** Optional second value drawn as a lighter track behind `value`. */
  target?: number;
  sublabel?: string;
  color?: string;
}

/**
 * "Revenue by hostel" style ranking. Bars are scaled to the largest value in
 * the set (or the largest `target`, so a partly-collected hostel still shows
 * how much of its agreed amount is missing).
 */
export const DevRankBar: React.FC<{
  items: RankItem[];
  max?: number;
  formatValue?: (n: number) => string;
  limit?: number;
}> = ({ items, max, formatValue = inrCompact, limit = 8 }) => {
  const list = items.slice(0, limit);
  if (list.length === 0) return <NoData />;

  const peak =
    max ??
    Math.max(
      1,
      ...list.map((i) => Math.max(Number(i.value) || 0, Number(i.target) || 0))
    );

  return (
    <View style={{ gap: 10 }}>
      {list.map((item, idx) => {
        const value = Math.max(0, Number(item.value) || 0);
        const target = Math.max(0, Number(item.target) || 0);
        const valuePct = Math.min(100, (value / peak) * 100);
        const targetPct = Math.min(100, (target / peak) * 100);
        const color = item.color || devColors.brand;

        return (
          <View key={`${item.label}-${idx}`}>
            <View style={s.rankLabelRow}>
              <Text style={s.rankLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[s.rankValue, { color }]}>{formatValue(value)}</Text>
            </View>
            <View style={s.rankTrack}>
              {targetPct > 0 && (
                <View style={[s.rankTargetFill, { width: `${targetPct}%` }]} />
              )}
              <View
                style={[s.rankValueFill, { width: `${valuePct}%`, backgroundColor: color }]}
              />
            </View>
            {!!item.sublabel && (
              <Text style={s.rankSub} numberOfLines={1}>
                {item.sublabel}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

// ─── Grouped monthly trend ───────────────────────────────────────────────────
export interface TrendMonth {
  month: string;
  income: number;
  expenses: number;
  net?: number;
}

export const DevTrendChart: React.FC<{
  data: TrendMonth[];
  width: number;
  height?: number;
}> = ({ data, width, height = 130 }) => {
  if (!data || data.length === 0) return <NoData label="No monthly history yet" />;

  const peak = Math.max(
    1,
    ...data.map((d) => Math.max(Number(d.income) || 0, Number(d.expenses) || 0))
  );
  const hasAnyValue = data.some((d) => (Number(d.income) || 0) + (Number(d.expenses) || 0) > 0);
  if (!hasAnyValue) return <NoData label="No income or expenses recorded yet" />;

  const chartW = Math.max(120, width);
  const plotH = height - 22; // leave room for the month labels
  const slot = chartW / data.length;
  const barW = Math.max(6, Math.min(14, slot / 3.4));
  const gap = 3;

  return (
    <View>
      <Svg width={chartW} height={height}>
        {/* Three faint gridlines give the columns a readable baseline. */}
        {[0, 0.5, 1].map((f) => (
          <Line
            key={f}
            x1={0}
            y1={plotH - plotH * f}
            x2={chartW}
            y2={plotH - plotH * f}
            stroke={devColors.divider}
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const income = Math.max(0, Number(d.income) || 0);
          const expenses = Math.max(0, Number(d.expenses) || 0);
          const incomeH = Math.max(income > 0 ? 2 : 0, (income / peak) * plotH);
          const expenseH = Math.max(expenses > 0 ? 2 : 0, (expenses / peak) * plotH);
          const centre = i * slot + slot / 2;
          return (
            <G key={`${d.month}-${i}`}>
              <Rect
                x={centre - barW - gap / 2}
                y={plotH - incomeH}
                width={barW}
                height={incomeH}
                rx={2.5}
                fill={devColors.success}
              />
              <Rect
                x={centre + gap / 2}
                y={plotH - expenseH}
                width={barW}
                height={expenseH}
                rx={2.5}
                fill={devColors.danger}
              />
            </G>
          );
        })}
      </Svg>

      <View style={[s.trendLabels, { width: chartW }]}>
        {data.map((d, i) => (
          <Text key={`${d.month}-lbl-${i}`} style={s.trendLabel} numberOfLines={1}>
            {d.month}
          </Text>
        ))}
      </View>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: devColors.success }]} />
          <Text style={s.legendText}>Received</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: devColors.danger }]} />
          <Text style={s.legendText}>Expenses</Text>
        </View>
        <Text style={s.legendPeak}>peak {inrCompact(peak)}</Text>
      </View>
    </View>
  );
};

// ─── Donut ───────────────────────────────────────────────────────────────────
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * Multi-segment ring. Segments are laid out by their true share of the total —
 * no per-segment minimum, because inflating a small slice to stay visible is
 * exactly how a chart starts lying about the data.
 */
export const DevDonut: React.FC<{
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerLabel: string;
}> = ({ segments, size = 116, strokeWidth = 13, centerValue, centerLabel }) => {
  const total = segments.reduce((a, seg) => a + Math.max(0, Number(seg.value) || 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let rotation = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={devColors.neutralTint}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {total > 0 && (
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {segments.map((seg, idx) => {
              const value = Math.max(0, Number(seg.value) || 0);
              if (value <= 0) return null;
              const share = value / total;
              const thisRotation = rotation;
              rotation += share * 360;
              return (
                <Circle
                  key={`${seg.label}-${idx}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - share * circumference}
                  fill="transparent"
                  rotation={thisRotation}
                  origin={`${size / 2}, ${size / 2}`}
                />
              );
            })}
          </G>
        )}
      </Svg>
      <View style={s.donutCenter}>
        <Text style={s.donutValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {centerValue}
        </Text>
        <Text style={s.donutLabel} numberOfLines={1}>
          {centerLabel}
        </Text>
      </View>
    </View>
  );
};

/** Legend rows for a DevDonut — percentages computed from the same values. */
export const DevDonutLegend: React.FC<{ segments: DonutSegment[]; formatValue?: (n: number) => string }> = ({
  segments,
  formatValue,
}) => {
  const total = segments.reduce((a, seg) => a + Math.max(0, Number(seg.value) || 0), 0);
  return (
    <View style={{ flex: 1, gap: 7 }}>
      {segments.map((seg, idx) => {
        const value = Math.max(0, Number(seg.value) || 0);
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
          <View key={`${seg.label}-${idx}`} style={s.donutLegendRow}>
            <View style={[s.legendDot, { backgroundColor: seg.color }]} />
            <Text style={s.donutLegendLabel} numberOfLines={1}>
              {seg.label}
            </Text>
            <Text style={[s.donutLegendValue, { color: seg.color }]}>
              {formatValue ? formatValue(value) : value}
            </Text>
            <Text style={s.donutLegendPct}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Stacked split bar ───────────────────────────────────────────────────────
/** One full-width bar split into parts — best for a two- or three-way share. */
export const DevSplitBar: React.FC<{
  parts: Array<{ label: string; value: number; color: string }>;
  height?: number;
  formatValue?: (n: number) => string;
}> = ({ parts, height = 12, formatValue = inrCompact }) => {
  const total = parts.reduce((a, p) => a + Math.max(0, Number(p.value) || 0), 0);
  if (total <= 0) return <NoData />;

  return (
    <View style={{ gap: 8 }}>
      <View style={[s.splitTrack, { height, borderRadius: height / 2 }]}>
        {parts.map((p, idx) => {
          const value = Math.max(0, Number(p.value) || 0);
          if (value <= 0) return null;
          return (
            <View
              key={`${p.label}-${idx}`}
              style={{ flex: value, backgroundColor: p.color }}
            />
          );
        })}
      </View>
      <View style={s.splitLegend}>
        {parts.map((p, idx) => {
          const value = Math.max(0, Number(p.value) || 0);
          const pct = Math.round((value / total) * 100);
          return (
            <View key={`${p.label}-lg-${idx}`} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: p.color }]} />
              <Text style={s.splitLegendText}>
                {p.label} {formatValue(value)} ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Semicircle gauge ────────────────────────────────────────────────────────
/** A single rate, 0-100. Used for collection rate and occupancy. */
export const DevGauge: React.FC<{
  percent: number;
  label: string;
  size?: number;
  color?: string;
}> = ({ percent, label, size = 132, color = devColors.brand }) => {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const height = size / 2 + strokeWidth;

  // Semicircle from 180° to 0°, drawn as an arc so the sweep is exact.
  const arc = (fraction: number) => {
    const angle = Math.PI * (1 - Math.max(0, Math.min(1, fraction)));
    const x = cx + radius * Math.cos(angle);
    const y = cy - radius * Math.sin(angle);
    const largeArc = 0;
    return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y}`;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={height}>
        <Path
          d={arc(1)}
          stroke={devColors.neutralTint}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {pct > 0 && (
          <Path
            d={arc(pct / 100)}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
      <View style={s.gaugeCenter}>
        <Text style={[s.gaugeValue, { color }]}>{Math.round(pct)}%</Text>
        <Text style={s.gaugeLabel}>{label}</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  noData: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  noDataText: {
    color: devColors.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },

  rankLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  rankLabel: {
    color: devColors.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  rankValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  rankTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: devColors.neutralTint,
    overflow: 'hidden',
    position: 'relative',
  },
  rankTargetFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: devColors.neutralBorder,
  },
  rankValueFill: {
    height: '100%',
    borderRadius: 4,
  },
  rankSub: {
    color: devColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  trendLabels: {
    flexDirection: 'row',
    marginTop: -18,
  },
  trendLabel: {
    flex: 1,
    textAlign: 'center',
    color: devColors.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    color: devColors.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  legendPeak: {
    marginLeft: 'auto',
    color: devColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '64%',
  },
  donutValue: {
    color: devColors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  donutLabel: {
    color: devColors.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  donutLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  donutLegendLabel: {
    color: devColors.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  donutLegendValue: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  donutLegendPct: {
    color: devColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },

  splitTrack: {
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: devColors.neutralTint,
  },
  splitLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  splitLegendText: {
    color: devColors.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
  },

  gaugeCenter: {
    marginTop: -26,
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  gaugeLabel: {
    color: devColors.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
  },
});

export default DevRankBar;
