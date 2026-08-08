/**
 * AssistantResponse.tsx
 * Master response renderer — dispatches to the correct UI based on content block type.
 * All content blocks are pure display components; data is fetched by parent.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import * as RootNavigation from '../../navigation/navigationRef';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const INR = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
  trend?: string;
}

export interface ActionButton {
  label: string;
  icon?: string;
  screen?: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'danger';
}

export interface DueRecord {
  id: string | number;
  name: string;
  roomNumber?: string;
  amount: number;
  dueDate?: string;
  status: 'overdue' | 'pending' | 'paid';
  studentId?: number;
}

export interface TrendPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'stat_cards'; cards: StatCard[] }
  | { type: 'action_buttons'; buttons: ActionButton[] }
  | { type: 'due_list'; dues: DueRecord[]; onCollect?: (id: string | number) => void }
  | { type: 'financial_summary'; income: number; expenses: number; net: number; pending: number; collectionRate: number }
  | { type: 'trend_chart'; data: TrendPoint[] }
  | { type: 'occupancy_bar'; occupied: number; available: number; total: number; rate: number }
  | { type: 'steps'; title: string; steps: string[]; screen?: string; screenLabel?: string }
  | { type: 'empty_state'; icon: string; message: string; subMessage?: string; action?: ActionButton }
  | { type: 'error_state'; message: string; onRetry?: () => void }
  | { type: 'loading' };

interface AssistantResponseProps {
  blocks: ContentBlock[];
}

// ─── Skeleton Block ───────────────────────────────────────────────────────────
const SkeletonBlock = () => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ gap: 10, padding: 4 }}>
      {[90, 60, 75].map((w, i) => (
        <Animated.View
          key={i}
          style={{ height: 14, width: `${w}%`, borderRadius: 7, backgroundColor: '#E2E8F0', opacity: anim }}
        />
      ))}
    </View>
  );
};

// ─── Stat Cards ──────────────────────────────────────────────────────────────
const StatCardsBlock = ({ cards }: { cards: StatCard[] }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
    {cards.map((card, i) => (
      <View key={i} style={[st.statCard, { backgroundColor: card.bg }]}>
        <View style={[st.statIcon, { backgroundColor: card.color + '20' }]}>
          <Ionicons name={card.icon as any} size={18} color={card.color} />
        </View>
        <Text style={[st.statValue, { color: card.color }]} numberOfLines={1}>{card.value}</Text>
        <Text style={st.statLabel} numberOfLines={1}>{card.label}</Text>
        {card.trend ? <Text style={[st.statTrend, { color: card.color }]}>{card.trend}</Text> : null}
      </View>
    ))}
  </ScrollView>
);

// ─── Action Buttons ───────────────────────────────────────────────────────────
const ActionButtonsBlock = ({ buttons }: { buttons: ActionButton[] }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {buttons.map((btn, i) => {
      const isPrimary = btn.variant === 'primary' || !btn.variant;
      const isDanger = btn.variant === 'danger';
      return (
        <TouchableOpacity
          key={i}
          style={[
            st.actionBtn,
            isPrimary && !isDanger && st.actionBtnPrimary,
            !isPrimary && !isDanger && st.actionBtnOutline,
            isDanger && st.actionBtnDanger,
          ]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            if (btn.onPress) { btn.onPress(); return; }
            if (btn.screen) { RootNavigation.navigate(btn.screen); }
          }}
          activeOpacity={0.75}
        >
          {btn.icon && (
            <Ionicons
              name={btn.icon as any}
              size={14}
              color={isPrimary && !isDanger ? '#FFF' : isDanger ? '#EF4444' : '#4F46E5'}
              style={{ marginRight: 5 }}
            />
          )}
          <Text style={[
            st.actionBtnText,
            isPrimary && !isDanger && { color: '#FFF' },
            !isPrimary && !isDanger && { color: '#4F46E5' },
            isDanger && { color: '#EF4444' },
          ]}>
            {btn.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Due List ─────────────────────────────────────────────────────────────────
const DueListBlock = ({ dues, onCollect }: { dues: DueRecord[]; onCollect?: (id: string | number) => void }) => {
  if (dues.length === 0) return null;
  return (
    <View style={st.tableContainer}>
      <View style={st.tableHeader}>
        <Text style={[st.tableHeaderCell, { flex: 2 }]}>Student</Text>
        <Text style={[st.tableHeaderCell, { flex: 1 }]}>Room</Text>
        <Text style={[st.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Due</Text>
        <Text style={[st.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Status</Text>
      </View>
      {dues.map((due, i) => (
        <TouchableOpacity
          key={i}
          style={[st.tableRow, i % 2 === 1 && { backgroundColor: '#FAFAFA' }]}
          onPress={() => {
            if (due.studentId) {
              RootNavigation.navigate('StudentDetails', { studentId: due.studentId });
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[st.tableCell, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>{due.name}</Text>
          <Text style={[st.tableCell, { flex: 1 }]} numberOfLines={1}>{due.roomNumber || '—'}</Text>
          <Text style={[st.tableCell, { flex: 1.5, textAlign: 'right', color: '#EF4444', fontWeight: '700' }]}>
            {INR(due.amount)}
          </Text>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={[st.badge, { backgroundColor: due.status === 'overdue' ? '#FEE2E2' : '#FEF3C7' }]}>
              <Text style={[st.badgeText, { color: due.status === 'overdue' ? '#DC2626' : '#D97706' }]}>
                {due.status === 'overdue' ? 'Overdue' : 'Pending'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Financial Summary ────────────────────────────────────────────────────────
const FinancialSummaryBlock = ({ income, expenses, net, pending, collectionRate }: {
  income: number; expenses: number; net: number; pending: number; collectionRate: number;
}) => (
  <View style={st.financialContainer}>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={[st.finCard, { backgroundColor: '#ECFDF5', flex: 1 }]}>
        <Ionicons name="trending-up-outline" size={18} color="#10B981" />
        <Text style={[st.finAmount, { color: '#10B981' }]}>{INR(income)}</Text>
        <Text style={st.finLabel}>Income</Text>
      </View>
      <View style={[st.finCard, { backgroundColor: '#FEF2F2', flex: 1 }]}>
        <Ionicons name="trending-down-outline" size={18} color="#EF4444" />
        <Text style={[st.finAmount, { color: '#EF4444' }]}>{INR(expenses)}</Text>
        <Text style={st.finLabel}>Expenses</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
      <View style={[st.finCard, { backgroundColor: net >= 0 ? '#EEF2FF' : '#FFF1F2', flex: 1 }]}>
        <Ionicons name="wallet-outline" size={18} color={net >= 0 ? '#4F46E5' : '#EF4444'} />
        <Text style={[st.finAmount, { color: net >= 0 ? '#4F46E5' : '#EF4444' }]}>{INR(net)}</Text>
        <Text style={st.finLabel}>Net Profit</Text>
      </View>
      <View style={[st.finCard, { backgroundColor: '#FFFBEB', flex: 1 }]}>
        <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
        <Text style={[st.finAmount, { color: '#F59E0B' }]}>{INR(pending)}</Text>
        <Text style={st.finLabel}>Pending Dues</Text>
      </View>
    </View>
    <View style={st.progressBar}>
      <Text style={st.progressLabel}>Collection Rate</Text>
      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${Math.min(collectionRate, 100)}%` }]} />
      </View>
      <Text style={st.progressValue}>{collectionRate}%</Text>
    </View>
  </View>
);

// ─── Trend Chart (SVG bars) ───────────────────────────────────────────────────
const TrendChartBlock = ({ data }: { data: TrendPoint[] }) => {
  if (!data || data.length === 0) return null;

  const chartW = SCREEN_W - 96;
  const chartH = 100;
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);
  const barW = Math.floor((chartW - 20) / (data.length * 2 + data.length - 1));
  const gap = Math.floor(barW / 2);

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={st.chartTitle}>Income vs Expenses (Last {data.length} months)</Text>
      <Svg width={chartW} height={chartH + 24}>
        {data.map((d, i) => {
          const x = i * (barW * 2 + gap);
          const incH = Math.max(4, (d.income / maxVal) * chartH);
          const expH = Math.max(4, (d.expenses / maxVal) * chartH);
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={chartH - incH} width={barW} height={incH} fill="#818CF8" rx={3} />
              <Rect x={x + barW + 2} y={chartH - expH} width={barW} height={expH} fill="#FCA5A5" rx={3} />
            </React.Fragment>
          );
        })}
        <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#E2E8F0" strokeWidth={1} />
      </Svg>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
        <View style={st.legendItem}>
          <View style={[st.legendDot, { backgroundColor: '#818CF8' }]} />
          <Text style={st.legendText}>Income</Text>
        </View>
        <View style={st.legendItem}>
          <View style={[st.legendDot, { backgroundColor: '#FCA5A5' }]} />
          <Text style={st.legendText}>Expenses</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Occupancy Bar ────────────────────────────────────────────────────────────
const OccupancyBarBlock = ({ occupied, available, total, rate }: {
  occupied: number; available: number; total: number; rate: number;
}) => {
  const pct = Math.min(100, Math.max(0, rate));
  const color = pct >= 90 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#6366F1';

  return (
    <View style={st.occupancyContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={st.occupancyTitle}>Hostel Occupancy</Text>
        <Text style={[st.occupancyPct, { color }]}>{pct}%</Text>
      </View>
      <View style={st.occTrack}>
        <View style={[st.occFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
        <View style={st.occStat}>
          <Text style={[st.occStatValue, { color }]}>{occupied}</Text>
          <Text style={st.occStatLabel}>Occupied</Text>
        </View>
        <View style={st.occStat}>
          <Text style={[st.occStatValue, { color: '#64748B' }]}>{available}</Text>
          <Text style={st.occStatLabel}>Available</Text>
        </View>
        <View style={st.occStat}>
          <Text style={[st.occStatValue, { color: '#0F172A' }]}>{total}</Text>
          <Text style={st.occStatLabel}>Total Beds</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Steps ────────────────────────────────────────────────────────────────────
const StepsBlock = ({ title, steps, screen, screenLabel }: {
  title: string; steps: string[]; screen?: string; screenLabel?: string;
}) => (
  <View style={st.stepsContainer}>
    <Text style={st.stepsTitle}>{title}</Text>
    <View style={{ gap: 10, marginTop: 12 }}>
      {steps.map((step, i) => (
        <View key={i} style={st.stepRow}>
          <View style={st.stepBadge}>
            <Text style={st.stepNum}>{i + 1}</Text>
          </View>
          <Text style={st.stepText}>{step}</Text>
        </View>
      ))}
    </View>
    {screen && (
      <TouchableOpacity
        style={[st.actionBtn, st.actionBtnPrimary, { marginTop: 16, alignSelf: 'flex-start' }]}
        onPress={() => { Haptics.selectionAsync().catch(() => {}); RootNavigation.navigate(screen); }}
        activeOpacity={0.8}
      >
        <Text style={[st.actionBtnText, { color: '#FFF' }]}>{screenLabel || 'Open Screen'}</Text>
        <Ionicons name="arrow-forward" size={14} color="#FFF" style={{ marginLeft: 5 }} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyStateBlock = ({ icon, message, subMessage, action }: {
  icon: string; message: string; subMessage?: string; action?: ActionButton;
}) => (
  <View style={st.emptyContainer}>
    <View style={st.emptyIconCircle}>
      <Ionicons name={icon as any} size={32} color="#94A3B8" />
    </View>
    <Text style={st.emptyTitle}>{message}</Text>
    {subMessage ? <Text style={st.emptySubTitle}>{subMessage}</Text> : null}
    {action && (
      <TouchableOpacity
        style={[st.actionBtn, st.actionBtnOutline, { marginTop: 12 }]}
        onPress={() => { if (action.onPress) action.onPress(); else if (action.screen) RootNavigation.navigate(action.screen); }}
      >
        <Text style={[st.actionBtnText, { color: '#4F46E5' }]}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Error State ──────────────────────────────────────────────────────────────
const ErrorStateBlock = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <View style={[st.emptyContainer, { borderColor: '#FEE2E2', borderWidth: 1 }]}>
    <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
    <Text style={[st.emptyTitle, { color: '#EF4444' }]}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1, marginTop: 12 }]} onPress={onRetry}>
        <Ionicons name="refresh-outline" size={14} color="#EF4444" style={{ marginRight: 5 }} />
        <Text style={[st.actionBtnText, { color: '#EF4444' }]}>Try Again</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Master Renderer ──────────────────────────────────────────────────────────
export const AssistantResponse: React.FC<AssistantResponseProps> = ({ blocks }) => (
  <View style={{ gap: 14 }}>
    {blocks.map((block, i) => {
      switch (block.type) {
        case 'loading':
          return <SkeletonBlock key={i} />;

        case 'text':
          return <Text key={i} style={st.textBlock}>{block.text}</Text>;

        case 'stat_cards':
          return <StatCardsBlock key={i} cards={block.cards} />;

        case 'action_buttons':
          return <ActionButtonsBlock key={i} buttons={block.buttons} />;

        case 'due_list':
          return <DueListBlock key={i} dues={block.dues} onCollect={block.onCollect} />;

        case 'financial_summary':
          return (
            <FinancialSummaryBlock
              key={i}
              income={block.income}
              expenses={block.expenses}
              net={block.net}
              pending={block.pending}
              collectionRate={block.collectionRate}
            />
          );

        case 'trend_chart':
          return <TrendChartBlock key={i} data={block.data} />;

        case 'occupancy_bar':
          return (
            <OccupancyBarBlock
              key={i}
              occupied={block.occupied}
              available={block.available}
              total={block.total}
              rate={block.rate}
            />
          );

        case 'steps':
          return (
            <StepsBlock
              key={i}
              title={block.title}
              steps={block.steps}
              screen={block.screen}
              screenLabel={block.screenLabel}
            />
          );

        case 'empty_state':
          return (
            <EmptyStateBlock
              key={i}
              icon={block.icon}
              message={block.message}
              subMessage={block.subMessage}
              action={block.action}
            />
          );

        case 'error_state':
          return <ErrorStateBlock key={i} message={block.message} onRetry={block.onRetry} />;

        default:
          return null;
      }
    })}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  textBlock: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    letterSpacing: 0.1,
  },

  // Stat Cards
  statCard: {
    width: 110,
    borderRadius: 14,
    padding: 12,
    gap: 5,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statTrend: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  // Action Buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnPrimary: {
    backgroundColor: '#4F46E5',
  },
  actionBtnOutline: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Table
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tableCell: {
    fontSize: 13,
    color: '#334155',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Financial
  financialContainer: {
    gap: 0,
  },
  finCard: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  finAmount: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  finLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  progressBar: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    minWidth: 90,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    minWidth: 36,
    textAlign: 'right',
  },

  // Chart
  chartTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },

  // Occupancy
  occupancyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  occupancyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  occupancyPct: {
    fontSize: 22,
    fontWeight: '900',
  },
  occTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  occFill: {
    height: 8,
    borderRadius: 4,
  },
  occStat: {
    alignItems: 'center',
  },
  occStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  occStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },

  // Steps
  stepsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },

  // Empty / Error
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  emptySubTitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
