/**
 * "Splits" — roommate expense splitting.
 *
 * Syncs with the backend API (/splits endpoints) on load and mutations.
 * Falls back to AsyncStorage when the backend is unavailable (offline-first).
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const STORAGE_KEY = 'splits_state_v1';
export const YOU_ID = 'you';

export type Member = { id: string; name: string };

export type Expense = {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  date: string; // ISO yyyy-mm-dd
};

export type SplitState = { members: Member[]; expenses: Expense[] };

export type Balance = { member: Member; net: number }; // net > 0 → is owed; < 0 → owes

const YOU_MEMBER: Member = { id: YOU_ID, name: 'You' };

const initialState: SplitState = {
  members: [YOU_MEMBER],
  expenses: [],
};

/** Pure: net balance per member across all expenses (equal split per expense). */
export function computeBalances(state: SplitState): Balance[] {
  const net: Record<string, number> = {};
  state.members.forEach((m) => (net[m.id] = 0));

  for (const e of state.expenses) {
    const parts = e.participantIds.filter((id) => net[id] !== undefined);
    if (parts.length === 0) continue;
    const share = e.amount / parts.length;
    if (net[e.paidById] !== undefined) net[e.paidById] += e.amount;
    parts.forEach((id) => (net[id] -= share));
  }

  return state.members.map((m) => ({ member: m, net: Math.round((net[m.id] || 0) * 100) / 100 }));
}

// Convert backend response to SplitState format
const toSplitState = (data: any): SplitState => {
  const backendMembers: Member[] = (data.members || []).map((m: any) => ({
    id: m.member_id || m.id,
    name: m.name,
  }));
  const allMembers = [YOU_MEMBER, ...backendMembers.filter(m => m.id !== YOU_ID)];

  const backendExpenses: Expense[] = (data.expenses || []).map((e: any) => ({
    id: e.expense_id || e.id,
    title: e.title,
    amount: parseFloat(e.amount),
    paidById: e.paid_by_id || e.paidById || YOU_ID,
    participantIds: e.participantIds || [],
    date: e.expense_date || e.date || new Date().toISOString().slice(0, 10),
  }));

  return { members: allMembers, expenses: backendExpenses };
};

export function useSplits() {
  const [state, setState] = useState<SplitState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Try backend first
        const res = await api.get('/splits');
        if (res.data?.success) {
          const remoteState = toSplitState(res.data.data);
          setState(remoteState);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState)).catch(() => {});
          return;
        }
      } catch {
        // Backend unavailable — fall back to local storage
      }
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SplitState;
          if (parsed?.members?.length) setState(parsed);
        }
      } catch {
        // start fresh
      }
    };
    load().finally(() => setLoaded(true));
  }, []);

  const localPersist = useCallback((next: SplitState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addMember = useCallback(async (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const exists = state.members.some((m) => m.name.toLowerCase() === clean.toLowerCase());
    if (exists) return;
    try {
      const res = await api.post('/splits/members', { name: clean });
      const member_id = res.data?.data?.member_id || `${Date.now()}`;
      localPersist({ ...state, members: [...state.members, { id: member_id, name: clean }] });
    } catch {
      // Fallback: local only
      localPersist({ ...state, members: [...state.members, { id: `local-${Date.now()}`, name: clean }] });
    }
  }, [state, localPersist]);

  const removeMember = useCallback(async (id: string) => {
    if (id === YOU_ID) return;
    try { await api.delete(`/splits/members/${id}`); } catch { /* ignore */ }
    localPersist({
      members: state.members.filter((m) => m.id !== id),
      expenses: state.expenses
        .filter((e) => e.paidById !== id)
        .map((e) => ({ ...e, participantIds: e.participantIds.filter((p) => p !== id) })),
    });
  }, [state, localPersist]);

  const addExpense = useCallback(async (input: { title: string; amount: number; paidById: string; participantIds: string[] }) => {
    if (!input.title.trim() || input.amount <= 0 || input.participantIds.length === 0) return;
    try {
      const res = await api.post('/splits/expenses', {
        title: input.title.trim(),
        amount: input.amount,
        paidById: input.paidById,
        participantIds: input.participantIds,
      });
      const expense_id = res.data?.data?.expense_id || `local-${Date.now()}`;
      const expense: Expense = {
        id: expense_id,
        title: input.title.trim(),
        amount: input.amount,
        paidById: input.paidById,
        participantIds: input.participantIds,
        date: new Date().toISOString().slice(0, 10),
      };
      localPersist({ ...state, expenses: [expense, ...state.expenses] });
    } catch {
      const expense: Expense = {
        id: `local-${Date.now()}`,
        title: input.title.trim(),
        amount: input.amount,
        paidById: input.paidById,
        participantIds: input.participantIds,
        date: new Date().toISOString().slice(0, 10),
      };
      localPersist({ ...state, expenses: [expense, ...state.expenses] });
    }
  }, [state, localPersist]);

  const removeExpense = useCallback(async (id: string) => {
    try { await api.delete(`/splits/expenses/${id}`); } catch { /* ignore */ }
    localPersist({ ...state, expenses: state.expenses.filter((e) => e.id !== id) });
  }, [state, localPersist]);

  const settleAll = useCallback(async () => {
    try { await api.post('/splits/settle'); } catch { /* ignore */ }
    localPersist({ ...state, expenses: [] });
  }, [state, localPersist]);

  return {
    loaded,
    members: state.members,
    expenses: state.expenses,
    balances: computeBalances(state),
    addMember,
    removeMember,
    addExpense,
    removeExpense,
    settleAll,
  };
}
