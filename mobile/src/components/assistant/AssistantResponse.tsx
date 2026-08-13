/**
 * AssistantResponse.tsx
 * Master response renderer — dispatches to the correct UI based on content block type.
 * All content blocks are pure display components; data is fetched by parent.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Dimensions, DeviceEventEmitter, Linking
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
  | { type: 'action_buttons'; buttons: ActionButton[]; isWelcome?: boolean }
  | { type: 'due_list'; dues: DueRecord[]; onCollect?: (id: string | number) => void }
  | { type: 'dues_donut'; paidCount: number; partialCount: number; unpaidCount: number; totalPaidAmount: number; totalPending: number }
  | { type: 'occupancy_donut'; occupied: number; available: number; total: number }
  | { type: 'expense_donut'; totalThisMonth: number; breakdown: { category: string; amount: number }[] }
  | { type: 'student_stats_donut'; active: number; inactive: number; prebooked: number; qrRegister: number }
  | { type: 'staff_list'; staff: any[] }
  | { type: 'guest_list'; guests: any[] }
  | { type: 'expense_list'; items: any[] }
  | { type: 'hostel_list'; hostels: any[]; activeHostelId: number; onSwitch?: (id: number, name: string) => void }
  | { type: 'financial_summary'; income: number; expenses: number; net: number; pending: number; collectionRate: number }
  | { type: 'trend_chart'; data: TrendPoint[] }
  | { type: 'occupancy_bar'; occupied: number; available: number; total: number; rate: number }
  | { type: 'steps'; title: string; steps: string[]; screen?: string; screenLabel?: string }
  | { type: 'empty_state'; icon: string; message: string; subMessage?: string; action?: ActionButton }
  | { type: 'error_state'; message: string; onRetry?: () => void }
  | { type: 'follow_up_chips'; label?: string; chips: Array<{ label: string; icon?: string; onPress: () => void }> }
  | { type: 'info_tip'; text: string; icon?: string; color?: string }
  | { type: 'student_detail_card'; student: any }
  | { type: 'room_detail_card'; room: any }
  | { type: 'floor_detail_card'; floor: any }
  | { type: 'student_list_card'; title: string; students: any[] }
  | { type: 'income_breakdown_card'; data: any }
  | { type: 'app_info_card'; topic: 'owner' | 'goal' | 'usage' }
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

// ─── Dues Donut Chart ──────────────────────────────────────────────────────────
const DuesDonutBlock = ({ paidCount, partialCount, unpaidCount, totalPaidAmount, totalPending }: {
  paidCount: number; partialCount: number; unpaidCount: number; totalPaidAmount: number; totalPending: number;
}) => {
  const total = (paidCount + partialCount + unpaidCount) || 1;
  const paidPct = Math.round((paidCount / total) * 100);
  const partialPct = Math.round((partialCount / total) * 100);
  const unpaidPct = Math.round((unpaidCount / total) * 100);

  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const amberLengthPct = unpaidPct + partialPct;
  const amberOffset = circumference - (amberLengthPct / 100) * circumference;
  const redOffset = circumference - (unpaidPct / 100) * circumference;

  return (
    <View style={{ gap: 6 }}>
      <View style={st.donutContainer}>
        <View style={st.donutChartWrap}>
          <Svg width={100} height={100} style={{ transform: [{ rotate: '-90deg' }] }}>
            {/* Base Paid Segment (Green) */}
            <Circle
              cx={50}
              cy={50}
              r={radius}
              stroke="#10B981"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Partially Paid Segment (Amber) */}
            {amberLengthPct > 0 && (
              <Circle
                cx={50}
                cy={50}
                r={radius}
                stroke="#F59E0B"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={amberOffset}
              />
            )}
            {/* Unpaid Segment (Red) */}
            {unpaidPct > 0 && (
              <Circle
                cx={50}
                cy={50}
                r={radius}
                stroke="#EF4444"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={redOffset}
                strokeLinecap="round"
              />
            )}
          </Svg>
          <View style={st.donutCenterLabel}>
            <Text style={st.donutCenterPct}>{unpaidPct}%</Text>
            <Text style={st.donutCenterSub}>Unpaid</Text>
          </View>
        </View>

        <View style={st.donutLegendWrap}>
          <Text style={st.donutTitle}>Rent Collection Status</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <Text style={st.donutTotalAmount}>Dues: {INR(totalPending)}</Text>
            <Text style={st.donutPaidAmount}>Paid: {INR(totalPaidAmount)}</Text>
          </View>

          <View style={{ gap: 4 }}>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={st.legendLabel}>Paid: {paidCount} ({paidPct}%)</Text>
            </View>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={st.legendLabel}>Partial: {partialCount} ({partialPct}%)</Text>
            </View>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={st.legendLabel}>Unpaid: {unpaidCount} ({unpaidPct}%)</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={st.donutExplainText}>
        💡 Tip: Unpaid and partially paid counts reflect students with outstanding balances. Tap Collect Payment to record payments.
      </Text>
    </View>
  );
};

// ─── Occupancy Donut Chart ───────────────────────────────────────────────────
const OccupancyDonutBlock = ({ occupied, available, total }: {
  occupied: number; available: number; total: number;
}) => {
  const totalBeds = total || 1;
  const occupiedPct = Math.round((occupied / totalBeds) * 100);
  const availablePct = Math.round((available / totalBeds) * 100);

  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (occupiedPct / 100) * circumference;

  return (
    <View style={{ gap: 6 }}>
      <View style={st.donutContainer}>
        <View style={st.donutChartWrap}>
          <Svg width={100} height={100} style={{ transform: [{ rotate: '-90deg' }] }}>
            {/* Base Available Segment (Sky Blue) */}
            <Circle
              cx={50}
              cy={50}
              r={radius}
              stroke="#38BDF8"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Occupied Segment (Indigo) */}
            {occupiedPct > 0 && (
              <Circle
                cx={50}
                cy={50}
                r={radius}
                stroke="#6366F1"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
              />
            )}
          </Svg>
          <View style={st.donutCenterLabel}>
            <Text style={st.donutCenterPct}>{occupiedPct}%</Text>
            <Text style={st.donutCenterSub}>Occupied</Text>
          </View>
        </View>

        <View style={st.donutLegendWrap}>
          <Text style={st.donutTitle}>Hostel Bed Occupancy</Text>
          <Text style={[st.donutTotalAmount, { color: '#6366F1' }]}>Total Beds: {totalBeds}</Text>

          <View style={{ gap: 4, marginTop: 4 }}>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: '#6366F1' }]} />
              <Text style={st.legendLabel}>Occupied: {occupied} ({occupiedPct}%)</Text>
            </View>
            <View style={[st.legendItem, { flexWrap: 'wrap' }]}>
              <View style={[st.legendDot, { backgroundColor: '#38BDF8' }]} />
              <Text style={st.legendLabel}>Available: {available} ({availablePct}%)</Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={st.donutExplainText}>
        💡 Occupancy metrics are calculated based on registered students and allocated hostel room beds.
      </Text>
    </View>
  );
};

// ─── Expense Donut Chart ───────────────────────────────────────────────────────
const ExpenseDonutBlock = ({ totalThisMonth, breakdown }: {
  totalThisMonth: number; breakdown: { category: string; amount: number }[];
}) => {
  const total = totalThisMonth || 1;

  const items = breakdown.slice(0, 3);
  const sumTop = items.reduce((sum, item) => sum + item.amount, 0);
  const hasOthers = total > sumTop;
  if (hasOthers) {
    items.push({ category: 'Others', amount: total - sumTop });
  }

  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  const colors = ['#6366F1', '#38BDF8', '#F59E0B', '#94A3B8'];

  const cumulativePctList: number[] = [];
  let runningSum = 0;
  items.forEach(item => {
    runningSum += item.amount;
    cumulativePctList.push((runningSum / total) * 100);
  });

  const reversedPcts = [...cumulativePctList].reverse();

  return (
    <View style={{ gap: 6 }}>
      <View style={st.donutContainer}>
        <View style={st.donutChartWrap}>
          <Svg width={100} height={100} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={50} cy={50} r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="transparent" />
            {reversedPcts.map((pct, idx) => {
              const color = colors[items.length - 1 - idx] || '#64748B';
              const offset = circumference - (pct / 100) * circumference;
              return (
                <Circle
                  key={idx}
                  cx={50}
                  cy={50}
                  r={radius}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>
          <View style={st.donutCenterLabel}>
            <Text style={st.donutCenterPct}>Spent</Text>
            <Text style={[st.donutCenterSub, { fontSize: 7 }]}>{INR(total)}</Text>
          </View>
        </View>

        <View style={st.donutLegendWrap}>
          <Text style={st.donutTitle}>Expenses Breakdown</Text>
          <Text style={[st.donutTotalAmount, { color: '#EF4444' }]}>Total: {INR(total)}</Text>

          <View style={{ gap: 4, marginTop: 4 }}>
            {items.map((item, idx) => {
              const pct = Math.round((item.amount / total) * 100);
              const color = colors[idx] || '#64748B';
              return (
                <View key={idx} style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: color }]} />
                  <Text style={st.legendLabel} numberOfLines={1}>{item.category}: {INR(item.amount)} ({pct}%)</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Student Stats Donut Chart ───────────────────────────────────────────────
const StudentStatsDonutBlock = ({ active, inactive, prebooked, qrRegister }: {
  active: number; inactive: number; prebooked: number; qrRegister: number;
}) => {
  const total = (active + inactive + prebooked + qrRegister) || 1;
  const activePct = Math.round((active / total) * 100);
  const inactivePct = Math.round((inactive / total) * 100);
  const prebookedPct = Math.round((prebooked / total) * 100);
  const qrPct = Math.round((qrRegister / total) * 100);

  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  const colors = ['#6366F1', '#10B981', '#F59E0B', '#94A3B8'];

  const items = [
    { label: 'Active', count: active, pct: activePct, color: '#6366F1' },
    { label: 'Pending QR', count: qrRegister, pct: qrPct, color: '#10B981' },
    { label: 'Pre-Booked', count: prebooked, pct: prebookedPct, color: '#F59E0B' },
    { label: 'Vacated (Left)', count: inactive, pct: inactivePct, color: '#94A3B8' },
  ];

  const cumulativePctList: number[] = [];
  let runningSum = 0;
  items.forEach(item => {
    runningSum += item.count;
    cumulativePctList.push((runningSum / total) * 100);
  });

  const reversedPcts = [...cumulativePctList].reverse();

  return (
    <View style={{ gap: 6 }}>
      <View style={st.donutContainer}>
        <View style={st.donutChartWrap}>
          <Svg width={100} height={100} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={50} cy={50} r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="transparent" />
            {reversedPcts.map((pct, idx) => {
              const color = colors[colors.length - 1 - idx] || '#64748B';
              const offset = circumference - (pct / 100) * circumference;
              return (
                <Circle
                  key={idx}
                  cx={50}
                  cy={50}
                  r={radius}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>
          <View style={st.donutCenterLabel}>
            <Text style={st.donutCenterPct}>{active}</Text>
            <Text style={st.donutCenterSub}>Active</Text>
          </View>
        </View>

        <View style={st.donutLegendWrap}>
          <Text style={st.donutTitle}>Student Distribution</Text>

          <View style={{ gap: 4, marginTop: 4 }}>
            {items.map((item, idx) => (
              <View key={idx} style={st.legendItem}>
                <View style={[st.legendDot, { backgroundColor: item.color }]} />
                <Text style={st.legendLabel}>{item.label}: {item.count} ({item.pct}%)</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Staff List Card Block ───────────────────────────────────────────────────
const StaffListBlock = ({ staff }: { staff: any[] }) => {
  return (
    <View style={st.listContainer}>
      <Text style={st.listHeader}>Staff Directory</Text>
      <View style={{ gap: 8 }}>
        {staff.slice(0, 5).map((s, idx) => (
          <View key={idx} style={st.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={st.listItemName}>{s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim()}</Text>
              <Text style={st.listItemSub}>{s.role || 'Staff'} • Salary: {INR(s.monthly_salary ?? s.salary ?? 0)}</Text>
            </View>
            <View style={[st.listItemBadge, { backgroundColor: s.status === 1 ? '#ECFDF5' : '#F1F5F9' }]}>
              <Text style={[st.listItemBadgeText, { color: s.status === 1 ? '#10B981' : '#64748B' }]}>
                {s.status === 1 ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Guest List Card Block ────────────────────────────────────────────────────
const GuestListBlock = ({ guests }: { guests: any[] }) => {
  return (
    <View style={st.listContainer}>
      <Text style={st.listHeader}>Recent Guests</Text>
      <View style={{ gap: 8 }}>
        {guests.slice(0, 5).map((g, idx) => (
          <View key={idx} style={st.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={st.listItemName}>{g.name || 'Guest'}</Text>
              <Text style={st.listItemSub}>Room: {g.room_number || 'N/A'} • Check-in: {g.check_in_date ? new Date(g.check_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}</Text>
            </View>
            <View style={[st.listItemBadge, { backgroundColor: g.checkout_time ? '#F1F5F9' : '#ECFDF5' }]}>
              <Text style={[st.listItemBadgeText, { color: g.checkout_time ? '#64748B' : '#10B981' }]}>
                {g.checkout_time ? 'Checked Out' : 'Active'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Expense List Card Block ──────────────────────────────────────────────────
const ExpenseListBlock = ({ items }: { items: any[] }) => {
  return (
    <View style={st.listContainer}>
      <Text style={st.listHeader}>Recent Expenses</Text>
      <View style={{ gap: 8 }}>
        {items.slice(0, 5).map((e, idx) => (
          <View key={idx} style={st.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={st.listItemName}>{e.title || 'Expense'}</Text>
              <Text style={st.listItemSub}>{e.category || 'Other'} • {e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</Text>
            </View>
            <Text style={[st.listItemBadgeText, { fontSize: 13, color: '#EF4444', fontWeight: '800' }]}>
              -{INR(e.amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Hostel List Card Block ───────────────────────────────────────────────────
const HostelListBlock = ({ hostels, activeHostelId, onSwitch }: {
  hostels: any[]; activeHostelId: number; onSwitch?: (id: number, name: string) => void;
}) => {
  return (
    <View style={st.listContainer}>
      <Text style={st.listHeader}>Your Hostels</Text>
      <View style={{ gap: 8 }}>
        {hostels.map((h, idx) => {
          const isActive = Number(h.hostel_id) === Number(activeHostelId);
          return (
            <View key={idx} style={st.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={st.listItemName}>{h.hostel_name || h.name || 'Hostel'}</Text>
                <Text style={st.listItemSub}>{isActive ? 'Currently Active Context' : 'Tap Switch to select PG context'}</Text>
              </View>
              {isActive ? (
                <View style={[st.listItemBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={[st.listItemBadgeText, { color: '#10B981' }]}>Active</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#EEF2FF',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#C7D2FE',
                  }}
                  activeOpacity={0.7}
                  onPress={() => onSwitch?.(h.hostel_id, h.name)}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#4F46E5' }}>Switch</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
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
const ActionButtonsBlock = ({ buttons, isWelcome }: { buttons: ActionButton[]; isWelcome?: boolean }) => {
  // Top welcome card options (isWelcome === true) ALWAYS remain 100% full-width stacked vertically (one by one).
  // Bottom result card action buttons (isWelcome === false/undefined) ALWAYS render side-by-side (2 per row).
  if (isWelcome) {
    return (
      <View style={{ gap: 9, marginTop: 6, width: '100%' }}>
        {buttons.map((btn, i) => {
          const isPrimary = btn.variant === 'primary';
          const isDanger = btn.variant === 'danger';
          return (
            <TouchableOpacity
              key={i}
              style={[
                st.actionBtn,
                {
                  width: '100%',
                  justifyContent: 'center',
                  borderRadius: 22,
                  paddingVertical: 11,
                  paddingHorizontal: 16,
                  backgroundColor: isPrimary ? '#4F46E5' : isDanger ? '#FEF2F2' : '#F8FAFC',
                  borderWidth: 1.2,
                  borderColor: isPrimary ? '#4F46E5' : isDanger ? '#FECACA' : '#CBD5E1',
                }
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => { });
                if (btn.onPress) { btn.onPress(); return; }
                if (btn.screen) {
                  RootNavigation.navigate(btn.screen);
                  DeviceEventEmitter.emit('CLOSE_ASSISTANT');
                }
              }}
              activeOpacity={0.75}
            >
              {btn.icon && (
                <Ionicons
                  name={btn.icon as any}
                  size={16}
                  color={isPrimary ? '#FFF' : isDanger ? '#EF4444' : '#2563EB'}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={[
                  st.actionBtnText,
                  {
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                    color: isPrimary ? '#FFF' : isDanger ? '#EF4444' : '#2563EB',
                  }
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, width: '100%' }}>
      {buttons.map((btn, i) => {
        const isPrimary = btn.variant === 'primary';
        const isDanger = btn.variant === 'danger';
        const isOddLast = buttons.length % 2 === 1 && i === buttons.length - 1;
        const isFullWidth = isOddLast || buttons.length === 1;

        return (
          <TouchableOpacity
            key={i}
            style={[
              st.actionBtn,
              {
                width: isFullWidth ? '100%' : '48%',
                flexGrow: isFullWidth ? 1 : 0,
                flexBasis: isFullWidth ? '100%' : '47%',
                justifyContent: 'center',
                borderRadius: 22,
                paddingVertical: 10,
                paddingHorizontal: 8,
                backgroundColor: isPrimary ? '#4F46E5' : isDanger ? '#FEF2F2' : '#F8FAFC',
                borderWidth: 1.2,
                borderColor: isPrimary ? '#4F46E5' : isDanger ? '#FECACA' : '#CBD5E1',
              }
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => { });
              if (btn.onPress) { btn.onPress(); return; }
              if (btn.screen) {
                RootNavigation.navigate(btn.screen);
                DeviceEventEmitter.emit('CLOSE_ASSISTANT');
              }
            }}
            activeOpacity={0.75}
          >
            {btn.icon && (
              <Ionicons
                name={btn.icon as any}
                size={15}
                color={isPrimary ? '#FFF' : isDanger ? '#EF4444' : '#2563EB'}
                style={{ marginRight: 5 }}
              />
            )}
            <Text
              numberOfLines={isFullWidth ? undefined : 1}
              style={[
                st.actionBtnText,
                {
                  fontSize: isFullWidth ? 14 : 13,
                  fontWeight: '600',
                  textAlign: 'center',
                  color: isPrimary ? '#FFF' : isDanger ? '#EF4444' : '#2563EB',
                }
              ]}
            >
              {btn.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

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
              DeviceEventEmitter.emit('CLOSE_ASSISTANT');
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
        onPress={() => {
          Haptics.selectionAsync().catch(() => { });
          RootNavigation.navigate(screen);
          DeviceEventEmitter.emit('CLOSE_ASSISTANT');
        }}
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
        onPress={() => {
          if (action.onPress) {
            action.onPress();
          } else if (action.screen) {
            RootNavigation.navigate(action.screen);
            DeviceEventEmitter.emit('CLOSE_ASSISTANT');
          }
        }}
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

// ─── Follow-Up Chips ─────────────────────────────────────────────────────────
const FollowUpChipsBlock = ({ label, chips }: {
  label?: string;
  chips: Array<{ label: string; icon?: string; onPress: () => void }>;
}) => (
  <View style={st.followUpContainer}>
    {label ? <Text style={st.followUpLabel}>{label}</Text> : null}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, flexDirection: 'row', paddingVertical: 2 }}
    >
      {chips.map((chip, i) => (
        <TouchableOpacity
          key={i}
          style={st.followUpChip}
          onPress={() => { Haptics.selectionAsync().catch(() => { }); chip.onPress(); }}
          activeOpacity={0.7}
        >
          {chip.icon ? (
            <Ionicons name={chip.icon as any} size={12} color="#4338CA" style={{ marginRight: 4 }} />
          ) : null}
          <Text style={st.followUpChipText}>{chip.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// ─── Info Tip ────────────────────────────────────────────────────────────────
const InfoTipBlock = ({ text, icon, color }: { text: string; icon?: string; color?: string }) => {
  const bg = color ? color + '15' : '#EEF2FF';
  const fg = color || '#4338CA';
  return (
    <View style={[st.infoTipContainer, { backgroundColor: bg, borderColor: fg + '30' }]}>
      <Ionicons name={(icon as any) || 'information-circle-outline'} size={14} color={fg} />
      <Text style={[st.infoTipText, { color: fg }]}>{text}</Text>
    </View>
  );
};

// ─── Student Detail Card Block ───────────────────────────────────────────────
const StudentDetailCardBlock = ({ student }: { student: any }) => {
  const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.name || 'Student';
  const initial = name.charAt(0).toUpperCase();
  const room = student.room_number || student.roomNumber || 'Unassigned';
  const bed = student.bed_number || student.bedNumber || 'N/A';
  const phone = student.phone || student.mobile || 'No phone recorded';
  const rent = student.monthly_rent || student.rent || 0;
  const status = student.status === 1 ? 'Active' : student.status === 0 ? 'Left / Vacated' : student.status === 2 ? 'Pre-Booked' : 'Pending';
  const statusColor = student.status === 1 ? '#10B981' : student.status === 0 ? '#64748B' : '#F59E0B';

  const rawJoiningDate = student.joining_date || student.created_at;
  const joiningDateStr = rawJoiningDate ? new Date(rawJoiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  return (
    <View style={st.detailCardContainer}>
      <View style={st.detailCardHeader}>
        <View style={[st.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#4F46E5' }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.detailCardName}>{name}</Text>
          <Text style={st.detailCardSub}>Phone: {phone}</Text>
        </View>
        <View style={[st.listItemBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[st.listItemBadgeText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <View style={st.detailGrid}>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Room / Bed</Text>
          <Text style={st.detailGridVal}>Rm {room} • Bed {bed}</Text>
        </View>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Joined Date</Text>
          <Text style={st.detailGridVal}>{joiningDateStr}</Text>
        </View>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Monthly Rent</Text>
          <Text style={[st.detailGridVal, { color: '#10B981' }]}>{INR(rent)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        {phone !== 'No phone recorded' && (
          <TouchableOpacity
            style={[st.actionBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, flex: 1, justifyContent: 'center' }]}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Ionicons name="call-outline" size={14} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={[st.actionBtnText, { color: '#10B981' }]}>Call</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[st.actionBtn, st.actionBtnPrimary, { flex: 1, justifyContent: 'center' }]}
          onPress={() => {
            RootNavigation.navigate('Students');
            DeviceEventEmitter.emit('CLOSE_ASSISTANT');
          }}
        >
          <Ionicons name="person-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={[st.actionBtnText, { color: '#FFF' }]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.actionBtn, st.actionBtnOutline, { flex: 1, justifyContent: 'center' }]}
          onPress={() => {
            RootNavigation.navigate('PendingPayments');
            DeviceEventEmitter.emit('CLOSE_ASSISTANT');
          }}
        >
          <Ionicons name="cash-outline" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
          <Text style={[st.actionBtnText, { color: '#4F46E5' }]}>Collect Rent</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── App Info & Owner Card Block ─────────────────────────────────────────────
const AppInfoCardBlock = ({ topic }: { topic: 'owner' | 'goal' | 'usage' }) => {
  if (topic === 'owner') {
    return (
      <View style={st.detailCardContainer}>
        <View style={st.detailCardHeader}>
          <View style={[st.avatarCircle, { backgroundColor: '#EEF2FF', width: 48, height: 48, borderRadius: 24 }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#4F46E5' }}>VG</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.detailCardName}>VeeraDurgarao Goriparthi</Text>
            <Text style={st.detailCardSub}>Owner & Developer • Hyderabad</Text>
          </View>
        </View>

        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18, fontWeight: '500' }}>
            👨‍💻 <Text style={{ fontWeight: '700' }}>About Owner:</Text> VeeraDurgarao Goriparthi is a software engineer and technology entrepreneur based in <Text style={{ fontWeight: '700', color: '#4F46E5' }}>Hyderabad, Telangana</Text>.
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>
            He built <Text style={{ fontWeight: '700', color: '#1E293B' }}>HOSTIX</Text> to streamline Hostel & PG management — automating room allocations, rent collection, QR admissions, and daily financial tracking.
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          <TouchableOpacity
            style={[st.actionBtn, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1, justifyContent: 'center' }]}
            onPress={() => Linking.openURL('tel:6303359425')}
          >
            <Ionicons name="call-outline" size={14} color="#4F46E5" style={{ marginRight: 6 }} />
            <Text style={[st.actionBtnText, { color: '#4F46E5' }]}>Call: +91 6303359425</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1, justifyContent: 'center' }]}
            onPress={() => Linking.openURL('mailto:veeradurgarao840@gmail.com')}
          >
            <Ionicons name="mail-outline" size={14} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={[st.actionBtnText, { color: '#15803D' }]}>Email: veeradurgarao840@gmail.com</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (topic === 'goal') {
    return (
      <View style={st.detailCardContainer}>
        <View style={st.detailCardHeader}>
          <View style={[st.avatarCircle, { backgroundColor: '#FEF3C7', width: 44, height: 44, borderRadius: 22 }]}>
            <Ionicons name="rocket-outline" size={22} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.detailCardName}>Main Goal of HOSTIX App</Text>
            <Text style={st.detailCardSub}>Smart Digital Hostel & PG Management</Text>
          </View>
        </View>

        <View style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A', gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#92400E', lineHeight: 18, fontWeight: '600' }}>
            🎯 <Text style={{ fontWeight: '800' }}>Mission:</Text> To simplify and automate daily hostel operations for PG and hostel owners across India.
          </Text>
          <View style={{ gap: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 11, color: '#B45309' }}>• 📊 <Text style={{ fontWeight: '700' }}>Real-time Occupancy:</Text> Instant bed & room availability tracking.</Text>
            <Text style={{ fontSize: 11, color: '#B45309' }}>• 💰 <Text style={{ fontWeight: '700' }}>Zero Dues Delay:</Text> Automated rent tracking & payment reminders.</Text>
            <Text style={{ fontSize: 11, color: '#B45309' }}>• 📷 <Text style={{ fontWeight: '700' }}>Self Registration:</Text> Student onboarding via QR codes.</Text>
            <Text style={{ fontSize: 11, color: '#B45309' }}>• 📈 <Text style={{ fontWeight: '700' }}>Financial Clarity:</Text> Income vs. Expense reports in 1 tap.</Text>
          </View>
        </View>
      </View>
    );
  }

  // usage
  return (
    <View style={st.detailCardContainer}>
      <View style={st.detailCardHeader}>
        <View style={[st.avatarCircle, { backgroundColor: '#ECFDF5', width: 44, height: 44, borderRadius: 22 }]}>
          <Ionicons name="help-circle-outline" size={22} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.detailCardName}>How to Use HOSTIX</Text>
          <Text style={st.detailCardSub}>Quick Getting Started Steps</Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View style={st.listItem}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#4F46E5', width: 20 }}>1.</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Setup your Rooms & Beds in Rooms module.</Text>
        </View>
        <View style={st.listItem}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#4F46E5', width: 20 }}>2.</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Add Students or share Hostel QR Code link.</Text>
        </View>
        <View style={st.listItem}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#4F46E5', width: 20 }}>3.</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Record Rent payments & send reminders.</Text>
        </View>
        <View style={st.listItem}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#4F46E5', width: 20 }}>4.</Text>
          <Text style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '500' }}>Track Monthly Income & Expenses in Reports.</Text>
        </View>
      </View>
    </View>
  );
};


// ─── Room Detail Card Block ──────────────────────────────────────────────────
const RoomDetailCardBlock = ({ room }: { room: any }) => {
  const roomNum = room.room_number || 'N/A';
  const floor = room.floor_number !== undefined ? `Floor ${room.floor_number}` : 'N/A';
  const roomType = room.room_type_name || 'Standard Room';
  const capacity = Number(room.total_capacity || room.capacity || 0);
  const occupied = Number(room.occupied_beds || (room.occupants || room.students || []).length || 0);
  const available = Math.max(capacity - occupied, 0);
  const occupants: any[] = room.occupants || room.students || [];

  // Generate bed slots up to total capacity
  const bedSlots = Array.from({ length: Math.max(capacity, occupants.length, 1) }, (_, i) => {
    const occupant = occupants[i] || null;
    return {
      bedNumber: occupant?.bed_number || i + 1,
      occupant
    };
  });

  return (
    <View style={st.detailCardContainer}>
      {/* ── Room Title & Badges Header ── */}
      <View style={st.detailCardHeader}>
        <View style={[st.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
          <Ionicons name="business" size={22} color="#4F46E5" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[st.detailCardName, { fontSize: 16 }]}>Room {roomNum}</Text>
            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#4338CA' }}>{floor}</Text>
            </View>
          </View>
          <Text style={st.detailCardSub}>{roomType} • {capacity} Beds Capacity</Text>
        </View>
        <View style={[st.listItemBadge, { backgroundColor: available > 0 ? '#ECFDF5' : '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4 }]}>
          <Text style={[st.listItemBadgeText, { color: available > 0 ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '800' }]}>
            {available > 0 ? `🟢 ${available} Vacant` : '🔴 Fully Occupied'}
          </Text>
        </View>
      </View>

      {/* ── Summary Stats Pills Bar ── */}
      <View style={[st.detailGrid, { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginVertical: 10 }]}>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Total Capacity</Text>
          <Text style={[st.detailGridVal, { color: '#1E293B', fontSize: 16 }]}>{capacity} Beds</Text>
        </View>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Occupied</Text>
          <Text style={[st.detailGridVal, { color: '#4F46E5', fontSize: 16 }]}>{occupied} Students</Text>
        </View>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Available</Text>
          <Text style={[st.detailGridVal, { color: available > 0 ? '#10B981' : '#EF4444', fontSize: 16 }]}>{available} Free</Text>
        </View>
      </View>

      {/* ── Occupants & Bed Allocation List ── */}
      <View style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[st.listHeader, { fontSize: 12, color: '#475569' }]}>Bed Allocation & Occupants ({occupants.length}/{capacity})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="bed-outline" size={13} color="#6366F1" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>
              {available > 0 ? `${available} Open Bed${available > 1 ? 's' : ''}` : 'No Vacancy'}
            </Text>
          </View>
        </View>

        {bedSlots.length === 0 ? (
          <View style={{ paddingVertical: 16, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10 }}>
            <Ionicons name="bed-outline" size={24} color="#94A3B8" />
            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: '500' }}>No bed configuration for this room.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {bedSlots.map((slot, idx) => {
              const occ = slot.occupant;
              if (occ) {
                const name = `${occ.first_name || occ.name || 'Student'} ${occ.last_name || ''}`.trim();
                const studentId = occ.id || occ.student_id || occ.studentId;
                const phone = occ.phone || occ.mobile || '';
                const isPaid = occ.rent_status === 'paid' || occ.due_amount === 0;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      st.listItem,
                      {
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderWidth: 1.2,
                        borderRadius: 12,
                        padding: 11,
                        elevation: 1,
                      }
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (studentId) {
                        RootNavigation.navigate('StudentDetails', { studentId });
                        DeviceEventEmitter.emit('CLOSE_ASSISTANT');
                      }
                    }}
                  >
                    {/* Student Avatar */}
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#EEF2FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      borderWidth: 1,
                      borderColor: '#C7D2FE'
                    }}>
                      <Ionicons name="person" size={18} color="#4F46E5" />
                    </View>

                    {/* Student Details */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[st.listItemName, { fontSize: 13, fontWeight: '700', color: '#0F172A' }]}>{name}</Text>
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#4338CA' }}>Bed {slot.bedNumber}</Text>
                        </View>
                      </View>

                      {phone ? (
                        <Text style={[st.listItemSub, { fontSize: 11, color: '#64748B', marginTop: 2 }]}>
                          📱 {phone}
                        </Text>
                      ) : (
                        <Text style={[st.listItemSub, { fontSize: 11, color: '#94A3B8', marginTop: 2, fontStyle: 'italic' }]}>
                          No phone record
                        </Text>
                      )}
                    </View>

                    {/* Status Badge */}
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[st.listItemBadge, { backgroundColor: isPaid ? '#ECFDF5' : '#FEF2F2' }]}>
                        <Text style={[st.listItemBadgeText, { color: isPaid ? '#10B981' : '#EF4444', fontSize: 10, fontWeight: '700' }]}>
                          {isPaid ? 'Paid' : 'Dues Pending'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                    </View>
                  </TouchableOpacity>
                );
              } else {
                // Vacant Bed Slot Card
                return (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: '#CBD5E1',
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <View style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: '#F1F5F9',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10
                    }}>
                      <Ionicons name="bed-outline" size={16} color="#94A3B8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                        Bed {slot.bedNumber} — Vacant
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        Ready for new student assignment
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981' }}>+ Available</Text>
                    </View>
                  </View>
                );
              }
            })}
          </View>
        )}
      </View>

      {/* ── Action Navigation ── */}
      <View style={{ marginTop: 14 }}>
        <TouchableOpacity
          style={[
            st.actionBtn,
            {
              backgroundColor: '#4F46E5',
              justifyContent: 'center',
              borderRadius: 22,
              paddingVertical: 10,
            }
          ]}
          onPress={() => {
            RootNavigation.navigate('Rooms');
            DeviceEventEmitter.emit('CLOSE_ASSISTANT');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="business-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={[st.actionBtnText, { color: '#FFF', fontSize: 13, fontWeight: '700' }]}>
            Manage Rooms & Bed Rates
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Floor Detail Card Block ─────────────────────────────────────────────────
const FloorDetailCardBlock = ({ floor }: { floor: any }) => {
  const floorNum = floor.floorNumber;
  const rooms: any[] = floor.rooms || [];

  return (
    <View style={st.detailCardContainer}>
      <View style={st.detailCardHeader}>
        <View style={[st.avatarCircle, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="layers-outline" size={20} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.detailCardName}>Floor {floorNum} Overview</Text>
          <Text style={st.detailCardSub}>{floor.totalRooms} Rooms • {floor.totalBeds} Total Beds</Text>
        </View>
      </View>

      <View style={st.detailGrid}>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Occupied Beds</Text>
          <Text style={[st.detailGridVal, { color: '#4F46E5' }]}>{floor.occupiedBeds}</Text>
        </View>
        <View style={st.detailGridItem}>
          <Text style={st.detailGridLabel}>Available Beds</Text>
          <Text style={[st.detailGridVal, { color: '#10B981' }]}>{floor.availableBeds}</Text>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={st.listHeader}>Rooms on Floor {floorNum}</Text>
        <View style={{ gap: 6 }}>
          {rooms.slice(0, 8).map((r, idx) => (
            <View key={idx} style={st.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={st.listItemName}>Room {r.room_number}</Text>
                <Text style={st.listItemSub}>{r.room_type_name || 'Standard'} • {r.occupied_beds || 0}/{r.total_capacity || r.capacity || 0} Beds Occupied</Text>
              </View>
              <View style={[st.listItemBadge, { backgroundColor: (r.available_beds || 0) > 0 ? '#ECFDF5' : '#FEF2F2' }]}>
                <Text style={[st.listItemBadgeText, { color: (r.available_beds || 0) > 0 ? '#10B981' : '#EF4444' }]}>
                  {(r.available_beds || 0) > 0 ? `${r.available_beds} Free` : 'Full'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── Student List Card Block ────────────────────────────────────────────────
const StudentListCardBlock = ({ title, students }: { title: string; students: any[] }) => {
  return (
    <View style={st.listContainer}>
      <Text style={st.listHeader}>{title} ({students.length})</Text>
      {students.length === 0 ? (
        <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 6 }}>No records found for this category.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {students.slice(0, 6).map((s, idx) => (
            <View key={idx} style={st.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={st.listItemName}>{s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim()}</Text>
                <Text style={st.listItemSub}>
                  Room: {s.roomNumber || s.room_number || 'N/A'} {s.paidAmount ? `• Paid: ${INR(s.paidAmount)}` : ''} {s.phone ? `• ${s.phone}` : ''}
                </Text>
              </View>
              {s.badgeText ? (
                <View style={[st.listItemBadge, { backgroundColor: s.badgeColor || '#EEF2FF' }]}>
                  <Text style={[st.listItemBadgeText, { color: s.badgeTextColor || '#4F46E5' }]}>{s.badgeText}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Income Breakdown Card Block ─────────────────────────────────────────────
const IncomeBreakdownCardBlock = ({ data }: { data: any }) => {
  return (
    <View style={st.detailCardContainer}>
      <Text style={st.listHeader}>Monthly Income Breakdown</Text>
      <Text style={[st.finAmount, { color: '#10B981', marginBottom: 10 }]}>{INR(data.totalIncome)}</Text>

      <View style={{ gap: 8 }}>
        <View style={st.listItem}>
          <Ionicons name="home-outline" size={18} color="#4F46E5" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={st.listItemName}>Student Rent Collection</Text>
            <Text style={st.listItemSub}>Monthly fees & room rent</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{INR(data.rentCollected)}</Text>
        </View>

        <View style={st.listItem}>
          <Ionicons name="person-outline" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={st.listItemName}>Guest Charges</Text>
            <Text style={st.listItemSub}>Short stay guest fees</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{INR(data.guestFees)}</Text>
        </View>

        {data.otherIncome > 0 && (
          <View style={st.listItem}>
            <Ionicons name="cash-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={st.listItemName}>Other Revenue</Text>
              <Text style={st.listItemSub}>Services & deposits</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{INR(data.otherIncome)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

function cleanMarkdownText(text: string) {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

// ─── Master Renderer ──────────────────────────────────────────────────────────
export const AssistantResponse: React.FC<AssistantResponseProps> = ({ blocks }) => (
  <View style={{ gap: 14 }}>
    {blocks.map((block, i) => {
      switch (block.type) {
        case 'loading':
          return <SkeletonBlock key={i} />;

        case 'text':
          return <Text key={i} style={st.textBlock}>{cleanMarkdownText(block.text)}</Text>;

        case 'stat_cards':
          return <StatCardsBlock key={i} cards={block.cards} />;

        case 'action_buttons':
          return <ActionButtonsBlock key={i} buttons={block.buttons} isWelcome={(block as any).isWelcome} />;

        case 'due_list':
          return <DueListBlock key={i} dues={block.dues} onCollect={block.onCollect} />;

        case 'dues_donut':
          return (
            <DuesDonutBlock
              key={i}
              paidCount={block.paidCount}
              partialCount={block.partialCount}
              unpaidCount={block.unpaidCount}
              totalPaidAmount={block.totalPaidAmount}
              totalPending={block.totalPending}
            />
          );

        case 'occupancy_donut':
          return (
            <OccupancyDonutBlock
              key={i}
              occupied={block.occupied}
              available={block.available}
              total={block.total}
            />
          );

        case 'expense_donut':
          return (
            <ExpenseDonutBlock
              key={i}
              totalThisMonth={block.totalThisMonth}
              breakdown={block.breakdown}
            />
          );

        case 'student_stats_donut':
          return (
            <StudentStatsDonutBlock
              key={i}
              active={block.active}
              inactive={block.inactive}
              prebooked={block.prebooked}
              qrRegister={block.qrRegister}
            />
          );

        case 'staff_list':
          return <StaffListBlock key={i} staff={block.staff} />;

        case 'guest_list':
          return <GuestListBlock key={i} guests={block.guests} />;

        case 'expense_list':
          return <ExpenseListBlock key={i} items={block.items} />;

        case 'hostel_list':
          return (
            <HostelListBlock
              key={i}
              hostels={block.hostels}
              activeHostelId={block.activeHostelId}
              onSwitch={block.onSwitch}
            />
          );

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

        case 'follow_up_chips':
          return <FollowUpChipsBlock key={i} label={block.label} chips={block.chips} />;

        case 'info_tip':
          return <InfoTipBlock key={i} text={block.text} icon={block.icon} color={block.color} />;

        case 'student_detail_card':
          return <StudentDetailCardBlock key={i} student={block.student} />;

        case 'room_detail_card':
          return <RoomDetailCardBlock key={i} room={block.room} />;

        case 'floor_detail_card':
          return <FloorDetailCardBlock key={i} floor={block.floor} />;

        case 'student_list_card':
          return <StudentListCardBlock key={i} title={block.title} students={block.students} />;

        case 'income_breakdown_card':
          return <IncomeBreakdownCardBlock key={i} data={block.data} />;

        case 'app_info_card':
          return <AppInfoCardBlock key={i} topic={block.topic} />;


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

  // Donut chart
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  donutChartWrap: {
    position: 'relative',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterPct: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  donutCenterSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  donutLegendWrap: {
    flex: 1,
  },
  donutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  donutTotalAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 4,
  },
  donutPaidAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 4,
  },
  donutExplainText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    paddingHorizontal: 6,
    lineHeight: 14,
  },

  // Lists visual block cards style
  listContainer: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  listHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  listItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  listItemSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  listItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
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

  // Follow-up chips
  followUpContainer: {
    marginTop: 4,
    gap: 6,
  },
  followUpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  followUpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  followUpChipText: {
    fontSize: 11,
    color: '#4338CA',
    fontWeight: '600',
  },

  // Info Tip
  infoTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoTipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },

  // Detail Cards (Student, Room, Floor, Income)
  detailCardContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailCardSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailGridVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#FFF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnPrimary: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  actionBtnOutline: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
});


