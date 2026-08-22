/**
 * AssistantResponse.tsx
 * Master response renderer — dispatches to the correct UI based on content block type.
 * All content blocks are pure display components; data is fetched by parent.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Dimensions, DeviceEventEmitter, Linking, Image
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
  phone?: string;
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
  | { type: 'vacant_rooms_card'; title: string; rooms: any[]; onSelectRoom?: (roomNumber: string | number) => void }
  | { type: 'student_list_card'; title: string; students: any[] }
  | { type: 'owner_list_card'; title: string; owners: any[] }
  | { type: 'income_breakdown_card'; data: any }
  | { type: 'app_info_card'; topic: 'owner' | 'goal' | 'usage' }
  | {
      type: 'distribution_donut_card';
      title: string;
      subtitle?: string;
      centerIcon: string;
      centerIconColor?: string;
      centerIconBg?: string;
      statusIcon?: string;
      statusIconColor?: string;
      segments: Array<{
        percentage: number;
        color: string;
        label: string;
        badge?: string;
      }>;
      highlightText?: string;
      actionButtons?: Array<{
        label: string;
        onPress: () => void;
        variant?: 'primary' | 'outline';
      }>;
    }
  | {
      type: 'profile_match_checklist_card';
      title: string;
      score: string;
      avatarUri?: string;
      icon?: string;
      items: Array<{
        label: string;
        matched: boolean;
      }>;
    }
  | {
      type: 'stat_pill_actions';
      question?: string;
      actions: Array<{
        label: string;
        onPress: () => void;
      }>;
    }
  | {
      type: 'question_cards_grid';
      label?: string;
      cards: Array<{
        title: string;
        subtitle?: string;
        icon: string;
        iconColor?: string;
        iconBg?: string;
        bg?: string;
        border?: string;
        onPress: () => void;
      }>;
    }
  | {
      type: 'simple_action_pills';
      pills: Array<{
        label: string;
        onPress: () => void;
      }>;
    }
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

// ─── Due List (Interactive Zomato-Grade Actionable Cards) ────────────────────
const DueListBlock = ({ dues, onCollect }: { dues: DueRecord[]; onCollect?: (id: string | number) => void }) => {
  if (dues.length === 0) return null;

  const totalDueAmount = dues.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const handleSendWhatsApp = (due: DueRecord) => {
    Haptics.selectionAsync().catch(() => {});
    const cleanPhone = (due.phone || '').replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hi ${due.name}, this is a gentle reminder from the hostel management that your pending fee of ₹${Number(due.amount).toLocaleString('en-IN')} is due. Kindly clear the payment at your earliest convenience. Thank you!`
    );
    const url = targetPhone ? `https://wa.me/${targetPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleCall = (due: DueRecord) => {
    Haptics.selectionAsync().catch(() => {});
    if (due.phone) {
      Linking.openURL(`tel:${due.phone}`).catch(() => {});
    } else if (due.studentId) {
      RootNavigation.navigate('StudentDetails', { studentId: due.studentId });
      DeviceEventEmitter.emit('CLOSE_ASSISTANT');
    }
  };

  const handleOpenStudent = (due: DueRecord) => {
    Haptics.selectionAsync().catch(() => {});
    if (due.studentId) {
      RootNavigation.navigate('StudentDetails', { studentId: due.studentId });
      DeviceEventEmitter.emit('CLOSE_ASSISTANT');
    }
  };

  return (
    <View style={st.dueCardListContainer}>
      <View style={st.dueCardListHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={st.dueCardListTitle}>Pending Dues ({dues.length})</Text>
        </View>
        <View style={st.dueTotalBadge}>
          <Text style={st.dueTotalBadgeText}>Total: {INR(totalDueAmount)}</Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {dues.slice(0, 10).map((due, i) => {
          const isOverdue = due.status === 'overdue';
          const initials = (due.name || 'S')
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <View key={i} style={st.dueCardItem}>
              {/* Top Row: Avatar + Details + Amount */}
              <TouchableOpacity
                style={st.dueCardTopRow}
                onPress={() => handleOpenStudent(due)}
                activeOpacity={0.7}
              >
                <View style={[st.dueAvatarCircle, { backgroundColor: isOverdue ? '#FEE2E2' : '#EEF2FF' }]}>
                  <Text style={[st.dueAvatarText, { color: isOverdue ? '#DC2626' : '#4F46E5' }]}>{initials}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={st.dueStudentName} numberOfLines={1}>{due.name}</Text>
                  <View style={st.dueSubMetaRow}>
                    <View style={st.dueRoomBadge}>
                      <Ionicons name="business-outline" size={11} color="#6366F1" />
                      <Text style={st.dueRoomBadgeText}>{due.roomNumber ? `Room ${due.roomNumber}` : 'Unallocated'}</Text>
                    </View>
                    <View style={[st.dueStatusTag, { backgroundColor: isOverdue ? '#FEF2F2' : '#FFFBEB' }]}>
                      <View style={[st.dueStatusDot, { backgroundColor: isOverdue ? '#EF4444' : '#F59E0B' }]} />
                      <Text style={[st.dueStatusTagText, { color: isOverdue ? '#DC2626' : '#D97706' }]}>
                        {isOverdue ? 'Overdue' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.dueAmountText}>{INR(due.amount)}</Text>
                  {due.dueDate ? (
                    <Text style={st.dueDateText}>Due {new Date(due.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              {/* Action Buttons Row */}
              <View style={st.dueActionRow}>
                <TouchableOpacity
                  style={[st.dueActionBtn, st.dueActionBtnWhatsApp]}
                  onPress={() => handleSendWhatsApp(due)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="logo-whatsapp" size={13} color="#059669" />
                  <Text style={[st.dueActionBtnText, { color: '#059669' }]}>WhatsApp</Text>
                </TouchableOpacity>

                {due.phone ? (
                  <TouchableOpacity
                    style={[st.dueActionBtn, st.dueActionBtnCall]}
                    onPress={() => handleCall(due)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="call-outline" size={13} color="#4F46E5" />
                    <Text style={[st.dueActionBtnText, { color: '#4F46E5' }]}>Call</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[st.dueActionBtn, st.dueActionBtnCollect]}
                  onPress={() => handleOpenStudent(due)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="card-outline" size={13} color="#1E293B" />
                  <Text style={[st.dueActionBtnText, { color: '#1E293B' }]}>Record Fee</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
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

// ─── Follow-Up Chips (Multi-colored illuminated pills) ───────────────────────
const CHIP_PALETTES = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: '#2563EB' }, // Blue
  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: '#DC2626' }, // Red
  { bg: '#FFF7ED', border: '#FFEDD5', text: '#C2410C', icon: '#EA580C' }, // Orange
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', icon: '#059669' }, // Emerald
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', icon: '#7C3AED' }, // Purple
  { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '#D97706' }, // Amber
  { bg: '#FDF2F8', border: '#FBCFE8', text: '#BE185D', icon: '#DB2777' }, // Pink
  { bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E', icon: '#0D9488' }, // Teal
];

const FollowUpChipsBlock = ({ label, chips }: {
  label?: string;
  chips: Array<{ label: string; icon?: string; onPress: () => void }>;
}) => (
  <View style={st.followUpContainer}>
    {label ? <Text style={st.followUpLabel}>{label}</Text> : null}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 2 }}
    >
      {chips.map((chip, i) => {
        const palette = CHIP_PALETTES[i % CHIP_PALETTES.length];
        return (
          <TouchableOpacity
            key={i}
            style={[
              st.followUpChip,
              {
                backgroundColor: palette.bg,
                borderColor: palette.border,
                borderWidth: 1.2,
                shadowColor: palette.icon,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 3,
                elevation: 1,
              }
            ]}
            onPress={() => { Haptics.selectionAsync().catch(() => { }); chip.onPress(); }}
            activeOpacity={0.75}
          >
            {chip.icon ? (
              <Ionicons name={chip.icon as any} size={13} color={palette.icon} style={{ marginRight: 4 }} />
            ) : null}
            <Text style={[st.followUpChipText, { color: palette.text, fontWeight: '700' }]}>{chip.label}</Text>
          </TouchableOpacity>
        );
      })}
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

// ─── Photo Resolver Helper ───────────────────────────────────────────────────
const resolveStudentPhotoUri = (rawPhoto?: string | null) => {
  if (!rawPhoto || typeof rawPhoto !== 'string' || rawPhoto.trim() === '' || rawPhoto.trim() === 'null') return null;
  const raw = rawPhoto.trim();
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('media/') || raw.startsWith('photos/') || raw.startsWith('documents/')) {
    return `http://143.244.131.69:8081/api/media/${raw.replace(/^media\//, '')}`;
  }
  return `http://143.244.131.69:8081${raw.startsWith('/') ? '' : '/'}${raw}`;
};

// ─── Student Detail Accordion Card Block ──────────────────────────────────────
const StudentDetailCardBlock = ({ student }: { student: any }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    personal: false,
    guardian: false,
    payments: false,
    documents: false,
    timeline: false,
  });

  const toggleSection = (key: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.name || 'Student';
  const initial = name.charAt(0).toUpperCase();
  const room = student.room_number || student.roomNumber || 'Unassigned';
  const bed = student.bed_name || student.bed_no || student.bed_number || student.bedNumber || 'N/A';
  const phone = student.phone || student.mobile || '';
  const email = student.email || '';
  const rent = student.monthly_rent || student.rent || 0;
  const deposit = student.deposit_amount || student.security_deposit || 0;
  const maintenance = student.maintenance_fee || 0;
  const status = student.status === 1 ? 'Active' : student.status === 0 ? 'Left / Vacated' : student.status === 2 ? 'Pre-Booked' : 'Pending';
  const statusColor = student.status === 1 ? '#10B981' : student.status === 0 ? '#64748B' : '#F59E0B';

  const rawJoiningDate = student.admission_date || student.joining_date || student.created_at;
  const joiningDateStr = rawJoiningDate ? new Date(rawJoiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  
  const photoUri = resolveStudentPhotoUri(student.photo);
  const [imgError, setImgError] = useState(false);

  const payments = Array.isArray(student.payment_history) ? student.payment_history : [];
  const dues = Array.isArray(student.pending_dues) ? student.pending_dues : [];
  const totalDueAmount = dues.reduce((acc: number, d: any) => acc + Number(d.balance || d.amount || 0), 0);

  const aadhaarNumber = student.aadhaar_card_number || student.id_proof_number || (student.id_proof ? 'On File' : null);
  const documentsCount = (student.aadhaar_card_photo ? 1 : 0) + (student.student_id_proof_photo ? 1 : 0) + (aadhaarNumber ? 1 : 0);

  return (
    <View style={st.accordionCardContainer}>
      {/* ── 1. PROFILE HEADER ── */}
      <View style={st.accordionProfileHeader}>
        <View style={st.accordionAvatarWrap}>
          {photoUri && !imgError ? (
            <Image
              source={{ uri: photoUri }}
              style={st.accordionAvatarImg}
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[st.accordionAvatarCircle, { backgroundColor: '#4F46E5' }]}>
              <Text style={st.accordionAvatarLetter}>{initial}</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={st.accordionProfileName} numberOfLines={1}>{name}</Text>
            <View style={[st.accordionStatusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[st.accordionStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[st.accordionStatusText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>

          <Text style={st.accordionProfileSubtitle} numberOfLines={1}>
            {student.college_or_working_company || student.occupation || 'Hostel Resident'}
          </Text>

          <View style={st.accordionPillRow}>
            <View style={st.accordionRoomPill}>
              <Ionicons name="bed-outline" size={11} color="#4F46E5" />
              <Text style={st.accordionRoomPillText}>Room {room} • Bed {bed}</Text>
            </View>
            <Text style={st.accordionRentText}>{INR(rent)}/mo</Text>
          </View>
        </View>
      </View>

      {/* ── 2. QUICK ACTION BUTTONS ── */}
      <View style={st.accordionActionRow}>
        {phone ? (
          <>
            <TouchableOpacity
              style={[st.accordionQuickBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
              onPress={() => Linking.openURL(`tel:${phone}`)}
              activeOpacity={0.75}
            >
              <Ionicons name="call" size={13} color="#10B981" />
              <Text style={[st.accordionQuickBtnText, { color: '#059669' }]}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[st.accordionQuickBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={() => Linking.openURL(`https://wa.me/91${phone.replace(/[^0-9]/g, '')}`)}
              activeOpacity={0.75}
            >
              <Ionicons name="logo-whatsapp" size={13} color="#16A34A" />
              <Text style={[st.accordionQuickBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity
          style={[st.accordionQuickBtn, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', flex: 1.2 }]}
          onPress={() => {
            if (student.student_id) {
              RootNavigation.navigate('StudentDetails', { studentId: student.student_id });
            } else {
              RootNavigation.navigate('Students');
            }
            DeviceEventEmitter.emit('CLOSE_ASSISTANT');
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="person" size={13} color="#4F46E5" />
          <Text style={[st.accordionQuickBtnText, { color: '#4F46E5' }]}>Full Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.accordionQuickBtn, { backgroundColor: '#4F46E5', borderColor: '#4F46E5', flex: 1.2 }]}
          onPress={() => {
            RootNavigation.navigate('CollectedPayments');
            DeviceEventEmitter.emit('CLOSE_ASSISTANT');
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="cash" size={13} color="#FFF" />
          <Text style={[st.accordionQuickBtnText, { color: '#FFF' }]}>Payments</Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. ACCORDION SECTIONS ── */}
      <View style={st.accordionListWrap}>

        {/* ── SECTION 1: Basic & Room Details ── */}
        <View style={st.accordionItem}>
          <TouchableOpacity
            style={st.accordionHeader}
            onPress={() => toggleSection('basic')}
            activeOpacity={0.7}
          >
            <View style={[st.accordionIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="person-outline" size={16} color="#4F46E5" />
            </View>
            <Text style={st.accordionTitle}>Basic details</Text>
            <Ionicons
              name={expandedSections.basic ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>

          {expandedSections.basic && (
            <View style={st.accordionContent}>
              <View style={st.accordionRow}>
                <Ionicons name="location-outline" size={15} color="#3B82F6" style={st.rowIcon} />
                <Text style={st.rowText}>{student.hostel_name || 'Hostix PG, Hyderabad'}</Text>
              </View>

              <View style={st.accordionRow}>
                <Ionicons name="business-outline" size={15} color="#0EA5E9" style={st.rowIcon} />
                <Text style={st.rowText}>Room {room} • Bed {bed} • {student.room_type_name || 'Standard AC/Non-AC'}</Text>
              </View>

              <View style={st.accordionRow}>
                <Ionicons name="calendar-outline" size={15} color="#6366F1" style={st.rowIcon} />
                <Text style={st.rowText}>Joined: {joiningDateStr}</Text>
              </View>

              <View style={st.accordionRow}>
                <Ionicons name="wallet-outline" size={15} color="#10B981" style={st.rowIcon} />
                <Text style={st.rowText}>Monthly Rent: <Text style={{ fontWeight: '700', color: '#10B981' }}>{INR(rent)}</Text> {deposit > 0 ? `• Deposit: ${INR(deposit)}` : ''}</Text>
              </View>

              {email ? (
                <View style={st.accordionRow}>
                  <Ionicons name="mail-outline" size={15} color="#3B82F6" style={st.rowIcon} />
                  <Text style={[st.rowText, { flex: 1 }]}>{email}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                </View>
              ) : null}

              {phone ? (
                <View style={st.accordionRow}>
                  <Ionicons name="call-outline" size={15} color="#10B981" style={st.rowIcon} />
                  <Text style={[st.rowText, { flex: 1 }]}>{phone}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                </View>
              ) : null}

              {student.college_or_working_company ? (
                <View style={st.accordionRow}>
                  <Ionicons name="briefcase-outline" size={15} color="#8B5CF6" style={st.rowIcon} />
                  <Text style={st.rowText}>{student.college_or_working_company}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* ── SECTION 2: Personal Details ── */}
        <View style={st.accordionItem}>
          <TouchableOpacity
            style={st.accordionHeader}
            onPress={() => toggleSection('personal')}
            activeOpacity={0.7}
          >
            <View style={[st.accordionIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="id-card-outline" size={16} color="#16A34A" />
            </View>
            <Text style={st.accordionTitle}>Personal details</Text>
            <Ionicons
              name={expandedSections.personal ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>

          {expandedSections.personal && (
            <View style={st.accordionContent}>
              <View style={st.accordionRow}>
                <Ionicons name="male-female-outline" size={15} color="#64748B" style={st.rowIcon} />
                <Text style={st.rowText}>Gender: <Text style={{ fontWeight: '600' }}>{student.gender || 'Not specified'}</Text></Text>
              </View>

              {student.date_of_birth ? (
                <View style={st.accordionRow}>
                  <Ionicons name="gift-outline" size={15} color="#EC4899" style={st.rowIcon} />
                  <Text style={st.rowText}>DOB: {new Date(student.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
              ) : null}

              {student.blood_group ? (
                <View style={st.accordionRow}>
                  <Ionicons name="water-outline" size={15} color="#EF4444" style={st.rowIcon} />
                  <Text style={st.rowText}>Blood Group: <Text style={{ fontWeight: '700', color: '#EF4444' }}>{student.blood_group}</Text></Text>
                </View>
              ) : null}

              {student.permanent_address ? (
                <View style={st.accordionRow}>
                  <Ionicons name="home-outline" size={15} color="#059669" style={st.rowIcon} />
                  <Text style={st.rowText}>Permanent: {student.permanent_address}</Text>
                </View>
              ) : null}

              {student.present_working_address ? (
                <View style={st.accordionRow}>
                  <Ionicons name="navigate-outline" size={15} color="#0284C7" style={st.rowIcon} />
                  <Text style={st.rowText}>Work / College Address: {student.present_working_address}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* ── SECTION 3: Guardian Details ── */}
        <View style={st.accordionItem}>
          <TouchableOpacity
            style={st.accordionHeader}
            onPress={() => toggleSection('guardian')}
            activeOpacity={0.7}
          >
            <View style={[st.accordionIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#D97706" />
            </View>
            <Text style={st.accordionTitle}>Guardian & Emergency contact</Text>
            <Ionicons
              name={expandedSections.guardian ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>

          {expandedSections.guardian && (
            <View style={st.accordionContent}>
              <View style={st.accordionRow}>
                <Ionicons name="people-outline" size={15} color="#D97706" style={st.rowIcon} />
                <Text style={st.rowText}>Guardian: <Text style={{ fontWeight: '700' }}>{student.guardian_name || 'Not provided'}</Text> ({student.guardian_relation || 'Parent'})</Text>
              </View>

              {student.guardian_phone ? (
                <View style={st.accordionRow}>
                  <Ionicons name="call-outline" size={15} color="#10B981" style={st.rowIcon} />
                  <Text style={[st.rowText, { flex: 1 }]}>{student.guardian_phone}</Text>
                  <TouchableOpacity
                    style={[st.accordionMiniBtn, { backgroundColor: '#ECFDF5' }]}
                    onPress={() => Linking.openURL(`tel:${student.guardian_phone}`)}
                  >
                    <Ionicons name="call" size={12} color="#10B981" />
                    <Text style={st.accordionMiniBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={st.rowMutedText}>No guardian contact number recorded.</Text>
              )}
            </View>
          )}
        </View>

        {/* ── SECTION 4: Payment & Dues History ── */}
        <View style={st.accordionItem}>
          <TouchableOpacity
            style={st.accordionHeader}
            onPress={() => toggleSection('payments')}
            activeOpacity={0.7}
          >
            <View style={[st.accordionIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="cash-outline" size={16} color="#EF4444" />
            </View>
            <Text style={st.accordionTitle}>Payment & Dues history</Text>
            {dues.length > 0 ? (
              <View style={st.accordionCountBadge}>
                <Text style={st.accordionCountBadgeText}>{dues.length} Due</Text>
              </View>
            ) : payments.length > 0 ? (
              <View style={[st.accordionCountBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[st.accordionCountBadgeText, { color: '#10B981' }]}>{payments.length} Paid</Text>
              </View>
            ) : null}
            <Ionicons
              name={expandedSections.payments ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>

          {expandedSections.payments && (
            <View style={st.accordionContent}>
              {/* Due summary card */}
              <View style={[st.accordionSubCard, { backgroundColor: totalDueAmount > 0 ? '#FEF2F2' : '#F0FDF4', borderColor: totalDueAmount > 0 ? '#FECACA' : '#BBF7D0' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: totalDueAmount > 0 ? '#991B1B' : '#166534' }}>
                    {totalDueAmount > 0 ? 'Pending Outstanding Rent' : 'All Dues Cleared'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: totalDueAmount > 0 ? '#EF4444' : '#10B981' }}>
                    {INR(totalDueAmount)}
                  </Text>
                </View>
              </View>

              {/* Payments list */}
              {payments.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={st.sectionSubHeader}>Recent Transactions ({payments.length})</Text>
                  {payments.slice(0, 4).map((p: any, idx: number) => (
                    <View key={idx} style={st.paymentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.paymentForText}>{p.payment_for_month || 'Monthly Rent Payment'}</Text>
                        <Text style={st.paymentDateText}>
                          {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'} • {p.payment_mode_name || p.payment_mode || 'Cash'}
                        </Text>
                      </View>
                      <Text style={st.paymentAmountText}>+{INR(p.amount_paid || p.amount || 0)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[st.rowMutedText, { marginTop: 6 }]}>No recent payment records found.</Text>
              )}
            </View>
          )}
        </View>

        {/* ── SECTION 5: Documents & ID Proofs ── */}
        <View style={st.accordionItem}>
          <TouchableOpacity
            style={st.accordionHeader}
            onPress={() => toggleSection('documents')}
            activeOpacity={0.7}
          >
            <View style={[st.accordionIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="document-text-outline" size={16} color="#9333EA" />
            </View>
            <Text style={st.accordionTitle}>Documents & Verification</Text>
            {documentsCount > 0 ? (
              <View style={[st.accordionCountBadge, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[st.accordionCountBadgeText, { color: '#9333EA' }]}>{documentsCount}</Text>
              </View>
            ) : null}
            <Ionicons
              name={expandedSections.documents ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>

          {expandedSections.documents && (
            <View style={st.accordionContent}>
              <View style={st.accordionRow}>
                <Ionicons name="card-outline" size={15} color="#9333EA" style={st.rowIcon} />
                <Text style={st.rowText}>Govt ID / Aadhaar: <Text style={{ fontWeight: '700' }}>{aadhaarNumber || 'Verified'}</Text></Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <View style={[st.docPill, { backgroundColor: student.aadhaar_card_photo ? '#ECFDF5' : '#F8FAFC' }]}>
                  <Ionicons name={student.aadhaar_card_photo ? "checkmark-circle" : "document-attach-outline"} size={13} color={student.aadhaar_card_photo ? "#10B981" : "#94A3B8"} />
                  <Text style={[st.docPillText, { color: student.aadhaar_card_photo ? "#059669" : "#64748B" }]}>Aadhaar Card</Text>
                </View>

                <View style={[st.docPill, { backgroundColor: student.student_id_proof_photo ? '#ECFDF5' : '#F8FAFC' }]}>
                  <Ionicons name={student.student_id_proof_photo ? "checkmark-circle" : "document-attach-outline"} size={13} color={student.student_id_proof_photo ? "#10B981" : "#94A3B8"} />
                  <Text style={[st.docPillText, { color: student.student_id_proof_photo ? "#059669" : "#64748B" }]}>Student / Org ID</Text>
                </View>

                <View style={[st.docPill, { backgroundColor: photoUri ? '#ECFDF5' : '#F8FAFC' }]}>
                  <Ionicons name={photoUri ? "checkmark-circle" : "camera-outline"} size={13} color={photoUri ? "#10B981" : "#94A3B8"} />
                  <Text style={[st.docPillText, { color: photoUri ? "#059669" : "#64748B" }]}>Profile Photo</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── SECTION 6: Timeline & Stay Info ── */}
        <View style={[st.accordionItem, { borderBottomWidth: 0 }]}>
          <TouchableOpacity
            style={st.accordionHeader}
            onPress={() => toggleSection('timeline')}
            activeOpacity={0.7}
          >
            <View style={[st.accordionIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="time-outline" size={16} color="#0284C7" />
            </View>
            <Text style={st.accordionTitle}>Stay timeline & Plan</Text>
            <Ionicons
              name={expandedSections.timeline ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>

          {expandedSections.timeline && (
            <View style={st.accordionContent}>
              <View style={st.accordionRow}>
                <Ionicons name="log-in-outline" size={15} color="#10B981" style={st.rowIcon} />
                <Text style={st.rowText}>Check-in Date: <Text style={{ fontWeight: '600' }}>{joiningDateStr}</Text></Text>
              </View>

              <View style={st.accordionRow}>
                <Ionicons name="repeat-outline" size={15} color="#6366F1" style={st.rowIcon} />
                <Text style={st.rowText}>Billing Plan: <Text style={{ fontWeight: '600' }}>{student.fee_plan ? `${student.fee_plan} Months Duration` : 'Monthly Cycle'}</Text></Text>
              </View>

              {student.plan_end_date ? (
                <View style={st.accordionRow}>
                  <Ionicons name="flag-outline" size={15} color="#F59E0B" style={st.rowIcon} />
                  <Text style={st.rowText}>Plan End / Renewal: <Text style={{ fontWeight: '600' }}>{new Date(student.plan_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

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
                const dueAmt = occ.due_amount !== undefined && occ.due_amount !== null ? parseFloat(occ.due_amount) : 0;
                const isPaid = occ.rent_status === 'paid' || dueAmt <= 0;

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
                          {isPaid ? 'Paid' : (dueAmt > 0 ? `₹${dueAmt.toLocaleString('en-IN')} Due` : 'Dues Pending')}
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

// ─── Vacant / Available Rooms Floor-Wise Card Block ─────────────────────────
const VacantRoomsCardBlock = ({ title, rooms, onSelectRoom }: {
  title: string;
  rooms: any[];
  onSelectRoom?: (roomNumber: string | number) => void;
}) => {
  // Group rooms by floor_number
  const floorMap = useMemo(() => {
    const map = new Map<number, any[]>();
    rooms.forEach((r: any) => {
      const fl = Number(r.floor_number ?? 0);
      if (!map.has(fl)) map.set(fl, []);
      map.get(fl)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [rooms]);

  const totalVacantBeds = rooms.reduce((acc, r) => acc + Number(r.available_beds ?? (Number(r.total_capacity || r.capacity || 0) - Number(r.occupied_beds || 0))), 0);

  const handlePressRoom = (r: any) => {
    Haptics.selectionAsync().catch(() => {});
    if (onSelectRoom) {
      onSelectRoom(r.room_number);
    } else {
      RootNavigation.navigate('RoomDetails', { roomId: r.room_id || r.id, roomNumber: r.room_number });
      DeviceEventEmitter.emit('CLOSE_ASSISTANT');
    }
  };

  return (
    <View style={st.detailCardContainer}>
      <View style={st.detailCardHeader}>
        <View style={[st.avatarCircle, { backgroundColor: '#ECFDF5', width: 42, height: 42, borderRadius: 21 }]}>
          <Ionicons name="bed-outline" size={20} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.detailCardName}>{title || 'Vacant Rooms & Bed Availability'}</Text>
          <Text style={st.detailCardSub}>{rooms.length} Rooms • {totalVacantBeds} Total Available Beds</Text>
        </View>
        <View style={[st.listItemBadge, { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4 }]}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>{totalVacantBeds} Free</Text>
        </View>
      </View>

      {rooms.length === 0 ? (
        <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 8 }}>
          All rooms are currently 100% occupied. No vacant beds available.
        </Text>
      ) : (
        <View style={{ gap: 12, marginTop: 4 }}>
          {floorMap.map(([floorNum, floorRooms]) => (
            <View key={floorNum} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#4F46E5' }}>Floor {floorNum}</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                  ({floorRooms.length} room{floorRooms.length > 1 ? 's' : ''})
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                {floorRooms.map((r: any, idx: number) => {
                  const cap = Number(r.total_capacity || r.capacity || 0);
                  const occ = Number(r.occupied_beds || 0);
                  const avail = Math.max(0, cap - occ);

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        st.listItem,
                        {
                          borderColor: avail > 0 ? '#BBF7D0' : '#E2E8F0',
                          backgroundColor: avail > 0 ? '#F0FDF4' : '#FFFFFF',
                        }
                      ]}
                      onPress={() => handlePressRoom(r)}
                      activeOpacity={0.75}
                    >
                      <View style={[st.avatarCircle, { backgroundColor: avail > 0 ? '#DCFCE7' : '#F1F5F9', width: 34, height: 34, borderRadius: 17, marginRight: 8 }]}>
                        <Ionicons name="business" size={16} color={avail > 0 ? '#16A34A' : '#94A3B8'} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={[st.listItemName, { fontSize: 13, fontWeight: '700', color: '#1E293B' }]} numberOfLines={1}>
                          Room {r.room_number} <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>({r.room_type_name || 'Standard'})</Text>
                        </Text>
                        <Text style={[st.listItemSub, { fontSize: 11 }]} numberOfLines={1}>
                          {occ}/{cap} Occupied • Tap for Bed Details
                        </Text>
                      </View>

                      <View style={[st.listItemBadge, { backgroundColor: avail > 0 ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4 }]}>
                        <Text style={[st.listItemBadgeText, { color: avail > 0 ? '#15803D' : '#DC2626', fontSize: 11, fontWeight: '800' }]}>
                          {avail > 0 ? `🟢 ${avail} Free` : '🔴 Full'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Student List Card Block ────────────────────────────────────────────────
const StudentListCardBlock = ({ title, students }: { title: string; students: any[] }) => {
  const handleOpenStudent = (s: any) => {
    const studentId = s.student_id || s.id;
    if (studentId) {
      Haptics.selectionAsync().catch(() => {});
      RootNavigation.navigate('StudentDetails', { studentId });
      DeviceEventEmitter.emit('CLOSE_ASSISTANT');
    }
  };

  const handleWhatsApp = (s: any) => {
    Haptics.selectionAsync().catch(() => {});
    const phone = s.phone || s.contact_number || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const name = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Resident';
    const msg = encodeURIComponent(`Hi ${name}, this is from hostel management regarding your stay.`);
    const url = targetPhone ? `https://wa.me/${targetPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleCall = (s: any) => {
    Haptics.selectionAsync().catch(() => {});
    const phone = s.phone || s.contact_number || '';
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  };

  return (
    <View style={st.listContainer}>
      <Text style={st.listHeader}>{title} ({students.length})</Text>
      {students.length === 0 ? (
        <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 6 }}>No records found for this category.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {students.slice(0, 8).map((s, idx) => {
            const fullName = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Resident';
            const isActive = String(s.status).toLowerCase() === 'active' || s.status === 1 || s.status === true;
            const hasPhone = Boolean(s.phone || s.contact_number);

            return (
              <TouchableOpacity
                key={idx}
                style={st.listItem}
                onPress={() => handleOpenStudent(s)}
                activeOpacity={0.75}
              >
                <View style={[st.avatarCircle, { backgroundColor: '#EEF2FF', width: 36, height: 36, borderRadius: 18, marginRight: 8 }]}>
                  <Ionicons name="person" size={16} color="#4F46E5" />
                </View>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={st.listItemName} numberOfLines={1} ellipsizeMode="tail">{fullName}</Text>
                  <Text style={st.listItemSub} numberOfLines={1} ellipsizeMode="tail">
                    Room: {s.roomNumber || s.room_number || 'N/A'} {s.monthly_rent || s.paidAmount ? `• ₹${Number(s.monthly_rent || s.paidAmount || 0).toLocaleString('en-IN')}` : ''}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {hasPhone && (
                    <>
                      <TouchableOpacity
                        style={st.miniIconBtnBlue}
                        onPress={() => handleCall(s)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="call" size={12} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={st.miniIconBtnGreen}
                        onPress={() => handleWhatsApp(s)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="logo-whatsapp" size={12} color="#059669" />
                      </TouchableOpacity>
                    </>
                  )}

                  {s.badgeText ? (
                    <View style={[st.listItemBadge, { backgroundColor: s.badgeColor || '#EEF2FF' }]}>
                      <Text style={[st.listItemBadgeText, { color: s.badgeTextColor || '#4F46E5' }]}>{s.badgeText}</Text>
                    </View>
                  ) : (
                    <View style={[st.listItemBadge, { backgroundColor: isActive ? '#ECFDF5' : '#FEE2E2' }]}>
                      <Text style={[st.listItemBadgeText, { color: isActive ? '#059669' : '#DC2626' }]}>
                        {isActive ? 'Active' : 'Vacated'}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ─── Owner List Card Block ──────────────────────────────────────────────────
const OwnerListBlock = ({ title, owners }: { title: string; owners: any[] }) => {
  return (
    <View style={st.listContainer}>
      <Text style={st.listHeader}>{title} ({owners.length})</Text>
      {owners.length === 0 ? (
        <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 6 }}>No owner records found.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {owners.slice(0, 8).map((o, idx) => {
            const fullName = o.full_name || o.name || `${o.first_name || ''} ${o.last_name || ''}`.trim() || 'Hostel Owner';
            const isActive = o.is_active || o.status === 'ACTIVE' || o.status === 1 || o.status === true;
            return (
              <View key={idx} style={st.listItem}>
                <View style={[st.avatarCircle, { backgroundColor: '#FFF7ED', width: 34, height: 34, borderRadius: 17, marginRight: 8 }]}>
                  <Ionicons name="business" size={16} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.listItemName}>{fullName}</Text>
                  <Text style={st.listItemSub}>
                    {o.phone || o.email || 'No contact'} {o.hostel_name ? `• ${o.hostel_name}` : ''}
                  </Text>
                </View>
                <View style={[st.listItemBadge, { backgroundColor: isActive ? '#ECFDF5' : '#FEE2E2' }]}>
                  <Text style={[st.listItemBadgeText, { color: isActive ? '#059669' : '#DC2626' }]}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            );
          })}
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

// ─── Visual Reference Donut Card Block (Images 1, 3, 4, 5) ──────────────────
const DistributionDonutCardBlock = ({
  title,
  subtitle,
  centerIcon,
  centerIconColor = '#7C3AED',
  centerIconBg = '#FFFFFF',
  statusIcon = 'checkmark-circle',
  statusIconColor = '#10B981',
  segments,
  highlightText,
  actionButtons,
}: {
  title: string;
  subtitle?: string;
  centerIcon: string;
  centerIconColor?: string;
  centerIconBg?: string;
  statusIcon?: string;
  statusIconColor?: string;
  segments: Array<{
    percentage: number;
    color: string;
    label: string;
    badge?: string;
  }>;
  highlightText?: string;
  actionButtons?: Array<{
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'outline';
  }>;
}) => {
  const radius = 38;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius;

  const cumulativePctList: number[] = [];
  let runningSum = 0;
  segments.forEach((seg) => {
    runningSum += seg.percentage;
    cumulativePctList.push(Math.min(runningSum, 100));
  });
  const reversedPcts = [...cumulativePctList].reverse();

  return (
    <View style={st.refCardContainer}>
      {/* Top Header Row */}
      <View style={st.refCardHeaderRow}>
        <Ionicons name={(statusIcon as any) || 'checkmark-circle'} size={18} color={statusIconColor} />
        <View style={{ flex: 1 }}>
          <Text style={st.refCardTitle}>{title}</Text>
          {subtitle ? <Text style={st.refCardSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {/* Donut Chart + Right-Side Dot Legend */}
      <View style={st.refDonutBodyRow}>
        <View style={st.refDonutChartWrap}>
          <Svg width={105} height={105} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={52.5}
              cy={52.5}
              r={radius}
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {reversedPcts.map((pct, idx) => {
              const segIndex = segments.length - 1 - idx;
              const color = segments[segIndex]?.color || '#64748B';
              const offset = circumference - (pct / 100) * circumference;
              return (
                <Circle
                  key={idx}
                  cx={52.5}
                  cy={52.5}
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

          {/* Center Circular Icon Badge */}
          <View style={[st.refDonutCenterBadge, { backgroundColor: centerIconBg }]}>
            <Ionicons name={(centerIcon as any) || 'stats-chart'} size={20} color={centerIconColor} />
          </View>
        </View>

        {/* Right Side Dots Legend */}
        <View style={st.refLegendColumn}>
          {segments.map((seg, idx) => (
            <View key={idx} style={st.refLegendItemRow}>
              <View style={[st.refLegendDot, { backgroundColor: seg.color }]} />
              <Text style={st.refLegendLabelText} numberOfLines={1}>
                {seg.label}: <Text style={st.refLegendPctBold}>{seg.percentage}%</Text>
              </Text>
              {seg.badge ? (
                <View style={st.refYouBadge}>
                  <Text style={st.refYouBadgeText}>{seg.badge}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Optional Highlight Stat Note */}
      {highlightText ? (
        <View style={st.refHighlightBox}>
          <Text style={st.refHighlightText}>{highlightText}</Text>
        </View>
      ) : null}

      {/* Action buttons (like ( Yes ) ( No )) */}
      {actionButtons && actionButtons.length > 0 ? (
        <View style={st.refPillsRow}>
          {actionButtons.map((btn, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                st.refPillBtn,
                btn.variant === 'primary' ? st.refPillBtnPrimary : st.refPillBtnOutline,
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                btn.onPress?.();
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  st.refPillBtnText,
                  btn.variant === 'primary' ? st.refPillBtnTextPrimary : st.refPillBtnTextOutline,
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

// ─── Visual Reference Profile Match Checklist Card (Image 2) ────────────────
const ProfileMatchChecklistBlock = ({
  title,
  score,
  avatarUri,
  icon = 'school',
  items,
}: {
  title: string;
  score: string;
  avatarUri?: string;
  icon?: string;
  items: Array<{
    label: string;
    matched: boolean;
  }>;
}) => {
  const midpoint = Math.ceil(items.length / 2);
  const leftCol = items.slice(0, midpoint);
  const rightCol = items.slice(midpoint);

  return (
    <View style={st.refCardContainer}>
      {/* Top Profile Header */}
      <View style={st.refMatchHeaderRow}>
        <View style={st.refAvatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={st.refAvatarImg} />
          ) : (
            <Image source={require('../../../assets/chatbot-image-newjpeg.jpeg')} style={st.refAvatarImg} />
          )}

          <View style={st.refAvatarBadge}>
            <Ionicons name={(icon as any) || 'school'} size={10} color="#7C3AED" />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={st.refMatchTitle}>{title}</Text>
          <Text style={st.refMatchScore}>{score}</Text>
        </View>
      </View>

      {/* 2-Column Checklist */}
      <View style={st.refChecklistGrid}>
        <View style={st.refChecklistCol}>
          {leftCol.map((item, idx) => (
            <View key={idx} style={st.refChecklistItem}>
              <Ionicons
                name={item.matched ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={item.matched ? '#10B981' : '#94A3B8'}
              />
              <Text
                style={[
                  st.refChecklistLabel,
                  !item.matched && { color: '#64748B' },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={st.refChecklistCol}>
          {rightCol.map((item, idx) => (
            <View key={idx} style={st.refChecklistItem}>
              <Ionicons
                name={item.matched ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={item.matched ? '#10B981' : '#94A3B8'}
              />
              <Text
                style={[
                  st.refChecklistLabel,
                  !item.matched && { color: '#64748B' },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── Stat Pill Action Buttons Block (Image 5) ───────────────────────────────
const StatPillActionsBlock = ({
  question,
  actions,
}: {
  question?: string;
  actions: Array<{ label: string; onPress: () => void }>;
}) => {
  return (
    <View style={{ marginTop: 4 }}>
      {question ? <Text style={st.refQuestionText}>{question}</Text> : null}
      <View style={st.refPillsRow}>
        {actions.map((act, idx) => (
          <TouchableOpacity
            key={idx}
            style={st.refPillBtnOutline}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              act.onPress?.();
            }}
            activeOpacity={0.8}
          >
            <Text style={st.refPillBtnTextOutline}>{act.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Predefined Question Cards 2x2 Grid Block ──────────────────────────────
const QuestionCardsGridBlock = ({
  label,
  cards,
}: {
  label?: string;
  cards: Array<{
    title: string;
    subtitle?: string;
    icon: string;
    iconColor?: string;
    iconBg?: string;
    bg?: string;
    border?: string;
    onPress: () => void;
  }>;
}) => {
  return (
    <View style={{ gap: 8, marginTop: 6, width: '100%' }}>
      {label ? <Text style={st.followUpLabel}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        {cards.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={{
              width: '48%',
              backgroundColor: c.bg || '#FFFFFF',
              borderColor: c.border || '#E2E8F0',
              borderWidth: 1.2,
              borderRadius: 14,
              padding: 12,
              shadowColor: c.iconColor || '#4F46E5',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              c.onPress();
            }}
            activeOpacity={0.75}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: c.iconBg || '#EEF2FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name={c.icon as any} size={18} color={c.iconColor || '#4F46E5'} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>
              {c.title}
            </Text>
            {c.subtitle ? (
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 14 }} numberOfLines={2}>
                {c.subtitle}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Simple Action Pills (Matching the user's reference image) ───────────────
const SimpleActionPillsBlock = ({
  pills,
}: {
  pills: Array<{ label: string; onPress: () => void }>;
}) => {
  return (
    <View style={{ gap: 8, marginTop: 10, width: '100%' }}>
      {pills.map((pill, idx) => (
        <TouchableOpacity
          key={idx}
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#FFF5F5',
            borderColor: '#FECDD3',
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 9,
            paddingHorizontal: 16,
            maxWidth: '100%',
          }}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            pill.onPress();
          }}
          activeOpacity={0.75}
        >
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: '600',
              color: '#E11D48',
              lineHeight: 18,
            }}
          >
            {pill.label}
          </Text>
        </TouchableOpacity>
      ))}
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
        case 'simple_action_pills':
          return <SimpleActionPillsBlock key={i} pills={block.pills} />;

        case 'question_cards_grid':
          return <QuestionCardsGridBlock key={i} label={block.label} cards={block.cards} />;


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

        case 'vacant_rooms_card':
          return <VacantRoomsCardBlock key={i} title={block.title} rooms={block.rooms} onSelectRoom={block.onSelectRoom} />;

        case 'student_list_card':
          return <StudentListCardBlock key={i} title={block.title} students={block.students} />;

        case 'owner_list_card':
          return <OwnerListBlock key={i} title={block.title} owners={block.owners} />;

        case 'income_breakdown_card':
          return <IncomeBreakdownCardBlock key={i} data={block.data} />;

        case 'distribution_donut_card':
          return (
            <DistributionDonutCardBlock
              key={i}
              title={block.title}
              subtitle={block.subtitle}
              centerIcon={block.centerIcon}
              centerIconColor={block.centerIconColor}
              centerIconBg={block.centerIconBg}
              statusIcon={block.statusIcon}
              statusIconColor={block.statusIconColor}
              segments={block.segments}
              highlightText={block.highlightText}
              actionButtons={block.actionButtons}
            />
          );

        case 'profile_match_checklist_card':
          return (
            <ProfileMatchChecklistBlock
              key={i}
              title={block.title}
              score={block.score}
              avatarUri={block.avatarUri}
              icon={block.icon}
              items={block.items}
            />
          );

        case 'stat_pill_actions':
          return (
            <StatPillActionsBlock
              key={i}
              question={block.question}
              actions={block.actions}
            />
          );

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

  // Visual Reference Cards (Images 1-5)
  refCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  refCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  refCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  refCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  refDonutBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 4,
  },
  refDonutChartWrap: {
    position: 'relative',
    width: 105,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refDonutCenterBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  refLegendColumn: {
    flex: 1,
    gap: 7,
  },
  refLegendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  refLegendLabelText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
  },
  refLegendPctBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  refYouBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  refYouBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7C3AED',
  },
  refHighlightBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  refHighlightText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    fontWeight: '600',
  },
  refPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  refPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refPillBtnOutline: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  refPillBtnPrimary: {
    backgroundColor: '#2563EB',
  },
  refPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refPillBtnTextOutline: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  refPillBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  refQuestionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  // Profile Match
  refMatchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  refAvatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  refAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  refAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  refMatchTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  refMatchScore: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 1,
  },
  refChecklistGrid: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  refChecklistCol: {
    flex: 1,
    gap: 6,
  },
  refChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refChecklistLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
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
  miniIconBtnGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  miniIconBtnBlue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  // ── Due Cards List (Zomato-grade) ──
  dueCardListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  dueCardListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dueCardListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  dueTotalBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dueTotalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  dueCardItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  dueCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dueAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  dueStudentName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dueSubMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  dueRoomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  dueRoomBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  dueStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  dueStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dueStatusTagText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  dueAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  dueDateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '500',
  },
  dueActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dueActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dueActionBtnWhatsApp: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dueActionBtnCall: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  dueActionBtnCollect: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  dueActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  followUpChipText: {
    fontSize: 11,
    color: '#7C3AED',
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

  // ── Accordion Student Profile Card Styles ──
  accordionCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginVertical: 4,
  },
  accordionProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accordionAvatarWrap: {
    position: 'relative',
  },
  accordionAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  accordionAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionAvatarLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  accordionProfileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  accordionProfileSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  accordionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  accordionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  accordionStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accordionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  accordionRoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accordionRoomPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  accordionRentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  accordionActionRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  accordionQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  accordionQuickBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accordionListWrap: {
    backgroundColor: '#FFFFFF',
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  accordionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  accordionCountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  accordionCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
    gap: 8,
  },
  accordionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowIcon: {
    width: 18,
  },
  rowText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
  rowMutedText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  accordionMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  accordionMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  accordionSubCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  sectionSubHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentForText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  paymentDateText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  paymentAmountText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#10B981',
  },
  docPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});


