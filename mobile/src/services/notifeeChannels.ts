/**
 * notifeeChannels.ts
 *
 * Configures Android Notification Channels and Channel Groups for:
 * - Hostix (Owner app)
 * - Stayvix (Tenant app)
 *
 * Enforces priority tiers:
 * - HIGH (heads-up, sound + vibration + lights)
 * - MEDIUM (standard tray, sound, no interrupt vibration)
 * - LOW (silent, badge-only)
 */

import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

export interface ChannelDef {
  id: string;
  name: string;
  description: string;
  importance: AndroidImportance;
  vibration: boolean;
  sound?: string;
  groupId: string;
  lights?: boolean;
  lightColor?: string;
}

// ── Notification Channel Groups ──────────────────────────────────────────────
export const CHANNEL_GROUPS = [
  { id: 'group_owner_operations', name: 'Hostix Operations' },
  { id: 'group_owner_finance', name: 'Hostix Financials' },
  { id: 'group_tenant_personal', name: 'Stayvix Account & Dues' },
  { id: 'group_tenant_community', name: 'Stayvix Community & Support' },
];

// ── Owner Channels (Hostix) ──────────────────────────────────────────────────
// Categories: Tenant Mgmt, Vacate, Guest, Dues, Reports, Complaints, Staff, Expenses
export const OWNER_CHANNELS: ChannelDef[] = [
  {
    id: 'owner_tenant_mgmt',
    name: 'Tenant Mgmt',
    description: 'New tenant registrations, admission approvals, and student profile changes',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    lights: true,
    lightColor: '#0D9488',
    groupId: 'group_owner_operations',
  },
  {
    id: 'owner_vacate',
    name: 'Vacate',
    description: 'Vacate requests, checkout notices, and room release alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    lights: true,
    lightColor: '#0D9488',
    groupId: 'group_owner_operations',
  },
  {
    id: 'owner_dues',
    name: 'Dues',
    description: 'Payment approvals, overdue rent warnings, and overstay alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    lights: true,
    lightColor: '#0D9488',
    groupId: 'group_owner_finance',
  },
  {
    id: 'owner_complaints',
    name: 'Complaints',
    description: 'Maintenance issues and tenant requests received or updated',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
    sound: 'default',
    lights: false,
    groupId: 'group_owner_operations',
  },
  {
    id: 'owner_guest',
    name: 'Guest',
    description: 'Visitor pass submissions and short-stay guest logs',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
    sound: 'default',
    lights: false,
    groupId: 'group_owner_operations',
  },
  {
    id: 'owner_staff',
    name: 'Staff',
    description: 'Staff attendance, salary wallet activity, and task logs',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
    sound: 'default',
    lights: false,
    groupId: 'group_owner_operations',
  },
  {
    id: 'owner_reports',
    name: 'Reports',
    description: 'Weekly and monthly revenue, occupancy summaries, and digests',
    importance: AndroidImportance.LOW,
    vibration: false,
    lights: false,
    groupId: 'group_owner_finance',
  },
  {
    id: 'owner_expenses',
    name: 'Expenses',
    description: 'Expense nudges and daily operational spending alerts',
    importance: AndroidImportance.LOW,
    vibration: false,
    lights: false,
    groupId: 'group_owner_finance',
  },
];

// ── Tenant Channels (Stayvix) ────────────────────────────────────────────────
// Categories: Account, Dues, Expenses, Notices, Growth, Gate Pass, Complaints
export const TENANT_CHANNELS: ChannelDef[] = [
  {
    id: 'tenant_account',
    name: 'Account',
    description: 'Registration status, room allocations, and contract approvals',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    lights: true,
    lightColor: '#C2410C',
    groupId: 'group_tenant_personal',
  },
  {
    id: 'tenant_dues',
    name: 'Dues',
    description: 'Rent due reminders, payment receipts, and approval notifications',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    lights: true,
    lightColor: '#C2410C',
    groupId: 'group_tenant_personal',
  },
  {
    id: 'tenant_notices',
    name: 'Notices',
    description: 'Urgent hostel broadcasts, mess schedule updates, and water/power advisories',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    lights: true,
    lightColor: '#C2410C',
    groupId: 'group_tenant_community',
  },
  {
    id: 'tenant_gate_pass',
    name: 'Gate Pass',
    description: 'Gate pass approvals, check-in status, and curfew timings',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
    sound: 'default',
    lights: false,
    groupId: 'group_tenant_personal',
  },
  {
    id: 'tenant_complaints',
    name: 'Complaints',
    description: 'Updates on your raised maintenance and room issues',
    importance: AndroidImportance.DEFAULT,
    vibration: false,
    sound: 'default',
    lights: false,
    groupId: 'group_tenant_community',
  },
  {
    id: 'tenant_expenses',
    name: 'Expenses',
    description: 'Personal expense tracker nudges and budget reminders',
    importance: AndroidImportance.LOW,
    vibration: false,
    lights: false,
    groupId: 'group_tenant_personal',
  },
  {
    id: 'tenant_growth',
    name: 'Growth',
    description: 'Daily moral growth journey stories, quizzes, and vocabulary insights',
    importance: AndroidImportance.LOW,
    vibration: false,
    lights: false,
    groupId: 'group_tenant_community',
  },
];

/**
 * Initializes all required channels and channel groups in Android System Settings.
 * Safe to call on every app boot.
 */
export async function initializeNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // 1. Create Channel Groups
    for (const group of CHANNEL_GROUPS) {
      await notifee.createChannelGroup({
        id: group.id,
        name: group.name,
      });
    }

    // 2. Create All Owner Channels
    for (const ch of OWNER_CHANNELS) {
      await notifee.createChannel({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        importance: ch.importance,
        vibration: ch.vibration,
        vibrationPattern: ch.vibration ? [0, 250, 250, 250] : undefined,
        sound: ch.sound,
        groupId: ch.groupId,
        visibility: AndroidVisibility.PUBLIC,
        lights: ch.lights ?? false,
        lightColor: ch.lightColor,
      });
    }

    // 3. Create All Tenant Channels
    for (const ch of TENANT_CHANNELS) {
      await notifee.createChannel({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        importance: ch.importance,
        vibration: ch.vibration,
        vibrationPattern: ch.vibration ? [0, 250, 250, 250] : undefined,
        sound: ch.sound,
        groupId: ch.groupId,
        visibility: AndroidVisibility.PUBLIC,
        lights: ch.lights ?? false,
        lightColor: ch.lightColor,
      });
    }

    // Fallback default channel
    await notifee.createChannel({
      id: 'default',
      name: 'General Alerts',
      description: 'Default notifications for Hostix and Stayvix',
      importance: AndroidImportance.HIGH,
      vibration: true,
      sound: 'default',
      visibility: AndroidVisibility.PUBLIC,
      lights: true,
      lightColor: '#0D9488',
    });

    console.log('[Notifee] ✅ All notification channels initialized successfully.');
  } catch (err: any) {
    console.warn('[Notifee] ⚠️ Error initializing notification channels:', err?.message || err);
  }
}

/**
 * Resolves appropriate channel ID based on user role and category / payload.
 */
export function resolveChannelId(category: string, isTenant: boolean): string {
  const norm = (category || '').toLowerCase().trim();

  if (isTenant) {
    if (norm.includes('due') || norm.includes('payment') || norm.includes('rent') || norm.includes('overstay')) {
      return 'tenant_dues';
    }
    if (norm.includes('notice') || norm.includes('broadcast') || norm.includes('mess')) {
      return 'tenant_notices';
    }
    if (norm.includes('account') || norm.includes('regist') || norm.includes('room') || norm.includes('allocat')) {
      return 'tenant_account';
    }
    if (norm.includes('gate') || norm.includes('pass') || norm.includes('curfew')) {
      return 'tenant_gate_pass';
    }
    if (norm.includes('complaint') || norm.includes('issue') || norm.includes('maint')) {
      return 'tenant_complaints';
    }
    if (norm.includes('expense') || norm.includes('budget') || norm.includes('spend')) {
      return 'tenant_expenses';
    }
    if (norm.includes('growth') || norm.includes('story') || norm.includes('quiz') || norm.includes('journey')) {
      return 'tenant_growth';
    }
    return 'tenant_dues';
  } else {
    // Owner
    if (norm.includes('vacat')) {
      return 'owner_vacate';
    }
    if (norm.includes('due') || norm.includes('payment') || norm.includes('rent') || norm.includes('overstay') || norm.includes('fee')) {
      return 'owner_dues';
    }
    if (norm.includes('regist') || norm.includes('admission') || norm.includes('student') || norm.includes('tenant')) {
      return 'owner_tenant_mgmt';
    }
    if (norm.includes('complaint') || norm.includes('issue') || norm.includes('maint')) {
      return 'owner_complaints';
    }
    if (norm.includes('guest') || norm.includes('visitor')) {
      return 'owner_guest';
    }
    if (norm.includes('staff') || norm.includes('employee') || norm.includes('salary')) {
      return 'owner_staff';
    }
    if (norm.includes('report') || norm.includes('digest') || norm.includes('summary')) {
      return 'owner_reports';
    }
    if (norm.includes('expense')) {
      return 'owner_expenses';
    }
    return 'owner_dues';
  }
}
